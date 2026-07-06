// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Basemap geometry layers (distinct from the text labels in labels.js):
//   - 'lakes'   — inland water polygons, filled in the sea colour over the land (always on)
//   - 'rivers'  — river centerlines (Rivers toggle; data lazy-loaded)
//   - 'borders' — admin-1 boundary lines for the allowlist (States toggle; data lazy-loaded)
// Each layer renders in its own pane above the land basemap and below the labels/markers,
// is non-interactive, and is gated by a simple per-layer minZoom so low zooms stay clean.
//
// `createGeoLayers(map)` returns { provide(key, geojson), setVisible(key, on) }. The geometry
// data arrives via provide() — at boot for lakes, lazily on first toggle for rivers/borders.
// Relies on the global `L` from lib/leaflet/leaflet.js.

import { PANE_Z } from './panes.js';

// Pane z-order lives in panes.js. These layers sit ABOVE the heat/climate tints so they stay
// visible over an active heat map; the desert tint is the one that sits below (it's a base texture).
const LAYERS = {
  deserts: {
    pane: 'desertsPane', z: PANE_Z.deserts, minZoom: 3,
    style: { fillColor: '#e8dcc0', fillOpacity: 0.55, stroke: false }
  },
  lakes: {
    pane: 'lakesPane', z: PANE_Z.lakes, minZoom: 3,
    style: { fillColor: '#cfe9ec', fillOpacity: 1, color: '#a9d2d9', weight: 0.5 } // aqua water
  },
  borders: {
    pane: 'bordersPane', z: PANE_Z.borders, minZoom: 4,
    style: { fill: false, color: '#bcae9c', weight: 0.6, dashArray: '3 2', opacity: 0.9 }
  },
  rivers: {
    pane: 'riversPane', z: PANE_Z.rivers, minZoom: 3,
    style: { fill: false, color: '#4fa6bd', weight: 0.8, opacity: 0.95 } // aqua
  }
};

export function createGeoLayers(map) {
  const state = {};
  for (const [key, cfg] of Object.entries(LAYERS)) {
    map.createPane(cfg.pane);
    const p = map.getPane(cfg.pane);
    p.style.zIndex = String(cfg.z);
    p.style.pointerEvents = 'none';
    state[key] = { cfg, layer: null, on: false };
  }

  // A layer is shown only when it has data, is toggled on, and the zoom is deep enough.
  function refresh(key) {
    const s = state[key];
    if (!s.layer) return;
    const want = s.on && map.getZoom() >= s.cfg.minZoom;
    const has = map.hasLayer(s.layer);
    if (want && !has) s.layer.addTo(map);
    else if (!want && has) s.layer.remove();
  }
  map.on('zoomend', () => { for (const key of Object.keys(state)) refresh(key); });

  // Build the Leaflet layer for a key from its GeoJSON (called once, when data arrives).
  function provide(key, geojson) {
    const s = state[key];
    if (!s || s.layer) return;
    s.layer = L.geoJSON(geojson, { pane: s.cfg.pane, interactive: false, style: s.cfg.style });
    refresh(key);
  }

  function setVisible(key, on) {
    const s = state[key];
    if (!s) return;
    s.on = on;
    refresh(key);
  }

  return { provide, setVisible };
}
