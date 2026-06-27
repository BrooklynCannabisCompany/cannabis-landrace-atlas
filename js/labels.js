// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Labels overlay: an optional, zoom-aware set of place labels drawn over the basemap.
// Three layers — country names (derived at runtime from world.geojson), bodies of water
// (data/labels/water.json), and major cities (data/labels/cities.json). All labels are
// non-interactive and sit in a dedicated pane *below* the leaf markers, so they never
// steal a click. `createLabels` returns a small controller; app.js owns the on/off state.
//
// Relies on the global `L` from lib/leaflet/leaflet.js (used only inside createLabels, so
// the pure gating helpers below remain importable under plain Node for tests).

// --- Pure zoom-gating helpers (unit-tested in labels.test.mjs) --------------
// The map's zoom range is 2..7. Each label carries a minZoom; it shows once the map is
// zoomed to (or past) it. The mappings below spread the three layers across that range so
// the map fills in gracefully rather than all at once.

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

// --- Runtime overlay --------------------------------------------------------

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
// Label text comes from controlled data, but it is interpolated into divIcon HTML, so we
// escape it defensively to keep that HTML injection-free (per the project's invariants).
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

// Builds the overlay and returns a controller with setVisible(on). Labels are added to /
// removed from their layer groups by zoom; the groups attach to the map only while on.
export function createLabels(map, world, cities, water, states) {
  // A pane below the marker pane (z 600), above the basemap overlay (z 400).
  map.createPane('labelPane');
  const pane = map.getPane('labelPane');
  pane.style.zIndex = 450;
  pane.style.pointerEvents = 'none';

  const entries = []; // { marker, group, minZoom }
  const countriesG = L.layerGroup();
  const statesG = L.layerGroup();
  const waterG = L.layerGroup();
  const citiesG = L.layerGroup();

  const add = (group, lat, lng, html, className, minZoom) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({ html, className, iconSize: null }),
      interactive: false,
      keyboard: false,
      pane: 'labelPane'
    });
    entries.push({ marker, group, minZoom });
  };

  for (const f of world.features || []) {
    const p = f.properties || {};
    if (typeof p.LABEL_X !== 'number' || typeof p.LABEL_Y !== 'number') continue;
    const name = p.NAME_EN || p.NAME;
    if (!name) continue;
    add(countriesG, p.LABEL_Y, p.LABEL_X,
      `<span class="lbl-t">${esc(name)}</span>`, 'lbl lbl-country', countryMinZoom(p.LABELRANK));
  }
  for (const s of states || []) {
    add(statesG, s.lat, s.lng,
      `<span class="lbl-t">${esc(s.name)}</span>`, 'lbl lbl-state', stateMinZoom(s.rank));
  }
  for (const w of water || []) {
    add(waterG, w.lat, w.lng,
      `<span class="lbl-t">${esc(w.name)}</span>`, 'lbl lbl-water', waterMinZoom(w.rank));
  }
  for (const c of cities || []) {
    add(citiesG, c.lat, c.lng,
      `<span class="lbl-dot"></span><span class="lbl-t lbl-city-t">${esc(c.name)}</span>`,
      'lbl lbl-city', cityMinZoom(c.rank));
  }

  let on = false;
  const applyZoom = () => {
    const z = map.getZoom();
    for (const e of entries) {
      const want = on && visibleAtZoom(e.minZoom, z);
      const has = e.group.hasLayer(e.marker);
      if (want && !has) e.group.addLayer(e.marker);
      else if (!want && has) e.group.removeLayer(e.marker);
    }
  };
  const onZoom = () => applyZoom();

  function setVisible(next) {
    if (next === on) return;
    on = next;
    if (on) {
      countriesG.addTo(map);
      statesG.addTo(map);
      waterG.addTo(map);
      citiesG.addTo(map);
      map.on('zoomend', onZoom);
      applyZoom();
    } else {
      map.off('zoomend', onZoom);
      countriesG.remove();
      statesG.remove();
      waterG.remove();
      citiesG.remove();
    }
  }

  return { setVisible };
}
