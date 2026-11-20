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
| 6 | Manual ORCID publication import | Not started |
| 7 | Identity matching, preprint relationships and exclusions | Not started |
| 8 | Manual OpenAlex citation matching and retrieval | Not started |
| 9 | Curated GitHub repository metadata import | Not started |
| 10 | AI-assisted draft descriptions and tags | Not started |
| 11 | One-PR-per-paper review workflow | Not started |
| 12 | Scheduled discovery, metadata and citation updates | Not started |

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

## Stage 8 — OpenAlex citations (manual)
**Scope:** Resolve catalogue items to OpenAlex works and fetch citation counts, keeping citation data separate from curated content.

**Pass when:** A sample of counts is checked against source records; unmatched works are flagged rather than guessed; API failures preserve prior values.

## Stage 9 — Selected GitHub repositories
**Scope:** Manually define which repositories appear, then retrieve supported GitHub metadata without overwriting curated fields.

**Pass when:** Only explicitly selected repos appear; missing/private repos fail gracefully; descriptions/tags remain editable.

## Stage 10 — AI-assisted draft content
**Scope:** Generate initial 1–2 sentence descriptions, candidate keywords and possible authorship role for new items, using available abstracts/documentation. No automatic regeneration of approved text.

**Pass when:** Generated fields are clearly drafts; no unsupported claims are inserted; an edited approved entry cannot be overwritten.

## Stage 11 — Review pull requests
**Scope:** Propose each newly discovered paper in a separate GitHub PR; review substantive metadata changes. Avoid duplicating pending or merged proposals.

**Pass when:** One test discovery creates one reviewable PR, a repeat creates none, and merge publishes only approved content.

## Stage 12 — Scheduled updates
**Scope:** Schedule ORCID discovery and routine metadata refresh; update OpenAlex citation JSON daily, independently of full Quarto rerenders. Maintain reliable cached fallbacks.

**Pass when:** Scheduled jobs are idempotent, errors are visible, curated content remains protected, and citation numbers update on the deployed site without a full site rebuild.

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
- Decision — separation for future automation: curated fields (`featured`, `roles`, `tags`, `exclude`, `related-*`, body) live only in `content/` and are never to be written by importers; generated metadata (ORCID/OpenAlex/GitHub, citation JSON) will live in a separate location (e.g. `data/`) from Stage 6 onward. Bibliographic fields currently in the entry files (`title`, `doi`, `authors`, `date`, `venue`) are the interim source; how importers merge with them is for Stage 6/7 to decide.
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

#
- Added `.github/workflows/pages.yml`: one workflow, two jobs. `build` runs on pull requests, pushes to `main` and manual runs: official `actions/checkout`, `quarto-dev/quarto-actions/setup` (Quarto pinned to the Codespaces version), `quarto render`, then a site validation step; on `main` it uploads the site with `actions/upload-pages-artifact`. `deploy` (`actions/configure-pages`, `actions/deploy-pages`, `pages: write` + `id-token: write` only on this job; default token is read-only) runs only for non-PR events on `refs/heads/main` and `needs: build`, so a failed build cannot deploy. Feature branches/PRs never deploy; concurrency group prevents overlapping deploys. `_site/` stays git-ignored; no rendered HTML is committed.
- Added `.github/scripts/check-site.ts` (run with Quarto's bundled Deno via `quarto run`, no imports from the network): checks that both pages, CSS and JS exist, every internal `href`/`src` (and `#fragment`) resolves, no link points outside the site, and each catalogue page has entries and references `catalogue.js`. Decision: TypeScript-on-Quarto's-Deno rather than Python or a link-checker action, because the Codespace has no Python and this adds no dependency or service.
- Docs: "Deployment (GitHub Pages)" section in `DEVELOPMENT.md` (event table, one-time Pages settings, workflow, how to diagnose failures). No site, content, style or devcontainer files changed, so Codespaces previews are unaffected.
- Verified locally: `quarto render` succeeds without warnings; validator passes (2 pages, 48 internal references) and fails with a clear message when a link or asset is deliberately broken (tested on a copy); output has no root-absolute links (so it works at the user-site root); build contains light and dark Bootstrap CSS, the colour-scheme toggle and `catalogue.js`; in jsdom both pages load the script with no errors, search with no match hides all entries, and clearing restores them.
- Not verified: the workflow has never run on GitHub (it can only be tested once pushed; the YAML was not linted by a GitHub tool); the keyword-click check in jsdom hit a keyword shared by both sample entries so it did not demonstrate narrowing (Stage 4 tested it thoroughly and the code is unchanged); light/dark appearance and mobile layout in a real browser; the live deployment. Action major versions (`checkout@v4`, `quarto-actions/setup@v2`, `upload-pages-artifact@v3`, `configure-pages@v5`, `deploy-pages@v4`) were chosen from memory and should be confirmed on first run.
- Owner actions remaining: push a branch and open a PR to see the build check run; when approved, set Pages source to GitHub Actions (and make the repo public if on a free plan), then merge to `main`.
- Sign-off: the pull-request build check passed on GitHub (deploy skipped, as designed); Pages source set to GitHub Actions, the repository made public and the pull request merged; the `main` deployment succeeded. The site owner reviewed the live site (light/dark, mobile layout, search, keyword filtering, navigation) and approved it. This resolves the "not verified" items above, including the action versions, which worked on first run.
