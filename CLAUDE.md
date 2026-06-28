# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The Cannabis Landrace Atlas — a **static, no-build, no-backend** world map of cannabis
landraces with per-variety write-ups and search. Plain ES-module JavaScript, CSS, HTML,
and JSON served as files.

**`docs/implementation-guide.md` is the canonical deep reference** (architecture, data
pipeline, module responsibilities, conventions). Read it before non-trivial work. The notes
below are the load-bearing constraints and the things that bite.

## Commands

```bash
npm test                 # node --test — runs every *.test.mjs (logic + data validator)
npm run validate         # validates landraces.json + the data/labels & data/geo files
npm run serve            # python3 -m http.server 8000  (then open http://localhost:8000)
node --test js/search.test.mjs        # run a single test file
node data/build/normalize-writeups.mjs   # rewrites the ## Description block of every write-up
node data/build/gen-labels.mjs           # regenerates data/labels/* and data/geo/* from Natural Earth (network)
```

There are no dependencies — `devDependencies` is empty; tests use only the Node built-in
runner. There is no bundler, framework, or transpile step; the browser loads `js/*.js` as
native ES modules.

## Versioning

The app version lives in `js/version.js` (`VERSION`) and is shown in the About dialog and as
the app-title tooltip. **Bump it in every commit**, using judgment for the size of the change:

- **Major commit** (notable feature/behavior change): add `0.01` → `1.00.00` becomes `1.01.00`.
- **Every other commit** (fixes, tweaks, docs, data): add `0.00.01` → `1.00.00` becomes `1.00.01`.

Format is `MAJOR.MINOR.PATCH` with MINOR/PATCH zero-padded to two digits; carry at 100
(`1.00.99` + patch → `1.01.00`). Edit the `VERSION` string as part of the same commit.

## Hard constraints (do not break)

- **No build step; the site has no backend.** Keep the static site buildless. Visitor
  submissions (`js/forms.js`) POST to a small Cloudflare Worker (`worker/`) that files a
  labeled GitHub issue on the project's behalf — so contributors need no GitHub account; a
  Cloudflare Turnstile token gates spam. The Worker is the only server-side code and deploys
  separately from GitHub Pages (`cd worker && npx wrangler deploy`); secrets live in
  Cloudflare, never in the repo.
- **`data/` holds only runtime files; `data/build/` holds the pipeline tooling.** What the
  browser fetches/imports lives directly in `data/`: `landraces.json`, `world.geojson`,
  `writeups/`, `vocab.mjs`, the map-label point files in `data/labels/` (`cities`, `water`,
  `states`, `lakes`, `rivers`, `ranges`, `peaks` — `.json`), and the overlay geometry in
  `data/geo/` (`lakes`/`rivers`/`admin1`.geojson, plus `relief.json`). The `data/labels/`
  and `data/geo/` files are generated once from public-domain **Natural Earth** by
  `data/build/gen-labels.mjs` (run manually; needs network) — like `convert`, it is provenance,
  not a live regen path. Everything used to *build* the dataset — `convert.mjs`, `validate.mjs`,
  `gen-labels.mjs`, the scrape/normalize scripts, the `lib/` helpers, `raw/`, and the
  intermediate artifacts — lives under `data/build/`. Keep that split.
- **`data/landraces.json` is the canonical dataset — edit it directly, then run
  `npm run validate`.** It was bootstrapped once from `data/build/raw/` (via
  `data/build/convert.mjs`; the `convert` npm script has been removed); that was a one-time
  step. **Do not re-run `convert`** — it would overwrite the dataset's direct edits and
  enrichment. `data/build/raw/`, `data/build/convert.mjs`, and the `data/build/lib/*` pipeline
  helpers are historical provenance, not a live regeneration path.
- **`data/vocab.mjs` is the single source of truth for controlled vocabularies**, imported
  by *both* Node (the validator, as `../vocab.mjs`) and the browser (Index facets, submission
  forms). It must stay valid ES-module syntax usable in both. Add or rename a controlled value
  here only.
- **Security invariants — never relax:** rendered Markdown is sanitized through an allowlist
  in `js/markdown.js` (`SAFE_HREF = /^(https?:|mailto:|#)/i`); dataset URLs are protocol-checked
  via `isValidUrl` (http/https only) in `js/util.js` before rendering.

## Identity (must hold)

Use **only the "Brooklyn Cannabis Company" identity** for this project in commits, files, and
issues. Contact email is `BrooklynCannabis@protonmail.com`. The repo is
`BrooklynCannabisCompany/cannabis-landrace-atlas`, deployed via GitHub Pages — a push to the
repo deploys.

## Architecture in brief

- `index.html` is the single page: ribbon + `#map` + `#panel` + a modal host. It loads vendored
  Leaflet and marked (classic scripts) before `js/app.js` (the module).
- **`js/app.js` is the orchestrator** and holds all module state (`strains`, `map`,
  `markersById`, `currentId`). Leaf modules export named functions and stay stateless;
  `app.js` passes callbacks when a module needs to act on app state (e.g.
  `addMarkers(map, strains, openPanel)`).
- `boot()` fetches `data/landraces.json` + `data/world.geojson` (+ the small `data/labels/`
  point files and `data/geo/lakes.geojson`), builds a tile-free Leaflet GeoJSON basemap, and
  places one marker per strain (declustered onto a sunflower spiral in `js/map.js`, since many
  varieties share an approximate centroid). The view is fit to the world via `fitBounds`
  (adaptive to screen size), not a fixed zoom.
- **Map overlays** (all toggles off by default; zoom-gated; state persisted): a top-left stack
  of toggles (`addToggleControls` in `js/map.js`; icons are CSS masks, not inline SVG) plus
  synced ☰-menu items drives — **Labels** (country/city/ocean **and lake** names), **States &
  Provinces** (admin-1 borders + labels), **Rivers** (lines + names), **Mountains** (triangle
  relief + range/peak names). Lake *outlines* are the one always-on element (basemap water);
  their names ride the Labels toggle. `js/labels.js` renders text labels (per-group visibility,
  pure zoom-gating helpers — unit-tested in `labels.test.mjs`); `js/geolayers.js` renders
  lake/river/border geometry (`data/geo/*.geojson`, lazy-loaded for rivers/borders);
  `js/relief.js` draws the mountain triangle field on a canvas (`data/geo/relief.json`, lazy).
- The **Index** (`openIndex` in `app.js`) is the single "browse by attribute" surface: clicking
  a panel fact/badge routes through `openFacet` → `openIndex({facet, value})`, the same path as a
  search jump. Height and Flowering Time use checkbox/dual-slider facets rather than value groups.
- Write-ups (`data/writeups/<id>.md`) are fetched on demand, sanitized, cached, then **decorated**
  at runtime (`decorateWriteup`): wire the disclaimer link, insert related-variety links, fill the
  link sections from the record's `seedSources`/`photos`/`forums`/`references` arrays, add the ⊕
  buttons.

## Contributing rules (enforced for PRs)

- **Data changes (`data/`) and code changes must be in separate PRs** — never mixed.
- **≤ 200 changed lines per PR.** Split larger work.
- **Cite real, verifiable sources** for any added data/coordinates/links; never invent URLs.
  Write-up *link sections must contain only verified URLs* (AI-drafted prose is fine as a starting
  point — see `docs/writeup-generation-guide.md`).
