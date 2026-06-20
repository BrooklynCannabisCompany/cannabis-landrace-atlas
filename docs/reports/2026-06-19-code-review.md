# Code review — The Cannabis Landrace Atlas

**Date:** 2026-06-19 · **Scope:** full source (`index.html`, `js/*.js`, `data/**/*.mjs`, `css/styles.css`). **Status:** review only — no code changed. Findings are prioritized; nothing here is a release blocker.

## Summary

The codebase is clean, dependency-free, and well-organized for a no-build static app. Pure logic (parsing, geocoding, search, relations, taxonomy, validation) is factored into ES modules with `node --test` coverage (42 tests pass). The browser/DOM layer is built with safe `textContent`/`createElement` patterns almost everywhere. The main risks are (1) unsanitized Markdown given the community-contribution model, (2) duplicated controlled vocabularies, and (3) `js/app.js` having grown into a 1,064-line catch-all. None are urgent; addressing them will keep the project maintainable as it opens to contributors.

## Strengths

- **No build step, no runtime third-party calls** (except the explicitly-sandboxed Database iframe). Vendored Leaflet/marked.
- **Pure logic is unit-tested** and shared between browser and Node.
- **Safe DOM construction**: values are set via `textContent`; the one templated `innerHTML` (`openListModal`) uses a static string then fills with `textContent`.
- **Good async hygiene**: `loadWriteup` guards against race conditions with `reqId !== currentId`.
- **Submission flow is correct for a static site**: pre-filled issue URLs opened via anchor click + in-modal fallback; URL inputs validated.

---

## High

**H1. Markdown is rendered without sanitization (`js/markdown.js`, `js/panel.js:setWriteupHtml`).**
`renderMarkdown` calls `marked.parse(...)` and the result is assigned via `writeup.innerHTML`. marked v12 does **not** sanitize, so any raw HTML in a write-up `.md` (e.g. `<img src=x onerror=...>`, `<script>`) executes. Today write-ups are first-party, but `CONTRIBUTING.md` invites community write-up PRs — a malicious or careless `.md` becomes stored XSS the moment it's merged and served.
→ **Recommendation:** sanitize after parsing (vendip a small DOMPurify and run `DOMPurify.sanitize(html)`), **or** strip/escape raw HTML at generation time and add a CI check that write-ups contain no raw HTML tags. At minimum, document "no raw HTML in write-ups" and enforce it in review. Defense-in-depth: add a `Content-Security-Policy` (e.g. via `<meta http-equiv>`) disallowing inline/external scripts beyond the vendored libs.

## Medium

**M1. Rendered link/image URLs from the dataset aren't protocol-checked (`js/app.js:fillLinkSections`, ~151–157).**
`a.href = it.img || it.url` and `im.src = it.img` come from `landraces.json` (vendor-scraped). A `javascript:` or `data:` URL in that data would be an injection vector. First-party data lowers the risk, but the data is also community-editable via PRs.
→ **Recommendation:** reuse the `isValidUrl` helper (already in `app.js`) to require `http:`/`https:` before assigning `href`/`src`; skip or flag anything else.

**M2. Controlled vocabularies are duplicated in 5+ places.**
The morphotype / chemotype / domestication / category / climate / continent lists appear in `js/app.js` (`SUBMIT_OPTIONS` and `INDEX_FACETS`), `js/panel.js` (`MORPHOTYPE_DEF`, `CHEMOTYPE_DEF`, `DOMESTICATION_DEF`), `data/validate.mjs`, and `data/lib/taxonomy.mjs`. Adding/renaming a value (e.g. a new climate bucket) requires synchronized edits across files and is easy to get wrong.
→ **Recommendation:** create one shared `data/lib/vocab.mjs` exporting the canonical arrays/sets and import it in both the browser (app/panel) and Node (validate/taxonomy/convert). The Index display order and the panel tooltips can layer on top of the shared source.

**M3. Modals lack focus management / dialog semantics (`js/app.js:openContentModal`, `openListModal`, `openModal`).**
Opening a modal doesn't move focus into it, doesn't trap Tab, and closing doesn't restore focus to the trigger. `#modal` has no `role="dialog"`/`aria-modal="true"`. Keyboard and screen-reader users can tab "behind" the modal. (Escape-to-close is implemented — good.)
→ **Recommendation:** set `role="dialog" aria-modal="true"` and an `aria-labelledby` pointing at `#modal-title`; on open, focus the first control or the close button; on close, return focus to the opener; trap Tab within the modal while open.

**M4. Search results have no arrow-key navigation (`js/app.js:showResults`, input keydown ~305).**
Results are `role="option"` and individually focusable, and Enter on the input picks the top match, but there's no ↑/↓ to move through the listbox, and the input lacks `role="combobox"` + `aria-activedescendant`. This is the expected pattern for an autocomplete.
→ **Recommendation:** add ArrowUp/Down handling that moves an `aria-activedescendant` highlight and selects on Enter; wire `role="combobox"`/`aria-expanded` on the input.

**M5. `js/app.js` is a 1,064-line module doing too much.**
It owns the panel, write-up post-processing, search, facet filtering, the modal system, the Index (facets + sliders + heading search), all submission/contact/section forms, the hamburger menu, global key handling, and boot.
→ **Recommendation:** split into focused modules, e.g. `forms.js` (Add/Correction/Contact/Section + `openIssue`/fallback), `index-view.js` (INDEX_FACETS, sliders, headings), `modal.js` (open/close/content/list + a11y from M3), `menu.js`. This also makes pieces independently testable and shrinks each file to something easy to hold in context.

## Low / minor

- **L1. Dead code:** `openModal` (`app.js:316`) is no longer referenced — remove it.
- **L2. DRY:** `headText()` exists (`app.js:95`) but `fillLinkSections` (~141) re-inlines the same `firstChild` logic, and `decorateWriteupSections`/`insertRelated` match section titles with bare `h.textContent.trim()`. Use `headText` consistently so a stray child node can't break matching.
- **L3. Write-up isn't cached:** re-opening the same variety re-`fetch`es its `.md`. Browser HTTP cache covers most of it; a small in-memory `Map<id, html>` would make re-selection instant. Minor.
- **L4. Initial payload:** `data/world.geojson` (~3.4 MB) loads up front. Acceptable for a static map and well-compressed over HTTP, but worth keeping an eye on; a lower-resolution basemap or simplification pass would cut first-paint cost if it ever matters.
- **L5. `References` and `Seed Sources` panel sections render the same vendor links** (`SECTION_DATA`, ~133–138). Intentional today, but as real references accrue these should diverge.
- **L6. Tooltip a11y:** the custom tooltip (`tooltip.js`) is `aria`-invisible; consider linking it to its trigger with `aria-describedby` so screen readers announce the definition.
- **L7. No automated check for the DOM layer.** Pure logic is tested; the browser glue (forms, Index, panel post-processing) is verified manually. A lightweight smoke test (jsdom or Playwright) over the critical flows would catch regressions the unit tests can't.

## Suggested order

1. **H1** + **M1** (security; cheap and high-value before going public).
2. **M2** (vocab module) — unblocks safer edits everywhere.
3. **M3/M4** (modal + autocomplete a11y).
4. **M5** + **L1/L2** (refactor `app.js`; remove dead code) — best done as one pass.
5. **L3–L7** opportunistically.
