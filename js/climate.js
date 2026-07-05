// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Climate heat maps: three optional land-only tints. Two are driven by the pre-computed grid in
// data/geo/climate.json (built once from public-domain NASA POWER climatology by
// data/build/gen-climate.mjs); the third is valued from latitude. Unlike the flowering layer —
// which interpolates the varieties themselves — these are properties of place, rendered on a coarse
// grid, bilinearly sampled and clamped to land (null cells stay transparent).
//
//   temp  mean temperature over each location's 6 warmest months (°C)   — from the grid
//   rain  total precipitation over those months (mm)                    — from the grid
//   day   mean growing-season daylight (h), rounded into latitude bands — from solar geometry,
//         masked to land via the temperature grid (no data of its own)
//
// `createClimate(map)` → { setData(grid), show(metric|null) }; metric is 'temp' | 'rain' | 'day'.
// Ramps avoid green (reserved for the leaf pins). Relies on the global `L`.

// Per-metric color ramps + absolute anchors (lo→hi weeks-style, chosen for cultivation relevance,
// not the raw data min/max, so polar extremes can't stretch them). No stop pair passes through
// green. Alpha is a flat tint since the field is continuous over land.
export const METRICS = {
  temp: {
    label: 'Summer Temperature', unit: '°C', lo: 5, hi: 30, fmt: (v) => `${Math.round(v)}°C`,
    // cold blue → faint blue-pink → red. Midpoint keeps B≥G so the crossing never reads green.
    stops: [[0, [42, 111, 200]], [0.5, [240, 232, 236]], [1, [208, 52, 44]]]
  },
  rain: {
    label: 'Growing Season Rainfall', unit: 'mm', lo: 0, hi: 1000, fmt: (v) => `${Math.round(v)}mm`,
    // dry amber → mauve → wet blue. Mauve midpoint (B≥G, R≥G) avoids the grey-green crossing.
    stops: [[0, [201, 150, 58]], [0.5, [210, 196, 214]], [1, [36, 86, 168]]]
  },
  day: {
    label: 'Growing Season Daylight', unit: 'h', fmt: (v) => `${Math.round(v)}h`,
    bands: true,   // valued by latitude (solar geometry), rounded into hour bands; masked to land
    // lo/hi are set below to the actual band range. Short day (equator) bright amber-yellow → long
    // day (poles) vivid bright yellow — starts bright, but stays saturated so the steps read.
    stops: [[0, [230, 176, 34]], [1, [255, 238, 96]]]
  }
};

const MAX_ALPHA = 0.52;                // land tint (all three maps)
const CELL = 6;                        // screen sampling cell, px
const BAND_STEP = 10;                  // latitude band width, degrees (0, 10, 20, …)
const LAND = [0xe9, 0xe6, 0xdf];       // basemap land fill, for legend compositing
const MID_DOY = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];

// Astronomical day length (hours) at a latitude on a day of year.
function dayLength(latDeg, doy) {
  const lat = (latDeg * Math.PI) / 180;
  const decl = 0.409 * Math.sin((2 * Math.PI / 365) * doy - 1.39);
  const cosH = -Math.tan(lat) * Math.tan(decl);
  if (cosH <= -1) return 24;
  if (cosH >= 1) return 0;
  return (24 * Math.acos(cosH)) / Math.PI;
}

// Mean growing-season day length (hours) at a latitude: average over the 6 summer months of that
// hemisphere (≈Apr–Sep north, ≈Oct–Mar south) — the same growing-season window as the climate grid.
export function growDaylight(latDeg) {
  const months = latDeg >= 0 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
  let s = 0;
  for (const m of months) s += dayLength(latDeg, MID_DOY[m]);
  return s / 6;
}

// The daylight color scale + legend use the ACTUAL range of the drawn bands (shortest near the
// equator, longest at the poles), not a fixed guess, so the key labels match what's on screen.
{
  const vals = [];
  for (let lat = -90; lat < 90; lat += BAND_STEP) vals.push(growDaylight(lat + BAND_STEP / 2));
  METRICS.day.lo = Math.round(Math.min(...vals) * 10) / 10;
  METRICS.day.hi = Math.round(Math.max(...vals) * 10) / 10;
}

