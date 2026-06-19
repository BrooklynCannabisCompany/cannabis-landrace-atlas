# The Cannabis Landrace Atlas — Design Spec

**Date:** 2026-06-19
**Status:** Approved design; in implementation. Updated with per-strain write-ups,
submission flows, open-source licensing, and source-credit requirements.

## Overview

**The Cannabis Landrace Atlas** is a web app for displaying cannabis landraces on a
world map. Each landrace location is marked with a small green pot-leaf icon.
Selecting a marker opens a side panel (~1/3 of screen width) showing the strain's
quick facts plus a Markdown write-up (overview, history, description, grow
information, and — where verified — photos and links to seed sources and forum
discussions). A full-width top ribbon holds the site title and a search box with
autocomplete, plus a button for submitting feedback. Each strain panel has a button
for submitting corrections and links.

The app is intentionally minimal: a static site with **no backend, no database,
and no build step**. The bundled data files (the dataset plus per-strain write-ups)
are the entire content store. Submission buttons are placeholders for now; once the
project has a public GitHub repository they will open pre-filled GitHub issues.

### Design principles

- **Minimum dependencies.** Plain HTML/CSS/JS. Vendored libraries (map + markdown
  renderer), no CDN.
- **Static and free to host.** Deployable as a folder of files to any free static
  host (GitHub Pages, Cloudflare Pages, Netlify, Vercel hobby tier).
- **Calm, academic tone.** Serious in an academic, reference-document way; modern,
  flat, uncluttered, and easy to use. Not deeply layered.
- **Degrade quietly.** Errors never produce a blank screen or a broken box.
- **Credit our sources.** Whenever the project uses someone else's data, it credits
  and links them prominently. Generated content never fabricates citations or links.
- **Truthful content.** AI-generated write-ups are labeled as unverified drafts, use
  honest hedging, and never invent specific references, photos, or links.

## Architecture & file structure

A static site, no build step, deployable as-is:

```
the-cannabis-landrace-atlas/
├── index.html          # single page: ribbon + map + panel
├── css/styles.css      # all styling
├── js/
│   ├── app.js          # wiring: load data, init map, search, panel, submit modals
│   ├── map.js          # Leaflet setup, GeoJSON world layer, markers
│   ├── panel.js        # render strain facts + markdown write-up into side panel
│   ├── search.js       # autocomplete over the dataset
│   └── markdown.js     # thin wrapper around the vendored markdown renderer
├── data/
│   ├── landraces.json  # the dataset (strains + lat/long + facts)
│   ├── world.geojson   # bundled country borders for the base map
│   ├── writeups/       # one markdown write-up per strain: <id>.md
│   ├── raw/            # source text (ingestion source of truth)
│   ├── convert.mjs     # one-time ingestion → landraces.json (Node, not shipped)
│   ├── validate.mjs    # schema validation (Node, not shipped)
│   └── lib/            # pure ingestion helpers + tests (Node, not shipped)
├── lib/
│   ├── leaflet/        # vendored Leaflet (js + css), no CDN
│   └── marked.min.js   # vendored markdown renderer, no CDN
├── assets/
│   └── leaf.svg        # the green pot-leaf marker icon
├── README.md           # about, data credit, usage
├── CONTRIBUTING.md     # contribution & submission guidelines
├── LICENSE             # MIT (code)
└── LICENSE-DATA        # CC BY-SA 4.0 (dataset + write-ups)
```

There is no backend and no database. `landraces.json` *is* the data store, loaded
with `fetch` at startup; each strain's Markdown write-up is fetched lazily from
`data/writeups/<id>.md` when its panel opens. No content is scraped at runtime.

### Map rendering

The world map is **self-contained**: Leaflet renders a bundled `world.geojson`
country-border layer with **no tile provider**, so there are no external tile
calls and the map works fully offline. Leaflet is vendored locally (one ~40KB
JS file plus its CSS) rather than loaded from a CDN, so there is no runtime
third-party dependency. Leaflet provides pan/zoom and custom marker icons for
free; the green pot-leaf markers are rendered as custom icons.

