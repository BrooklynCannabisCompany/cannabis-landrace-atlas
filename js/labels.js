// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Labels overlay: zoom-aware place labels drawn over the basemap, organized into independently
// toggled groups so each map control drives its own set:
//   - 'place'   — country names (world.geojson), oceans/seas, cities, lake names  (Labels toggle)
//   - 'states'  — first-order divisions (data/labels/states.json)                 (States toggle)
//   - 'rivers'  — major rivers (data/labels/rivers.json)                          (Rivers toggle)
//   - 'terrain' — ranges/peaks/landforms (deserts, plateaus, basins, deltas)      (Terrain toggle)
// Lake *names* sit in 'place' so they follow the Labels toggle; only lake *shapes* (geolayers.js)
// are always on. All labels are non-interactive and sit in a dedicated pane *below* the leaf
// markers, so they never steal a click. `createLabels` returns a controller; app.js owns the toggles.
//
// Relies on the global `L` from lib/leaflet/leaflet.js (used only inside createLabels, so
// the pure gating helpers below remain importable under plain Node for tests).

import { PANE_Z } from './panes.js';

// --- Pure zoom-gating helpers (unit-tested in labels.test.mjs) --------------
// The map's zoom range is 2..7. Each label carries a minZoom; it shows once the map is
// zoomed to (or past) it. The mappings spread the layers across that range so the map fills
// in gracefully rather than all at once.

export function visibleAtZoom(minZoom, zoom) {
  return zoom >= minZoom;
}

// Natural Earth LABELRANK: lower = more prominent. Clamp into our 2..6 window so the
// biggest countries (rank 2) appear at the world view and the smallest at zoom 6.
export function countryMinZoom(labelRank) {
  const r = Number.isFinite(labelRank) ? labelRank : 5;
  return Math.min(6, Math.max(2, r));
}

// Natural Earth admin-1 scalerank: lower = more prominent division. States/provinces fill
// in *between* countries and cities — big divisions (California, Kerala) at zoom 4, the rest
// by 6–7 — so the country > state > city hierarchy reveals in order.
export function stateMinZoom(rank) {
  if (rank <= 2) return 4;
  if (rank <= 4) return 5;
  if (rank <= 6) return 6;
  return 7;
}

// Natural Earth populated-places scalerank: lower = bigger city. Keep cities off the map
// until the user has zoomed in (5+), revealing smaller places as they go deeper.
export function cityMinZoom(rank) {
  if (rank <= 1) return 5;
  if (rank <= 3) return 6;
  return 7;
}

// Marine scalerank: 0 = oceans, 1 = seas/bays/gulfs. Oceans show as soon as labels are on.
export function waterMinZoom(rank) {
  return rank <= 0 ? 2 : 3;
}

// Natural Earth lakes scalerank (0 = biggest). Lake names ride the Labels toggle (they sit in
// the 'place' group) and are additionally zoom-gated so tiny ones don't clutter the world view.
export function lakeMinZoom(rank) {
  return rank <= 0 ? 3 : 4;
}

// Natural Earth rivers scalerank (1 = biggest). Major rivers (Amazon, Nile) at zoom 4; the
// smallest named ones (rank 6 — e.g. the Hudson, Thames) only at max zoom so low zooms stay clean.
export function riverMinZoom(rank) {
  if (rank <= 2) return 4;
  if (rank <= 4) return 5;
  if (rank <= 5) return 6;
  return 7;
}

// Natural Earth physical-region scalerank for ranges (1 = biggest). The great ranges
// (Himalayas, Andes — rank 1) show from zoom 3; smaller ranges fill in deeper.
export function rangeMinZoom(rank) {
  if (rank <= 1) return 3;
  if (rank <= 3) return 4;
  if (rank <= 4) return 5;
  return 6;
}

// Named landform regions (deserts/plateaus/basins/deltas) scalerank — large physical areas,
// so the prominent ones (Sahara, Tibetan Plateau) show at the world view, smaller ones deeper.
export function landformMinZoom(rank) {
  if (rank <= 1) return 2;
  if (rank <= 3) return 3;
  if (rank <= 5) return 4;
  return 5;
}

// Peak scalerank (1 = most prominent). Peaks come in a notch deeper than ranges.
export function peakMinZoom(rank) {
  if (rank <= 2) return 4;
  if (rank <= 4) return 5;
  if (rank <= 6) return 6;
  return 7;
}

// Coarse elevation tier (1..4) driving the peak triangle size — deliberately approximate.
export function peakSizeTier(elev) {
  if (elev >= 6000) return 4;
  if (elev >= 4000) return 3;
  if (elev >= 2000) return 2;
  return 1;
}

