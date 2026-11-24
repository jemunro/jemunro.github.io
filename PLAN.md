# Academic portfolio — incremental implementation plan

## Goal
Build a minimal Quarto/GitHub Pages portfolio with a **Publications** homepage and **Software** catalogue. Develop and test privately in Codespaces. Add placeholder entries and a stable editing workflow before attempting APIs or automation.

**Process:** Complete one milestone, test it, review it, then explicitly approve the next. Update the status in this file as work progresses. No public deployment until Stage 5.

| Stage | Milestone | Status |
|---|---|---|
| 0 | Reproducible Codespaces environment | In progress / verify |
| 1 | Website shell and private preview | Complete |
| 2 | Placeholder catalogue entries and presentation | Complete |
| 3 | Editable Markdown content model | Complete |
| 4 | Search, filters, featured ordering | Complete |
| 5 | GitHub Pages deployment | Complete |
| 6 | Manual ORCID publication import | Complete |
| 7 | Identity matching, preprint relationships and exclusions | Complete |
| 8 | AI-assisted draft descriptions and tags | In progress (first batch awaiting review) |
| 9 | Client-side OpenAlex citation counts | Not started |
| 10 | Curated GitHub repository metadata import | Not started |
| 11 | Agent-assisted new-publication branch workflow | Not started |

## Stage 0 — Development environment
**Scope:** Devcontainer with Quarto, relevant VS Code extensions and a private forwarded preview port. No website implementation.

**Pass when:** Container rebuild succeeds, `quarto --version` and `quarto check` work, and the preview port is private.

## Stage 1 — Website shell
**Scope:** Minimal Quarto site with header (name/qualifications/position/affiliation), desktop sidebar (short bio and profile-link placeholders), Publications homepage and Software page, responsive styling. No catalogue entries or data integrations. Preview privately in Codespaces.

**Pass when:** `quarto render` succeeds; both pages and navigation work; sidebar/header behave sensibly on desktop and narrow screens; a private Codespaces preview is available. No public deployment.

## Stage 2 — Placeholder catalogues
**Scope:** Add a few clearly identified sample publications and software projects; iterate compact entry layout, descriptions, links, tags, authorship/featured indicators. Use hardcoded data temporarily.

**Pass when:** Both catalogues are legible and visually consistent at desktop/mobile widths; no invented bibliographic metadata appears as verified fact.

## Stage 3 — Editable content model
**Scope:** Move entries to one version-controlled Markdown file per item, with stable IDs and curated fields. Choose a clean separation between curated files and future generated metadata.

**Pass when:** Adding, editing and removing an entry requires editing content files, not site rendering code; manual fields persist unchanged across builds.

## Stage 4 — Search and filtering
**Scope:** Add text search, shared controlled-vocabulary keyword filters and featured-first ordering; keep regular entries chronological. Prefer native Quarto listings where practical.

**Pass when:** Search and tag filtering work for both catalogues, including mobile; featured ordering works; empty results and filter reset behave sensibly.

## Stage 5 — First publication
**Scope:** Configure GitHub Actions/GitHub Pages deployment of approved `main` only. Continue testing unfinished work privately in Codespaces on feature branches.

**Pass when:** Public site matches approved preview; updates to approved `main` deploy; development branches do not publish automatically.

## Stage 6 — Manual ORCID importer
**Scope:** Fetch works from a supplied ORCID profile using a manually run importer. Save source metadata separately; no automatic publication or PRs yet.

**Pass when:** Imported works and identifiers can be inspected; errors do not erase cached data; curated files are untouched.

## Stage 7 — Matching and publication lifecycle
**Scope:** Stable identifiers, DOI matching, preprint/journal relationships, deduplication and manual exclusions.

**Pass when:** Repeated import is idempotent; test cases for duplicates and preprint updates are handled; exclusions persist.

## Stage 8 — AI-assisted draft content
**Scope:** Claude Code (or another agent), when prompted, drafts initial 1–2 sentence descriptions, candidate keywords and a possible authorship role for new items, using available abstracts/documentation. No automatic regeneration of approved text.

**Pass when:** Generated fields are clearly drafts; no unsupported claims are inserted; an edited approved entry cannot be overwritten.

## Stage 9 — OpenAlex citations (client-side)
**Scope:** Browser JavaScript queries the OpenAlex API by DOI (batched, one request per page) and shows citation counts on entries. No cache, no JSON file and no build-time step; counts are always live. Optionally a "most cited" sort if cheap. Entries without a DOI or without an OpenAlex match show no count (never guessed). Citation data is never written into `content/`.

