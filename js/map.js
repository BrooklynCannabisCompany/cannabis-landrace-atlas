// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
// Map module: initializes Leaflet with a GeoJSON base layer (no tile provider)
// and renders green-leaf markers. Exposes init + selection helpers.
// Relies on the global `L` from lib/leaflet/leaflet.js.

// The leaf marker is a vendored single SVG file (the detailed cannabis-leaf silhouette),
// shared by every marker. A divIcon (rather than L.icon) wraps the image so the inner <img>
// can scale on hover without disturbing Leaflet's positioning transform on the outer element.
// The leaf's viewBox is 600x640 (≈0.94 aspect); the stem points down at the location.
const LEAF_ICON = L.divIcon({
  html: '<img src="assets/leaf.svg" alt="" class="leaf-img" width="26" height="28">',
  iconSize: [26, 28],
  iconAnchor: [13, 27],
  popupAnchor: [0, -26],
  className: 'leaf-marker'
});

// Highlighted icon for the currently selected variety: the same leaf turned white (CSS
// filter) inside a purple circle.
const SELECTED_ICON = L.divIcon({
  html: '<span class="sel-leaf"><img src="assets/leaf.svg" alt="" class="sel-leaf-img" width="20" height="21"></span>',
  className: 'leaf-marker-selected',
  iconSize: [30, 30],
  iconAnchor: [15, 27],
  popupAnchor: [0, -26]
});

// Toggles the selected (purple, inverted) highlight on a marker.
export function setMarkerSelected(marker, on) {
  if (marker) marker.setIcon(on ? SELECTED_ICON : LEAF_ICON);
}

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
      link.setAttribute('data-tip', 'Reset view'); // fast custom tooltip (see tooltip.js)
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

  // Replace the zoom buttons' slow native titles with the fast custom tooltip.
  const c = map.getContainer();
  const zin = c.querySelector('.leaflet-control-zoom-in');
  const zout = c.querySelector('.leaflet-control-zoom-out');
  if (zin) { zin.setAttribute('data-tip', 'Zoom in'); zin.removeAttribute('title'); }
  if (zout) { zout.setAttribute('data-tip', 'Zoom out'); zout.removeAttribute('title'); }

  return map;
}

// --- Marker declustering --------------------------------------------------
// Many varieties resolve to the same approximate point (a country/region centroid),
// so leaves pile up. We fan each pile out onto a deterministic sunflower (phyllotaxis)
// spiral. The spacing is geographic (in degrees), so the leaves spread apart as the
// user zooms in and only overlap at low zoom. SPREAD_DEG is sized so that neighbouring
// leaves clear the 24px icon at the map's max zoom (z7 ≈ 91px per degree).
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SPREAD_DEG = 0.42;  // ~38px between nearest neighbours at maxZoom 7 (icon is 24px)
const CLUSTER_EPS = 0.6;  // markers within this many degrees are treated as one pile

// Returns a Map of strain id -> [lat, lng] with co-located markers spread out.
function declusterPositions(strains) {
  const pts = strains.filter((s) => typeof s.lat === 'number' && s.lng !== null);
  // Greedy proximity clustering (small dataset; deterministic input order).
  const clusters = [];
  for (const s of pts) {
    let c = clusters.find((cl) => Math.abs(cl.lat - s.lat) < CLUSTER_EPS && Math.abs(cl.lng - s.lng) < CLUSTER_EPS);
    if (!c) { c = { lat: s.lat, lng: s.lng, members: [] }; clusters.push(c); }
    c.members.push(s);
  }
  const pos = new globalThis.Map();
  for (const c of clusters) {
    if (c.members.length === 1) {
      pos.set(c.members[0].id, [c.members[0].lat, c.members[0].lng]);
      continue;
    }
    // Stable order by id so positions don't shuffle between loads.
    const members = c.members.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    const mLat = members.reduce((t, s) => t + s.lat, 0) / members.length;
    const mLng = members.reduce((t, s) => t + s.lng, 0) / members.length;
    const cosLat = Math.cos((mLat * Math.PI) / 180) || 1; // keep pixel spacing ~circular on Mercator
    members.forEach((s, i) => {
      const r = SPREAD_DEG * Math.sqrt(i);
      const a = i * GOLDEN_ANGLE;
      pos.set(s.id, [mLat + r * Math.sin(a) * cosLat, mLng + r * Math.cos(a)]);
    });
  }
  return pos;
}

// Displaced render position per strain id (filled by addMarkers, read by flyToStrain).
let markerPositions = new globalThis.Map();

// Adds markers for every strain with coordinates. Calls onSelect(strain) on click.
// Returns a Map of strain id -> Leaflet marker for later programmatic selection.
export function addMarkers(map, strains, onSelect) {
  markerPositions = declusterPositions(strains);
  const byId = new globalThis.Map();
  for (const s of strains) {
    const at = markerPositions.get(s.id);
    if (!at) continue;
    const marker = L.marker(at, { icon: LEAF_ICON, title: s.name });
    marker.bindTooltip(s.name, { direction: 'top', offset: [0, -26] });
    marker.on('click', () => onSelect(s));
    marker.addTo(map);
    byId.set(s.id, marker);
  }
  return byId;
}

// Pans/zooms so the marker sits in the visible (left) portion when the panel is open.
// Uses the declustered render position so the view centres on the actual marker.
export function flyToStrain(map, strain) {
  if (!strain) return;
  const at = markerPositions.get(strain.id) || (typeof strain.lat === 'number' ? [strain.lat, strain.lng] : null);
  if (!at) return;
  map.flyTo(at, Math.max(map.getZoom(), 5), { duration: 0.6 });
}
