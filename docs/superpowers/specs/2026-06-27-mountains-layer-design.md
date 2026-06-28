# Mountains Layer — Design

**Date:** 2026-06-27
**Status:** Approved (design); implemented.
**Builds on:** the labels overlay and hydrography/borders work.

## Summary

A new **Mountains** toggle (4th toggle in the grouped top-left bar), off by default. It is a
**labels-only** layer — no geometry is drawn (filled range polygons look wrong on a paper
map) — so the data is small and ships at boot (no lazy-load). Two sub-layers, both under the
one toggle, each zoom-gated:

- **Ranges** — area labels (Himalayas, Hindu Kush, Rif, Andes, Sierra Madre…), 222 ranges
  from Natural Earth `geography_regions_polys` filtered to `Range/mtn` (a centroid label
  point + name + scale rank; the polygons are discarded).
- **Peaks** — a ▲ glyph + name (Everest, K2, Kilimanjaro…), 632 named peaks from
  `geography_regions_elevation_points`. The **▲ scales with elevation in four tiers**
  (<2 km / 2–4 km / 4–6 km / >6 km); elevation is never shown as text.

## Data (Natural Earth, public domain)

- `data/labels/ranges.json` — `{name, lat, lng, rank}`, generated in `gen-labels.mjs`.
- `data/labels/peaks.json` — `{name, lat, lng, rank, elev}`; `elev` (metres) drives the
  runtime size tier via `peakSizeTier`, and is not displayed.

Both are small point files loaded at boot alongside the other label data.

## Rendering & code

- `js/labels.js`: a new `mountains` group holds both range labels (`lbl-range`) and peak
  markers (`lbl-peak`, ▲ via `lbl-peak-mark t1..t4`). New pure, unit-tested helpers:
  `rangeMinZoom`, `peakMinZoom`, `peakSizeTier`. Ranges reveal from zoom 3 (great ranges);
  peaks a notch deeper.
- `js/map.js`: a `mountains` entry in `TOGGLE_ICONS` (a mountain-silhouette glyph).
- `js/app.js`: a `mountains` entry in `TOGGLES` (no geo, no lazy-load), boot-fetches the two
  files and passes them to `createLabels`; persisted toggle + ☰-menu item like the others.
- `css/styles.css`: ranges as muted, letter-spaced brown italic serif; peaks as a brown ▲
  (sized by tier) + small name. Responsive font scaling.

## Styling (classic atlas)

Ranges in a muted brown italic with wide letter-spacing (evoking the spread of a range);
peaks as a grey-brown ▲ with a small name. Both sit in the label pane below the leaf markers,
non-interactive, with the paper halo.

## Testing & rollout

- Unit-test `rangeMinZoom`, `peakMinZoom`, `peakSizeTier`; extend the validator to shape-check
  the two new label files.
- One coherent commit; user tests locally before any push. Version bump (minor).

## Future (topographic features worth considering)

Captured for a follow-up discussion: deserts, plateaus and basins (already in
`regions_polys` as `Desert`/`Plateau`/`Basin` — same label-only treatment as ranges);
shaded relief / hillshade (raster — conflicts with the tile-free design, so likely no);
glaciers and ice (Natural Earth `glaciated_areas` / Antarctic ice — polygons); mountain
passes (in `elevation_points` as `pass` — relevant to landrace trade routes).
