// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Graticule: latitude/longitude reference lines as an independent overlay toggle. The lines are
// pure geometry (meridians every N° from pole to pole, parallels every N° around the globe), so
// they are generated at runtime — no data file. The spacing adapts to zoom (coarser when zoomed
// out, finer when zoomed in). The equator and prime meridian are drawn a touch stronger. When
// zoomed out, degree labels are drawn along the right edge (latitudes) and bottom edge (longitudes)
// on a small canvas; they are hidden once zoomed in to avoid clutter.
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

const LAT_LIMIT = 85;      // Web Mercator clips near ±85°, so meridians run to there
const LABEL_MAX_ZOOM = 3;  // edge labels only while zoomed out (world/continent view)

// Degree label formatters (hemisphere suffix; 0 and ±180 have none).
export function fmtLat(lat) {
  return lat === 0 ? '0°' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`;
}
export function fmtLng(lng) {
  const w = ((lng % 360) + 540) % 360 - 180;   // normalize to (-180, 180]
  if (w === 0) return '0°';
  if (Math.abs(w) === 180) return '180°';
  return `${Math.abs(w)}°${w > 0 ? 'E' : 'W'}`;
}

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
  const linePane = map.getPane('graticulePane');
  linePane.style.zIndex = '421';         // above the heat tints (420), below labels (450) / markers (600)
  linePane.style.pointerEvents = 'none';

  map.createPane('graticuleLabelPane');
  const labelPane = map.getPane('graticuleLabelPane');
  labelPane.style.zIndex = '422';
  labelPane.style.pointerEvents = 'none';
  const canvas = L.DomUtil.create('canvas', 'graticule-labels', labelPane);
  const ctx = canvas.getContext('2d');
  canvas.style.display = 'none';

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

  // Rebuild the lines only when the zoom-derived step actually changes.
  function refreshLines() {
    if (!on) return;
    const step = graticuleStep(map.getZoom());
    if (step === curStep && layer) return;
    curStep = step;
    if (layer) layer.remove();
    layer = build(step);
    layer.addTo(map);
  }

  function label(text, x, y) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#3a3a34';
    ctx.fillText(text, x, y);
  }

  function drawLabels(size) {
    ctx.clearRect(0, 0, size.x, size.y);
    if (map.getZoom() > LABEL_MAX_ZOOM) return;   // only when zoomed out
    const step = graticuleStep(map.getZoom());
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    // Latitudes down the right edge (y depends on latitude alone in Web Mercator).
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let lat = Math.ceil(-LAT_LIMIT / step) * step; lat <= LAT_LIMIT; lat += step) {
      const y = map.latLngToContainerPoint([lat, 0]).y;
      if (y < 9 || y > size.y - 9) continue;
      label(fmtLat(lat), size.x - 4, y);
    }
    // Longitudes along the bottom edge (skip any that would sit under the latitude column).
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let lng = -180; lng <= 180; lng += step) {
      const x = map.latLngToContainerPoint([0, lng]).x;
      if (x < 12 || x > size.x - 22) continue;
      label(fmtLng(lng), x, size.y - 3);
    }
  }

  function resetCanvas() {
    if (!on) return;
    const size = map.getSize();
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.x * dpr;
    canvas.height = size.y * dpr;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLabels(size);
  }

  const onZoomStart = () => { canvas.style.visibility = 'hidden'; };
  const onRedraw = () => { refreshLines(); resetCanvas(); canvas.style.visibility = 'visible'; };

  function setVisible(next) {
    if (next === on) return;
    on = next;
    if (on) {
      map.on('zoomstart', onZoomStart);
      map.on('zoomend moveend resize', onRedraw);
      canvas.style.display = '';
      canvas.style.visibility = 'visible';
      refreshLines();
      resetCanvas();
    } else {
      map.off('zoomstart', onZoomStart);
      map.off('zoomend moveend resize', onRedraw);
      if (layer) { layer.remove(); layer = null; }
      curStep = 0;
      canvas.style.display = 'none';
    }
  }

  return { setVisible };
}
