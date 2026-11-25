# Site development notes

## Preview and build
- Preview (private in Codespaces): `quarto preview --port 4200 --host 0.0.0.0 --no-browser`, then open forwarded port 4200 from the Ports tab. Keep its visibility **Private**.
- Build: `quarto render` (output in `_site/`, git-ignored).

## Updating profile details
All profile text lives in [`_variables.yml`](_variables.yml): name, qualifications, position, affiliation, sidebar keywords, bio and profile links. Pages use `{{< var ... >}}`; never retype these values in `.qmd` files.

**Header photo:** `photo` in `_variables.yml` points to an image under `images/` (shown as a circle beside the name). To change the photo, replace the file (or point `photo` at another image); the header expects the key to be present.

**Profile links** are rendered by the `profile-links` shortcode ([`_extensions/profile/`](_extensions/profile/profile-links.lua)). A link shows only if its key exists in `_variables.yml`. Supported keys, in display order: `github`, `orcid`, `scholar`, `openalex`, `wehi`, `linkedin`, `email` (plain address; `mailto:` is added), `cv`. Delete a key to hide the link.

**Author metrics** (h-index, i10-index, total citations and a chart of citations per year over the last 10 years) sit under the profile links, rendered by the `metrics` shortcode (`_extensions/profile/metrics.lua` + `metrics.js`). They are fetched live in the browser from the OpenAlex author API using the ID in the `openalex` profile link; nothing is cached or written to `content/`. If the link is missing, JavaScript is off or the request fails, the block stays hidden. The current year is partial, so its bar is still growing.

## Search and social metadata
Page titles and descriptions are the `pagetitle` and `description` in the front matter of `index.qmd` and `software.qmd` (they use `{{< var >}}`, so the name and affiliation come from `_variables.yml`). `website.site-url` in `_quarto.yml` drives the canonical links, absolute social-image URLs, the generated `sitemap.xml` and `robots.txt` (Quarto writes the latter with only a `Sitemap:` line, so crawlers are not blocked). Link previews use Quarto's `open-graph` and `twitter-card` with the header photo (`image`); the site name and image alt text in `_quarto.yml` repeat the owner's name, so update them if it changes. The homepage also carries schema.org `Person` JSON-LD from the `person-jsonld` shortcode, built from `_variables.yml` (name, position, affiliation, bio, photo and the `sameAs` profile links). Nothing here uses `noindex`. The sitemap lists the homepage as `/index.html` while its canonical is `/`; Quarto offers no option to change this and search engines resolve it via the canonical link.

## Structure
- `_quarto.yml` — light/dark themes, render scope. (Quarto navbar is not used: the top bar is `_partials/header.qmd`; tabs come from the `site-tabs` shortcode in `_extensions/profile/site-tabs.lua` — add a line there for a new page.)
- `_partials/header.qmd`, `_partials/sidebar.qmd` — shared header and sidebar, included by each page.
- `styles.scss` — layout (sidebar beside the content on ≥992px, stacked on narrow screens).
- `theme-light.scss`, `theme-dark.scss` — the "academic navy" palettes (Bootstrap variables plus the `--brand/--accent/--warm/--soft/…` tokens). Change colours only here; `styles.scss` (layout, type, components) is shared and uses the tokens, so light and dark differ only in colour.
- `index.qmd` (Publications, homepage), `software.qmd`; `content/` — catalogue entries.

## Catalogue entries
Search, keyword filters and sorting are done by `_extensions/profile/catalogue.js` (vanilla JS, derives everything from the rendered entries). Entries are Markdown files in `content/publications/` and `content/software/`; the `catalogue` shortcode (`_extensions/profile/catalogue.lua`) renders them using the shared `.catalogue`/`.entry` styles in `styles.scss`. Schema and how to add an entry: [`content/README.md`](content/README.md).

## Automatic preview
`.devcontainer/devcontainer.json` runs `.devcontainer/start-preview.sh` each time you attach to the codespace (`postAttachCommand`); it starts `quarto preview` on port 4200 unless it already responds, and opens the private forwarded port. Log: `/tmp/quarto-preview.log`. Applies after a rebuild or the next attach/restart.

## Don't render while previewing
`quarto preview` re-renders automatically on save. Running `quarto render` at the same time writes to the same `_site/` and can make the preview error or 404. To check a clean build while the preview is running, render to a separate folder inside the project (git-ignored): `quarto render --output-dir _check`, then delete `_check/`. (An output directory outside the project triggers Quarto warnings.)

## Deployment (GitHub Pages)
The site is built and published by [`.github/workflows/pages.yml`](.github/workflows/pages.yml). Rendered HTML is never committed; `_site/` stays git-ignored and exists only inside the workflow.

| Event | Build + validate | Deploy |
|---|---|---|
| Pull request (any branch) | yes | **no** |
| Push to a feature branch (no PR) | no workflow runs | no |
| Push / merge to `main` | yes | yes, only if the build passed |
| Manual run (Actions → Run workflow) | yes | only when run on `main` |

The `build` job installs Quarto (version pinned by `QUARTO_VERSION` in the workflow; keep it equal to the Codespaces version, `quarto --version`), runs `quarto render`, then `quarto run .github/scripts/check-site.ts _site`, which fails the job if an expected page or asset is missing, an internal link/asset/fragment does not resolve, or a catalogue page has no entries or lacks its search script. The `deploy` job `needs: build`, so a failed render or validation means nothing is published and the live site keeps its previous version.

