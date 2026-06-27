# Map Labels Overlay — Design

**Date:** 2026-06-27
**Status:** Approved (design); implementation pending
**Scope:** Feature A only — a zoom-aware labels overlay for the existing 2026 basemap.
Historical-era switching is an explicit *follow-on*, out of scope here (see "Future").

## Summary

Add a master **Labels** toggle to the map. When on, three label layers render over the
current paper basemap and auto-show/hide by zoom level:

1. **Country names** — derived at runtime from `world.geojson` (no new data file).
2. **Bodies of water** — oceans + major seas, from a new `data/labels/water.json`.
3. **Major cities** — ~200 cities, from a new `data/labels/cities.json`.

Labels are styled as a classic paper atlas. The toggle is *off by default* so the current
clean first impression is preserved. State persists across reloads.

## Behavior & UX

- **Off by default.** With labels off, the map renders exactly as it does today.
- **Two synced controls, one source of truth** (`labelsOn` in `app.js`):
  - A button in a new **bottom-right control group** (a container built to hold future
    controls — the historical-era selector is the obvious next tenant). Styled to match the
    existing `leaflet-bar` buttons, with a `data-tip` fast tooltip and `aria-pressed`.
  - A **"Labels" item in the ☰ menu** that shows a check (`aria-checked`) when on.
  - Toggling either updates both and `localStorage`.
- **Zoom-aware** (map zoom range is 2–7). Each layer is gated so the map never clutters:
  - **Country names:** mid–low zoom. Gated per-country using Natural Earth's `MIN_LABEL`
    (already in `world.geojson`) mapped onto our 2–7 range; large/important countries appear
    earliest.
  - **Water:** low zoom. Big oceans always visible when labels are on; major seas a bit later.
  - **Cities:** high zoom only (appear ~zoom 5+), gated by each city's `rank`; megacities
    appear earliest.
- **Persistence:** the on/off choice is stored in `localStorage` and restored on load.

## Responsive / mobile (required)

- The current responsive model: under **860px** the layout becomes a column and the panel
  becomes an 80vh **bottom sheet**; secondary ribbon buttons are already hidden and reached
  via the ☰ menu.
- **Bottom-right control group is hidden under 860px** (it would collide with the bottom-sheet
  panel). On mobile the **☰ menu "Labels" item is the guaranteed path** — mirroring the
  existing `#submit-btn`/`#contact-btn` pattern.
- **Label text scales down** slightly under 860px for density/legibility.
- Button is a comfortable touch target (matches the existing `leaflet-bar` control sizing,
  which already works on touch).
- Labels are `interactive: false` and below the marker pane, so they never intercept taps
  meant for leaf markers.

## Styling (classic atlas)

- **Country names:** small **spaced small-caps**, ink-grey `#6b6760`, soft paper-colored text
  halo (so names stay legible over the grey borders and leaf markers).
- **Water:** *italic* blue-grey, same halo (long-standing cartographic convention; visually
  separates water from land labels).
- **Cities:** a tiny dot + small upright label.
- All labels render below the marker pane and are non-interactive.

## Data (real sources only — no invented coordinates)

- **Country names — no new file.** Derived at runtime from `world.geojson` properties:
  `NAME_EN` (fallback `NAME`), `LABEL_X`/`LABEL_Y` (label anchor), `LABELRANK`/`MIN_LABEL`
  (zoom gating). All already shipped.
- **`data/labels/cities.json`** — major cities from **Natural Earth populated places**
  (public domain), filtered to ~200 by scale rank / population. Shape:
  `[{ "name": string, "lat": number, "lng": number, "rank": number }]`.
- **`data/labels/water.json`** — oceans + major seas, label points derived from **Natural
  Earth marine polygons** (public domain); ~15–25 entries, same shape as cities.
- A **one-time generator** for these two files lives under `data/build/` (respecting the
  runtime-vs-tooling split documented in CLAUDE.md). The committed JSON lives in
  `data/labels/`. The generator is provenance, not a live regeneration path.

## Architecture & code

- **`js/labels.js`** (new, stateless leaf module, mirroring the existing module convention):
  - `createLabels(map, world, cities, water)` → builds three `L.layerGroup`s
    (countries / water / cities) of non-interactive text `divIcon` markers.
  - `setLabelsVisible(map, on)` → adds/removes the groups and attaches/detaches the `zoomend`
    handler.
  - **`visibleAtZoom(rank, zoom)`** → pure helper deciding per-label visibility; unit-testable.
- **Bottom-right control group + Labels button:** in `js/map.js`, mirroring the existing
  `ResetControl` pattern (`L.Control.extend`, `position: 'bottomright'`). The group container
  is reusable for future controls.