// Highest relief-scatter level (0..2) drawn at a given zoom — denser as you zoom in, so the
// world view stays sparse. Used by the canvas relief layer.
export function reliefMaxLevel(zoom) {
  if (zoom <= 4) return 0;
  if (zoom === 5) return 1;
  return 2;
}

// --- Runtime overlay --------------------------------------------------------

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
// Label text comes from controlled data, but it is interpolated into divIcon HTML, so we
// escape it defensively to keep that HTML injection-free (per the project's invariants).
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

// Builds the label overlay. `data` = { world, cities, water, states, lakes, rivers, ranges,
// peaks, landforms }. Returns { setGroupVisible(key, on) } — key is 'place' | 'states' |
// 'rivers' | 'terrain'.
// Lake names live in the 'place' group (with countries/cities/oceans) so they follow the
// Labels toggle — only the lake *shapes* (geolayers.js) are always on.
export function createLabels(map, data) {
  // A pane below the marker pane (z 600), above the basemap/geometry panes (z <= 414).
  map.createPane('labelPane');
  const pane = map.getPane('labelPane');
  pane.style.zIndex = PANE_Z.labels;
  pane.style.pointerEvents = 'none';

  const groups = {
    place: L.layerGroup(),
    states: L.layerGroup(),
    rivers: L.layerGroup(),
    terrain: L.layerGroup()
  };
  const on = { place: false, states: false, rivers: false, terrain: false };
  const entries = []; // { marker, key, minZoom }

  const add = (key, lat, lng, html, className, minZoom) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({ html, className, iconSize: null }),
      interactive: false,
      keyboard: false,
      pane: 'labelPane'
    });
    entries.push({ marker, key, minZoom });
  };
  const text = (key, lat, lng, name, className, minZoom) =>
    add(key, lat, lng, `<span class="lbl-t">${esc(name)}</span>`, className, minZoom);

  // 'place' group: countries (from world geometry), oceans/seas, cities.
  for (const f of (data.world && data.world.features) || []) {
    const p = f.properties || {};
    if (typeof p.LABEL_X !== 'number' || typeof p.LABEL_Y !== 'number') continue;
    const name = p.NAME_EN || p.NAME;
    if (name) text('place', p.LABEL_Y, p.LABEL_X, name, 'lbl lbl-country', countryMinZoom(p.LABELRANK));
  }
  for (const w of data.water || []) text('place', w.lat, w.lng, w.name, 'lbl lbl-water', waterMinZoom(w.rank));
  for (const c of data.cities || []) {
    add('place', c.lat, c.lng,
      `<span class="lbl-dot"></span><span class="lbl-t lbl-city-t">${esc(c.name)}</span>`,
      'lbl lbl-city', cityMinZoom(c.rank));
  }
  // Independently-toggled groups.
  for (const s of data.states || []) text('states', s.lat, s.lng, s.name, 'lbl lbl-state', stateMinZoom(s.rank));
  for (const r of data.rivers || []) text('rivers', r.lat, r.lng, r.name, 'lbl lbl-river', riverMinZoom(r.rank));
  for (const k of data.lakes || []) text('place', k.lat, k.lng, k.name, 'lbl lbl-lake', lakeMinZoom(k.rank));
  // Terrain: range + peak names (triangles drawn by relief.js) and named landform regions
  // (deserts/plateaus/basins/deltas). All in the one 'terrain' group (Terrain toggle).
  for (const r of data.ranges || []) text('terrain', r.lat, r.lng, r.name, 'lbl lbl-range', rangeMinZoom(r.rank));
  for (const p of data.peaks || []) text('terrain', p.lat, p.lng, p.name, 'lbl lbl-peak', peakMinZoom(p.rank));
  for (const lf of data.landforms || []) text('terrain', lf.lat, lf.lng, lf.name, `lbl lbl-${lf.kind}`, landformMinZoom(lf.rank));

  const applyZoom = () => {
    const z = map.getZoom();
    for (const e of entries) {
      const want = on[e.key] && visibleAtZoom(e.minZoom, z);
      const has = groups[e.key].hasLayer(e.marker);
      if (want && !has) groups[e.key].addLayer(e.marker);
      else if (!want && has) groups[e.key].removeLayer(e.marker);
    }
  };
  map.on('zoomend', applyZoom);

  function setGroupVisible(key, vis) {
    if (!(key in on) || on[key] === vis) return;
    on[key] = vis;
    if (vis) groups[key].addTo(map);
    else groups[key].remove();
    applyZoom();
  }

  return { setGroupVisible };
}
