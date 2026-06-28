# Terrain Layer + Aqua Water — Design

**Date:** 2026-06-28
**Status:** Approved (design); implementation pending.
**Supersedes:** the Mountains toggle from `2026-06-27-mountains-layer-design.md` /
`2026-06-28-mountain-triangle-relief-design.md` (Mountains becomes Terrain).

## Summary

Three changes:

1. **Rename Mountains → Terrain** and broaden it to cover mountains, deserts, plateaus, and
   basins/deltas under one toggle.
2. **Densify the mountain relief** so big ranges (Rockies, Andes, Himalayas) read as a
   continuous wall instead of scattered dots.
3. **Recolor all water aqua-blue** (oceans, seas, lakes, rivers, and their labels).

Forests/jungles are **out of scope** — Natural Earth has no forest/jungle vector data, and
raster land cover would break the tile-free/vector/no-backend constraint.

## 1. Terrain toggle (was Mountains)

The top-left **Mountains** toggle + its ☰-menu item become **Terrain** (keep the mountain
glyph icon). It drives, as one coherent layer:

- **Mountains** — triangle relief (densified, §2) + range & peak names *(existing)*. Triangles
  stay **muted brown** (`#8a6f57`), distinct from the green leaf markers and the aqua water.
- **Deserts** — names **+ a subtle sandy tint** on the desert polygons.
- **Plateaus** — names.
- **Basins & deltas** — names.

Rivers and lakes keep their own toggles (water). The `localStorage` key changes
`cla-mountains` → `cla-terrain` (one saved bool resets — harmless). The `labels.js` label
group `mountains` is renamed `terrain`.

### Data (Natural Earth `regions_polys`, already fetched in `gen-labels.mjs`)
- **`data/labels/landforms.json`** — `{name, lat, lng, rank, kind}` for deserts/plateaus/
  basins/deltas (centroid label points; `kind ∈ desert|plateau|basin|delta`; filtered by
  `FEATURECLA`). Boot-loaded (small).
- **`data/geo/deserts.geojson`** — desert polygons (coordinate-rounded) for the sandy tint.
  **Lazy-loaded** when Terrain is enabled.
- Ranges (`ranges.json`) and peaks (`peaks.json`) are unchanged; `relief.json` is regenerated
  denser (§2).

### Rendering
- **`labels.js`**: rename the `mountains` group → `terrain`; add desert/plateau/basin/delta
  labels with muted per-kind styles, gated by a new pure helper `landformMinZoom(rank)`
  (unit-tested). Deserts/plateaus/basins are large → appear at low–mid zoom like ranges.
- **`geolayers.js`**: add a `deserts` polygon layer — a light sandy fill (≈ `#e8dcc0`, no/thin
  border) in a pane **below** the relief and labels, lazy-loaded. Kept clearly lighter than
  the brown mountain triangles so the two don't blend.
- **`relief.js`**: unchanged logic; consumes the denser `relief.json` (minor size/overlap
  tuning only).
- **`app.js`**: the Terrain toggle drives the `terrain` label group + the relief canvas
  (lazy `relief.json`) + the desert tint (lazy `deserts.geojson`).
- **`map.js` / `index.html`**: rename to Terrain (`map-toggle--terrain`, `data-menu="terrain"`);
  keep the mountain mask icon.

## 2. Densify the relief ("wall", not scattered)

In `gen-labels.mjs`, the triangle scatter is reworked:
- Replace **random rejection sampling** with **jittered-grid** placement clipped to each range
  polygon (even coverage — no bald gaps that read as "scattered").
- **Drop the per-range cap**; triangle count scales with polygon area, so the Rockies/Andes/
  Himalayas fill proportionally and form a continuous massif.
- Grid spacing + a slight triangle size/overlap bump are tuned so neighbours merge into a
  ridge wall; the existing `lvl`/`reliefMaxLevel` zoom tiers keep the world view from becoming
  a solid blob.
- `relief.json` grows (≈ 0.5–0.8 MB) but is **lazy-loaded only with Terrain**, so normal page
  load is unaffected. Final density tuned against Rockies/Andes screenshots.

## 3. Aqua-blue water

Shift the water palette from pale grey-blue to aqua (final shades tuned on-screen):
- **Ocean/sea background** — `.map { background }` `#eef1f4` → soft aqua (≈ `#cfe9ec`).
- **Lake fill** — `geolayers.js` lakes style `#eef1f4` → same aqua as the ocean.
- **Rivers** — `geolayers.js` river stroke `#9fb3c2` → deeper aqua (≈ `#4fa6bd`).
- **Water/lake/river name labels** — `css` `.lbl-water` / `.lbl-lake` / `.lbl-river` colors →
  matching aqua-blue ink.

## Testing, docs, rollout
- Unit-test `landformMinZoom`; extend `validate.test.mjs` for `landforms.json` (label shape)
  and `deserts.geojson` (non-empty FeatureCollection).
- Update CLAUDE.md / README / implementation-guide (Mountains → Terrain; aqua water).
- Version bump (minor). One coherent change; user tests locally before push.

## Out of scope
- Forests/jungles (no vector data; raster breaks constraints).
- Desert tint is the only new fill; plateaus/basins/deltas are name-only (fills look wrong).
