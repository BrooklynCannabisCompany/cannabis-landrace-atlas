// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Flowering-time heat map: a transparent tint over the map colored by how many weeks the
// varieties in an area take to flower — bluish where flowering is shortest, reddish where it is
// longest, with NO green anywhere in the ramp (green is reserved for the leaf pins, which always
// render above this layer). The surface is a Gaussian inverse-distance average of nearby
// strains' flowering midpoints, evaluated on a coarse pixel grid and painted onto a <canvas>.
// It describes regions, so it uses each strain's TRUE coordinates, not the declustered
// sunflower-spiral render positions.
//
// `createHeat(map)` → { setPoints(points), setVisible(on) }, where points = [{ lat, lng, weeks }].
// Modeled on js/relief.js (own pane, canvas repositioned/redrawn on move/zoom, hidden during the
// zoom animation). Relies on the global `L`.

import { PANE_Z } from './panes.js';

// Color ramp (short → long). Linear RGB interpolation between stops; no stop pair passes through
// green. Kept as [t, [r, g, b]] rows so heatColor can bracket-and-lerp.
const STOPS = [
  [0.00, [0x3a, 0x6f, 0xd8]],  // blue (min anchor)
  [0.25, [0x9a, 0x50, 0xc9]],  // purple — warms early so the top half is red
  [0.50, [0xd8, 0x3f, 0x88]],  // pink-red
  [0.75, [0xf5, 0x28, 0x3e]],  // bright red-pink
  [1.00, [0xff, 0x12, 0x14]]   // vivid red (max)
];

// Peak tint opacity — this is a tint, not paint.
export const MAX_ALPHA = 0.45;
// Alpha saturation constant: larger => a lone/faraway point fades in more gradually.
const ALPHA_K = 0.6;
// Kernel width in degrees. Geographic (not pixels) so the surface shape is stable across zoom.
const SIGMA_DEG = 4;
// Absolute flowering-time anchors for the color scale, in weeks. Growers read flowering time on an
// absolute scale — under ~8w short, 8–10w normal, >10w long, >12w very long — so the ramp is pinned
// to weeks, NOT to the dataset's own min/max (which a lone ~24w outlier would otherwise stretch,
// washing typical varieties cool and making isolated ones look wrongly purple). Blue at/below
// LO_WEEKS, brightest red at/above HI_WEEKS; the dense 12–16w "very long" band spreads across the
// warm half, and everything longer clamps to red. See valueToT.
const LO_WEEKS = 8;
const HI_WEEKS = 16;
// Cells below this total kernel weight are left fully transparent (no data nearby).
const WEIGHT_EPS = 0.02;
// Grid cell size in CSS px — coarse enough to stay cheap, fine enough to read as a smooth field.
const CELL = 8;

// Ramp lookup on a normalized value t (clamped to [0,1]) → [r, g, b] ints.
export function heatColor(t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    if (x <= t1) {
      const [t0, c0] = STOPS[i - 1];
      const f = t1 === t0 ? 0 : (x - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f)
      ];
    }
  }
  return STOPS[STOPS.length - 1][1].slice();
}