**Map controls:** the standard Leaflet zoom in/out (+/−) buttons, plus a **reset-view**
icon button directly below them (same size/style, part of the same control stack) that
returns the map to its original center/zoom.

## Data model

Each landrace is one object in `landraces.json`:

```json
{
  "id": "mazar-i-sharif",
  "name": "Mazar I Sharif",
  "continent": "Middle East / Central Asia",
  "country": "Afghanistan",
  "region": "Northern Afghanistan",
  "lat": 36.71,
  "lng": 67.11,
  "coordsApproximate": true,
  "type": "Indica",
  "category": "Indica",
  "height": "Short",
  "flowering": "7–9w",
  "climate": "Cold arid mountain",
  "summary": "High resin production.",
  "links": []
}
```

Field notes:

- `id` — unique, kebab-case, stable identifier (derived from the name; a numeric
  suffix disambiguates intentional pairs like the two Transkei entries).
- `name` — the landrace name (panel header, marker tooltip, search).
- `aka` — array of alternate names, extracted deterministically from the source
  notes (quoted names and explicit "Also …" lists); often empty. Shown as the panel's
  AKA row when non-empty. Not fabricated; can be enriched later.
- `continent` — the source grouping ("Africa" or "Middle East / Central Asia").
  Searchable; available for future grouping/filtering.