// Linear ramp lookup on a normalized value t (clamped to [0,1]) → [r,g,b] ints.
export function rampColor(stops, t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i];
    if (x <= t1) {
      const [t0, c0] = stops[i - 1];
      const f = t1 === t0 ? 0 : (x - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f)
      ];
    }
  }
  return stops[stops.length - 1][1].slice();
}

// Normalize an absolute value onto 0..1 against a metric's [lo, hi] anchors, clamped.
export function norm(v, lo, hi) {
  const t = (v - lo) / (hi - lo);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// A CSS gradient string for a legend bar: the ramp composited over land at MAX_ALPHA, so the swatch
// matches the on-map tint. Exported for reuse/testing.
export function legendGradient(stops) {
  const comp = (c) => c.map((v, i) => Math.round(v * MAX_ALPHA + LAND[i] * (1 - MAX_ALPHA)));
  const parts = stops.map(([t, c]) => `rgb(${comp(c).join(',')}) ${(t * 100).toFixed(0)}%`);
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

export function createClimate(map) {
  map.createPane('climatePane');
  const pane = map.getPane('climatePane');
  pane.style.zIndex = '419';            // beside the flowering heat pane, below labels(450)/markers(600)
  pane.style.pointerEvents = 'none';

  const canvas = L.DomUtil.create('canvas', 'heat-canvas', pane);
  const ctx = canvas.getContext('2d');

  const legend = L.DomUtil.create('div', 'heat-legend', map.getContainer());
  legend.hidden = true;
  legend.innerHTML =
    '<span class="heat-legend-min"></span>' +
    '<span class="heat-legend-bar"></span>' +
    '<span class="heat-legend-max"></span>' +
    '<span class="heat-legend-cap"></span>';

  let grid = null;       // { meta, temp[], rain[], day[] }
  let metric = null;     // 'temp' | 'rain' | 'day' | null

  // Null-aware bilinear sample of the active metric grid at (lat, lng). Returns [value, coverage]
  // where coverage is the fraction of the 4 surrounding cells that carried data (bilinear weight of
  // the present cells, 0..1) — full over land interior, falling toward 0 across a coast so the tint
  // fades into the ocean instead of painting a hard land-only edge. null when no cell is in range.
  function sample(lat, lng, key) {
    const { res, lat0, lng0, nLat, nLng } = grid.meta;
    const arr = grid[key];
    const gi = (lat - lat0) / res - 0.5;
    const gj = (lng - lng0) / res - 0.5;
    const i0 = Math.floor(gi), j0 = Math.floor(gj);
    const fi = gi - i0, fj = gj - j0;
    let wsum = 0, vsum = 0;
    for (let a = 0; a <= 1; a++) for (let b = 0; b <= 1; b++) {
      const i = i0 + a, j = j0 + b;
      if (i < 0 || i >= nLat || j < 0 || j >= nLng) continue;
      const v = arr[i * nLng + j];
      if (v == null) continue;
      const w = (a ? fi : 1 - fi) * (b ? fj : 1 - fj);
      wsum += w; vsum += w * v;
    }
    return wsum > 0.001 ? [vsum / wsum, wsum] : null;
  }

  // Daylight band labels: merge consecutive BAND_STEP bands that round to the same hour into one, so
  // there's a single label per value. Each is drawn as a small yellow sun badge (disc + rays, hours
  // inside) at the right edge — the badge keeps the value legible over any background and stops it
  // blending into place labels when zoomed in. A badge that would overlap the previous one is
  // skipped (bands bunch up toward the poles).
  function drawBandLabels(size) {
    const segs = [];
    for (let lat = -90; lat < 90; lat += BAND_STEP) {
      const v = Math.round(growDaylight(lat + BAND_STEP / 2));
      const last = segs[segs.length - 1];
      if (last && last.v === v) last.hi = lat + BAND_STEP;
      else segs.push({ lo: lat, hi: lat + BAND_STEP, v });
    }
    const R = 12, cx = size.x - 22;
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'round';
    let lastY = -Infinity;
    for (const s of segs) {
      const cy = (map.latLngToContainerPoint([s.hi, 0]).y + map.latLngToContainerPoint([s.lo, 0]).y) / 2;
      if (cy < R + 5 || cy > size.y - R - 5 || Math.abs(cy - lastY) < 2 * R + 3) continue;
      lastY = cy;
      ctx.strokeStyle = '#e0a52c';
      ctx.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (R + 2), cy + Math.sin(a) * (R + 2));
        ctx.lineTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#e0a52c';
      ctx.stroke();
      ctx.fillStyle = '#5a4a1e';
      ctx.fillText(`${s.v}h`, cx, cy);
    }
  }

  function draw(size) {
    ctx.clearRect(0, 0, size.x, size.y);
    if (!metric || !grid) return;         // every climate map (incl. daylight's land mask) needs the grid
    const m = METRICS[metric];
    const day = !!m.bands;
    for (let y = 0; y < size.y; y += CELL) {
      for (let x = 0; x < size.x; x += CELL) {
        const ll = map.containerPointToLatLng([x + CELL / 2, y + CELL / 2]);
        // Daylight is valued by latitude (rounded into hour bands, so equal neighbours merge) but
        // still masked to land via the temperature grid, so it never tints — and greens — the ocean.
        const s = sample(ll.lat, ll.lng, day ? 'temp' : metric);
        if (!s) continue;
        const val = day ? Math.round(growDaylight(ll.lat)) : s[0];
        const [r, g, b] = rampColor(m.stops, norm(val, m.lo, m.hi));
        // Coverage-scaled alpha (eased) keeps interiors solid but feathers the coastline.
        ctx.fillStyle = `rgba(${r},${g},${b},${MAX_ALPHA * Math.min(1, s[1] * 1.4)})`;
        ctx.fillRect(x, y, CELL, CELL);
      }
    }
    if (day) drawBandLabels(size);
  }

  function reset() {
    if (!metric) return;
    const size = map.getSize();
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.x * dpr;
    canvas.height = size.y * dpr;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(size);
  }

  const onZoomStart = () => { canvas.style.visibility = 'hidden'; };
  const onRedraw = () => { reset(); canvas.style.visibility = 'visible'; };

  function updateLegend() {
    const m = METRICS[metric];
    legend.querySelector('.heat-legend-min').textContent = m.fmt(m.lo);
    legend.querySelector('.heat-legend-max').textContent = m.fmt(m.hi);
    legend.querySelector('.heat-legend-bar').style.background = legendGradient(m.stops);
    legend.querySelector('.heat-legend-cap').textContent = m.label;
  }

  // Show a metric ('temp'|'rain'|'day') or hide entirely (null).
  function show(next) {
    const was = metric;
    metric = next && METRICS[next] ? next : null;
    if (metric === was) return;
    if (metric) {
      canvas.style.display = '';
      updateLegend();
      legend.hidden = false;
      if (!was) {                       // first turn-on: start listening
        map.on('zoomstart', onZoomStart);
        map.on('zoomend moveend resize', onRedraw);
      }
      canvas.style.visibility = 'visible';
      reset();
    } else {
      canvas.style.display = 'none';
      legend.hidden = true;
      map.off('zoomstart', onZoomStart);
      map.off('zoomend moveend resize', onRedraw);
    }
  }

  // The grid arrives sparse (parallel idx/temp/rain arrays over land cells only); scatter it back
  // into dense row-major arrays so sample() can index by i*nLng+j. (Daylight isn't in the grid.)
  function setData(g) {
    const n = g.meta.nLat * g.meta.nLng;
    const dense = (key) => {
      const out = new Array(n).fill(null);
      const src = g[key];
      for (let k = 0; k < g.idx.length; k++) out[g.idx[k]] = src[k];
      return out;
    };
    grid = { meta: g.meta, temp: dense('temp'), rain: dense('rain') };
    if (metric) reset();
  }

  canvas.style.display = 'none';
  return { setData, show };
}
