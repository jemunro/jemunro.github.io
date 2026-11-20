// Manual ORCID works importer (Stage 6). Runs with Quarto's bundled Deno:
//
//   quarto run scripts/import-orcid.ts [orcid-id-or-url] [--out data/orcid/works.json] [--dry-run]
//
// With no ORCID argument the iD is read from the `orcid:` profile link in _variables.yml.
// Uses the public ORCID API (no credentials). Writes generated metadata to
// data/orcid/works.json and never touches content/ (curated files).
//
// Safety: everything is fetched and validated in memory first; the output file is
// replaced atomically only if that succeeds, so a failed run keeps the previous cache.
// Output is deterministic (sorted, no per-run timestamp unless the data changed), so a
// repeat import with unchanged ORCID data leaves the file byte-identical.
import { dirname, resolve } from "node:path";

const API = "https://pub.orcid.org/v3.0";
const BULK_SIZE = 50; // ORCID allows up to 100 put-codes per bulk request

// deno-lint-ignore no-explicit-any
type J = any;

// ---------- arguments ----------
const args = [...Deno.args];
const flag = (name: string) => {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};
const option = (name: string) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const dryRun = flag("--dry-run");
const outPath = resolve(option("--out") ?? "data/orcid/works.json");
let orcidArg = args[0];

function die(msg: string): never {
  console.error(`ERROR: ${msg}`);
  Deno.exit(1);
}

if (!orcidArg) {
  try {
    const m = Deno.readTextFileSync("_variables.yml").match(/^orcid:\s*["']?([^"'\s#]+)/m);
    orcidArg = m?.[1];
  } catch { /* handled below */ }
}
const orcid = orcidArg?.match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/)?.[0];
if (!orcid) die(args[0] ? `"${args[0]}" is not a valid ORCID iD` : "no ORCID iD given and none found under `orcid:` in _variables.yml");

// ---------- fetching ----------
async function get(path: string): Promise<J> {
  const url = `${API}/${path}`;
  for (let attempt = 1; ; attempt++) {
    let retryable = true, why = "";
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.ok) return await r.json();
      why = `HTTP ${r.status}`;
      retryable = r.status === 429 || r.status >= 500;
    } catch (e) {
      why = String(e); // network error
    }
    if (!retryable || attempt >= 4) throw new Error(`${why} for ${url}`);
    await new Promise((res) => setTimeout(res, 1000 * attempt));
  }
}

// ---------- normalisation (all fields optional; missing -> null / []) ----------
const val = (o: J): string | null => {
  const v = o?.value;
  return v === undefined || v === null || v === "" ? null : String(v);
};
const num = (o: J): number | null => {
  const v = val(o);
  return v !== null && /^\d+$/.test(v) ? Number(v) : null;
};
const iso = (ms: J): string | null => {
  const v = val(ms);
  return v && /^\d+$/.test(v) ? new Date(Number(v)).toISOString() : null;
};

function dateOf(pd: J) {
  const year = num(pd?.year), month = num(pd?.month), day = num(pd?.day);
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = year === null ? null
    : month === null ? String(year)
    : day === null ? `${year}-${pad(month)}`
    : `${year}-${pad(month)}-${pad(day)}`;
  return { year, month, day, text };
}

function externalIds(e: J) {
  return (e?.["external-id"] ?? []).map((x: J) => ({
    type: x["external-id-type"] ?? null,
    value: x["external-id-value"] ?? null,
    url: val(x["external-id-url"]),
    relationship: x["external-id-relationship"] ?? null,
  }));
}

function normalise(w: J, group: number) {
  const ids = externalIds(w["external-ids"]);
  const doiEntry = ids.find((i: J) => String(i.type).toLowerCase() === "doi" && i.value);
  const doi = doiEntry ? String(doiEntry.value).trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").toLowerCase() : null;
  const contributors = (w.contributors?.contributor ?? []).map((c: J) => ({
    name: val(c["credit-name"]),
    orcid: c["contributor-orcid"]?.path ?? null,
    sequence: c["contributor-attributes"]?.["contributor-sequence"] ?? null,
    role: c["contributor-attributes"]?.["contributor-role"] ?? null,
  }));
  return {
    "put-code": w["put-code"],
    group,
    title: val(w.title?.title),
    subtitle: val(w.title?.subtitle),
    type: w.type ?? null,
    date: dateOf(w["publication-date"]),
    venue: val(w["journal-title"]),
    doi,
    "external-ids": ids,
    url: val(w.url),
    contributors,
    citation: w.citation
      ? { type: w.citation["citation-type"] ?? null, value: w.citation["citation-value"] ?? null }
      : null,
    "short-description": w["short-description"] ?? null,
    language: w["language-code"] ?? null,
    visibility: w.visibility ?? null,
    source: {
      name: val(w.source?.["source-name"]),
      orcid: w.source?.["source-orcid"]?.path ?? null,
      "client-id": w.source?.["source-client-id"]?.path ?? null,
    },
    "created": iso(w["created-date"]),
    "last-modified": iso(w["last-modified-date"]),
    path: w.path ?? null,
  };
}

