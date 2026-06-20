# The Cannabis Landrace Atlas

A static, no-backend world map of cannabis landraces with per-strain write-ups and search.

---

## Run locally

```bash
git clone https://github.com/BrooklynCannabisCompany/cannabis-landrace-atlas.git
cd cannabis-landrace-atlas
npm run serve          # starts python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

**There is no build step and no backend.** Everything is plain static files — HTML, CSS, vanilla JS, and JSON. The only command you need to browse the map locally is `npm run serve` (or any static file server you prefer).

## Deploy (free hosting via GitHub Pages)

Because the site is fully static with **relative asset paths**, it can be served as-is from GitHub Pages at no cost — including under a project subpath (e.g. `https://<org>.github.io/<repo>/`).

1. Push this repository to GitHub.
2. In the repo: **Settings → Pages**.
3. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: `master`** and **folder: `/ (root)`**, then **Save**.
4. Wait ~1 minute; the public URL appears at the top of the Pages settings. It redeploys automatically on every push to `master`.

No configuration files are required — there is no build step, so the repository contents are served directly. (Cloudflare Pages and Netlify work the same way if you prefer a root-domain URL: connect the repo, leave the build command empty, and set the publish directory to the repository root.)

### Other commands

| Command | What it does |
|---|---|
| `npm test` | Runs the data and logic tests (Node.js built-in test runner) |
| `npm run convert` | Regenerates `data/landraces.json` from the raw files in `data/raw/` |
| `npm run validate` | Validates the compiled dataset against the schema/rules |

---

## How it works

- **Map:** [Leaflet](https://leafletjs.com/) renders a bundled GeoJSON world map (`data/world.geojson`) — no external tile server is required. The selected variety's marker is highlighted; every marker has a hover name tooltip.
- **Markers & data:** loaded from `data/landraces.json`, generated from the raw source files via `npm run convert`. Each record carries botanical fields — **morphotype, chemotype (inferred), domestication** — alongside region, climate, height, and flowering, derived in `data/lib/` and validated by `npm run validate`. The taxonomy follows McPartland & Russo (see `docs/reports/`).
- **Panel:** a side panel shows the facts (Morphotype badge + Region, Climate, Chemotype, Domestication, Type, Height, Flowering Time) with explanatory tooltips, then the write-up.
- **Write-ups:** each strain's Markdown write-up is fetched on demand from `data/writeups/<id>.md`. The `## Description` section is a consistent fact bullet list + prose paragraph (`data/normalize-writeups.mjs`). Drafts are AI-generated and unverified; link sections contain only real, verified URLs.
- **Index:** a collapsible, multi-facet browser (Region, Climate, Morphotype, Chemotype, Domestication, Type, Height, Flowering Time) with range sliders for Height and Flowering Time, opened from the ribbon.
- **Database:** the hamburger menu embeds the searchable original dataset.
- **Submissions:** "Suggest an Addition" and "Suggest Corrections" open a form that files a pre-filled, labeled GitHub issue (`add request` / `update request`) — no backend.

---

## Data & credit

> **The initial dataset is adapted from a community landrace and heirloom strain list compiled by Dankk1 on the Overgrow forum:**
> https://overgrow.com/t/attempted-complete-global-landrace-hemp-heirloom-strain-list/238462
>
> Crediting your sources when you use others' data is a core principle of this project.

A few caveats:

- **Coordinates are approximate** — strain origin regions are broad; markers represent rough centroids, not exact growing sites.
- **Strain write-ups are AI-generated, unverified drafts.** They are a starting point, not authoritative references. Corrections are very welcome — see [Contributing](#contributing).
- **World map geometry** (`data/world.geojson`) is derived from [Natural Earth](https://www.naturalearthdata.com/), whose map data is in the public domain ("Made with Natural Earth"). It is not covered by the dataset's CC BY-SA license. Map rendering uses [Leaflet](https://leafletjs.com/) (BSD-2-Clause) and [marked](https://github.com/markedjs/marked) (MIT), each under its own license.

---

## Submissions

The **Submit** buttons inside the app are placeholders. Once the project has a public GitHub repository they will open pre-filled GitHub issue templates so the community can propose new strains, coordinate corrections, and link verified sources without touching code.

---

## License

- **Code** (JS, CSS, HTML, tooling): MIT — see [`LICENSE`](LICENSE).
- **Dataset and write-ups** (`data/landraces.json`, `data/raw/`, `data/writeups/`): Creative Commons Attribution-ShareAlike 4.0 International — see [`LICENSE-DATA`](LICENSE-DATA).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines on submitting data corrections, new strains, code improvements, and write-up updates.
