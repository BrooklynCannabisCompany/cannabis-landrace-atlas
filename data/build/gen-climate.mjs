// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// ONE-TIME build script (provenance, not a live regen path — like gen-labels.mjs). Fetches public-
// domain NASA POWER climatology (MERRA-2, 2001–2020) and writes data/geo/climate.json: a coarse
// global, land-only grid with two per-cell values that drive the climate heat maps —
//
//   summerTemp   mean 2m air temperature over each location's 6 warmest months (°C)
//   growRain     total precipitation over those same 6 months (mm)
//
// "6 warmest months" is the growing-season proxy, chosen per cell from the monthly temperatures, so
// it is automatically hemisphere-correct (≈Apr–Sep north, ≈Oct–Mar south). The growing-season
// daylight map is NOT built here — it is pure solar geometry, drawn as latitude bands in the
// browser (js/climate.js). Run manually with network access:
//   node data/build/gen-climate.mjs
// Tiles are cached under data/build/.cache-climate/ so re-runs don't refetch.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CACHE = join(__dirname, '.cache-climate');
if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });

const OUT_RES = 1;                 // output grid resolution, degrees
const N_LAT = 180 / OUT_RES;       // 90
const N_LNG = 360 / OUT_RES;       // 180
const TILE = 10;                   // NASA POWER regional max extent per request (degrees)
const CONCURRENCY = 6;
const PARAMS = { T2M: 'T2M', RAIN: 'PRECTOTCORR' };
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Poleward of ±POLAR_LAT, average each POLAR_BLOCK×POLAR_BLOCK cell block to one value so the high
// Arctic and Antarctica stay on the temp/rain maps but at lower resolution (no cultivation detail
// there). Growing-season daylight is NOT in this grid — the browser draws it as latitude bands.
const POLAR_LAT = 60;
const POLAR_BLOCK = 3;

// --- Point-in-polygon land mask from Natural Earth Admin-0 (data/world.geojson) ---
function buildLandTest() {
  const world = JSON.parse(readFileSync(join(ROOT, 'data', 'world.geojson'), 'utf8'));
  // Flatten to [rings, bbox] where rings is an array of linear rings (outer + holes) and even-odd
  // ray casting across all a polygon's rings handles holes (lakes) correctly.
  const polys = [];
  for (const f of world.features) {
    const g = f.geometry;
    if (!g) continue;
    const chunks = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const rings of chunks) {
      let minX = 180, minY = 90, maxX = -180, maxY = -90;
      for (const ring of rings) for (const [x, y] of ring) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      polys.push({ rings, bbox: [minX, minY, maxX, maxY] });
    }
  }
  const inRing = (x, y, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  return (x, y) => {
    for (const p of polys) {
      const [minX, minY, maxX, maxY] = p.bbox;
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      let inside = false;
      for (const ring of p.rings) if (inRing(x, y, ring)) inside = !inside;
      if (inside) return true;
    }
    return false;
  };
}