// ---------- main ----------
console.log(`Fetching works for ORCID ${orcid} ...`);
const summary = await get(`${orcid}/works`).catch((e) => die(`could not fetch works list: ${e}`));
const groups: J[] = summary.group ?? [];

// put-code -> group number. ORCID groups versions of the same work (matched on shared
// external ids) from different sources; the group number is the position in a stable order.
const groupKeys = groups.map((g) => {
  const codes: number[] = (g["work-summary"] ?? []).map((s: J) => s["put-code"]).sort((a: number, b: number) => a - b);
  return { codes, preferred: g["work-summary"]?.[0]?.["put-code"] as number };
}).filter((g) => g.codes.length > 0).sort((a, b) => a.codes[0] - b.codes[0]);
const groupOf = new Map<number, number>();
groupKeys.forEach((g, i) => g.codes.forEach((c) => groupOf.set(c, i + 1)));
const preferredCodes = new Set(groupKeys.map((g) => g.preferred));
const putCodes = [...groupOf.keys()].sort((a, b) => a - b);
console.log(`ORCID lists ${putCodes.length} work record(s) in ${groupKeys.length} group(s).`);

const works: J[] = [];
const problems: string[] = [];
for (let i = 0; i < putCodes.length; i += BULK_SIZE) {
  const chunk = putCodes.slice(i, i + BULK_SIZE);
  const res = await get(`${orcid}/works/${chunk.join(",")}`).catch((e) => die(`could not fetch work details: ${e}`));
  const returned = new Set<number>();
  for (const item of res.bulk ?? []) {
    if (item.work) {
      returned.add(item.work["put-code"]);
      const rec = normalise(item.work, groupOf.get(item.work["put-code"]) ?? 0);
      rec["preferred-in-group"] = preferredCodes.has(rec["put-code"]);
      works.push(rec);
    } else {
      problems.push(`bulk item error: ${JSON.stringify(item.error ?? item).slice(0, 200)}`);
    }
  }
  for (const c of chunk) if (!returned.has(c)) problems.push(`work ${c} was listed but its details were not returned`);
}
// Fail closed: do not replace a good cache with a partial one.
if (problems.length) die(`incomplete import, existing data left untouched:\n  ${problems.join("\n  ")}`);
if (works.length !== putCodes.length) die("record count mismatch, existing data left untouched");
works.sort((a, b) => a["put-code"] - b["put-code"]);

// ---------- write (only if changed) ----------
const header = {
  source: "ORCID public API",
  "api-version": "v3.0",
  orcid,
  "work-count": works.length,
  "group-count": groupKeys.length,
};
let previous: J = null;
try { previous = JSON.parse(Deno.readTextFileSync(outPath)); } catch { /* first run */ }
const unchanged = previous && JSON.stringify({ ...previous, retrieved: undefined }) === JSON.stringify({ ...header, retrieved: undefined, works });
const output = unchanged ? previous : { ...header, retrieved: new Date().toISOString(), works };

console.log(`Retrieved ${works.length} work record(s).`);
if (dryRun) {
  console.log("--dry-run: nothing written.");
} else if (unchanged) {
  console.log(`No changes since ${previous.retrieved}; ${outPath} left as is.`);
} else {
  Deno.mkdirSync(dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp`;
  Deno.writeTextFileSync(tmp, JSON.stringify(output, null, 2) + "\n");
  Deno.renameSync(tmp, outPath);
  console.log(`Wrote ${outPath}`);
}

// ---------- report on data quality ----------
const missing = (label: string, n: number) => n && console.log(`  ${label}: ${n}/${works.length}`);
console.log("Missing/odd fields:");
missing("no title", works.filter((w) => !w.title).length);
missing("no DOI", works.filter((w) => !w.doi).length);
missing("no venue", works.filter((w) => !w.venue).length);
missing("no publication year", works.filter((w) => w.date.year === null).length);
missing("no contributors listed", works.filter((w) => !w.contributors.length).length);
missing("no type", works.filter((w) => !w.type).length);
const multi = groupKeys.filter((g) => g.codes.length > 1);
if (multi.length) console.log(`  groups with several records (same work, multiple sources): ${multi.length}`);
const dois = new Map<string, number>();
for (const w of works) if (w.doi) dois.set(w.doi, (dois.get(w.doi) ?? 0) + 1);
const dup = [...dois].filter(([, n]) => n > 1);
if (dup.length) console.log(`  DOIs on several records: ${dup.length}`);
