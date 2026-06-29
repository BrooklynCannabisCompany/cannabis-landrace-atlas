# The Cannabis Landrace Atlas

A static, no-backend world map of cannabis landraces with per-strain write-ups and search.

---

## Run locally

```bash
git clone https://github.com/BrooklynCannabisCompany/cannabis-landrace-atlas.git
cd cannabis-landrace-atlas
npm run serve          # starts a no-cache static server (node serve.mjs) on :8000
```

Open http://localhost:8000 in your browser.

**There is no build step and no backend.** Everything is plain static files — HTML, CSS, vanilla JS, and JSON. The only command you need to browse the map locally is `npm run serve` (or any static file server you prefer). Because all asset paths are relative, the site can be served as-is from any static host.

### Other commands

| Command | What it does |
|---|---|
| `npm test` | Runs the data and logic tests (Node.js built-in test runner) |
| `npm run validate` | Validates `data/landraces.json` against the schema/rules |

> **`data/` holds the runtime files; `data/build/` holds the pipeline tooling.** The browser
> only fetches/imports what's directly in `data/` (`landraces.json`, `world.geojson`,
> `writeups/`, `vocab.mjs`); the build scripts, helpers, raw sources, and intermediate
> artifacts live under `data/build/`.
>
> **`data/landraces.json` is the maintained dataset — edit it directly.** It was bootstrapped
> once from `data/build/raw/` by `data/build/convert.mjs`; that was a one-time step (the
> `convert` npm script has been removed) and **must not be re-run** — it would overwrite the
> dataset's direct edits and enrichment. `data/build/raw/` and `data/build/convert.mjs` are kept
> only as historical provenance.

---

## How it works

- **Map:** [Leaflet](https://leafletjs.com/) renders a bundled GeoJSON world map (`data/world.geojson`) — no external tile server is required. The selected variety's marker is highlighted; every marker has a hover name tooltip. The world view is fit to the screen, so it fills large displays.
- **Map overlays:** top-left toggles (mirrored in the ☰ menu) add optional, zoom-aware cartography. **Labels** is the master text switch — turn it off and no names show; turn it on and you get names for whatever other layers are enabled (plus base country/city/ocean/lake names). **States & Provinces** (admin-1 borders), **Rivers** (lines), and **Terrain** (mountain ranges as a triangle-relief field with named peaks, plus deserts/plateaus/basins/deltas and a subtle desert tint) each draw their geometry on their own; their names appear when both that toggle and Labels are on. Water (oceans, lakes, rivers) is aqua; major lake outlines are always drawn. All toggles are off by default and remembered between visits; the larger layers load on first use.
- **Markers & data:** loaded from `data/landraces.json` — the project's maintained dataset (originally bootstrapped once from `data/build/raw/`, now edited directly). Each record carries botanical fields — **morphotype, chemotype (inferred), domestication** — alongside region, climate, height, and flowering, derived in `data/build/lib/` and validated by `npm run validate`. The taxonomy follows McPartland & Russo (see `docs/taxonomy-guide.md`).
- **Panel:** a side panel shows the facts (Morphotype badge + Region, Climate, Chemotype, Domestication, Type, Height, Flowering Time) with explanatory tooltips, then the write-up.
- **Write-ups:** each strain's Markdown write-up is fetched on demand from `data/writeups/<id>.md`. The `## Description` section is a consistent fact bullet list + prose paragraph (`data/build/normalize-writeups.mjs`). Drafts are AI-generated and unverified; link sections contain only real, verified URLs.
- **Index:** a collapsible, multi-facet browser (Region, Climate, Morphotype, Chemotype, Domestication, Type, Height, Flowering Time) with range sliders for Height and Flowering Time, opened from the ribbon.
- **Database:** the hamburger menu embeds the searchable original dataset.
- **Submissions:** the ribbon's "Suggest Addition", "Suggest Corrections", and "Contact Us" buttons — plus the ⊕ buttons on the Photos / Seed Sources / Forum Discussions / References sections — open simple in-app forms. Submitting sends your suggestion to the maintainers for review; no account or sign-in is required.

---

## Data & credit

> **The initial dataset is adapted from a community landrace and heirloom strain list compiled by Dankk1 on the Overgrow forum:**
> https://overgrow.com/t/attempted-complete-global-landrace-hemp-heirloom-strain-list/238462
>
> Crediting your sources when you use others' data is a core principle of this project.

A few caveats:

- **Coordinates are approximate** — strain origin regions are broad; markers represent rough centroids, not exact growing sites.
- **Strain write-ups are AI-generated, unverified drafts.** They are a starting point, not authoritative references. Corrections are very welcome — see [Contributing](#contributing).
- **World map geometry** (`data/world.geojson`) and the optional **place-label data** (`data/labels/cities.json`, `data/labels/water.json`, `data/labels/states.json`, `data/labels/lakes.json`, `data/labels/rivers.json`, `data/labels/ranges.json`, `data/labels/peaks.json`, plus the country names drawn from the world geometry) and the **basemap geometry** (`data/geo/lakes.geojson`, `data/geo/rivers.geojson`, `data/geo/admin1.geojson`, `data/geo/relief.json`) are derived from [Natural Earth](https://www.naturalearthdata.com/), whose map data is in the public domain ("Made with Natural Earth"). They are not covered by the dataset's CC BY-SA license. Map rendering uses [Leaflet](https://leafletjs.com/) (BSD-2-Clause) and [marked](https://github.com/markedjs/marked) (MIT), each under its own license.

---

## Submissions

The in-app contribution buttons open simple forms — **no account or sign-in required.** Submitting sends your suggestion to the maintainers, who review it before it appears:

- **Suggest Addition** — propose a new variety via a structured form.
- **Suggest Corrections** — edit a variety's fields and write-up (pre-filled with current values).
- **Contact Us** — send a feature request, bug report, or general feedback.
- The **⊕** buttons beside Photos / Seed Sources / Forum Discussions / References add verified URLs.

Behind the scenes, submissions are delivered through a small [Cloudflare Worker](worker/) that files a labeled issue on the project's GitHub repository for the maintainers to triage (spam is gated by a Cloudflare Turnstile check).

---

## License

- **Code** (JS, CSS, HTML, tooling): MIT — see [`LICENSE`](LICENSE).
- **Dataset and write-ups** (`data/landraces.json`, `data/writeups/`, `data/build/raw/`): Creative Commons Attribution-ShareAlike 4.0 International — see [`LICENSE-DATA`](LICENSE-DATA).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines on submitting data corrections, new strains, code improvements, and write-up updates.

---

We do not sell seeds or any other cannabis products.
