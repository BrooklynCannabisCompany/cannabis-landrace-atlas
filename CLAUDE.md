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
npm run convert          # data/raw/*.txt + enrichment → data/landraces.json (GENERATED)
npm run validate         # checks data/landraces.json against the controlled vocab
npm run serve            # python3 -m http.server 8000  (then open http://localhost:8000)
node --test js/search.test.mjs        # run a single test file
node data/normalize-writeups.mjs      # rewrites the ## Description block of every write-up
```

There are no dependencies — `devDependencies` is empty; tests use only the Node built-in
runner. There is no bundler, framework, or transpile step; the browser loads `js/*.js` as
native ES modules.

## Hard constraints (do not break)

- **No build step, no backend.** Don't introduce either. Contributions happen via pre-filled
  GitHub issues (`js/forms.js` builds `issues/new?...` URLs — no token, the user submits
  while signed into GitHub).
- **`data/landraces.json` is generated, never hand-edited.** Edit `data/raw/*.txt`, the
  pure helpers in `data/lib/*.mjs`, or `data/vendor-links.json`, then run `npm run convert`
  followed by `npm run validate`.
- **`data/lib/vocab.mjs` is the single source of truth for controlled vocabularies**, imported
  by *both* Node (the validator) and the browser (Index facets, submission forms). It must stay
  valid ES-module syntax usable in both. Add or rename a controlled value here only.
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
- `boot()` fetches `data/landraces.json` + `data/world.geojson`, builds a tile-free Leaflet
  GeoJSON basemap, and places one marker per strain (declustered onto a sunflower spiral in
  `js/map.js`, since many varieties share an approximate centroid).
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
