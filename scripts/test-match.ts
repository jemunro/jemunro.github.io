// Tests for the Stage 7 matching rules. Run with Quarto's bundled Deno:
//   quarto run scripts/test-match.ts
// Uses synthetic ORCID records only (no network, no files).
import { buildWorks, type Entry, type OrcidRecord, type Overrides, serialise } from "./lib/match.ts";

let n = 0, failed = 0;
function check(name: string, ok: boolean, detail = "") {
  n++;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : "  " + detail}`);
}

let pc = 1;
const rec = (o: Partial<OrcidRecord> & { year?: number }): OrcidRecord => ({
  "put-code": pc++,
  group: null,
  title: "T",
  type: "journal-article",
  date: { year: o.year ?? 2020 },
  venue: null,
  doi: null,
  ...o,
});
const none: Overrides = { exclude: [], "preprint-of": [] };
const run = (r: OrcidRecord[], e: Entry[] = [], o: Overrides = none) => buildWorks(r, e, o);
const entry = (id: string, doi: string, exclude = false): Entry => ({ id, doi, exclude, file: `${id}.md` });

// 1. duplicate records with the same DOI (different case / URL prefix, no group) -> one work
{
  const { works } = run([
    rec({ doi: "10.1/AbC", title: "A paper" }),
    rec({ doi: "https://doi.org/10.1/abc", title: "A  paper" }),
  ]);
  check("duplicate DOI records collapse", works.length === 1 && works[0].doi === "10.1/abc", JSON.stringify(works));
}

// 2. preprint + journal in one ORCID group -> published, preprint ignored but listed
{
  const { works } = run([
    rec({ group: 1, doi: "10.1101/2021.05.19.444768", type: "other", title: "Pre", venue: "bioRxiv" }),
    rec({ group: 1, doi: "10.1371/journal.x", title: "Pub", venue: "PLOS X" }),
  ]);
  const w = works[0];
  check("preprint ignored once published", works.length === 1 && w.doi === "10.1371/journal.x" && w.status === "published" &&
    JSON.stringify(w.also) === '["10.1101/2021.05.19.444768"]', JSON.stringify(works));
}

// 3. a journal DOI carried by one record typed "preprint" is still a published DOI
{
  const { works } = run([
    rec({ group: 1, doi: "10.1261/rna.1", type: "journal-article" }),
    rec({ group: 1, doi: "10.1261/rna.1", type: "preprint" }),
    rec({ group: 1, doi: "10.1101/840892", type: "other" }),
  ]);
  check("mislabelled record does not make journal DOI a preprint", works[0].doi === "10.1261/rna.1" && works[0].status === "published", JSON.stringify(works));
}

// 4. separate groups, same title -> preprint merged into the published work
{
  const { works } = run([
    rec({ group: 1, doi: "10.1101/2024.06.12.24308870", type: "preprint", title: "TBtypeR: Sensitive detection" }),
    rec({ group: 2, doi: "10.1038/s42003-025-07705-9", title: "TBtypeR: sensitive  detection!" }),
  ]);
  check("same-title preprint merged", works.length === 1 && works[0].doi === "10.1038/s42003-025-07705-9", JSON.stringify(works));
}

// 5. preprint-only, different title -> stays a separate preprint; manual override links it
{
  const recs = () => [
    rec({ group: 1, doi: "10.1101/2024.01.01.111111", type: "preprint", title: "Early title" }),
    rec({ group: 2, doi: "10.1234/pub", title: "Completely new title" }),
  ];
  check("different titles stay separate", run(recs()).works.length === 2);
  const o: Overrides = { exclude: [], "preprint-of": [{ preprint: "10.1101/2024.01.01.111111", published: "10.1234/pub" }] };
  const { works } = run(recs(), [], o);
  check("preprint-of override links them", works.length === 1 && works[0].doi === "10.1234/pub", JSON.stringify(works));
  const bad = run(recs(), [], { exclude: [], "preprint-of": [{ preprint: "10.9/none", published: "10.1234/pub" }] });
  check("unknown preprint-of DOI warns", bad.report.warnings.some((w) => w.includes("10.9/none")));
}

// 6. work without a DOI -> identified by title, flagged
{
  const { works, report } = run([rec({ title: "No DOI here, but a title", year: 2015 })]);
  check("DOI-less work keyed by title", works[0].doi === null && works[0].id === "t-no-doi-here-but-a-title-2015" && works[0].note === "no DOI" &&
    report.warnings.length === 1, JSON.stringify(works));
}

// 7. preprint -> journal lifecycle: entry still has the preprint DOI
{
  const { works } = run(
    [
      rec({ group: 1, doi: "10.1101/2022.01.01.222222", type: "preprint", title: "Same" }),
      rec({ group: 1, doi: "10.1234/journal", title: "Same" }),
    ],
    [entry("e1", "10.1101/2022.01.01.222222")],
  );
  check("entry with preprint DOI matches and is flagged stale", works[0].state === "matched" && works[0].entry === "e1" &&
    works[0]["stale-doi"] === "10.1101/2022.01.01.222222" && works[0].doi === "10.1234/journal", JSON.stringify(works));
}

// 8. exclusions: by override (even via a preprint DOI) and by exclude: true in content
{
  const recs = () => [
    rec({ group: 1, doi: "10.1101/2022.01.01.333333", type: "preprint", title: "X" }),
    rec({ group: 1, doi: "10.1234/x", title: "X" }),
    rec({ doi: "10.1234/y", title: "Y" }),
    rec({ doi: "10.1234/z", title: "Z" }),
  ];
  const o: Overrides = { exclude: [{ doi: "10.1101/2022.01.01.333333" }], "preprint-of": [] };
  const { works } = run(recs(), [entry("ey", "10.1234/y", true)], o);
  const st = Object.fromEntries(works.map((w) => [w.doi, w.state]));
  check("exclusions (override incl. via preprint DOI, and exclude:true)", st["10.1234/x"] === "excluded" && st["10.1234/y"] === "excluded" && st["10.1234/z"] === "new", JSON.stringify(st));
}

// 9. duplicate content entries for one work -> error
{
  const { report } = run([rec({ doi: "10.1234/d" })], [entry("a", "10.1234/d"), entry("b", "10.1234/D")]);
  check("two entries for one work is an error", report.errors.length === 1);
}

// 9b. arXiv-only ORCID record (no DOI) gets the deterministic arXiv DOI and matches the entry
{
  const { works, report } = run(
    [rec({ doi: null, title: "SVPLEX", type: "other", "external-ids": [{ type: "arxiv", value: "2608.11621v2" }] })],
    [entry("svplex", "10.48550/arXiv.2608.11621")],
  );
  check("arXiv id becomes a DOI and matches", works[0].doi === "10.48550/arxiv.2608.11621" && works[0].state === "matched" &&
    works[0].entry === "svplex" && report.warnings.length === 0, JSON.stringify(works));
}

// 9c. HTML in titles (escaped or literal) is cleaned
{
  const { works } = run([rec({ doi: "10.1/h", title: "On &lt;i&gt;Plasmodium vivax&lt;/i&gt; &amp; <b>friends</b>" })]);
  check("HTML in titles is cleaned", works[0].title === "On Plasmodium vivax & friends", works[0].title ?? "");
}

// 10. idempotent and independent of input order
{
  const recs = [
    rec({ group: 1, doi: "10.1101/2021.01.01.1", type: "preprint", title: "P" }),
    rec({ group: 1, doi: "10.1/p", title: "P" }),
    rec({ group: 2, doi: "10.1/q", title: "Q", year: 2019 }),
    rec({ group: 2, doi: "10.1/q", title: "Q", year: 2019 }),
    rec({ title: "Nodoi", year: 2018 }),
  ];
  const e = [entry("p", "10.1/p")];
  const a = serialise(run(recs, e).works);
  const b = serialise(run([...recs].reverse(), e).works);
  const c = serialise(run(recs, e).works);
  check("deterministic across runs and input order", a === b && a === c, `${a}\n${b}`);
  check("one work per line", a.split("\n").filter((l) => l.startsWith("  {")).length === 3);
}

console.log(`\n${n - failed}/${n} passed`);
if (failed) Deno.exit(1);