// Map an absolute flowering time (weeks) to a normalized 0..1 ramp position, clamped, using the
// grower-meaningful anchors above rather than the dataset's min/max. This is what makes a 13w
// variety read reddish and keeps the long-flowering outlier from stretching the scale.
export function valueToT(weeks) {
  const t = (weeks - LO_WEEKS) / (HI_WEEKS - LO_WEEKS);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// Saturating alpha from total kernel weight: 0 weight → transparent, growing toward MAX_ALPHA
// so dense clusters read strongest and isolated points still show a faint tint.
export function heatAlpha(weight) {
  if (weight <= 0) return 0;
  return MAX_ALPHA * (1 - Math.exp(-weight / ALPHA_K));
}

export function createHeat(map) {
  map.createPane('heatPane');
  const pane = map.getPane('heatPane');
  pane.style.zIndex = String(PANE_Z.heat);   // a data tint — below the reference geometry/labels
  pane.style.pointerEvents = 'none';

  const canvas = L.DomUtil.create('canvas', 'heat-canvas', pane);
  const ctx = canvas.getContext('2d');

  // Bottom-left legend (gradient bar + real dataset min/max), shown only while the layer is on.
  const legend = L.DomUtil.create('div', 'heat-legend', map.getContainer());
  legend.hidden = true;
  // The scale is absolute (weeks), so the legend endpoints are fixed: LO_WEEKS at the blue end,
  // HI_WEEKS+ (everything longer clamps to red) at the warm end.
  legend.innerHTML =
    `<span class="heat-legend-min">${LO_WEEKS}w</span>` +
    '<span class="heat-legend-bar"></span>' +
    `<span class="heat-legend-max">${HI_WEEKS}w+</span>` +
    '<span class="heat-legend-cap">Flowering Time</span>';

  let points = null;
  let on = false;

  function draw(size) {
    ctx.clearRect(0, 0, size.x, size.y);
    if (!points || !points.length) return;

    // Cheap raw-degree viewport cull (+ kernel margin) before the per-cell kernel sum, mirroring
    // relief.js. Latitude never wraps; filter longitude only when bounds sit within [-180,180]
    // (skip near world-view / an antimeridian pan).
    const margin = 3 * SIGMA_DEG;
    const b = map.getBounds();
    const south = b.getSouth() - margin, north = b.getNorth() + margin;
    const west = b.getWest() - margin, east = b.getEast() + margin;
    const lngFilter = west >= -180 && east <= 180;
    const vis = [];
    for (const p of points) {
      if (p.lat < south || p.lat > north) continue;
      if (lngFilter && (p.lng < west || p.lng > east)) continue;
      vis.push(p);
    }
    if (!vis.length) return;

    const inv2s2 = 1 / (2 * SIGMA_DEG * SIGMA_DEG);
    for (let y = 0; y < size.y; y += CELL) {
      for (let x = 0; x < size.x; x += CELL) {
        const ll = map.containerPointToLatLng([x + CELL / 2, y + CELL / 2]);
        // Approximate equirectangular degree-distance: shrink the longitude delta by cos(lat) so
        // the kernel is roughly circular on the ground, not stretched near the poles.
        const cosLat = Math.cos(ll.lat * Math.PI / 180);
        let wsum = 0, vsum = 0;
        for (const p of vis) {
          const dlat = ll.lat - p.lat;
          const dlng = (ll.lng - p.lng) * cosLat;
          const w = Math.exp(-(dlat * dlat + dlng * dlng) * inv2s2);
          wsum += w;
          vsum += w * p.weeks;
        }
        if (wsum < WEIGHT_EPS) continue;
        const [r, g, bl] = heatColor(valueToT(vsum / wsum));
        ctx.fillStyle = `rgba(${r},${g},${bl},${heatAlpha(wsum)})`;
        ctx.fillRect(x, y, CELL, CELL);
      }
    }
  }

  function reset() {
    if (!on) return;
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

  // Same zoom trick as relief.js: hide the canvas while Leaflet scales the pane mid-zoom, redraw
  // crisply on zoomend. Panning keeps the drawn content aligned via the pane transform.
  const onZoomStart = () => { canvas.style.visibility = 'hidden'; };
  const onRedraw = () => { reset(); canvas.style.visibility = 'visible'; };

  function setVisible(next) {
    if (next === on) return;
    on = next;
    canvas.style.display = on ? '' : 'none';
    legend.hidden = !on;
    if (on) {
      map.on('zoomstart', onZoomStart);
      map.on('zoomend moveend resize', onRedraw);
      canvas.style.visibility = 'visible';
      reset();
    } else {
      map.off('zoomstart', onZoomStart);
      map.off('zoomend moveend resize', onRedraw);
    }
  }

  function setPoints(pts) {
    points = pts;
    if (on) reset();
  }

  canvas.style.display = 'none';
  return { setVisible, setPoints };
}