- `country` and `region` — kept distinct. The panel shows
  "Mazar I Sharif — Northern Afghanistan, Afghanistan". Both are searchable.
  `region` carries the more specific locality named in the data (or the descriptive
  area when that's all the source gives).
- `lat` / `lng` — marker position. Derived approximately from the named region
  (see Data source & ingestion); broad regions/corridors are placed at a
  representative central point.
- `coordsApproximate` — boolean; `true` everywhere in this first dataset, since all
  coordinates are derived rather than surveyed. Lets the UI/enrichment treat
  precision honestly later.
- `type` — the **full original type descriptor** from the source, preserved
  verbatim for display (e.g. "Feral sativa complex", "Sativa Subsp. Indica",
  "Ruderalis"). Searchable.
- `category` — a **normalized** single-value tag derived from `type`, drawn from a
  fixed set: Sativa, Indica, Ruderalis, Hybrid-Intermediate, Hemp, Feral, Mixed.
  Used for search and future filtering. (Markers use the same leaf icon regardless
  of category.)
- `morphotype` — derived botanical morphotype shown below Type in the panel, as a
  full name (Narrow-Leaf Drug / Broad-Leaf Drug / Narrow-Leaf Hemp / Broad-Leaf Hemp
  / Ruderalis) with its definition in a tooltip. Mapped from category/type/region
  (Sativa→NLD, Indica→BLD, Ruderalis→Ruderalis, Hemp→NLH or BLH; intermediate/feral/
  mixed mapping TBD with the user).
- `chemotype` — derived cannabinoid profile shown below Morphotype, with a fuller
  description in a tooltip: Chemotype I (THC-dominant), II (balanced 1:1), III
  (CBD-dominant), IV (CBG-dominant), V (cannabinoid-free / fiber-seed hemp). Inferred
  (no lab data) and hedged; default assumptions (e.g. drug landraces → I, hemp → V)
  confirmed with the user.
- `height` — plant height descriptor as given (e.g. "Short", "Tall (2–4m)",
  "Very tall"). Shown in the traits list.
- `flowering` — flowering-time descriptor as given (e.g. "7–9w", "Variable").
  Shown in the traits list.
- `climate` — climate/habitat descriptor. Normalized to a consistent controlled
  vocabulary for clean display and sensible facet grouping; the original full
  descriptor is preserved (kept in data and/or moved to the Description) so no detail
  is lost.
- `summary` — the curated description, sourced from the `Notes:` line in the raw
  data; will be expanded during enrichment.
- `links[]` — empty in this first dataset; populated during enrichment. Each link
  has a `label`, `url`, and `embed` boolean.
  - `embed: true` is an **explicit, hand-maintained allowlist** flag, set only for
    sources confirmed to render inside an iframe (e.g. Wikipedia, YouTube, map
    embeds). These render as inline embedded pages.
  - `embed: false` (the default for everything else) renders as a plain outbound
    link that opens in a new tab.
  - This makes the "links-first, embed only where allowed" behavior deterministic
    rather than guessed at runtime.

## Data source & ingestion

The content originates as semi-structured text (see `data/raw/landraces-part1.txt`),
organized under continent headers with one entry per block:

```
Name (Country) – Type descriptor | Height | Flowering | Climate
Notes: free text
Region: optional specific locality
```

The format is inconsistent across entries (strain type sometimes embedded in the
descriptor, sometimes a separate field; region sometimes on its own line, sometimes
trailing the notes). Ingestion is a **one-time, mostly manual conversion** into
`landraces.json`, not a runtime parser — there is no backend, and the raw text never
ships to the browser. The conversion:

1. Splits entries under their continent header and parses name, country, type
   descriptor, height, flowering, and climate.
2. Normalizes each `type` descriptor into a `category`.
3. Derives approximate `lat`/`lng` from the named region/country, setting
   `coordsApproximate: true`.
4. Assigns a unique kebab-case `id`, disambiguating intentional pairs.
5. Leaves `links` empty for later enrichment.

The data arrives in several parts, kept under `data/raw/` as the source of truth for
re-conversion:

- `landraces-part1.txt` — **Africa** and **Middle East / Central Asia** (~125 entries).
- `landraces-part2.txt` — **South Asia (Himalayan & Subcontinent)**, **Southeast Asia**,
  **East Asia / North Asia**, and **Americas** (Latin America & Caribbean).
- `landraces-part3.txt` — **Europe**, **North America / Hawaii** (incl. Caribbean),
  **Oceania / Pacific**, and a **Russia / Former USSR** grouping.

This is the complete dataset (~300+ entries across all three parts). `continent` is
drawn from a fixed set: Africa; Middle East / Central Asia; South Asia; Southeast
Asia; East Asia / North Asia; Europe; Oceania; Americas.

Source headers are not always clean — Part 3's European block had no header (added
during save), some entries sit under single-country sub-headers (Germany, Poland,
Baltics, etc.), the "Russia / Former USSR" group spans Europe and the Caucasus, and
the Americas are split across Parts 2 and 3. Ingestion therefore assigns `continent`
by the entry's **actual geography**, not strictly by the source header it appeared
under (e.g. Caribbean islands → Americas; Caucasus ferals → Europe).

