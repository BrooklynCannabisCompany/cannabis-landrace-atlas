// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
// Map module: initializes Leaflet with a GeoJSON base layer (no tile provider)
// and renders green-leaf markers. Exposes init + selection helpers.
// Relies on the global `L` from lib/leaflet/leaflet.js.

const LEAF_ICON = L.icon({
  iconUrl: 'assets/leaf.svg',
  iconSize: [22, 25],
  iconAnchor: [11, 24],
  popupAnchor: [0, -22],
  className: 'leaf-marker'
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