// --- Fetch one regional tile for one parameter, with on-disk cache + retry ---
async function fetchTile(param, latMin, lngMin) {
  const key = `${param}_${latMin}_${lngMin}.json`;
  const cached = join(CACHE, key);
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8'));
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/regional?parameters=${param}` +
    `&community=AG&latitude-min=${latMin}&latitude-max=${latMin + TILE}` +
    `&longitude-min=${lngMin}&longitude-max=${lngMin + TILE}&format=JSON`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j.features) throw new Error(`no features: ${JSON.stringify(j.messages || j.header)}`);
      writeFileSync(cached, JSON.stringify(j));
      return j;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
  }
}

async function pool(items, worker, size) {
  const results = [];
  let i = 0;
  async function run() { while (i < items.length) { const idx = i++; results[idx] = await worker(items[idx], idx); } }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run));
  return results;
}

async function main() {
  console.log('Building land mask from data/world.geojson…');
  const isLand = buildLandTest();

  // Output cell centers + which are land. A cell counts as land if ANY point on a dense sub-lattice
  // across it is land, so small islands and thin coasts (Tahiti, the Dutch coast, the Caribbean)
  // aren't dropped just because the cell centre falls on water. SUB sub-samples each cell finer
  // than most inhabited islands.
  const cellLat = (i) => -90 + (i + 0.5) * OUT_RES;
  const cellLng = (j) => -180 + (j + 0.5) * OUT_RES;
  const SUB = 6;
  const cellIsLand = (la, lo) => {
    const la0 = la - OUT_RES / 2, lo0 = lo - OUT_RES / 2;
    for (let a = 0; a < SUB; a++) for (let b = 0; b < SUB; b++) {
      if (isLand(lo0 + ((b + 0.5) / SUB) * OUT_RES, la0 + ((a + 0.5) / SUB) * OUT_RES)) return true;
    }
    return false;
  };
  const landCell = new Uint8Array(N_LAT * N_LNG);
  let landCount = 0;
  for (let i = 0; i < N_LAT; i++) for (let j = 0; j < N_LNG; j++) {
    if (cellIsLand(cellLat(i), cellLng(j))) { landCell[i * N_LNG + j] = 1; landCount++; }
  }
  console.log(`Land cells: ${landCount} / ${N_LAT * N_LNG}`);

  // 10° tiles that contain at least one land cell.
  const tiles = [];
  for (let latMin = -90; latMin < 90; latMin += TILE) {
    for (let lngMin = -180; lngMin < 180; lngMin += TILE) {
      let hasLand = false;
      for (let i = 0; i < N_LAT && !hasLand; i++) {
        const la = cellLat(i); if (la < latMin || la >= latMin + TILE) continue;
        for (let j = 0; j < N_LNG; j++) {
          const lo = cellLng(j); if (lo < lngMin || lo >= lngMin + TILE) continue;
          if (landCell[i * N_LNG + j]) { hasLand = true; break; }
        }
      }
      if (hasLand) tiles.push([latMin, lngMin]);
    }
  }
  console.log(`Tiles to fetch (land-touching): ${tiles.length} (×2 params = ${tiles.length * 2} requests)`);

  // Accumulators per output cell. Two sets: interior land points (preferred) and ALL points in a
  // flagged-land cell (a maritime fallback for islands/coasts too small to contain a land sample).
  const sumT = new Float64Array(N_LAT * N_LNG);
  const sumR = new Float64Array(N_LAT * N_LNG);
  const cnt = new Uint32Array(N_LAT * N_LNG);
  const allT = new Float64Array(N_LAT * N_LNG);
  const allR = new Float64Array(N_LAT * N_LNG);
  const allCnt = new Uint32Array(N_LAT * N_LNG);

  let done = 0;
  await pool(tiles, async ([latMin, lngMin]) => {
    const [tj, rj] = await Promise.all([fetchTile(PARAMS.T2M, latMin, lngMin), fetchTile(PARAMS.RAIN, latMin, lngMin)]);
    // Index rain features by "lng,lat" so we can pair them with temperature features.
    const rainAt = new Map();
    for (const f of rj.features) rainAt.set(f.geometry.coordinates.slice(0, 2).join(','), f.properties.parameter.PRECTOTCORR);
    for (const f of tj.features) {
      const [lng, lat] = f.geometry.coordinates;
      const t = f.properties.parameter.T2M;
      const rain = rainAt.get([lng, lat].join(','));
      if (!t || !rain) continue;
      const temps = MONTHS.map((m) => t[m]);
      const rains = MONTHS.map((m) => rain[m]);
      if (temps.some((v) => v <= -900) || rains.some((v) => v <= -900)) continue;
      const i = Math.min(N_LAT - 1, Math.max(0, Math.floor((lat + 90) / OUT_RES)));
      const j = Math.min(N_LNG - 1, Math.max(0, Math.floor((lng + 180) / OUT_RES)));
      const idx = i * N_LNG + j;
      if (!landCell[idx]) continue;                 // only fill flagged-land cells
      // 6 warmest months (indices), hemisphere-correct by construction.
      const warm = temps.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]).slice(0, 6).map((p) => p[1]);
      let mt = 0, mr = 0;
      for (const k of warm) {
        mt += temps[k];
        mr += rains[k] * DAYS_IN_MONTH[k];          // mm/day → mm over the month
      }
      mt /= 6;
      allT[idx] += mt; allR[idx] += mr; allCnt[idx]++;
      if (isLand(lng, lat)) { sumT[idx] += mt; sumR[idx] += mr; cnt[idx]++; }
    }
    done++;
    if (done % 25 === 0 || done === tiles.length) console.log(`  fetched ${done}/${tiles.length} tiles`);
  }, CONCURRENCY);

  // Finalize grid (row-major, null where no data).
  const temp = new Array(N_LAT * N_LNG).fill(null);
  const rain = new Array(N_LAT * N_LNG).fill(null);
  for (let idx = 0; idx < N_LAT * N_LNG; idx++) {
    // Prefer interior-land points; fall back to the local (maritime) average for tiny islands.
    const [n, st, sr] = cnt[idx]
      ? [cnt[idx], sumT[idx], sumR[idx]]
      : [allCnt[idx], allT[idx], allR[idx]];
    if (!n) continue;
    temp[idx] = Math.round((st / n) * 10) / 10;
    rain[idx] = Math.round(sr / n);
  }

  // Coarsen the poles (see POLAR_LAT/POLAR_BLOCK): average each block to one replicated value.
  const coarsenPoles = (arr, prec) => {
    const p = 10 ** prec;
    for (let i0 = 0; i0 < N_LAT; i0 += POLAR_BLOCK) {
      if (Math.abs(-90 + (i0 + POLAR_BLOCK / 2) * OUT_RES) <= POLAR_LAT) continue;
      for (let j0 = 0; j0 < N_LNG; j0 += POLAR_BLOCK) {
        let s = 0, n = 0;
        for (let i = i0; i < Math.min(i0 + POLAR_BLOCK, N_LAT); i++)
          for (let j = j0; j < Math.min(j0 + POLAR_BLOCK, N_LNG); j++) {
            const v = arr[i * N_LNG + j]; if (v != null) { s += v; n++; }
          }
        if (!n) continue;
        const avg = Math.round((s / n) * p) / p;
        for (let i = i0; i < Math.min(i0 + POLAR_BLOCK, N_LAT); i++)
          for (let j = j0; j < Math.min(j0 + POLAR_BLOCK, N_LNG); j++)
            if (arr[i * N_LNG + j] != null) arr[i * N_LNG + j] = avg;
      }
    }
  };
  coarsenPoles(temp, 1);
  coarsenPoles(rain, 0);

  // Robust color ranges (p2..p98) so an outlier cell doesn't stretch a ramp.
  const pct = (arr, p) => {
    const v = arr.filter((x) => x != null).sort((a, b) => a - b);
    return v.length ? v[Math.floor(p * (v.length - 1))] : 0;
  };
  const ranges = {
    temp: [pct(temp, 0.02), pct(temp, 0.98)],
    rain: [pct(rain, 0.02), pct(rain, 0.98)]
  };
  const filled = temp.filter((x) => x != null).length;
  console.log(`Filled cells: ${filled}. Ranges`, ranges);

  // Store SPARSE — only filled (land) cells — to avoid ~40k JSON "null"s per array. The browser
  // (js/climate.js setData) scatters these back into dense grids on load.
  const idx = [], tArr = [], rArr = [];
  for (let k = 0; k < N_LAT * N_LNG; k++) {
    if (temp[k] == null) continue;
    idx.push(k); tArr.push(temp[k]); rArr.push(rain[k]);
  }
  const out = {
    meta: {
      source: 'NASA POWER climatology (MERRA-2, 2001–2020), public domain',
      generated: 'gen-climate.mjs',
      res: OUT_RES, lat0: -90, lng0: -180, nLat: N_LAT, nLng: N_LNG,
      season: '6 warmest months per cell (hemisphere-correct growing-season proxy)',
      units: { temp: '°C', rain: 'mm' },
      ranges
    },
    idx, temp: tArr, rain: rArr    // sparse: parallel arrays keyed by idx (row-major cell)
  };
  const outPath = join(ROOT, 'data', 'geo', 'climate.json');
  writeFileSync(outPath, JSON.stringify(out));
  console.log(`Wrote ${outPath} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB, ${idx.length} cells)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
