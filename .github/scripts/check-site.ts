// Sanity-check a rendered Quarto site. Runs with Quarto's bundled Deno:
//   quarto run .github/scripts/check-site.ts [site_dir]     (default: _site)
//
// Checks: expected pages/assets exist; every internal href/src in every HTML
// file resolves to a file (and #fragments to an id); catalogue pages contain
// entries and reference the search script; nothing points outside the site.
import { dirname, join, normalize, relative, resolve } from "node:path";

function* walk(d: string): Generator<string> {
  for (const e of Deno.readDirSync(d)) {
    const p = join(d, e.name);
    if (e.isDirectory) yield* walk(p); else yield p;
  }
}

const site = resolve(Deno.args[0] ?? "_site");
const errors: string[] = [];
const fail = (m: string) => errors.push(m);
const isFile = (p: string) => { try { return Deno.statSync(p).isFile; } catch { return false; } };
const isDir = (p: string) => { try { return Deno.statSync(p).isDirectory; } catch { return false; } };

if (!isDir(site)) { console.error(`ERROR: ${site} not found (run quarto render first)`); Deno.exit(2); }

const all = [...walk(site)];
const htmlFiles = all.filter((p) => p.endsWith(".html"));
if (!all.some((p) => /site_libs\/.*\.css$/.test(p))) fail("no CSS under site_libs/");
if (!all.some((p) => /site_libs\/.*\.js$/.test(p))) fail("no JS under site_libs/");
for (const req of ["index.html", "software.html"]) {
  if (!isFile(join(site, req))) fail(`missing page: ${req}`);
}

const attrRe = /\s(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const idRe = /\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const parsed = new Map<string, { html: string; ids: Set<string> }>();
for (const f of htmlFiles) {
  const html = Deno.readTextFileSync(f);
  const ids = new Set<string>();
  for (const m of html.matchAll(idRe)) ids.add(m[1] ?? m[2]);
  parsed.set(f, { html, ids });
}

for (const page of ["index.html", "software.html"]) {
  const p = parsed.get(join(site, page));
  if (!p) continue;
  const entries = (p.html.match(/<(?:article|li|div)[^>]*class="[^"]*\bentry\b/g) ?? []).length;
  if (entries === 0) fail(`${page}: no catalogue entries rendered`);
  if (!/<script[^>]+src="[^"]*catalogue[^"]*\.js"/.test(p.html)) {
    fail(`${page}: catalogue search/filter script not referenced`);
  }
}

let refs = 0;
for (const [page, { html }] of parsed) {
  const rel = relative(site, page);
  for (const m of html.matchAll(attrRe)) {
    const ref = (m[2] ?? m[3]).trim();
    if (ref === "" || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue; // external / mailto / data
    refs++;
    const [pathPart, frag] = [ref.split("#")[0].split("?")[0], ref.includes("#") ? ref.split("#")[1] : ""];
    let target = pathPart === "" ? page
      : pathPart.startsWith("/") ? join(site, decodeURIComponent(pathPart))
      : normalize(join(dirname(page), decodeURIComponent(pathPart)));
    if (isDir(target)) target = join(target, "index.html");
    if (relative(site, target).startsWith("..")) fail(`${rel}: '${ref}' points outside the site`);
    else if (!isFile(target)) fail(`${rel}: '${ref}' does not resolve to a file`);
    else if (frag && parsed.has(target) && !parsed.get(target)!.ids.has(frag)) {
      fail(`${rel}: '${ref}' fragment not found`);
    }
  }
}

if (errors.length) {
  console.error("Site validation FAILED:");
  for (const e of errors) console.error("  - " + e);
  Deno.exit(1);
}
console.log(`Site validation passed: ${htmlFiles.length} pages, ${refs} internal references checked.`);
