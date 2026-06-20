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
- No backend. Contributions happen via pre-filled GitHub issues (see §12).
- The browser imports the shared vocabulary directly from `data/lib/vocab.mjs`, so that
  file must stay valid ES-module syntax usable by both Node and the browser.

## 2. Commands

```bash
npm test                 # node --test — runs every *.test.mjs (logic + data + DOM smoke)
npm run convert          # data/raw/*.txt + enrichment → data/landraces.json
npm run validate         # checks data/landraces.json against the controlled vocab
npm run serve            # python3 -m http.server 8000  (then open http://localhost:8000)
node data/normalize-writeups.mjs   # rewrites the ## Description block of every write-up
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
data/
  raw/landraces-part{1,2,3}.txt   Source text blocks (the original dataset).
  convert.mjs           Build: raw → landraces.json (the app's data file).
  validate.mjs          Validates landraces.json; validate.test.mjs runs it in CI.
  landraces.json        GENERATED. 446 records. The app fetches this at boot.
  world.geojson         Basemap polygons (simplified; see data/simplify-geojson.mjs).
  writeups/<id>.md      One Markdown write-up per strain (447 files).
  vendor-links.json     Real, curated links per id: { seed[], photo, forums[], references[] }.
  aka-generated.json    Curated alternate names per id: { id: [names] }.
  strains-to-add.json   Queue of scraped strains with no dataset match yet.
  lib/*.mjs             Pure helper modules for the pipeline (+ *.test.mjs).
  scrape-tlt.mjs, scrape-rsc.mjs   Seed-vendor sitemap matchers (enrichment).
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
| `forms.js` | All contribution forms: `openFeedbackSubmit` (Suggest Addition), `openStrainSubmit`, `openContactForm`, `openSectionSubmit` (the ⊕ buttons). Builds GitHub-issue URLs (no backend). `repoLink` helper. |
| `modal.js` | The single modal host: `openContentModal(title, fill)`, `showModal`/`closeModal`, focus trap + restore, `data-close` handling, dialog ARIA. |
| `markdown.js` | `renderMarkdown` → marked + an **allowlist sanitizer** (XSS prevention). |
| `search.js` | `filterStrains(strains, query)` — pure, tested. Searches name/aka/country/region/continent/type/category. |
| `relations.js` | `relatedStrains` — nearby / same-region / similar suggestions shown in the panel. |
| `tooltip.js` | One fast, body-anchored tooltip for any `[data-tip]` element (delegated listeners). Replaces slow native `title`. `initTooltips()` wires it once. |
| `util.js` | `isValidUrl` (http/https only), `parseWeeks`. Tested. |

**Conventions:** modules export named functions; `app.js` imports them. State lives in
`app.js`, not in the leaf modules. When a module needs to act on app state, `app.js`
passes a callback (e.g. `addMarkers(map, strains, openPanel)`).

## 6. Data pipeline (`data/`)

`raw/*.txt` → **`convert.mjs`** → `landraces.json`. `convert.mjs` splits the raw text
into blocks (tracking the current continent header), then for each block calls the pure
helpers in `data/lib/`:

- `parse.mjs` — `parseEntry(block)` → `{ name, countryRaw, regionRaw, type, height, flowering, climate, summary, incomplete }`.
- `id.mjs` — `makeUniqueId(name, seen)` → stable kebab-case id (de-duplicated).
- `category.mjs` — `normalizeCategory(type)` → one of the vernacular categories.
- `coords.mjs` — `resolveCoords({countryRaw, regionRaw, name, id})` → `{lat,lng}` from
  country centroids + region/sub-region overrides + deterministic jitter.
- `normalize.mjs` — `cleanType`, `cleanRegion` (returns `{region, note}`), `cleanClimate`
  (maps free text → a canonical climate bucket; original kept as `climateFull`).
- `taxonomy.mjs` — `deriveMorphotype`, `deriveChemotype`, `deriveDomestication`
  (McPartland & Russo scheme; see [`taxonomy-guide.md`](taxonomy-guide.md)).

`convert.mjs` also merges enrichment: `vendor-links.json` provides `seedSources`,
`photos`, `forums`, `references`; `aka-generated.json` adds alternate names. **Run
`npm run convert` whenever you change raw data, the lib helpers, or `vendor-links.json`,
then `npm run validate`.**

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

## 8. Controlled vocabulary (`data/lib/vocab.mjs`)

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
  Time — then "Location is approximate.", the disclaimer, and the write-up sections.
- **Modals** (`modal.js`): About, Database (embedded iframe), References, License, and
  every contribution form all render through `openContentModal`. Esc / backdrop / ✕
  close; focus is trapped and restored.
- **Search**: `filterStrains` for variety matches **plus** Index-heading matches
  (`headingEntries`/`matchHeadings`) so typing e.g. "Tall" or "Indica" jumps into the
  Index. Arrow-key navigation with combobox/`aria-activedescendant` semantics.

## 10. The Index (one "browse by attribute" surface)

`openIndex(target?)` renders a collapsible tree in the modal: one `<details>` facet per
`INDEX_FACETS` entry, value groups inside (one-per-line variety rows styled like the
search/facet list — name left, place right, hover highlight). Persisted expand/collapse
state in `localStorage` (`cla-index-state`) when opened with no target.

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
  (sanitized), cached per id, then **decorated** at runtime (`decorateWriteup`): wire the
  disclaimer link, insert related-variety links, fill the link sections from the record's
  arrays, and append the ⊕ add buttons. See `docs/writeup-generation-guide.md` for the
  generation rules (fixed 8-section shape, no invented URLs, honest hedging).
- Link sections (Seed Sources / Forum Discussions / References) render one entry per line;
  References uses `record.references` (falling back to seed sources). Photos render as
  thumbnails.
- **Contributions create GitHub issues, no backend.** Each form builds a pre-filled
  `issues/new?labels=…&title=…&body=…` URL and opens it via an anchor click (pop-up
  blockers killed `window.open`); an in-modal fallback link is also shown. Section ⊕
  forms use add/remove **name + link** rows and validate URLs with `isValidUrl`. Labels:
  `add request` / `update request`, and per-section `add image/seed source/forum/reference
  request`.

## 13. Security & identity (must hold)

- **Sanitize all rendered Markdown** (`markdown.js` allowlist; `SAFE_HREF = /^(https?:|mailto:|#)/i`)
  and **protocol-check dataset URLs** (`isValidUrl`) before rendering. Never relax these.
- The GitHub remote is the repo under `github.com/BrooklynCannabisCompany`
  (`cannabis-landrace-atlas`), pushed via an SSH **deploy key**. Commit author is
  "Brooklyn Cannabis Company"; contact email `BrooklynCannabis@protonmail.com`.
- **Use only the Brooklyn Cannabis Company identity for this project.** Never access GitHub
  as, or write the owner's personal account name or real name into, any commit, file, or
  issue. History was scrubbed to enforce this.

## 14. Testing

`node --test` runs every `*.test.mjs`: pure pipeline helpers (`data/lib/*.test.mjs`),
the data validator (`data/validate.test.mjs`), and browser-logic/DOM tests
(`js/search.test.mjs`, `js/relations.test.mjs`, `js/util.test.mjs`). Keep tests green;
add a test when you add a pure function. Browser-only behaviour (Leaflet, modal focus) is
verified manually / via devtools, not in `node --test`.

## 15. Conventions & gotchas

- **Re-run `npm run convert` after editing raw data, `data/lib/*`, or `vendor-links.json`**
  — `landraces.json` is generated, never hand-edited.
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
