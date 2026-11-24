// Stage 7 matching logic (pure functions, no I/O) shared by scripts/match-orcid.ts
// and scripts/test-match.ts. Turns the raw ORCID record cache into one entry per
// logical publication and compares it with the curated content entries.
//
// Rules (ORCID only; no external lookups):
//  1. Records belong to the same work if ORCID put them in one group or they share a DOI.
//  2. A DOI is a preprint DOI if it matches a known preprint-server pattern, or every
//     ORCID record carrying it is typed "preprint". (A journal DOI is NOT made a
//     preprint DOI by one mislabelled record.)
//  3. Once a published (non-preprint) DOI exists for a work, the preprint DOIs are
//     ignored: the work is reported under the published DOI, with the preprint DOIs
//     listed in `also`.
//  4. A preprint-only work with the same normalised title as a published work is merged
//     into it; anything else is linked manually via `preprint-of` in content/overrides.yml.

// deno-lint-ignore no-explicit-any
export type J = any;

export interface OrcidRecord {
  "put-code": number;
  group: number | null;
  title: string | null;
  type: string | null;
  date: { year: number | null } | null;
  venue: string | null;
  doi: string | null;
  "external-ids"?: { type: string; value: string }[];
  "preferred-in-group"?: boolean;
}
export interface Entry { id: string; doi: string; exclude: boolean; file: string }
export interface Overrides {
  exclude: { doi: string; note?: string }[];
  "preprint-of": { preprint: string; published: string }[];
}
export interface Work {
  id: string;
  doi: string | null;
  title: string | null;
  year: number | null;
  status: "published" | "preprint";
  venue: string | null;
  state: "matched" | "new" | "excluded";
  entry: string | null;
  also?: string[];
  "stale-doi"?: string;
  note?: string;
}
export interface Report { warnings: string[]; errors: string[] }

const PREPRINT_DOI = [
  /^10\.1101\/(\d{4}\.\d{2}\.\d{2}\.|\d+$)/, // bioRxiv / medRxiv (other 10.1101/ DOIs are CSHL journals)
  /^10\.21203\/rs\./, // Research Square
  /^10\.48550\/arxiv\./, // arXiv
  /^10\.64898\//, // openRxiv (new bioRxiv/medRxiv prefix)
  /^10\.20944\/preprints/, // Preprints.org
  /^10\.2139\/ssrn\./, // SSRN
  /^10\.3[14]2[13]9\/osf\.io\//, // OSF preprints
];

export const normDoi = (d: string | null | undefined): string | null => {
  if (!d) return null;
  const v = d.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:/, "");
  return v || null;
};
/** DOI of a record: its DOI, else the deterministic arXiv DOI derived from an arXiv external id. */
export const recordDoi = (r: OrcidRecord): string | null => {
  const d = normDoi(r.doi);
  if (d) return d;
  const ax = r["external-ids"]?.find((x) => x.type === "arxiv")?.value;
  const id = ax?.trim().replace(/^arxiv:/i, "").replace(/v\d+$/, "");
  return id ? `10.48550/arxiv.${id}`.toLowerCase() : null;
};

