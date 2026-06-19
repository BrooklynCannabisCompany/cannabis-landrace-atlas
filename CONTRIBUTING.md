# Contributing to The Cannabis Landrace Atlas

Thank you for your interest in improving the Atlas. This document covers everything you need to make a clean, reviewable submission.

---

## Scope

Contributions welcome in these areas:

- **Data corrections** — fixing strain names, coordinates, categories, or metadata in `data/raw/` or `data/landraces.json`.
- **New strains** — adding well-documented landraces or heirloom varieties with real sources.
- **Write-up improvements** — correcting or expanding the per-strain Markdown files in `data/writeups/`.
- **Code improvements** — bug fixes, search logic, map rendering, UI/UX, tooling.
- **Documentation** — improving these docs (but keep it proportionate).

---

## Rules

### 1. Separate data and code submissions

Data changes (`data/`) and code changes (everything else) **must be in separate pull requests** — never mixed in the same PR. This makes reviews cleaner and keeps git history easier to audit.

### 2. Size limit — at most 200 changed lines per submission

Keep each PR focused. If your work touches more than 200 lines, split it into smaller logical units and submit them as separate PRs. Large, sprawling diffs are hard to review and error-prone.

### 3. Description and testing evidence

Every submission needs:

- A **clear, complete description** of what was changed and why.
- **Evidence of testing** appropriate to the change:
  - For data or logic changes: paste the full output of `npm test` and/or `npm run validate`.
  - For UI changes: include a screenshot or a written manual-test note describing what you clicked and what you observed.

### 4. Credit your sources

Any data you add — coordinates, links, references, facts in write-ups — must cite a **real, verifiable source**. Do not invent URLs or citations. If you cannot find a reliable source for something, note that uncertainty explicitly rather than filling in a guess.

### 5. Write-up guidelines

Write-ups must follow the process described in [`docs/writeup-generation-guide.md`](docs/writeup-generation-guide.md).

In brief:
- Prose-only AI drafts may be added as starting points.
- **Link sections must contain only real, verified links** — no AI-hallucinated URLs.
- Every factual claim that can be sourced should be sourced.

### 6. Review any AI-generated work yourself

You are required to have personally reviewed any AI-generated code you are submitting. AI assistance is welcome, but you are responsible for every line in your submission — read it, understand it, and verify it works before opening a PR. The same applies to AI-generated data and write-ups: check the facts and sources yourself.

---

## GitHub issues and the Submit buttons

The in-app **Submit** buttons are currently placeholders. Once the project has a public GitHub repository, they will open pre-filled GitHub issue templates — one for new strain submissions and one for corrections. Those templates will mirror the requirements above (description, sources, test output) to guide contributors at the point of entry.

Until then, open issues or pull requests manually on GitHub following the guidelines in this document.

---

## Quick checklist

Before submitting, confirm:

- [ ] Data and code changes are in **separate** PRs.
- [ ] PR is **under 200 changed lines**.
- [ ] PR description explains the change clearly.
- [ ] `npm test` output is pasted (data/logic changes).
- [ ] `npm run validate` output is pasted (dataset changes).
- [ ] All sources are real and cited.
- [ ] Write-ups follow `docs/writeup-generation-guide.md`.
