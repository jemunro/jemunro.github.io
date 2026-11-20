# Site development notes

## Preview and build
- Preview (private in Codespaces): `quarto preview --port 4200 --host 0.0.0.0 --no-browser`, then open forwarded port 4200 from the Ports tab. Keep its visibility **Private**.
- Build: `quarto render` (output in `_site/`, git-ignored).

## Updating profile details
All profile text lives in [`_variables.yml`](_variables.yml): name, qualifications, position, affiliation, research focus, bio and profile links. Pages use `{{< var ... >}}`; never retype these values in `.qmd` files.

**Profile links** are rendered by the `profile-links` shortcode ([`_extensions/profile/`](_extensions/profile/profile-links.lua)). A link shows only if its key exists in `_variables.yml`. Supported keys, in display order: `github`, `orcid`, `scholar`, `wehi`, `linkedin`, `email` (plain address; `mailto:` is added), `cv`. Delete a key to hide the link.

## Structure
- `_quarto.yml` — light/dark themes, render scope. (Quarto navbar is not used: the top bar is `_partials/header.qmd`; tabs come from the `site-tabs` shortcode in `_extensions/profile/site-tabs.lua` — add a line there for a new page.)
- `_partials/header.qmd`, `_partials/sidebar.qmd` — shared header and sidebar, included by each page.
- `styles.scss` — layout (sticky sidebar on ≥992px, stacked on narrow screens).
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
