// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Triangle-relief layer: draws mountain ranges as a field of small filled triangles (and the
// named peaks as slightly larger accent triangles) on a <canvas>, giving a topographic feel
// while staying vector/tile-free. The range scatter is data/geo/relief.json (compact
// [lat, lng, r, lvl] rows); peaks come from data/labels/peaks.json. Roughly constant on-screen
// size — triangles do not bloat as you zoom. Sits above the land basemap, below the labels.
//
// `createRelief(map, peaks)` → { setScatter(rows), setVisible(on) }. Relies on the global `L`.

import { peakMinZoom, peakSizeTier, reliefMaxLevel } from './labels.js';

const FILL = '#8a6f57';
const EDGE = 'rgba(94, 75, 55, 0.85)';

// Base on-screen triangle size (px) by zoom — kept small per the chosen style.
function baseSize(zoom) {
  if (zoom <= 3) return 0.9;
  if (zoom <= 4) return 1.1;
  if (zoom <= 5) return 1.3;
  if (zoom <= 6) return 1.6;
  return 1.9;
}

export function createRelief(map, peaks) {
  map.createPane('reliefPane');
  const pane = map.getPane('reliefPane');
  pane.style.zIndex = '411';            // above lakes (410), below borders/rivers/labels
  pane.style.pointerEvents = 'none';

  const canvas = L.DomUtil.create('canvas', 'relief-canvas', pane);
  const ctx = canvas.getContext('2d');
  let scatter = null;
  let on = false;

  function triPath(x, y, s) {
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.85, y + s * 0.7);
    ctx.lineTo(x - s * 0.85, y + s * 0.7);
    ctx.closePath();
  }

  function draw(topLeft, size) {
    ctx.clearRect(0, 0, size.x, size.y);
    const z = map.getZoom();
    const base = baseSize(z);
    const pad = 12;

    // Range scatter: cull to viewport, gate by level, sort back-to-front for overlap depth.
    if (scatter) {
      const maxLvl = reliefMaxLevel(z);
      const items = [];
      for (const row of scatter) {
        if (row[3] > maxLvl) continue;
        const p = map.latLngToLayerPoint([row[0], row[1]]).subtract(topLeft);
        if (p.x < -pad || p.y < -pad || p.x > size.x + pad || p.y > size.y + pad) continue;
        const r = row[2];
        items.push([p.x, p.y, base * (0.55 + r * r * 2.4), 0.55 + r * 0.4]);
      }
      items.sort((a, b) => a[1] - b[1]);
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = EDGE;
      for (const [x, y, s, alpha] of items) {
        ctx.beginPath();
        triPath(x, y, s);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = FILL;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
      }
    }

    // Named peaks: larger accent triangles by elevation tier, on top.
    if (peaks) {
      const pts = [];
      for (const pk of peaks) {
        if (peakMinZoom(pk.rank) > z) continue;
        const p = map.latLngToLayerPoint([pk.lat, pk.lng]).subtract(topLeft);
        if (p.x < -pad || p.y < -pad || p.x > size.x + pad || p.y > size.y + pad) continue;
        pts.push([p.x, p.y, base * (1.2 + peakSizeTier(pk.elev) * 0.7)]);
      }
      pts.sort((a, b) => a[1] - b[1]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#7a6a57';
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = 'rgba(94, 75, 55, 1)';
      for (const [x, y, s] of pts) {
        ctx.beginPath();
        triPath(x, y, s);
        ctx.fill();
        ctx.stroke();
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
    draw(topLeft, size);
  }
  const onMove = () => reset();

  function setVisible(next) {
    if (next === on) return;
    on = next;
    canvas.style.display = on ? '' : 'none';
    if (on) { map.on('moveend zoomend resize', onMove); reset(); }
    else map.off('moveend zoomend resize', onMove);
  }
  function setScatter(rows) {
    scatter = rows;
    if (on) reset();
  }

  canvas.style.display = 'none';
  return { setVisible, setScatter };
}
