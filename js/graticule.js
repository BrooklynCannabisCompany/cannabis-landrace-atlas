// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Graticule: latitude/longitude reference lines as an independent overlay toggle. The lines are
// pure geometry (meridians every N° from pole to pole, parallels every N° around the globe), so
// they are generated at runtime — no data file. The spacing adapts to zoom (coarser when zoomed
// out, finer when zoomed in). The equator and prime meridian are drawn a touch stronger.
//
// `createGraticule(map)` → { setVisible(on) }. Relies on the global `L`.

// Degree spacing between lines for a given zoom — halves roughly as you zoom in.
export function graticuleStep(zoom) {
  if (zoom <= 2) return 30;
  if (zoom <= 3) return 20;
  if (zoom <= 4) return 10;
  if (zoom <= 5) return 5;
  if (zoom <= 6) return 2;
  return 1;
}

const LAT_LIMIT = 85;   // Web Mercator clips near ±85°, so meridians run to there

function line(coords, major) {
  return { type: 'Feature', properties: { major }, geometry: { type: 'LineString', coordinates: coords } };
}

// Build the graticule FeatureCollection at a given degree step.
export function graticuleFeatures(step) {
  const features = [];
  for (let lng = -180; lng <= 180; lng += step) {
    features.push(line([[lng, -LAT_LIMIT], [lng, LAT_LIMIT]], lng === 0));
  }
  const lat0 = Math.ceil(-LAT_LIMIT / step) * step;
  for (let lat = lat0; lat <= LAT_LIMIT; lat += step) {
    features.push(line([[-180, lat], [180, lat]], lat === 0));
  }
  return { type: 'FeatureCollection', features };
}

export function createGraticule(map) {
  map.createPane('graticulePane');
  const pane = map.getPane('graticulePane');
  pane.style.zIndex = '421';            // above the heat tints (420), below labels (450) / markers (600)
  pane.style.pointerEvents = 'none';

  let layer = null;
  let on = false;
  let curStep = 0;

  function build(step) {
    return L.geoJSON(graticuleFeatures(step), {
      pane: 'graticulePane',
      interactive: false,
      style: (f) => ({
        color: '#4a4a44',
        weight: f.properties.major ? 0.9 : 0.5,
        opacity: f.properties.major ? 0.5 : 0.3
      })
    });
  }

  // Rebuild only when the zoom-derived step actually changes.
  function refresh() {
    if (!on) return;
    const step = graticuleStep(map.getZoom());
    if (step === curStep && layer) return;
    curStep = step;
    if (layer) layer.remove();
    layer = build(step);
    layer.addTo(map);
  }

  function setVisible(next) {
    if (next === on) return;
    on = next;
    if (on) {
      map.on('zoomend', refresh);
      refresh();
    } else {
      map.off('zoomend', refresh);
      if (layer) { layer.remove(); layer = null; }
      curStep = 0;
    }
  }

  return { setVisible };
}