A handful of raw entries are **incomplete stubs** — a name with little or no
descriptor (e.g. "Colombian Boyaca High Plateau", "Southern Ecuador Interior Andean
Valley"). Ingestion keeps these as records with whatever fields are present, marks
them incomplete (empty/placeholder `summary`, `coordsApproximate: true`), and they
are surfaced for completion during enrichment rather than dropped. The data
validation script treats missing optional descriptors as warnings, not errors, so
stubs don't block the build.

### Enrichment sources (seed-bank references)

Two specialist landrace/heirloom seed vendors are used to enrich the dataset and to
provide per-strain reference links:

- The Real Seed Company — https://therealseedcompany.com/
- The Landrace Team (TLT Seeds) — https://www.tltseeds.com/

Both maintain detailed origin notes, photos, and regional/ethnobotanical write-ups
for many traditional landraces, making them well-suited reference sources for this
project.

**How they're used (enrichment phase, not the initial build):**

1. **Scrape** each site's catalogue to build a local index of the strains they
   offer, with each strain's title, page URL, and any usable descriptive text. The
   scrape is a one-time/periodic offline step that produces data we fold into
   `landraces.json` — nothing about scraping happens at runtime in the browser.
2. **Match** scraped strains to our landrace entries. Names will rarely match
   exactly (their product names vs. our region names), so matching is fuzzy and
   human-reviewed, not automatic; only confident matches are linked.
3. **Improve** entries from matched pages — expanding thin `summary` text and
   filling `region`/`country` detail where the vendor's notes are more specific.
   Vendor text is paraphrased/curated, not copied verbatim, and our own data remains
   the source of truth.
4. **Link** each matched entry to the vendor's strain page via the `links[]` array
   (e.g. `{ "label": "The Real Seed Company", "url": "https://...", "embed": false }`).
   These are outbound links (`embed: false`) unless a page is confirmed to allow
   iframe embedding. An entry can link to one or both vendors; entries with no match
   simply get no vendor link.

**Constraints:** respect each site's `robots.txt` and terms of service; scrape
gently (rate-limited, cached locally) and only for the purpose of referencing and
linking back to the source. The scraper, the raw scrape output, and the matching
notes live alongside the other ingestion tooling under `data/` and never ship to the
browser.

## UI, layout & interaction

A single full-viewport screen. A full-width ribbon on top; map and panel split the
space below it.

```
┌─────────────────────────────────────────────────────────────┐
│  RIBBON: [ Landrace Atlas ]        [search w/ autocomplete ] │  ← spans full width
├─────────────────────────────────────────┬───────────────────┤
│                                          │                   │
│           WORLD MAP (~2/3)               │   STRAIN PANEL    │
│         · green leaf markers ·           │   (~1/3 width)    │
│                                          │                   │
└─────────────────────────────────────────┴───────────────────┘
```

### Top ribbon

- Spans the full viewport width: a **hamburger (☰) menu** in the top-left corner, then
  the site title/wordmark ("The Cannabis Landrace Atlas"), the search box (with
  autocomplete) in the center/right, and a **Suggest Additions** button at the far right.
- **Hamburger menu** items: **About** (standard about box, placeholder for now),
  **Index** (a browsable index grouped by facet — e.g. a "Type" H1 with category H2s
  Sativa/Indica/Ruderalis/Hybrid-Intermediate/Hemp/Feral/Mixed, each listing the
  matching varieties as clickable links), **References** (the global foundational
  reference list — Clarke & Merlin 2013; Clarke 1998; Overgrow data credit — moved here
  out of the per-strain panels), and **License** (MIT code / CC BY-SA 4.0 data).

The general foundational references live ONLY on the global References screen. A
strain's own References section holds only strain-specific sources (its matched
seed-vendor listing, where present); the section "sources" footnote markers link to
the global References screen.
- The **Submit** button covers feature requests, bug reports, and strain additions.
  For now it opens a small modal explaining that submissions will be available once
  the project's public GitHub repo exists; later it links to pre-filled GitHub issue
  templates. It does not POST anywhere.
- Thin and flat, with a subtle bottom divider — a quiet header bar, not a heavy
  toolbar.
- Stays fixed while the map pans/zooms beneath it.

### Map + panel

- Below the ribbon, the map (left ~2/3) and strain panel (right ~1/3) split the
  remaining height.
- **Default state:** the panel is closed and the map uses the full width under the
  ribbon.
- Selecting a marker (or a search result) opens the panel and the map reflows to
  ~2/3 width.
- **Markers:** the green pot-leaf SVG, small and consistently sized across zoom
  levels. Hover shows the strain name as a tooltip; click selects it.
- **Selecting a marker:** opens the panel, fills it with that strain, and gently
  pans/zooms the map to center the marker within the visible (left) area.
- **Closing:** an × in the panel, or pressing Escape, closes the panel and returns
  the map to full width.

### Panel content order