**Pass when:** A sample of counts matches OpenAlex records; unmatched works and failed/blocked requests show no count and the page still works; the site is unaffected with JavaScript disabled. Note: OpenAlex is keyless and CORS-enabled; add its optional `mailto` parameter only with a generic, non-personal address supplied by the owner.

## Stage 10 — Selected GitHub repositories
**Scope:** Manually define which repositories appear, then retrieve supported GitHub metadata without overwriting curated fields.

**Pass when:** Only explicitly selected repos appear; missing/private repos fail gracefully; descriptions/tags remain editable.

## Stage 11 — Agent-assisted new-publication branch
**Scope:** A documented runbook/prompt (in `DEVELOPMENT.md`, plus a short prompt file if useful) for Claude Code or another agent: run the ORCID importer, compare results with `content/` (ids, DOIs, exclusions), and for each newly found work create a separate branch containing a draft `content/publications/*.md` entry (drafted description, tags, proposed authorship role, clearly marked as draft). The site owner reviews, pushes and merges the PR manually.

**Pass when:** A test run with one new work yields one branch with one new draft entry; a repeat run yields nothing for works already present or excluded; merging to `main` deploys through the existing Stage 5 workflow.

## Deferred unless explicitly requested
Blog, individual project pages, citation dashboards/graphs, full-text abstract hosting, scraping Google Scholar, automatic inclusion of all GitHub repos, and extra frontend frameworks.

## Review log
Record milestone completion dates, decisions and relevant caveats here as the project progresses.

### 2026-11-20 — Stage 1 complete (reviewed and approved)
- Quarto website shell: full-width header (name, qualifications, position, affiliation); below it a left sidebar (bio, research focus, profile links) and a right column with Publications (homepage) / Software tabs above the content; light/dark themes (cosmo/darkly) with Quarto's native toggle. Layout revised after first review (tabs moved from top bar into the content column; no repeated page headings).
- Profile data centralised in `_variables.yml`; a small local shortcode (`_extensions/profile`) renders only the links that are defined, so further profile links (e.g. institution page, LinkedIn, email, CV) and a photo can be added later by adding a key (photo support not yet built).
- Decisions: `page-layout: custom` with a CSS grid and no Quarto navbar (its sidebar is navigation-only and a navbar cannot read `_variables.yml`); tabs come from a local `site-tabs` shortcode; header/tab markup uses raw HTML where needed because Quarto merges headings into section wrappers; `_quarto.yml` renders only `*.qmd`, so README.md (the GitHub profile README) is untouched.
- Verified: `quarto render` succeeds without warnings; both pages serve via `quarto preview` on port 4200; active-tab marking, links and titles present in rendered HTML. User reviewed the layout visually and approved it.
- Docs: see `DEVELOPMENT.md`.

### 2026-11-20 — Stage 2 complete
- Two sample publications and two sample software entries, supplied by the site owner, hardcoded as plain HTML in `index.qmd` and `software.qmd` (temporary; replaced in Stage 3). Both catalogues share one set of `.catalogue`/`.entry` styles in `styles.scss`: title (linked), metadata line, short description, keyword badges, external links; "Featured" and "First author" badges.
- Not implemented (later stages): search/filtering, ordering logic, content files, any API/AI integration.
- Verified: `quarto render` succeeds without warnings; each page contains its two entries; all external links return HTTP 200. Not verified: visual appearance at desktop/mobile widths (no browser available in the container) — needs review in the Codespaces preview.
- Presentation decisions made during review: entries have no cross-links between tabs, only external links (publication venue/DOI and GitHub where relevant, labelled by venue name or "GitHub"); "academic navy" palette defined per mode in `theme-light.scss`/`theme-dark.scss` while `styles.scss` is shared so light and dark differ only in colour (system font stack, no web fonts); each featured entry has its own gold left rule; sidebar research focus shown as keyword chips and profile links have icons (Bootstrap Icons, bundled with Quarto; ORCID drawn in CSS).
- Dev-environment additions: `.devcontainer/start-preview.sh` starts the private preview on attach; do not run `quarto render` into `_site/` while previewing (see `DEVELOPMENT.md`).
- Review caveat: layout was checked by the site owner in the Codespaces preview; no automated visual/mobile test exists.

