# Implementation guide

How **The Cannabis Landrace Atlas** is built, for anyone (including future Claude
sessions) working on it. Read this first; it explains the architecture, the data
pipeline, and the conventions that keep edits safe.

---

## 1. What it is

A **static, no-build, no-backend** world map of cannabis landraces. Plain ES-module
JavaScript, CSS, and HTML served as files — open `index.html` over HTTP and it runs.
There is **no bundler, no framework, no transpile step**. Vendored libraries live in
`lib/`. The dataset is a pre-generated JSON file plus per-variety Markdown write-ups.

**Hard constraints (do not break):**
- No build step. Don't introduce one. Browser loads `js/*.js` as native ES modules.
- The site itself has no backend. Visitor submissions POST to a small Cloudflare Worker
  (`worker/`, see §12) that files a GitHub issue on the project's behalf — it is the only
  server-side code and deploys separately from Pages.
- The browser imports the shared vocabulary directly from `data/vocab.mjs`, so that
  file must stay valid ES-module syntax usable by both Node and the browser. Runtime files
  live directly in `data/`; the pipeline tooling lives in `data/build/` (see §6).

## 2. Commands

```bash
npm test                 # node --test — runs every *.test.mjs (logic + data + DOM smoke)
npm run validate         # checks data/landraces.json against the controlled vocab
npm run serve            # python3 -m http.server 8000  (then open http://localhost:8000)
node data/build/normalize-writeups.mjs   # rewrites the ## Description block of every write-up
cd worker && npx wrangler deploy   # deploys the submission Worker (see worker/README.md)
```

There are no runtime dependencies and `devDependencies` is empty — tests use only the
Node built-in test runner.

## 3. Repository layout

```
index.html              Single page: ribbon + map + panel + modal host.
css/styles.css          All styles (one file). CSS variables in :root.
js/                     Browser ES modules (see §5).
lib/                    Vendored libs: leaflet/ (1.9.4) and marked (v12). Not edited.
assets/leaf.svg         The shared green leaf marker graphic.
data/                   RUNTIME ONLY — what the browser fetches/imports.
  landraces.json        The CANONICAL dataset — edited directly. The app fetches it at boot.
  world.geojson         Basemap polygons (simplified; see data/build/simplify-geojson.mjs).
  writeups/<id>.md      One Markdown write-up per strain (447 files).
  vocab.mjs             Controlled vocabularies — imported by the browser AND the validator.
  build/                PIPELINE TOOLING — never fetched at runtime (§6).
    raw/landraces-part{1,2,3}.txt   Source text blocks (historical provenance only).
    convert.mjs         One-time bootstrap raw → ../landraces.json. NOT re-run (§6).
    validate.mjs        Validates ../landraces.json; validate.test.mjs runs it in CI.
    vendor-links.json   Real, curated links per id: { seed[], photo, forums[], references[] }.
    aka-generated.json  Curated alternate names per id: { id: [names] }.
    strains-to-add.json Queue of scraped strains with no dataset match yet.
    lib/*.mjs           Pure helper modules for the pipeline (+ *.test.mjs).
    scrape-tlt.mjs, scrape-rsc.mjs   Seed-vendor sitemap matchers (enrichment).
worker/
  src/index.js          Cloudflare Worker: verifies a Turnstile token, files the GitHub
                        issue. Deployed separately (`wrangler deploy`); holds the secrets.
  wrangler.toml         Worker config. README.md has the one-time setup + deploy steps.
docs/
  implementation-guide.md         This file.
  writeup-generation-guide.md     Rules for generating data/writeups/*.md.
  reports/                         Point-in-time review reports (code, UX, taxonomy).
```

## 4. Runtime architecture (boot + data flow)

`js/app.js` is the orchestrator. At the bottom it calls `initTooltips()` then `boot()`:

1. `boot()` fetches `data/landraces.json` and `data/world.geojson` in parallel.
2. `createMap('map', world, closePanel)` builds the Leaflet map (GeoJSON basemap, no
   tiles) and the zoom + reset controls.
3. `addMarkers(map, strains, openPanel)` places one marker per strain (declustered, §11)
   and returns `markersById` (id → Leaflet marker).
4. User interactions flow through `app.js`: clicking a marker or a search result →
   `openPanel(strain)`; clicking a fact/badge → `openFacet` → `openIndex` (§10); menu →
   the modal openers.