1. Name + region/country header.
2. Type badge.
3. Quick facts (small definition list): **AKA** (alternate names, when known — see
   `aka` field), then Type, Height, Flowering, Climate, Region; plus an "approximate
   location" note when `coordsApproximate`. The **Type, Height, Climate, and Region**
   values are **clickable facets**: clicking lists all varieties matching that value
   (each a link that opens the strain). When a value contains a slash (e.g.
   "Middle East / Central Asia"), each part is a separate clickable facet.
4. **Markdown write-up** — fetched from `data/writeups/<id>.md` and rendered to HTML.
   Sections: Overview, History, Description, Grow Information; then **exploration
   cross-links** — *Nearby Varieties* (closest by distance), *Regional Varieties*
   (same continent), *Similar Varieties* (same category), each a list of links that
   open the strain; then Photos, Seed Sources, Forum Discussions (each with a **+**
   button to submit additions), and a **Sources** section holding only this strain's
   specific sources (e.g. its matched seed-vendor listing). The general foundational
   references live on the global References screen (hamburger), not here. A section
   "sources" footnote marker appears after Overview/History/Description **only when a
   real source exists** for that strain — never on general AI-drafted prose. While
   loading, a quiet placeholder shows; if the file is missing, "Write-up pending" shows.
5. Any structured `links[]` (from enrichment): `embed: true` → inline iframe with a
   caption + fallback link; `embed: false` → outbound link (new tab).
6. **Bottom submit button** — "Suggest Corrections" for this strain. Like the ribbon
   button, it is a placeholder (opens a modal) until the GitHub repo exists, then
   opens a pre-filled per-strain issue.

The faceted-filter and exploration cross-link logic is pure (`js/search.js`-style)
and lives in `js/relations.js` (tested). The clickable facets and per-section "+"
buttons reuse the same modal as the submit flow (a list modal for facets).

### Search & autocomplete

- Lives in the ribbon. Matches against `name`, `country`, `region`, `continent`,
  `type`, and `category`.
- As the user types, an autocomplete dropdown lists matching strains.
- Selecting a result behaves exactly like clicking that strain's marker: opens the
  panel and flies the map to the marker.
- No matches shows a quiet "No matches" row, not an empty dropdown.

### Tone & styling

Serious/academic but modern:

- Restrained neutral palette: off-white/paper background, dark ink text, a single
  muted green accent for markers and interactive elements.
- One clean typeface family (humanist sans for UI), optionally a serif for the
  strain name/summary to lean "academic".
- Generous whitespace; flat design — no heavy shadows or gradients; subtle borders
  and dividers.
- The GeoJSON base map is drawn in soft greys with no tile imagery, reinforcing the
  quiet reference-document feel.

### Responsive behavior

- The ribbon stays full-width; the title may shrink to make room for the search box.
- On narrow/mobile screens the strain panel becomes a bottom sheet (or full-screen
  overlay) instead of a 1/3-width side column, since 1/3 width is unusable on a
  phone.

## Error handling

Everything degrades quietly, in keeping with the calm tone:

- **Data load fails** (`landraces.json` / `world.geojson` missing or malformed):
  show a small, plain message in the map area ("Unable to load map data") rather
  than a blank screen or a console-only failure.
- **Marker with bad/missing coordinates:** skip that entry, log a warning, and keep
  rendering the rest — one bad record never breaks the map.
- **Iframe embed fails to load** (a source flagged `embed: true` that blocks framing
  anyway): the iframe shows a visible fallback — the link's label as a normal
  outbound link with a short "opens on the source site" note — so the panel never
  shows a broken/empty box.
- **Search with no matches:** the autocomplete shows a quiet "No matches" row.

## Testing

Kept proportional to a no-build static site:

- **Data validation:** a tiny standalone script (run manually, or as a free CI
  check) that validates `landraces.json` against the expected shape — required
  fields present, `lat`/`lng` in range, `id`s unique, `category` within the fixed
  set, and `embed` boolean on any links. This is the highest-value test, since the
  data file is the entire app's content.