### 2026-11-20 — Stage 3 complete (reviewed and approved)
- Entries moved from hardcoded HTML to one Markdown file each: `content/publications/*.md`, `content/software/*.md` (YAML front matter + short Markdown body). Pages contain only `{{< catalogue publications >}}` / `{{< catalogue software >}}`. Schema, curated-vs-bibliographic field split and an add-entry example: `content/README.md`.
- Publication fields: `id`, `title`, `doi`, `authors`, `date`, `venue`, `status` (preprint/published), `featured`, `roles` (list: first/senior/corresponding/coauthor), `tags`, `related-software`, `exclude`. Software fields: `id`, `title`, `github`, `date` (ordering only), `featured`, `tags`, `related-publications`, `exclude`.
- Decision — custom Lua shortcode instead of a native Quarto listing: a listing was prototyped and rejected because (a) it cannot expose the Markdown body as the description (descriptions came back empty, even with the default template), (b) it forces rendering of a detail page per entry, contrary to the "no project-detail pages" design, and (c) it cannot join publications to software. `catalogue.lua` (~205 lines) reads the files, validates them, sorts and emits the same markup as Stage 2. No new dependencies.
- Decision — cross-links are by ID and derived: a paper's GitHub link comes from its related software entry; a software entry's paper link (labelled with the venue) comes from the related publication. URLs are never duplicated across files. `exclude: true` also removes links to that entry.
- Decision — separation for future automation: curated fields (`featured`, `roles`, `tags`, `exclude`, `related-*`, body) live only in `content/` and are never to be written by importers; generated metadata (ORCID/GitHub) will live in a separate location (e.g. `data/`) from Stage 6 onward. Bibliographic fields currently in the entry files (`title`, `doi`, `authors`, `date`, `venue`) are the interim source; how importers merge with them is for Stage 6/7 to decide.
- Decision — ordering (featured, then newest `date`, then title) is implemented in the shortcode because the page needs a deterministic order; Stage 4 still owns search, filters and any UI for ordering. Month-only dates sort as the latest of that month; this keeps the Stage 2 order. The sample software `date` values copy the associated paper's date for ordering only (not verified release dates).
- Tags are still free text; the controlled vocabulary and its validation are Stage 4.
- Verified: `quarto render` (to a separate output dir; preview was running) succeeds without warnings; output markup (order, badges, tags, links, ids) is identical to Stage 2 apart from line-wrapping of description text. Tested: edited a description (appeared), added a temporary publication + software pair with senior/corresponding badges and cross-links (appeared, correct links), `exclude: true` (hidden, link removed), invalid role (build error naming the file), then removed the temporary files (back to two entries each). Preview refreshes after content edits when a page `.qmd` is saved (tested).
- Not verified: visual appearance in a browser (markup unchanged, so none expected).
- Note: the acceptance criterion says "README"; the root `README.md` is the GitHub profile README (untouched), so the schema is in `content/README.md`.

