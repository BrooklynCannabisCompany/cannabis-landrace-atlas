# Basemap Hydrography + Admin-1 Borders — Design

**Date:** 2026-06-27
**Status:** Approved (design); implementation pending
**Builds on:** the labels overlay (`2026-06-27-map-labels-overlay-design.md`).

## Summary

Add real water geometry and first-order-division borders to the basemap:

- **Lakes** — major inland water bodies (Great Lakes, Caspian, Victoria, Baikal…) drawn as
  water-filled polygons, **always on**, **always labeled** (zoom-permitting). No toggle.
- **States & Provinces** — a **new toggle** that draws admin-1 **boundaries + labels**
  together for the 18-country allowlist. Off by default. State labels move *out* of the
  existing Labels toggle into this one.
- **Rivers** — a **new toggle** that draws river lines + names. Off by default.

All geometry is public-domain Natural Earth.

## Controls

Top-left control stack (under zoom/reset), each a button synced to a ☰-menu checkbox item,
each persisted independently in `localStorage`, each zoom-gated:

| Control | Drives | Default |
|---|---|---|
| **Labels** *(existing)* | country, city, ocean & sea names | off |
| **States & Provinces** *(new)* | admin-1 borders **and** labels | off |
| **Rivers** *(new)* | river lines **and** labels | off |
| *(none)* **Lakes** | lake shapes + labels, always on | on |

Naming: "States & Provinces" reads correctly across US states, Canadian/Mexican/Brazilian
provinces, Indian states, Moroccan regions, German Länder, and avoids colliding with the
Index's existing "Region" facet.

## Layers & data (all Natural Earth, public domain)

- **Lakes — `data/geo/lakes.geojson`** (110m, ~24 major lakes, ~32 KB). Water-filled polygons
  (`#eef1f4`, matching the sea) drawn over the land; always-on italic labels (zoom-gated)
  from each lake's name. Loaded at boot (tiny). The Caspian, currently a "sea" label in
  `water.json`, is reconciled to the lake so it is not double-labeled.
- **Rivers — `data/geo/rivers.geojson`** (50m centerlines, scalerank ≤ 5 → 250 rivers,
  coordinates rounded to 2 decimals → **~267 KB**). Thin blue-grey lines + italic labels
  (label point = a midpoint of the line, computed at runtime), zoom-gated. **Lazy-loaded**
  the first time the Rivers toggle is enabled.
- **State borders — `data/geo/admin1.geojson`** (**~269 KB**, hybrid: Natural Earth 50m
  admin-1 *lines* for the 9 coastline-heavy countries the lines file covers — US, Canada,
  Brazil, India, China, Indonesia, South Africa, Australia, Russia — plus 50m admin-1
  *polygon outlines* for the other 9; all rounded to 2 decimals). Geometry only. **Lazy-loaded**
  on first States toggle-on.
- **State labels** keep using the existing `data/labels/states.json` (10m-derived label
  points, ~30 KB, boot-loaded) — crisper placement than the 50m polygons and already shipped.
  The States toggle drives both the borders (geolayers) and these labels (labels.js).

The allowlist (`ADMIN1_COUNTRIES`) and generation stay in `data/build/gen-labels.mjs`.
Lake/river labels are derived from their geometry at runtime, so they need no separate point
files; state/city/water labels keep their existing point files.

## Rendering & code

- **`js/geolayers.js`** (new): builds the three `L.geoJSON` layers (lakes / rivers / borders)
  with their styles and per-layer zoom gating. Geometry is kept distinct from the text-label
  machinery in `js/labels.js`.
- **`js/labels.js`**: refactor the single `setVisible(on)` into **per-group visibility**
  (place-names / states / rivers / lakes), so each toggle drives its own label set. Lakes
  labels default on; the pure zoom helpers (`lakeMinZoom`, `riverMinZoom`, plus existing
  ones) stay unit-tested.
- **`js/map.js`**: add the two new toggle controls, reusing the `addLabelsControl` pattern
  (one generic control factory parameterized by icon/label/handler).
- **`js/app.js`**: own three independent on/off states (`labelsOn`, `statesOn`, `riversOn`),
  wire each button + menu item + `localStorage`, and lazy-`fetch` the rivers and admin-1
  files on first enable (cached thereafter).
- **Pane order:** lake/river/border geometry sits above the land basemap and below the
  `labelPane`; leaf markers stay on top.

## Security invariants (unchanged)

Label text is inserted as escaped plain text into divIcons; GeoJSON is rendered as geometry
only (no HTML). The Markdown sanitizer / URL allowlist are untouched.

## Testing & rollout

- Unit-test the new zoom-gating helpers alongside the existing ones (`node --test`).
- Extend the validator to confirm the new `data/geo/*.geojson` files parse and are non-empty
  FeatureCollections.
- Report final shipped byte sizes after trimming (rivers especially) so they can be vetoed.
- One coherent commit; the user tests locally before any push. Version bump (minor).

## Future (out of scope)

Historical-era switching still rides on this same control stack + geometry machinery. A
per-layer "Water" master or additional admin levels (counties) could reuse `geolayers.js`.