- **Manual smoke checklist:**
  - Map renders with the GeoJSON base layer.
  - Markers appear at correct locations.
  - Clicking a marker opens the panel with correct content.
  - Search + autocomplete selects a strain and flies the map to its marker.
  - Escape and × both close the panel and restore full-width map.
  - Responsive bottom-sheet works on a narrow viewport.
  - An `embed: true` link renders as an inline iframe; an `embed: false` link
    renders as an outbound link.
- No heavyweight test framework — that would contradict the minimum-dependency goal.

## Strain write-ups

Each strain has a Markdown write-up at `data/writeups/<id>.md`, fetched lazily when
its panel opens and rendered to HTML by the vendored Markdown renderer
(`lib/marked.min.js`). Sections, in order: **Overview, History, Description, Grow
Information, Photos, Seed Sources, Forum Discussions, References.**

- The first four are AI-generated **prose drafts**. Each file opens with a disclaimer
  line (e.g. *"AI-generated draft — unverified. Help us improve it."*). Prose uses
  honest hedging ("commonly reported", "grower accounts suggest"); for obscure feral
  populations with little documented record it stays to regional climate/landrace
  generalities rather than inventing specifics.
- **No fabricated links or citations.** Photos / Seed Sources / Forum Discussions /
  References are left as clearly-labeled empty slots ("No verified links yet — use
  the button below to suggest one"). They are filled only from real sources: the
  enrichment scraping (seed sources) and community submissions. The generation step
  never invents URLs.
- Photos with a verified image URL embed via Markdown image syntax; seed/forum/
  reference entries are outbound links.
- Rendering: content is first-party (our repo files) and therefore trusted; the panel
  styles headings/lists/links/images for the calm academic look. A missing write-up
  (404) degrades to "Write-up pending" beneath the quick facts.

Generation: write-ups for all ~446 strains are generated (in batches) after the
display system is built and verified end-to-end.

## Submissions & contributions

Two submission entry points, **non-functional for now** — each opens a small modal
explaining that submissions open once the public GitHub repo exists; neither POSTs
anywhere. Later they will open pre-filled GitHub issues:

- **Ribbon "Submit"** — feature requests, bug reports, strain additions.
- **Panel bottom button** (per strain) — corrections, forum links, seed links.

Contribution guidelines (`CONTRIBUTING.md`):

- **Data changes and code changes go in separate submissions** (separate PRs).
- **At most 200 changed lines per submission.**
- Each submission needs a **clear, complete description** and **evidence of testing**
  where appropriate (`npm test` / `npm run validate` output for data or logic
  changes; a screenshot or note for UI changes).

## Licensing & credit

- **Code:** MIT (`LICENSE`). First-party source files (`.js`, `.css`, `.html`, and
  the ingestion `.mjs`) carry a short header: an `SPDX-License-Identifier: MIT` line
  plus a copyright line. (Vendored `lib/` files keep their own upstream licenses.)
- **Data + write-ups:** CC BY-SA 4.0 (`LICENSE-DATA`), noted in the README.
- **Credit is mandatory.** The initial dataset is adapted from a community list by
  **Dankk1** on Overgrow
  (https://overgrow.com/t/attempted-complete-global-landrace-hemp-heirloom-strain-list/238462);
  the README credits this prominently. Any future incorporated data (e.g. seed-bank
  enrichment) is likewise credited and linked. This is a standing project principle.
- **README.md** describes the app, how to run it, the data source/credit, and the
  licensing split.

## Out of scope (YAGNI)

- No backend or database. Submissions are **client-side only** for now (placeholder
  modals); the eventual GitHub-issue wiring is deferred until the repo is public.
- No runtime scraping or fetching of third-party data.
- No build step, bundler, or framework.
- No tile-based map imagery.
- No filtering/grouping UI beyond search (the `country`/`category` keys leave room).
- Seed/photo/forum links in write-ups are **not** generated now — they come from the
  later enrichment phase and community submissions.
```

