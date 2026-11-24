# Academic portfolio — guidance for Claude Code

## Purpose
Build a minimal, maintainable personal academic portfolio using **Quarto**, developed in **GitHub Codespaces** and eventually published on **GitHub Pages**. The site showcases publications and selected software repositories as searchable catalogues. Repository READMEs and external publication pages provide the detailed documentation; this site provides concise summaries and links.

## Working principles
- **Work on one milestone at a time.** Read `PLAN.md` before making changes; implement only the current approved milestone. Stop and report before starting another.
- **Start small, test, then extend.** Keep the site renderable after each change. Use placeholder content before connecting external services.
- **Prefer Quarto's native capabilities** and simple, understandable code. Avoid unnecessary frameworks, services, abstractions and dependencies.
- **Test what you change.** At minimum, render the website and check relevant navigation/functionality. Explain anything not tested.
- **Keep development previews private.** Do not enable or configure public GitHub Pages deployment until its milestone is approved.
- **Separate automated metadata from curated content.** Never silently overwrite manually edited descriptions, tags, authorship roles, featured status, exclusions or project links.
- **Keep changes reviewable.** Make focused changes, avoid unrelated refactoring and record decisions that affect later work.
- **Do not invent publication details, credentials, affiliations or citation metrics.** Use clearly labelled placeholders until verified information is supplied or retrieved.
- **Never commit credentials or API keys.** Prefer environment secrets when those integrations are eventually introduced.
- **Keep personal metadata out of `CLAUDE.md` and `PLAN.md`.** Do not write the owner's name, email address, affiliation, profile URLs, publication details or similar personal information into these files. Keep them generic (e.g. "the site owner"); personal details belong only in the site's content/config files.

## Agreed website design
- The **Publications** catalogue is the homepage; **Software** is the other main tab.
- A compact full-width header displays name, qualifications, position and affiliation. Below it: sidebar on the left; on the right the Publications/Software tabs (current tab clearly marked, page titles not repeated as headings) above the content.
- A persistent desktop sidebar contains a short bio and links to GitHub, ORCID, Google Scholar, an institutional profile, LinkedIn, email and CV; it adapts to mobile.
- Catalogue entries stay compact: title, relevant metadata, a 1–2 sentence description, shared keywords and external links. Publication entries are collapsible cards that start collapsed (description hidden; authors shortened to first, last and the site owner in bold, with "…" between); Software entries are plain compact entries.
- Featured entries are manually pinned above regular entries. Regular entries are reverse chronological.
- One controlled keyword vocabulary is shared across both catalogues.
- Publications include preprints; manual exclusions are supported.
- Authorship roles (first, senior and corresponding where appropriate) are separate from research-topic keywords and subject to human review.
- Do not create individual project-detail pages by default. Link to original publications and repository documentation.

## Planned content and workflow (not for initial milestones)
The site is updated manually only; there are no scheduled jobs or automated PRs.
- Curated, version-controlled Markdown files hold descriptions, keywords, featured flags, authorship roles, exclusions and cross-links.
- **ORCID** is the source for publication discovery; **OpenAlex** provides citation metrics and may enrich identifiers. Do not use OpenAlex to discover additional publications independently.
- When prompted, an agent pulls ORCID and, for each new paper, creates a separate branch with a draft entry (AI-drafted description/tags and proposed authorship role). The site owner pushes and merges the PR manually. Approved text is never regenerated.
- Software repos are selected manually; AI may draft initial descriptions/tags for review.
- Bibliographic metadata changes are made on a branch and reviewed before merging.
- OpenAlex citation counts are fetched live in the browser by DOI. No cache, JSON file or build step.
- Do not add GitHub Actions automation, scheduled jobs or stored tokens for content updates (the Pages deploy workflow is the only workflow).

## Definition of done for each milestone
1. The scoped feature works and the Quarto site renders.
2. Relevant behaviour is tested (including mobile layout where applicable).
3. The README or other relevant documentation reflects how to use or maintain it.
4. Report files changed, tests run/results, unresolved issues and suggested next step.
5. Stop. Do **not** begin the next milestone without approval.

`PLAN.md` defines the sequence and acceptance criteria; if scope is unclear, ask before broadening it.
