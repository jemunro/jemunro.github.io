// Stage 7: match the cached ORCID works against the curated content (Runs with Quarto's
// bundled Deno):
//
//   quarto run scripts/match-orcid.ts [--orcid data/orcid/works.json] [--content content]
//                                     [--out data/publications.json] [--dry-run]
//
// Reads the raw cache written by scripts/import-orcid.ts, content/publications/*.md
// (only `id`, `doi`, `exclude` are read) and content/overrides.yml, and writes
// data/publications.json: one deduplicated line per publication with its match state
// (matched / new / excluded). It never modifies content/. The output is deterministic
// (no timestamps) and is rewritten only when it changes, so it is small to diff in git.
import { parse } from "stdlib/yaml";
import { join, resolve } from "node:path";
import { buildWorks, type Entry, type J, type Overrides, serialise } from "./lib/match.ts";

const args = [...Deno.args];
const flag = (n: string) => {
  const i = args.indexOf(n);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};
const option = (n: string, d: string) => {
  const i = args.indexOf(n);
  if (i < 0) return d;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const dryRun = flag("--dry-run");
const orcidPath = resolve(option("--orcid", "data/orcid/works.json"));
const contentDir = resolve(option("--content", "content"));
const outPath = resolve(option("--out", "data/publications.json"));

function die(msg: string): never {
  console.error(`ERROR: ${msg}`);
  Deno.exit(1);
}
if (args.length) die(`unexpected argument: ${args.join(" ")}`);

// ---- inputs ----
let cache: J;
try {
  cache = JSON.parse(Deno.readTextFileSync(orcidPath));
} catch (e) {
  die(`cannot read ${orcidPath} (${e instanceof Error ? e.message : e}); run scripts/import-orcid.ts first`);
}
if (!Array.isArray(cache.works)) die(`${orcidPath} has no "works" array`);

const entries: Entry[] = [];
const pubDir = join(contentDir, "publications");
const ids = new Set<string>();
for (const f of [...Deno.readDirSync(pubDir)].map((e) => e.name).sort()) {
  if (!f.endsWith(".md") || f.startsWith("_") || f.startsWith(".")) continue;
  const m = Deno.readTextFileSync(join(pubDir, f)).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) die(`${f}: no YAML front matter`);
  const fm = parse(m[1]) as J;
  if (typeof fm?.id !== "string" || typeof fm?.doi !== "string") die(`${f}: needs string "id" and "doi"`);
  if (ids.has(fm.id)) die(`${f}: duplicate id "${fm.id}"`);
  ids.add(fm.id);
  entries.push({ id: fm.id, doi: fm.doi, exclude: fm.exclude === true, file: f });
}

const overrides: Overrides = { exclude: [], "preprint-of": [] };
try {
  const o = parse(Deno.readTextFileSync(join(contentDir, "overrides.yml"))) as J;
  for (const k of Object.keys(o ?? {})) if (!(k in overrides)) die(`overrides.yml: unknown key "${k}"`);
  for (const x of o?.exclude ?? []) {
    if (typeof x?.doi !== "string") die(`overrides.yml: each exclude item needs a "doi"`);
    overrides.exclude.push({ doi: x.doi, note: x.note });
  }
  for (const x of o?.["preprint-of"] ?? []) {
    if (typeof x?.preprint !== "string" || typeof x?.published !== "string") {
      die(`overrides.yml: each preprint-of item needs "preprint" and "published"`);
    }
    overrides["preprint-of"].push({ preprint: x.preprint, published: x.published });
  }
} catch (e) {
  if (!(e instanceof Deno.errors.NotFound)) throw e;
}

// ---- match ----
const { works, report } = buildWorks(cache.works, entries, overrides);
if (report.errors.length) {
  report.errors.forEach((m) => console.error(`ERROR: ${m}`));
  die("matching failed; output not written");
}

const text = serialise(works);
let before = "";
try {
  before = Deno.readTextFileSync(outPath);
} catch { /* first run */ }
const changed = before !== text;
if (changed && !dryRun) {
  Deno.mkdirSync(join(outPath, ".."), { recursive: true });
  Deno.writeTextFileSync(outPath + ".tmp", text);
  Deno.renameSync(outPath + ".tmp", outPath);
}

// ---- report ----
const count = (s: string) => works.filter((w) => w.state === s).length;
console.log(`${cache.works.length} ORCID records -> ${works.length} publications`);
console.log(`  matched ${count("matched")}, new ${count("new")}, excluded ${count("excluded")}`);
const show = (title: string, items: string[]) => {
  if (items.length) console.log(`\n${title}\n${items.map((i) => "  " + i).join("\n")}`);
};
show("New (not in content/):", works.filter((w) => w.state === "new").map((w) => `${w.id}  ${w.status}  ${w.year}  ${w.title}`));
show(
  "Content entries whose DOI is out of date (a published version exists):",
  works.filter((w) => w["stale-doi"]).map((w) => `${w.entry}: ${w["stale-doi"]} -> ${w.doi}`),
);
show(
  "Preprints with no published version (add `preprint-of` to content/overrides.yml if one exists):",
  works.filter((w) => w.status === "preprint").map((w) => `${w.id}  ${w.title}`),
);
show("Warnings:", report.warnings);
console.log(`\n${outPath}: ${changed ? (dryRun ? "would change (dry run)" : "updated") : "unchanged"}`);