// ORCID sometimes returns titles with HTML escaped (&lt;i&gt;...) or literal tags.
const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&");
export const cleanTitle = (t: string | null): string | null => {
  if (!t) return null;
  const v = decode(t).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return v || null;
};
const normTitle = (t: string | null) =>
  (cleanTitle(t) ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const slug = (t: string | null, year: number | null) =>
  `t-${normTitle(t).split(" ").slice(0, 8).join("-")}-${year ?? "nd"}`;

export function buildWorks(
  records: OrcidRecord[],
  entries: Entry[],
  overrides: Overrides,
): { works: Work[]; report: Report } {
  const report: Report = { warnings: [], errors: [] };
  const recs = [...records].sort((a, b) => a["put-code"] - b["put-code"]);

  // ----- DOI classification -----
  const byDoi = new Map<string, OrcidRecord[]>();
  for (const r of recs) {
    const d = recordDoi(r);
    if (d) byDoi.set(d, [...(byDoi.get(d) ?? []), r]);
  }
  const isPreprintDoi = (d: string) =>
    PREPRINT_DOI.some((re) => re.test(d)) || (byDoi.get(d) ?? []).every((r) => r.type === "preprint");

  // ----- clustering (union-find over record indices) -----
  const parent = recs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  const firstWith = new Map<string, number>();
  recs.forEach((r, i) => {
    for (const key of [r.group !== null ? `g:${r.group}` : null, recordDoi(r) ? `d:${recordDoi(r)}` : null]) {
      if (!key) continue;
      if (firstWith.has(key)) union(i, firstWith.get(key)!); else firstWith.set(key, i);
    }
  });
  const unionDois = (a: string, b: string) => {
    const ia = recs.findIndex((r) => recordDoi(r) === a), ib = recs.findIndex((r) => recordDoi(r) === b);
    if (ia < 0 || ib < 0) return false;
    union(ia, ib);
    return true;
  };

  // manual preprint links
  for (const l of overrides["preprint-of"]) {
    const p = normDoi(l.preprint), q = normDoi(l.published);
    if (!p || !q || !unionDois(p, q)) {
      report.warnings.push(`overrides: preprint-of ${l.preprint} -> ${l.published}: DOI not found in ORCID data (ignored)`);
    }
  }

  const clusters = () => {
    const m = new Map<number, OrcidRecord[]>();
    recs.forEach((r, i) => m.set(find(i), [...(m.get(find(i)) ?? []), r]));
    return [...m.values()];
  };
  const doisOf = (c: OrcidRecord[]) => [...new Set(c.map((r) => recordDoi(r)).filter((d): d is string => !!d))];
  const hasPublished = (c: OrcidRecord[]) => doisOf(c).some((d) => !isPreprintDoi(d));

  // title match: preprint-only cluster -> published cluster with the same title
  {
    const cs = clusters();
    const published = new Map<string, OrcidRecord[]>();
    for (const c of cs) {
      if (!hasPublished(c)) continue;
      for (const r of c) if (normTitle(r.title)) published.set(normTitle(r.title), c);
    }
    for (const c of cs) {
      if (hasPublished(c) || doisOf(c).length === 0) continue;
      const target = c.map((r) => published.get(normTitle(r.title))).find((t) => t && t !== c);
      if (target) union(recs.indexOf(c[0]), recs.indexOf(target[0]));
    }
  }

  // ----- one work per cluster -----
  const entryByDoi = new Map<string, Entry[]>();
  for (const e of entries) {
    const d = normDoi(e.doi);
    if (d) entryByDoi.set(d, [...(entryByDoi.get(d) ?? []), e]);
  }
  const excluded = new Set(overrides.exclude.map((x) => normDoi(x.doi)).filter((d): d is string => !!d));
  const seenDois = new Set<string>();
  const works: Work[] = [];

  for (const c of clusters()) {
    const dois = doisOf(c);
    dois.forEach((d) => seenDois.add(d));
    const published = dois.filter((d) => !isPreprintDoi(d));
    const pool = published.length ? published : dois;
    const count = (d: string) => (byDoi.get(d) ?? []).length;
    // canonical DOI: most records, then lexicographically smallest (deterministic)
    const doi = pool.length ? [...pool].sort((a, b) => count(b) - count(a) || (a < b ? -1 : 1))[0] : null;
    const status: Work["status"] = doi
      ? (published.length ? "published" : "preprint")
      : (c.every((r) => r.type === "preprint") ? "preprint" : "published");

    // representative record for title / year / venue
    const rank = (r: OrcidRecord) => (r.type === "journal-article" ? 0 : r.type === "preprint" ? 1 : 2);
    const candidates = c.filter((r) => !doi || recordDoi(r) === doi);
    const rep = [...candidates].sort((a, b) =>
      Number(!!b["preferred-in-group"]) - Number(!!a["preferred-in-group"]) || rank(a) - rank(b) ||
      a["put-code"] - b["put-code"]
    )[0];
    const title = cleanTitle(rep.title);
    const year = rep.date?.year ?? c.map((r) => r.date?.year).find((y) => y != null) ?? null;
    const id = doi ?? slug(title, year);

    const w: Work = {
      id,
      doi,
      title,
      year,
      status,
      venue: rep.venue ? rep.venue.replace(/\s+/g, " ").trim() : null,
      state: "new",
      entry: null,
    };
    const also = dois.filter((d) => d !== doi).sort();
    if (also.length) w.also = also;
    if (!doi) {
      w.note = "no DOI";
      report.warnings.push(`no DOI: "${title}" (${year}) is identified by title; add a DOI on ORCID if one exists`);
    }
    if (published.length > 1) {
      w.note = `several published DOIs (${published.join(", ")}); using ${doi}`;
      report.warnings.push(`${id}: ${w.note}`);
    }

    // match with curated entries (any DOI of the work)
    const matched = [...new Set(dois.flatMap((d) => entryByDoi.get(d) ?? []))];
    if (matched.length > 1) {
      report.errors.push(`${id}: matched by several content entries (${matched.map((e) => e.file).join(", ")})`);
    }
    if (matched.length) {
      w.entry = matched[0].id;
      w.state = "matched";
      const ed = normDoi(matched[0].doi);
      if (ed && ed !== doi) w["stale-doi"] = ed;
    }
    if (dois.some((d) => excluded.has(d)) || matched.some((e) => e.exclude)) w.state = "excluded";
    works.push(w);
  }

  // consistency checks against content / overrides
  for (const e of entries) {
    const d = normDoi(e.doi);
    if (d && !seenDois.has(d)) {
      report.warnings.push(`content entry "${e.id}" (${e.file}) has DOI ${e.doi}, which is not in the ORCID data`);
    }
  }
  for (const x of overrides.exclude) {
    const d = normDoi(x.doi);
    if (!d || !seenDois.has(d)) report.warnings.push(`overrides: exclude ${x.doi}: DOI not found in ORCID data`);
  }

  works.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { works, report };
}

/** One work per line so that a change to one work is a one-line diff. */
export function serialise(works: Work[]): string {
  const keys = ["id", "doi", "title", "year", "status", "venue", "state", "entry", "also", "stale-doi", "note"];
  const lines = works.map((w) => {
    const o: J = {};
    for (const k of keys) if ((w as J)[k] !== undefined) o[k] = (w as J)[k];
    return "  " + JSON.stringify(o);
  });
  return `[\n${lines.join(",\n")}\n]\n`;
}
