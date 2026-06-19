// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
// Map module: initializes Leaflet with a GeoJSON base layer (no tile provider)
// and renders green-leaf markers. Exposes init + selection helpers.
// Relies on the global `L` from lib/leaflet/leaflet.js.

// Inline SVG (not an <img>) so the marker inherits the CSS `color` of the
// `.leaf-marker` wrapper via `currentColor` — an external <img> SVG cannot.
const LEAF_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72" width="20" height="22" aria-hidden="true">' +
  '<g fill="currentColor"><path d="M32 64C32 50 32 44 32 38c-3 4-7 7-12 8 3-3 5-7 5-11-4 4-9 6-14 6 4-3 7-8 8-13-5 3-11 4-16 3 5-2 10-6 13-11-5 1-10 1-15-1 6-1 12-4 16-9-4-1-8-3-11-6 5 1 10 1 14-1-3-3-5-7-6-11 4 3 8 5 12 6-1-5-1-10 1-15 2 5 4 10 7 14 1-5 4-10 7-14 2 5 2 10 1 15 4-1 8-3 12-6-1 4-3 8-6 11 4 2 9 2 14 1-3 3-7 5-11 6 4 5 10 8 16 9-5 2-10 2-15 1 3 5 8 9 13 11-5 1-11 0-16-3 1 5 4 10 8 13-5 0-10-2-14-6 0 4 2 8 5 11-5-1-9-4-12-8 0 6 0 12 0 26z"/></g>' +
  '<rect x="31" y="56" width="2" height="12" fill="currentColor"/></svg>';

const LEAF_ICON = L.divIcon({
  html: LEAF_SVG,
  className: 'leaf-marker',
  iconSize: [20, 22],
  iconAnchor: [10, 21],
  popupAnchor: [0, -20]
});

export function createMap(elementId, worldGeoJson) {
  const map = L.map(elementId, {
    center: [20, 10],
    zoom: 2,
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