### One-time setup (repository owner, manual)
1. Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions** (not "Deploy from a branch").
2. GitHub Pages for a *private* repository requires a paid GitHub plan; on a free plan the repository must be public. Do this only when ready to publish.
3. The repository must be named `<username>.github.io`, so the site is served at `https://<username>.github.io/` (site root; no base-path configuration needed).
4. Optional: **Settings → Environments → github-pages** already restricts deployments to `main`; leave that as is. Optionally protect `main` and require the *Build and deploy site / build* check on pull requests.
5. Until step 1 is done the `deploy` job on `main` fails at `configure-pages` ("Pages not enabled"); the build job and pull-request checks are unaffected.

### Day-to-day
Work on a feature branch, preview privately in Codespaces (above), open a pull request (the **build** check runs; nothing is published), merge to `main` → the site updates within a minute or two. Deployment history: repository **Actions** tab and **Settings → Environments → github-pages**.

### Diagnosing a failed run
Open the run in the **Actions** tab and find the failing step:
- **Render site** – a Quarto/Lua error (e.g. invalid front matter in `content/`, naming the file). Reproduce locally with `quarto render --output-dir _check`, then delete `_check/`.
- **Validate site** – the log lists each problem (missing file, unresolved link). Reproduce locally: `quarto render --output-dir _check && quarto run .github/scripts/check-site.ts _check`.
- **configure-pages / deploy-pages** – almost always Pages not enabled or the source not set to *GitHub Actions* (setup step 1), or a deployment from a branch other than `main`.
- Rendering works locally but not in CI – compare Quarto versions first.

## ORCID import (manual)

`scripts/import-orcid.ts` fetches the works listed on the ORCID profile (public API, no credentials) and caches their bibliographic metadata in `data/orcid/works.json`. It is **generated data**: nothing reads it yet, it is not part of the site, and the importer never touches `content/` (curated files).

```bash
quarto run scripts/import-orcid.ts              # iD taken from `orcid:` in _variables.yml
quarto run scripts/import-orcid.ts 0000-0000-0000-0000   # or give an iD / ORCID URL
quarto run scripts/import-orcid.ts --dry-run    # fetch and report, write nothing
```

The cache is git-ignored (a local, regenerable file; later stages will commit only small derived data if needed). Inspect it directly, e.g. `less data/orcid/works.json`. Behaviour:

- Each ORCID work record (one per `put-code`) is stored with title, type, publication date (year/month/day/text), venue, DOI (lower-cased, URL prefix removed), all external identifiers, contributors, citation text, source and created/modified times. Missing values are `null`/`[]`.
- ORCID groups records of the same work from different sources; each record carries its `group` number and `preferred-in-group` (ORCID's preferred version). Records are **not** merged or deduplicated here (Stage 7).
- Output is sorted by `put-code` and the `retrieved` timestamp changes only when the data does, so a repeat import with unchanged data leaves the file untouched.
- The import fails closed: on any network/API error or incomplete response it exits non-zero and the existing file is left as it was (the file is replaced atomically).
- It prints a short report of missing fields (no DOI, venue, contributors, ...).

## Matching ORCID works to the catalogue (manual)

`scripts/match-orcid.ts` reads the raw ORCID cache (see above) and `content/publications/`, collapses the 50-odd raw records into one line per publication, and writes **`data/publications.json`**, the one generated file that is committed (the rest of `data/` is git-ignored). It reads `content/` and never writes to it.

```bash
quarto run scripts/import-orcid.ts      # refresh the raw cache first (network)
quarto run scripts/match-orcid.ts       # rewrite data/publications.json and print a report
quarto run scripts/match-orcid.ts --dry-run   # report only
quarto run scripts/test-match.ts        # tests for the matching rules (no network)
```

Each line of `data/publications.json` has: `id` (the DOI, or a title-based id when ORCID has no DOI), `doi`, `title`, `year`, `status` (`published` | `preprint`), `venue`, `state` and `entry`, plus `also`, `stale-doi` and `note` only when relevant. There are no timestamps, put-codes or group numbers, so a re-run with no real change is byte-identical and a change to one work is a one-line diff.

- **`state`**: `matched` (a content entry has one of the work's DOIs; `entry` is its id), `new` (not in `content/`, a candidate for a new entry), `excluded` (see below).
- **Deduplication**: records are one work if ORCID grouped them or they share a DOI. A record with an arXiv id but no DOI is given the deterministic arXiv DOI (`10.48550/arxiv.<id>`).
- **Preprints**: a work with a published (non-preprint) DOI is reported under that DOI and its preprint DOIs are ignored (listed in `also`). A preprint-only work whose title equals a published work's title is merged into it. Any other preprint stays `status: preprint` until you link it with `preprint-of` in `content/overrides.yml` (the report lists these). Nothing outside ORCID is consulted.
- **`stale-doi`**: a content entry still carries a DOI that is not the work's current one (typically a preprint DOI after publication). The report lists these; updating the entry is a manual, reviewed edit.
- **Manual overrides** live in `content/overrides.yml`: `exclude` (DOIs never to propose; a preprint DOI also covers its published version) and `preprint-of` (preprint DOI -> published DOI). Entries with `exclude: true` are treated as excluded too.
- **Warnings** (printed, not fatal): works with no DOI, several published DOIs for one work, content entries whose DOI is not in the ORCID data, overrides naming unknown DOIs. Errors (exit 1, nothing written): unreadable cache, malformed overrides, duplicate ids, or two entries matching one work.