On any fetch failure the map element shows "Unable to load map data." (graceful).

## 5. Browser modules (`js/`)

| Module | Responsibility |
|---|---|
| `app.js` | Orchestrator: boot, panel open/close, search, the Index, all hamburger-menu screens (About/Database/References/License), facet→Index routing, global keys. Holds module state (`strains`, `map`, `markersById`, `currentId`). |
| `map.js` | Leaflet setup, leaf + selected icons, marker **declustering** (sunflower spiral), `flyToStrain`, `setMarkerSelected`, reset/zoom controls + their tooltips. |
| `panel.js` | Renders the variety panel header: title, place, the two classification **badges** (morphotype + vernacular type) and the trait rows (`facetRow`). Holds the tooltip definition maps (`MORPHOTYPE_DEF`, `CHEMOTYPE_DEF`, `DOMESTICATION_DEF`, `CATEGORY_DEF`). |
| `forms.js` | All contribution forms: `openFeedbackSubmit` (Suggest Addition), `openStrainSubmit`, `openContactForm`, `openSectionSubmit` (the ⊕ buttons). Each mounts a Turnstile widget (`mountTurnstile`) and POSTs `{label, title, body, turnstileToken}` to the Worker (`submitIssue` → `WORKER_URL`), then shows a thank-you (`showSubmitSuccess`). `repoLink` helper. |
| `modal.js` | The single modal host: `openContentModal(title, fill)`, `showModal`/`closeModal`, focus trap + restore, `data-close` handling, dialog ARIA. |
| `markdown.js` | `renderMarkdown` → marked + an **allowlist sanitizer** (XSS prevention). |
| `search.js` | `filterStrains(strains, query)` — pure, tested. Searches name/aka/country/region/continent/type/category. |
| `relations.js` | `relatedStrains` — nearby / same-region / similar suggestions shown in the panel. |
| `tooltip.js` | One fast, body-anchored tooltip for any `[data-tip]` element (delegated listeners). Replaces slow native `title`. `initTooltips()` wires it once. |
| `util.js` | `isValidUrl` (http/https only), `parseWeeks`. Tested. |

**Conventions:** modules export named functions; `app.js` imports them. State lives in
`app.js`, not in the leaf modules. When a module needs to act on app state, `app.js`
passes a callback (e.g. `addMarkers(map, strains, openPanel)`).

## 6. Data pipeline (`data/build/`) — one-time bootstrap, historical

> **Layout:** runtime files (`landraces.json`, `world.geojson`, `writeups/`, `vocab.mjs`)
> live directly in `data/`; everything that *builds* the dataset lives in **`data/build/`**.
> The build paths below are relative to `data/build/`, and the scripts reach the runtime
> files via `../` (e.g. `convert.mjs` writes `../landraces.json`).
>
> **`data/landraces.json` is the canonical dataset and is edited directly.** The pipeline
> below ran **once** to bootstrap it from `build/raw/*.txt`; it is kept as provenance. **Do not
> re-run `data/build/convert.mjs`** (the `convert` npm script has been removed) — `landraces.json`
> has since accumulated direct edits and enrichment that `convert` would overwrite. After editing
> `landraces.json`, run `npm run validate`. (`data/build/` is not a live path.)

How the bootstrap worked: `build/raw/*.txt` → **`build/convert.mjs`** → `landraces.json`.
`convert.mjs` split the raw text into blocks (tracking the current continent header), then for
each block called the pure helpers in `data/build/lib/`:

- `parse.mjs` — `parseEntry(block)` → `{ name, countryRaw, regionRaw, type, height, flowering, climate, summary, incomplete }`.
- `id.mjs` — `makeUniqueId(name, seen)` → stable kebab-case id (de-duplicated).
- `category.mjs` — `normalizeCategory(type)` → one of the vernacular categories.
- `coords.mjs` — `resolveCoords({countryRaw, regionRaw, name, id})` → `{lat,lng}` from
  country centroids + region/sub-region overrides + deterministic jitter.
- `normalize.mjs` — `cleanType`, `cleanRegion` (returns `{region, note}`), `cleanClimate`
  (maps free text → a canonical climate bucket; original kept as `climateFull`).
