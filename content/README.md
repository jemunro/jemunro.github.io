# Content files

One Markdown file per catalogue entry. The pages render whatever is here; **adding, editing or removing an entry never needs a change to `index.qmd`, `software.qmd`, `styles.scss` or the Lua code.**

```
content/publications/<slug>.md   → Publications (homepage)
content/software/<slug>.md       → Software
```

Each file is YAML front matter (structured fields) plus a short Markdown body (the 1–2 sentence description shown in the list). Files whose names start with `_` or `.` and non-`.md` files (such as this README) are ignored.

## Two kinds of field
- **Bibliographic / source fields** (`title`, `doi`, `authors`, `date`, `venue`, `status`, `github`): facts that a later ORCID/OpenAlex/GitHub integration may refresh.
- **Curated fields** (`featured`, `roles`, `tags`, `exclude`, `related-*`, and the Markdown body): edited by hand. Automation must never overwrite them.

Planned separation: future importers write to a separate generated location (e.g. `data/`), never into these files' curated fields; any change to bibliographic fields goes through review. Nothing is imported yet.

## Publication fields (`content/publications/`)
| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable internal ID, unique within publications. Never change it after the entry exists; other files refer to it. |
| `title` | yes | Title (quote it if it contains `:`). |
| `doi` | yes | DOI without the `https://doi.org/` prefix. The title and venue link use it. |
| `authors` | no | List of names, shown as given. A collapsed card shows the first author, the last author and the site owner (bold) with "…" for omitted authors; lists of three or fewer are shown in full, and an open card shows everyone. The owner is recognised by surname and first initial of `name` in `_variables.yml`, so "Jacob Munro", "J. E. Munro" etc. all match. |
| `date` | no | `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. Only the year is displayed; the full value orders entries (a missing month/day sorts as the latest of that period). |
| `venue` | no | Journal or server (e.g. `bioRxiv`); shown on the card as the link to the paper (via the DOI), e.g. "bioRxiv preprint" or "iScience". |
| `status` | no | `preprint` (adds "preprint" after the venue) or `published` (default). |
| `featured` | no | `true` pins the entry above regular entries and adds the gold marker. |
| `roles` | no | List from `first`, `senior`, `corresponding`, `coauthor`. `first`/`senior`/`corresponding` show as a gold chip at the start of the keyword row, clickable like a keyword (several may apply); `coauthor` is the default and shows none. Subject to human review. |
| `tags` | no | Keyword list. Use the shared vocabulary (spelling must match the other entries). |
| `related-software` | no | List of software `id`s. Each adds a GitHub link taken from that software entry. |
| `exclude` | no | `true` hides the entry (and links to it from software) without deleting the file. |

## Software fields (`content/software/`)
| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable internal ID, unique within software. |
| `title` | yes | Display name. |
| `github` | yes | Repository URL (the "GitHub" link in the card's meta line). |
| `date` | no | Used for ordering only (newest first). Not displayed. |
| `featured`, `tags`, `exclude` | no | As for publications. |
| `related-publications` | no | List of publication `id`s. Each adds a link to that paper (labelled with its venue). |

Order: featured entries first, then publications newest `date` first and software alphabetically. Visitors can also search, filter by keyword and re-sort in the browser; keywords are derived from the `tags` of the entries (matched case-insensitively), so there is no separate keyword list.

## Example: add a publication
Create `content/publications/my-paper.md`:

```markdown
---
id: my-paper
title: "A Title: With a Subtitle"
doi: 10.1234/example.5678
authors: [A. Author, B. Author]
date: 2027-03
venue: Example Journal
status: published
featured: false
roles: [corresponding]
tags: [Nextflow]
related-software: [my-tool]
---

One or two sentences describing the paper in plain language.
```

If it has a repository, add `content/software/my-tool.md` with `id: my-tool`, `github: https://github.com/…` and `related-publications: [my-paper]`. Then render. Bad input fails the build with a message naming the file (missing `id`/`title`/`doi`/`github`, duplicate `id`, unknown `role` or `status`); an unknown related ID produces a warning.

To remove an entry delete its file, or set `exclude: true` to keep it but hide it.

## Preview
`quarto preview` only watches page files: after editing a content file, save `index.qmd` or `software.qmd` (or restart the preview) to refresh. Do not run a plain `quarto render` during a preview (see `DEVELOPMENT.md`).

## Overrides for the ORCID matcher
`content/overrides.yml` (not an entry) is read by `scripts/match-orcid.ts`: `exclude` lists DOIs that must never be proposed as new publications, and `preprint-of` links a preprint DOI to its published DOI when ORCID does not group them. It is curated by hand. See `DEVELOPMENT.md` ("Matching ORCID works to the catalogue").

## Keyword vocabulary
The shared vocabulary for both catalogues is [`keywords.yml`](keywords.yml): fields and diseases, data and methods, and programming languages (currently Nextflow and R). Entries' `tags` must use its spellings exactly (sentence case); to add a keyword, add it to `keywords.yml` first. Nothing validates tags against it yet. It was proposed from the titles of the publications found on ORCID and is for the site owner to edit.

The sidebar "Keywords" list (below Profiles) is built from `keywords.yml`, in file order. Every keyword is a clickable filter with a count of the entries on the current page (0 if none).
