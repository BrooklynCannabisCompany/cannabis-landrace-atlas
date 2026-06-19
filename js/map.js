// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
// Map module: initializes Leaflet with a GeoJSON base layer (no tile provider)
// and renders green-leaf markers. Exposes init + selection helpers.
// Relies on the global `L` from lib/leaflet/leaflet.js.

// The leaf marker is a vendored single SVG file (green cannabis fan leaf),
// shared by every marker — far lighter than inlining SVG per marker.
const LEAF_ICON = L.icon({
  iconUrl: 'assets/leaf.svg',
  iconSize: [24, 30],
  iconAnchor: [12, 28],
  popupAnchor: [0, -26],
  className: 'leaf-marker'
});

const INITIAL_VIEW = { center: [20, 10], zoom: 2 };

// `onReset` (optional) runs after the view resets — e.g. to close the panel.
export function createMap(elementId, worldGeoJson, onReset) {
  const map = L.map(elementId, {
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    minZoom: 2,
    maxZoom: 7,
    worldCopyJump: true,
    zoomControl: true,
    attributionControl: false
  });

  L.geoJSON(worldGeoJson, {
    style: {
      color: '#c8c5bd',       // soft grey borders
      weight: 0.7,
      fillColor: '#e9e6df',   // pale paper landmass
      fillOpacity: 1
    },
    interactive: false
  }).addTo(map);

  // Reset-view control: same-size icon button stacked below the +/- zoom buttons.
  const ResetControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd() {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control reset-control');
      const link = L.DomUtil.create('a', '', container);
      link.href = '#';
      link.title = 'Reset view';
      link.setAttribute('role', 'button');
      link.setAttribute('aria-label', 'Reset map to the whole world');
      link.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">' +
        '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>';
      L.DomEvent.on(link, 'click', L.DomEvent.stop);
      L.DomEvent.on(link, 'click', () => {
        map.setView(INITIAL_VIEW.center, INITIAL_VIEW.zoom);
        if (typeof onReset === 'function') onReset();
      });
      return container;
    }
  });
  map.addControl(new ResetControl());

  return map;
}

// Adds markers for every strain with coordinates. Calls onSelect(strain) on click.
// Returns a Map of strain id -> Leaflet marker for later programmatic selection.
export function addMarkers(map, strains, onSelect) {
  const byId = new globalThis.Map();
  for (const s of strains) {
    if (s.lat === null || s.lng === null || typeof s.lat !== 'number') continue;
    const marker = L.marker([s.lat, s.lng], { icon: LEAF_ICON, title: s.name });
    marker.on('click', () => onSelect(s));
    marker.addTo(map);
    byId.set(s.id, marker);
  }
  return byId;
}

// Pans/zooms so the marker sits in the visible (left) portion when the panel is open.
export function flyToStrain(map, strain) {
  if (!strain || strain.lat === null) return;
  map.flyTo([strain.lat, strain.lng], Math.max(map.getZoom(), 5), { duration: 0.6 });
}