- `taxonomy.mjs` — `deriveMorphotype`, `deriveChemotype`, `deriveDomestication`
  (McPartland & Russo scheme; see [`taxonomy-guide.md`](taxonomy-guide.md)).

`convert.mjs` also merged enrichment at bootstrap: `vendor-links.json` provided
`seedSources`, `photos`, `forums`, `references`; `aka-generated.json` added alternate names.
Those enrichment files (and `data/build/lib/*`) are historical — changing them no longer affects
`landraces.json`, which is now maintained directly.

`validate.mjs` asserts every record's `continent/climate/morphotype/chemotype/
domestication/category` is in the controlled vocab and coords resolve; warnings are
non-fatal. `validate.test.mjs` runs it under `node --test`.

**Enrichment scrapers** (`scrape-tlt.mjs`, `scrape-rsc.mjs`) read vendor sitemaps and
conservatively match products to existing strains (exact/name-prefix, excluding crosses),
writing into `vendor-links.json`; unmatched go to `strains-to-add.json`.

## 7. Data model (one record in `landraces.json`)

```jsonc
{
  "id": "durban-basin",            // stable, unique
  "name": "Durban basin",
  "aka": ["Durban Poison"],
  "continent": "Africa",            // == "Region" facet
  "country": "South Africa",
  "region": "KwaZulu-Natal",
  "lat": -29.0, "lng": 31.0,
  "coordsApproximate": true,
  "type": "Sativa landrace",        // free-text descriptor (display)
  "category": "Sativa",             // controlled vernacular type (one of 7)
  "morphotype": "Narrow-Leaf Drug", // derived
  "chemotype": "I", "chemotypeInferred": true,
  "domestication": "Domesticated",  // derived
  "height": "Tall",
  "flowering": "9–11 weeks",
  "climate": "Tropical Highland",   // canonical bucket
  "climateFull": "tropical highland", // original wording (lossless)
  "summary": "…",
  "seedSources": [{ "vendor": "...", "product": "...", "url": "..." }],
  "photos": ["https://…"],
  "forums":   [{ "label": "...", "url": "https://…" }],
  "references": [{ "label": "...", "url": "https://…" }]
}
```

## 8. Controlled vocabulary (`data/vocab.mjs`)

Single source of truth, **imported by both Node (validation) and the browser (Index
facets, forms)**. Arrays are in display order: `CONTINENTS`, `CLIMATES`, `MORPHOTYPES`,
`CHEMOTYPES`, `DOMESTICATIONS`, `CATEGORY_ORDER` (the 7 vernacular types: Hemp, Sativa,
Indica, Mixed, Hybrid-Intermediate, Ruderalis, Feral), `HEIGHTS`. To add/rename a value,
edit it **here only**, then re-validate.

## 9. UI surfaces

- **Ribbon** (`index.html` header): hamburger `☰` (menu), wordmark, search group
  (Index icon button + search input), and two icon buttons — **+** (Suggest Addition)
  and ✉ (Contact Us), each with a `data-tip` tooltip. On screens ≤860px the two icon
  buttons are hidden and reached via the hamburger instead (the ribbon collapses to one
  row); the hamburger lists About, Index, Database, References, License, Suggest
  Addition, Contact Us.
- **Map + panel**: map fills the viewport; selecting a variety slides in the right
  **panel** (`body.panel-open`). On ≤860px the panel becomes a bottom sheet.
- **Panel content order** (matches the Index facet order): title, place, badges
  (Morphotype + vernacular Type, both purple, clickable, with tooltips), then trait rows
  — AKA, Region, Climate, Chemotype, Domestication, Type (vernacular), Height, Flowering
  Time — then "Location is approximate." and the write-up sections. (Write-ups are
  AI-generated drafts; that caveat lives in the README, not in every panel.)
- **Modals** (`modal.js`): About, Database (embedded iframe), References, License, the Index,
  and every contribution form render through `openContentModal(title, build, opts)`; focus is
  trapped and restored. `opts` toggles modal classes:
  - `persistent` (forms) — close **only via ✕** (or a successful submit), so a stray backdrop
    click / Esc can't discard a half-filled form (`isModalPersistent` gates the Esc/backdrop
    handlers). Implies `headbar` + `divider`.
  - `headbar` (forms + Index) — the shared "pinned title + ✕ over a scrolling **body**" layout:
    the card is a non-scrolling flex column (so the absolute ✕ stays put) and the side padding
    (`--pad-x`) lives on the title + body, which puts the body's scrollbar in the right-hand
    gutter instead of over the fields.
  - `divider` (forms + About / License / References, **not** Index/Database) — a full-bleed line
    under the title bar.
  - `indexHeaders` (Index) — `headbar` + sticky H1/H2 section headers (§10).
  Read-only non-headbar modals (About/License/References/Database) close on Esc / backdrop / ✕
  and scroll the whole card.
- **Responsive**: form/Index dialogs hold the location map, a dual-thumb slider, and a Turnstile
  widget (~300px wide). The card width and `--pad-x` adapt at the ≤520px (phone) breakpoint —
  wider card (94vw), smaller padding (16px) — so the widget and map fit without horizontal
  overflow; the title divider and body gutter both track `--pad-x`. Inputs / selects / textareas
  are full-width; tablet (≤860px) uses the 460px-capped card unchanged.
- **Search**: `filterStrains` for variety matches **plus** Index-heading matches
  (`headingEntries`/`matchHeadings`) so typing e.g. "Tall" or "Indica" jumps into the
  Index. Arrow-key navigation with combobox/`aria-activedescendant` semantics.

## 10. The Index (one "browse by attribute" surface)

`openIndex(target?)` renders a collapsible tree in the modal: one `<details>` facet per
`INDEX_FACETS` entry, value groups inside (one-per-line variety rows styled like the
search/facet list — name left, place right, hover highlight). Persisted expand/collapse
state in `localStorage` (`cla-index-state`) when opened with no target.

**Sticky section headers** (`indexHeaders` / `.modal.index-sticky`): as you scroll, the
current facet header (H1, `summary.index-h1`) pins just below the pinned title, and the current
value-group header (H2, `summary.index-h2`) pins below the H1 — via `position: sticky` (H1 at
`top:0` of the scrolling body, H2 at `top: var(--idx-h1-h)`). Each is confined to its own
`<details>`, so the next header pushes the previous one out. `openIndex` measures the rendered
H1 height into `--idx-h1-h` for the H2 offset.

**Facets are the single filtering surface.** Clicking a panel fact or badge calls
`openFacet(field, token)`, which maps the data field → its Index heading (`FIELD_TO_INDEX`)
and calls `openIndex({facet, value})` — opening the Index scrolled to that node, others
folded (same path as a search jump). There is no separate flat list.

Two facets are not value-group lists:
- **Height** → `buildHeightChecks`: a checkbox per named height (all on by default;
  arriving from a Height fact checks only that one).
- **Flowering Time** → `buildFloweringSlider`: a dual-thumb weeks slider
  (`makeDualSlider`) with value **bubbles** above each thumb, a minimum 1-week gap (the
  thumbs can never coincide), and presets to the clicked variety's range. The Index
  heading shows "Flowering Time (weeks)".

## 11. Markers & declustering (`map.js`)

Each strain is one Leaflet marker using a **`divIcon`** (so the inner `<img>` can scale
on hover without disturbing Leaflet's positioning transform). Many varieties share an
approximate centroid, so `declusterPositions` fans each pile onto a deterministic
**sunflower (phyllotaxis) spiral** with geographic (degree-based) spacing — leaves spread
apart as you zoom in and only overlap at low zoom. `SPREAD_DEG`/`CLUSTER_EPS` are tuned so
neighbours clear the icon at max zoom (z7). The selected marker is a purple circle with a
centered white leaf-fan (drawn inline, no stem). `flyToStrain` centres on the declustered
position.

## 12. Write-ups & contributions

- Write-ups (`data/writeups/<id>.md`) are loaded on demand, rendered with `markdown.js`
  (sanitized), cached per id, then **decorated** at runtime (`decorateWriteup`): insert
  related-variety links, fill the link sections from the record's arrays, and append the ⊕
  add buttons. See `docs/writeup-generation-guide.md` for the
  generation rules (fixed 8-section shape, no invented URLs, honest hedging).
- Link sections (Seed Sources / Forum Discussions / References) render one entry per line;
  References uses `record.references` (falling back to seed sources). Photos render as
  thumbnails.
- **Contributions go through the Worker — no GitHub account needed.** Each form mounts a
  Cloudflare Turnstile widget and, on submit, POSTs `{ label, title, body, turnstileToken }`
  to the Worker (`WORKER_URL`), which verifies the token and files the labeled issue on the
  project's behalf, then shows a thank-you. The created issue is intentionally **not** linked
  back to the visitor (most don't use GitHub). Section ⊕ forms use add/remove **name + link**
  rows and validate URLs with `isValidUrl`. Labels: `add request` / `update request`, and
  per-section `add image/seed source/forum/reference request`. See `worker/README.md` for
  setup/deploy.
- **Add/Correction form controls** (`buildSubmissionForm`, `SUBMIT_FIELDS`): selects for the
  controlled-vocab fields (Height too — a fixed scale; a non-vocab existing value is preserved
  as an extra option), a Country **combobox** (`datalist` of the dataset's countries, set by
  app.js via `setCountryOptions`, free text allowed), the Flowering Time **dual-thumb slider**
  (shared `js/slider.js`; full span = unspecified), and a **location picker** map (`locationPicker`,
  tile-free GeoJSON base, click/drag a leaf; `fitWorld` when no coords). In **correct** mode only,
  edited fields are flagged (`highlightChanges`): the field label turns green, and free-text
  fields get an inline word-level diff overlay painting added/changed words green
  (`attachTextDiff` — a backdrop behind a transparent-text field). lat/lng have their own green
  Lat/Lng labels.

## 13. Security & identity (must hold)

- **Sanitize all rendered Markdown** (`markdown.js` allowlist; `SAFE_HREF = /^(https?:|mailto:|#)/i`)
  and **protocol-check dataset URLs** (`isValidUrl`) before rendering. Never relax these.
- **Submission Worker (`worker/`):** the GitHub token and Turnstile secret are Cloudflare
  Worker secrets (`wrangler secret put`) — never in the repo or the static site. The Worker
  verifies the Turnstile token server-side, restricts CORS to the Pages origin, and only
  accepts the known issue labels. The GitHub token should be minimally scoped (issues on the
  one repo). The Turnstile **site key** in `js/forms.js` is public by design.
- The GitHub remote is the repo under `github.com/BrooklynCannabisCompany`
  (`cannabis-landrace-atlas`), pushed via an SSH **deploy key**. Commit author is
  "Brooklyn Cannabis Company"; contact email `BrooklynCannabis@protonmail.com`.
- **Use only the Brooklyn Cannabis Company identity for this project.** Never access GitHub
  as, or write the owner's personal account name or real name into, any commit, file, or
  issue. History was scrubbed to enforce this.

## 14. Testing

`node --test` runs every `*.test.mjs`: pure pipeline helpers (`data/build/lib/*.test.mjs`),
the data validator (`data/build/validate.test.mjs`), and browser-logic/DOM tests
(`js/search.test.mjs`, `js/relations.test.mjs`, `js/util.test.mjs`). Keep tests green;
add a test when you add a pure function. Browser-only behaviour (Leaflet, modal focus) is
verified manually / via devtools, not in `node --test`.

## 15. Conventions & gotchas

- **Edit `data/landraces.json` directly, then `npm run validate`.** It is the canonical
  dataset; `data/build/convert.mjs` was a one-time bootstrap and must **not** be re-run (§6).
- Add a controlled value in `vocab.mjs` only; the browser and validator both read it.
- Range sliders: `makeDualSlider(absMin, absMax, onChange, initLo, initHi, minGap, fmt)`.
  Bubbles are inset-corrected to track the native thumb; keep `minGap ≥ 1` where thumbs
  must not coincide.
- The shared tooltip is opt-in via `data-tip`; don't add slow native `title` for the same
  element (you'd get two tooltips).
- Marker visuals: scale the **inner** `.leaf-img`, never the marker root (Leaflet owns its
  `transform`).
- Deployment is **GitHub Pages** from the repo; it's a static site, so a push deploys.

## 16. Companion docs

- [`taxonomy-guide.md`](taxonomy-guide.md) — how varieties are classified (morphotype,
  chemotype, domestication, vernacular type) and the McPartland & Russo rationale.
- [`writeup-generation-guide.md`](writeup-generation-guide.md) — rules for generating
  `data/writeups/*.md`.
