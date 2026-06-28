# Mountain Triangle-Relief — Design

**Date:** 2026-06-28
**Status:** Approved (design); implementing.
**Supersedes the visual of:** `2026-06-27-mountains-layer-design.md` (peak ▲ + range text).

## Problem

The first mountains pass showed range *names* plus a few single peak triangles. The desired
look is a classic relief map: each mountain range drawn as a **field of small triangle
symbols** that forms the shape of the range — a genuinely topographic feel — while staying
within the project's tile-free, vector, buildless constraints.

## Approach (chosen)

**Vector triangle-relief, rendered on a canvas layer.** Style **C, on the smaller side**:
filled brown triangles with varied size (taller-looking peaks here and there), drawn densely
enough to read as a range but kept small. Range **name labels** stay (identification); named
**peaks** become slightly larger accent triangles within the field, with their name labels.

## Data (Natural Earth, public domain)

- **`data/geo/relief.json`** — the triangle field: points scattered *inside each
  `Range/mtn` polygon* (deterministic seeded rejection-sampling clipped to the polygon),
  count ∝ range area (capped), each `{lat, lng, r, lvl}` where `r`∈[0,1] drives size variation
  and `lvl` (0–2) drives zoom-density (sparser at low zoom). Target ~5–7k triangles, ~150 KB.
  **Lazy-loaded** on first Mountains toggle-on (keeps boot light).
- **`data/labels/peaks.json`** (existing) — reused for the larger accent peak-triangles
  (size by `elev` tier) and the peak name labels.
- **`data/labels/ranges.json`** (existing) — range name labels (unchanged).

Generated in `gen-labels.mjs` (`genRelief`), reusing the range polygons already fetched.

## Rendering & code

- **`js/relief.js`** (new): `createRelief(map, peaks)` → `{ setScatter(points), setVisible(on) }`.
  A custom `L.Layer` owning a `<canvas>` in a dedicated pane above the land and below the
  labels. On `moveend`/`zoomend`/`resize` it repositions+resizes the canvas to the view and
  redraws: range-scatter triangles (filtered by `lvl` vs current zoom) + peak triangles
  (sized by elevation tier), culled to the viewport, sorted back-to-front, filled muted brown
  with a thin darker edge. Roughly constant on-screen size (does not bloat with zoom).
- **`js/labels.js`**: the `mountains` group keeps range + peak **name** labels; the peak entry
  drops its ▲ glyph (the canvas now draws the triangle). `peakSizeTier` is reused by relief.
- **`js/app.js`**: the Mountains toggle drives `labels.setGroupVisible('mountains', on)` **and**
  `relief.setVisible(on)`, lazy-fetching `relief.json` on first enable.
- **`css/styles.css`**: `.relief-canvas { pointer-events:none }`; peak label offset retained.

## Testing & rollout

- The pure size/zoom helpers (`peakSizeTier`, plus a new `reliefLevelForZoom`) are unit-tested;
  the generator's point-in-polygon + sampling is exercised by regenerating and validating
  `relief.json` (non-empty, in-range coords). Validator extended.
- One commit; user tests locally before push. Version bump (minor).

## Notes

- The old peak-▲-in-label CSS (`lbl-peak-mark t1..t4`) is removed; triangles now live on the
  canvas only, avoiding two triangle systems.
- Performance: only viewport triangles are drawn each redraw; canvas handles thousands easily.