### 2026-11-20 — Stage 4 complete (reviewed and approved)
- Added to both catalogues: text search (title, description and keywords; all words must match), keyword filtering by clicking keywords on entries (multi-select, AND; no separate keyword bar, active keywords are named in the status line), clickable keywords on every entry, a sort menu, a Clear button (shown only when something is active), a result count and a "no results" message with a clear button. State is per page, so Publications and Software are independent.
- Layout: the search box, sort menu and Clear button sit in the tab bar to the right of the tabs (JS moves them there), wrapping under the tabs on narrow screens.
- Decision — native Quarto listings were not used (rejected in Stage 3 for reasons that still hold, and they cannot produce the featured-first ordering over Markdown-body descriptions without detail pages). Instead one small vanilla-JS file, `_extensions/profile/catalogue.js` (~140 lines, no dependencies), is attached by the `catalogue` shortcode. It derives search text and keyword filters from the rendered entries, so adding a Markdown entry makes it searchable and its keywords filterable with no other change. Keywords match case-insensitively (the first spelling is displayed). No JavaScript: the plain list still shows in default order and keywords are inert buttons.
- Ordering: default is featured first, then publications newest-first / software A–Z (Lua sets this order in the HTML, JS reproduces it). Software `date` no longer drives default order, only the optional "Newest first" sort. Other sorts (publications: newest, oldest, title; software: A–Z, Z–A, newest) ignore the featured flag. Authorship badges never affect order.
- Not done: controlled-vocabulary *validation* (keywords are derived, not checked against a list); search state is not kept in the URL.
- Verified: `quarto render` succeeds without warnings; temporary entries (featured/non-featured, mixed-case duplicate keyword, future/older dates) checked, then removed. Because the container has no browser, the script was run against the rendered pages in jsdom (via Quarto's Deno): default order, search, no-result state, clear, click-to-filter and every sort option behaved as specified, with no script errors. Not verified: appearance in a real browser (light/dark, mobile layout) and real-browser console — needs review in the Codespaces preview.

### 2026-11-20 — Stage 5 complete (reviewed and approved)
- Added `.github/workflows/pages.yml`: one workflow, two jobs. `build` runs on pull requests, pushes to `main` and manual runs: official `actions/checkout`, `quarto-dev/quarto-actions/setup` (Quarto pinned to the Codespaces version), `quarto render`, then a site validation step; on `main` it uploads the site with `actions/upload-pages-artifact`. `deploy` (`actions/configure-pages`, `actions/deploy-pages`, `pages: write` + `id-token: write` only on this job; default token is read-only) runs only for non-PR events on `refs/heads/main` and `needs: build`, so a failed build cannot deploy. Feature branches/PRs never deploy; concurrency group prevents overlapping deploys. `_site/` stays git-ignored; no rendered HTML is committed.
- Added `.github/scripts/check-site.ts` (run with Quarto's bundled Deno via `quarto run`, no imports from the network): checks that both pages, CSS and JS exist, every internal `href`/`src` (and `#fragment`) resolves, no link points outside the site, and each catalogue page has entries and references `catalogue.js`. Decision: TypeScript-on-Quarto's-Deno rather than Python or a link-checker action, because the Codespace has no Python and this adds no dependency or service.
- Docs: "Deployment (GitHub Pages)" section in `DEVELOPMENT.md` (event table, one-time Pages settings, workflow, how to diagnose failures). No site, content, style or devcontainer files changed, so Codespaces previews are unaffected.
- Verified locally: `quarto render` succeeds without warnings; validator passes (2 pages, 48 internal references) and fails with a clear message when a link or asset is deliberately broken (tested on a copy); output has no root-absolute links (so it works at the user-site root); build contains light and dark Bootstrap CSS, the colour-scheme toggle and `catalogue.js`; in jsdom both pages load the script with no errors, search with no match hides all entries, and clearing restores them.
- Not verified: the workflow has never run on GitHub (it can only be tested once pushed; the YAML was not linted by a GitHub tool); the keyword-click check in jsdom hit a keyword shared by both sample entries so it did not demonstrate narrowing (Stage 4 tested it thoroughly and the code is unchanged); light/dark appearance and mobile layout in a real browser; the live deployment. Action major versions (`checkout@v4`, `quarto-actions/setup@v2`, `upload-pages-artifact@v3`, `configure-pages@v5`, `deploy-pages@v4`) were chosen from memory and should be confirmed on first run.
- Owner actions remaining: push a branch and open a PR to see the build check run; when approved, set Pages source to GitHub Actions (and make the repo public if on a free plan), then merge to `main`.
- Sign-off: the pull-request build check passed on GitHub (deploy skipped, as designed); Pages source set to GitHub Actions, the repository made public and the pull request merged; the `main` deployment succeeded. The site owner reviewed the live site (light/dark, mobile layout, search, keyword filtering, navigation) and approved it. This resolves the "not verified" items above, including the action versions, which worked on first run.

### 2026-11-20 — Stage 6 complete
- Added `scripts/import-orcid.ts` (TypeScript on Quarto's bundled Deno, same approach as the Stage 5 validator; no new dependencies) and generated cache `data/orcid/works.json`. Run: `quarto run scripts/import-orcid.ts` (iD read from the `orcid:` link in `_variables.yml`, or passed as an argument; `--dry-run`, `--out`). Documented in `DEVELOPMENT.md`.
- Decisions: public ORCID API v3.0 (works list for groups, then bulk full-record fetch for contributors/citation); one stored record per ORCID `put-code` with group number and ORCID's preferred flag, no merging; ORCID has no publication "status" field, so only ORCID `type` (e.g. journal-article, preprint) is stored and status inference is left to Stage 7; DOI normalised to lower case without URL prefix, original external-id entries kept verbatim; output deterministic and written only when data changes; fails closed (partial/failed fetch never replaces the cache); generated data lives in `data/`, separate from `content/`, and is **git-ignored** (revised after review: the raw cache changes often and holds more than downstream stages need, and discovery should rely on `content/` rather than a committed cache; Stage 7 decides what small derived file, if any, is committed).
- Verified: import retrieves all works (record counts match ORCID's group listing); repeat run reports no change and the file is byte-identical; a simulated network failure, an unknown iD (404) and an invalid argument exit non-zero leaving the cache intact; a profile with sparse metadata imports without errors; `content/` unchanged (git status shows only new files); `quarto render` succeeds, site validator passes and `data/` is not in the built site.
- Not done (by scope): nothing consumes the cache; no matching, deduplication, preprint reconciliation, OpenAlex, AI drafting or PRs.

### 2026-11-24 — Plan revised: manual updates only
- Decision: the site is updated manually only. Stage 11 is an agent-prompted workflow where a new work found via ORCID gets its own branch and the owner pushes and merges the PR manually (no GitHub Actions, bots or tokens).
- Decision: Stage 9 (then numbered 8) citation counts are fetched live in the browser from OpenAlex by DOI; no cache and no build step. OpenAlex is still not used to discover publications.
- Stage 8 (then numbered 10) drafting is done by an agent on request. The Stage 6 note that `data/` is git-ignored remains valid (the importer is run on demand).

### 2026-11-24 — Stage 7 complete (provisionally approved)
- Added `scripts/match-orcid.ts` (CLI), `scripts/lib/match.ts` (pure matching rules), `scripts/test-match.ts` (15 tests on synthetic records) and `content/overrides.yml` (manual `exclude` and `preprint-of`). Run: `quarto run scripts/match-orcid.ts`; documented in `DEVELOPMENT.md` and `content/README.md`. No new dependencies (YAML parsing uses Quarto's bundled `stdlib/yaml`).
- Output: `data/publications.json`, the only committed file under `data/` (`.gitignore` now ignores `/data/*` except it): one deduplicated line per publication (id, doi, title, year, status, venue, match state, matched entry id, plus `also`/`stale-doi`/`note` when relevant), no timestamps, sorted year-descending then id.
- Decisions: ORCID only, no external lookups. A work with a published DOI ignores its preprint DOIs (kept in `also`). Records are one work if in the same ORCID group or sharing a DOI; a preprint-only work is merged into a published work with an identical normalised title; other links are manual (`preprint-of`). A DOI is a preprint DOI if it matches a known preprint-server pattern or every record carrying it is typed `preprint` (ORCID mislabels some journal records, e.g. a `preprint` record bearing the journal DOI). Exclusions: one `exclude` DOI list in `content/overrides.yml`, plus existing `exclude: true` entries. A content entry still holding a preprint DOI after publication is flagged `stale-doi`, never edited automatically. DOI-less works get a title-based id and a warning.
- Verified: on the real cache (after the owner updated the ORCID profile), 53 ORCID records -> 26 publications, 2 matched, 24 new, no warnings; a repeat run leaves the file byte-identical; the test script passes; with a temporary overrides file an exclusion and a `preprint-of` link took effect; unknown override keys, a missing cache and a malformed file exit non-zero and leave the previous output intact; `content/` entries unchanged (only `content/overrides.yml` added); `quarto render` and the site validator pass and neither `data/` nor `overrides.yml` is in the built site.
- Review findings (resolved with the owner): one content entry was missing from ORCID, so it was added there; ORCID stores arXiv works with an arXiv id and no DOI, so the matcher derives the deterministic arXiv DOI (`10.48550/arxiv.<id>`) and matches on it. Two older preprints were found to be published under changed titles (DOIs confirmed against Crossref as a one-off check, not part of the tooling); both published versions were added to ORCID and the preprints linked with `preprint-of` in `content/overrides.yml`. The remaining preprint-only works are reported as preprints. A title-cleaning bug (ORCID returns HTML-escaped tags such as `&lt;i&gt;` in titles) was found on this run and fixed, with tests (15 total).
- Not done (by scope): nothing creates content entries or branches from `new` works (Stage 11); no OpenAlex/Crossref lookups.
- Sign-off: the site owner reviewed the output and provisionally approved it. One ORCID edit made late in the session had not appeared in the public API when last checked (two re-imports returned the same 53 records), so it is unverified; re-run the importer and matcher once it propagates.

### 2026-11-24 — Plan reordered
- AI-assisted draft content is now Stage 8, ahead of client-side OpenAlex citations (Stage 9) and selected GitHub repositories (Stage 10), so the publication catalogue can be filled in first. Scopes are unchanged; only the numbering moved. Earlier log entries that mention the old numbers are annotated.

### 2026-11-24 — Stage 8 in progress: first batch (2026 papers)
- Approved approach: draft the seven 2026 papers marked `new` first, to find problems before doing the rest. Drafts are identified by branch/commit, not by an in-file marker (owner's decision). Seven new files in `content/publications/`, all `featured: false`.
- Sources (one-off lookups by DOI, not part of the tooling): abstracts and first-publication dates from Europe PMC; full author names and titles from Crossref (publisher-supplied, used verbatim). Descriptions are 1–2 sentences written from the abstract only, with any figures taken directly from it.
- Authorship roles: `first` only where the site owner is clearly the first author; everything else `coauthor`. Senior/corresponding were not proposed because the data does not show them; set manually.
- Keyword vocabulary: proposed in `content/README.md` ("Keyword vocabulary"), extending the five existing keywords from the titles of all ORCID works. For the owner to edit; still not validated.
- Verified: `match-orcid` reports 9 matched / 17 new with no warnings; tests pass; `quarto render` and the site validator pass; the new entries render in date order below the featured ones, with `first` badges only where set.
- Issues found: (1) author lists are shown in full, so one entry runs to ~680 characters (38 authors) against ~80 for the others, which breaks the compact-list design; (2) the owner's name appears in several forms because publishers format it differently; (3) dates are Europe PMC first-publication dates, which can differ from journal issue dates.
- Design change (owner's request, folded into Stage 8): Publications entries are now collapsible cards (native `<details>`, collapsed by default, no JavaScript needed). Collapsed: title, meta line, keywords and links stay visible; the description is hidden and authors are shortened to first author, last author and the site owner in bold, with "…" between (lists of three or fewer are never shortened). Open: full description and full author list. The owner is matched by surname + first initial derived from `name` in `_variables.yml` (no new setting). Software entries are unchanged. CLAUDE.md "Agreed website design" updated to match. Implemented in `catalogue.lua` and `styles.scss`; `catalogue.js` is unchanged (descriptions stay in the DOM, so search still covers them).
- Verified: the live preview renders 9 cards; owner bold and in the right place for first, middle and last positions; short lists unshortened; Software page has no cards; compiled CSS contains the card rules. Not verified: appearance and click behaviour in a real browser (desktop, mobile, light/dark); search/keyword-click behaviour was not re-run in a DOM test (a jsdom check was blocked), though `catalogue.js` is unchanged and its inputs are still present.
- Further presentation changes (owner's requests, Stage 8): authorship roles are now gold chips at the start of the keyword row, filterable like keywords; the venue in the meta line is the link to the paper (titles on publication cards are plain text) and related GitHub links sit next to it; the sidebar "Research focus" became "Keywords" (`sidebar_keywords` in `_variables.yml`, `sidebar-keywords` shortcode): each is a clickable filter with a count of entries on the current page, and the existing focus keywords were added to relevant entries (Computational genomics, Methods development, in both catalogues; additions only, existing tags untouched). Which entries received them is a judgement call for the owner to review. Not verified in a real browser; the count and click logic in `catalogue.js` has not been run in a DOM (script parses, markup checked in the served HTML).
- Keyword vocabulary is now a file, `content/keywords.yml` (grouped; includes programming languages Nextflow and R), and the sidebar "Keywords" section lists all of it, below Profiles, built from that file (replacing the `sidebar_keywords` variable). Unused keywords show a count of 0 until entries use them. The sidebar scrolls within the viewport when long. Tags are still not validated against the vocabulary (a manual check found every tag in use is listed).

### 2026-11-24 — Software entries added; Software cards match Publication cards
- Four software entries added by the site owner's request, each cross-linked by id with its paper (three papers newly drafted from abstracts, one paper already present); descriptions were written from each repository's README. This is the manual selection part of Stage 10 done early; no GitHub metadata retrieval was built. Software `date` values copy the associated paper's date (ordering only, unverified as release dates), as in Stage 3.
- Software cards now behave like paper cards: plain-text title, meta line holding the GitHub link and the related paper's venue link, keywords below, description folded away, whole-card hover and click. CLAUDE.md design note updated. A shared `venue_label` helper in `catalogue.lua` labels paper links on both pages.
- Verified: both pages render (12 paper cards, 6 software cards); every paper with software shows its GitHub link and every software card links to its paper; the matcher reports the new papers as matched; site validator and tests pass. Not verified in a real browser. The owner confirmed co-first authorship on the one paper where they are second author; three of the new papers are featured.
- Presentation change (owner's request): the "Featured" badge was removed. Featured entries are identified only by the gold rule down the left side and by sitting above regular entries; `featured` ordering and the `featured: true` field are unchanged.