- **`js/app.js`** orchestrates (holds all state, per the existing convention): owns `labelsOn`,
  wires the button + ☰ menu item + `localStorage`, and calls into `js/labels.js`. Leaf modules
  stay stateless and receive callbacks/state from `app.js`.
- **`boot()`** additionally fetches `data/labels/cities.json` and `data/labels/water.json`
  alongside the existing `landraces.json` + `world.geojson` fetches.
- **`index.html`:** add the "Labels" `data-menu` item to `#app-menu`.
- **`css/styles.css`:** label typography/halo classes + the bottom-right group styling +
  the `@media (max-width: 860px)` rules.

## Security invariants (unchanged, must hold)

- No new Markdown is rendered; the existing sanitizer/URL allowlist is untouched.
- Label text comes from controlled data files / Natural Earth properties and is inserted as
  plain text (`textContent`), never as HTML, so the divIcon HTML stays injection-free.

## Testing

- **`js/labels.test.mjs`** (`node --test`): unit-tests the pure logic — `visibleAtZoom`
  across the 2–7 zoom range and rank tiers, and any data-shape/filter helpers.
- **Validator:** extend the data validator to shape-check `data/labels/*.json`
  (required keys, numeric lat/lng in range, non-empty name).
- `npm test` and `npm run validate` must pass.

## Rollout

- The ≤200-line / data-and-code-in-separate-PRs contributor rules do **not** apply to
  first-party work here; the feature lands as one coherent change.
- The **data files must exist before the code that fetches them** is exercised, so author
  `data/labels/*.json` first, then the module/control/wiring.
- **Version bump:** notable feature → minor bump (`+0.01`) in `js/version.js`, same commit.
- The user will **test locally before anything is pushed.**

## Addendum — State/province labels (admin-1 layer)

Added after the initial labels overlay shipped. A **4th label layer** for first-order
divisions (states/provinces/regions), under the *same* master Labels toggle — no new control.

- **Countries (allowlist):** USA, Canada, Mexico, Brazil, Argentina, Colombia, India,
  Pakistan, Afghanistan, Nepal, Thailand, China, Indonesia, Morocco, South Africa,
  Australia, Russia, Germany. Curated for well-known *and* landrace-relevant divisions; the
  list is one constant (`ADMIN1_COUNTRIES`) in `gen-labels.mjs`.
- **Data:** `data/labels/states.json` (`{name, lat, lng, rank}`, ~551 divisions), generated
  from Natural Earth `ne_10m_admin_1_states_provinces` (public domain) — filtered to the
  allowlist, name from `name_en` (English form: "Bavaria", not "Bayern"), label point from
  NE's `latitude`/`longitude`, `rank` from `scalerank`. Same shape, so the validator covers
  it for free.
- **Zoom gating:** `stateMinZoom(rank)` slots divisions *between* countries and cities —
  prominent ones (California, Kerala, Yunnan) at zoom 4, the rest by 6–7. Unit-tested.
- **Styling:** subordinate level — smaller (10px), lighter (`#8a857c`) small-caps, same
  paper halo; upright, no dot. Visual hierarchy reads country > state > city.
- **Code:** a 4th `L.layerGroup` in `js/labels.js`; `createLabels` gains a `states` arg;
  `boot()` fetches the file with the same graceful fallback. Version bump (minor).

## Addendum 2 — control placement + world fit (revised after review)

- **Labels toggle moved to the top-left**, stacked beneath the zoom (+/−) and reset buttons
  (`addLabelsControl`, `position: 'topleft'`), replacing the original bottom-right group. It
  no longer collides with the mobile bottom-sheet panel, so it stays visible on small screens
  (the ☰-menu item remains as a secondary path). Future controls (e.g. the historical-era
  selector) join the same top-left stack.
- **World view now fits the viewport** instead of using a fixed zoom 2: `createMap` and the
  reset button call `fitWorld(map)` → `map.fitBounds(WORLD_BOUNDS)` over a polar-trimmed
  world frame. This fills large screens (Leaflet picks a higher zoom) while small screens
  fall back to a lower zoom automatically.

## Future (out of scope)

- **Historical-era switching.** The bottom-right control group and the label-rendering
  machinery are intentionally built to host an era selector that swaps boundary GeoJSON and
  per-era names/label positions. That is a separate, heavier project (historical boundary
  data sourcing, licensing/attribution, file size) with its own spec → plan → implementation
  cycle.
- Additional bottom-right controls beyond labels and era (e.g. layer-specific toggles) can
  reuse the same group container.
