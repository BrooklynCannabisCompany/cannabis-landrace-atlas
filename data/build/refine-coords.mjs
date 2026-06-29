import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAZ_FILES = ['states', 'cities', 'ranges', 'peaks', 'landforms', 'lakes', 'rivers'];

export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function loadGazetteer(labelsDir) {
  const gaz = new Map();
  for (const src of GAZ_FILES) {
    const file = path.join(labelsDir, `${src}.json`);
    if (!fs.existsSync(file)) continue;
    const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const e of entries) {
      if (typeof e.lat !== 'number' || typeof e.lng !== 'number' || !e.name) continue;
      const key = normalize(e.name);
      if (!key) continue;
      const rec = { name: e.name, lat: e.lat, lng: e.lng, src, rank: e.rank ?? 99 };
      if (!gaz.has(key)) gaz.set(key, []);
      gaz.get(key).push(rec);
    }
  }
  return gaz;
}

const SRC_PRIORITY = { states: 0, cities: 1, ranges: 2, peaks: 2, landforms: 2, lakes: 3, rivers: 3 };

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(haystack, gaz) {
  const norm = normalize(haystack);
  const out = [];
  for (const [name, candidates] of gaz) {
    if (name.length < 3) continue;
    const re = new RegExp(`\\b${escapeRe(name)}\\b`);
    if (re.test(norm)) out.push({ matchedName: name, candidates });
  }
  return out;
}

function bestMatch(matches) {
  if (!matches.length) return null;
  matches.sort((a, b) => {
    if (b.matchedName.length !== a.matchedName.length) return b.matchedName.length - a.matchedName.length;
    const pa = Math.min(...a.candidates.map(c => SRC_PRIORITY[c.src] ?? 9));
    const pb = Math.min(...b.candidates.map(c => SRC_PRIORITY[c.src] ?? 9));
    return pa - pb;
  });
  return matches[0];
}

export function matchPlace(record, gaz) {
  return (
    bestMatch(findMatches(record.name || '', gaz)) ||
    bestMatch(findMatches(record.region || '', gaz)) ||
    null
  );
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPoly(point, rings) {
  // even-odd across outer ring + holes: inside outer, outside holes
  let inside = false;
  for (const ring of rings) if (pointInRing(point, ring)) inside = !inside;
  return inside;
}

export function pointInPolygon(point, geometry) {
  if (geometry.type === 'Polygon') return pointInPoly(point, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some(poly => pointInPoly(point, poly));
  return false;
}

const COUNTRY_ALIASES = {
  'alaska': ['united states of america'],
  'hawaii': ['united states of america'],
  'drc': ['dem. rep. congo'],
  'dr congo': ['dem. rep. congo'],
  'baltics': ['estonia', 'latvia', 'lithuania'],
  'crimea': ['ukraine', 'russia'],
};

export function buildCountryIndex(world) {
  const idx = new Map();
  for (const f of world.features) {
    const p = f.properties || {};
    for (const key of [p.NAME, p.ADMIN, p.NAME_LONG]) {
      if (!key) continue;
      const k = key.toLowerCase();
      if (!idx.has(k)) idx.set(k, []);
      if (!idx.get(k).includes(f.geometry)) idx.get(k).push(f.geometry);
    }
  }
  return idx;
}

export function resolveCountry(country, index) {
  const lc = String(country || '').toLowerCase();
  for (const t of [lc, lc.replace(/\s*&\s*/g, ' and ')]) {
    if (index.has(t)) return index.get(t);
  }
  const aliases = COUNTRY_ALIASES[lc];
  if (aliases) {
    const geos = [];
    for (const a of aliases) if (index.has(a)) geos.push(...index.get(a));
    if (geos.length) return geos;
  }
  return [];
}

export function inAny(point, geometries) {
  return geometries.some(g => pointInPolygon(point, g));
}

export function ringsCentroid(geometries) {
  let sx = 0, sy = 0, n = 0;
  for (const g of geometries) {
    const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
    for (const poly of polys) {
      for (const [x, y] of poly[0]) { sx += x; sy += y; n++; }
    }
  }
  return n ? [sx / n, sy / n] : [0, 0];
}

export function foothillsOffset(point, centroid, deg = 0.25) {
  const dx = centroid[0] - point[0];
  const dy = centroid[1] - point[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return [point[0], point[1]];
  return [point[0] + (dx / len) * deg, point[1] + (dy / len) * deg];
}

export function inWater(point, lakeGeometries) {
  return lakeGeometries.some(g => pointInPolygon(point, g));
}

export function nudgeToLand(point, geometries, lakeGeometries, centroid) {
  const dx = centroid[0] - point[0];
  const dy = centroid[1] - point[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  for (let i = 0; i <= 25; i++) {
    const p = [point[0] + ux * 0.1 * i, point[1] + uy * 0.1 * i];
    if (inAny(p, geometries) && !inWater(p, lakeGeometries)) return p;
  }
  return null;
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function round3(n) { return Math.round(n * 1000) / 1000; }

function centroidFor(country, geos, cache) {
  if (!cache.has(country)) cache.set(country, ringsCentroid(geos));
  return cache.get(country);
}

export function decideRefinement(record, ctx) {
  const { gaz, countryIndex, lakes, centroidCache } = ctx;
  const m = matchPlace(record, gaz);
  if (!m) return { action: 'none', reason: 'no-place' };

  const geos = resolveCountry(record.country, countryIndex);
  if (!geos.length) return { action: 'none', reason: 'country-unresolved', matched: m.matchedName };

  const inCountry = m.candidates.filter(c => inAny([c.lng, c.lat], geos));
  if (!inCountry.length) {
    return { action: 'reject-country', matched: m.matchedName, reason: 'match only outside country' };
  }
  if (inCountry.length >= 2) {
    const spread = Math.max(...inCountry.map(c =>
      Math.max(...inCountry.map(d => Math.hypot(c.lng - d.lng, c.lat - d.lat)))));
    if (spread > 1.0) return { action: 'ambiguous', matched: m.matchedName, reason: 'multiple in-country matches' };
  }

  inCountry.sort((a, b) => (SRC_PRIORITY[a.src] - SRC_PRIORITY[b.src]) || (a.rank - b.rank));
  const chosen = inCountry[0];
  let pt = [chosen.lng, chosen.lat];

  if (chosen.src === 'peaks' || chosen.src === 'ranges') {
    pt = foothillsOffset(pt, centroidFor(record.country, geos, centroidCache));
  }

  if (!inAny(pt, geos) || inWater(pt, lakes)) {
    const safe = nudgeToLand(pt, geos, lakes, centroidFor(record.country, geos, centroidCache));
    if (!safe) return { action: 'reject-water', matched: m.matchedName };
    pt = safe;
  }

  const lat = round3(pt[1]), lng = round3(pt[0]);
  if (lat === record.lat && lng === record.lng) return { action: 'none', reason: 'already-placed', matched: m.matchedName };
  return {
    action: 'move', lat, lng, matched: m.matchedName,
    distanceKm: Math.round(haversineKm(record.lat, record.lng, lat, lng)),
  };
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..');

export function run({ dryRun = false } = {}) {
  const labelsDir = path.join(DATA, 'labels');
  const data = JSON.parse(fs.readFileSync(path.join(DATA, 'landraces.json'), 'utf8'));
  const world = JSON.parse(fs.readFileSync(path.join(DATA, 'world.geojson'), 'utf8'));
  const lakesGeo = JSON.parse(fs.readFileSync(path.join(DATA, 'geo', 'lakes.geojson'), 'utf8'));
  const ctx = {
    gaz: loadGazetteer(labelsDir),
    countryIndex: buildCountryIndex(world),
    lakes: lakesGeo.features.map(f => f.geometry),
    centroidCache: new Map(),
  };
  const report = { moved: [], mountains: [], rejectedCountry: [], rejectedWater: [], ambiguous: [], none: 0 };

  for (const r of data) {
    const d = decideRefinement(r, ctx);
    const tag = { name: r.name, country: r.country, matched: d.matched };
    switch (d.action) {
      case 'move': {
        const entry = { ...tag, from: [r.lat, r.lng], lat: d.lat, lng: d.lng, distanceKm: d.distanceKm };
        report.moved.push(entry);
        const cands = ctx.gaz.get(d.matched) || [];
        if (cands.some(c => c.src === 'peaks' || c.src === 'ranges')) report.mountains.push(entry);
        if (!dryRun) { r.lat = d.lat; r.lng = d.lng; }
        break;
      }
      case 'reject-country': report.rejectedCountry.push({ ...tag, reason: d.reason }); break;
      case 'reject-water': report.rejectedWater.push(tag); break;
      case 'ambiguous': report.ambiguous.push({ ...tag, reason: d.reason }); break;
      default: report.none++;
    }
  }

  if (!dryRun) {
    fs.writeFileSync(path.join(DATA, 'landraces.json'), JSON.stringify(data, null, 2) + '\n');
  }
  return report;
}

function printReport(report) {
  const line = (e) => `  ${e.name} (${e.country})  →  ${e.lat},${e.lng}  [${e.matched}, ${e.distanceKm}km]`;
  console.log(`\n✅ Moved: ${report.moved.length}`);
  for (const e of report.moved) console.log(line(e));
  console.log(`\n⛰️  Mountain (foothills offset) — review: ${report.mountains.length}`);
  for (const e of report.mountains) console.log(line(e));
  console.log(`\n🚫 Rejected — would cross country: ${report.rejectedCountry.length}`);
  for (const e of report.rejectedCountry) console.log(`  ${e.name} (${e.country}) [${e.matched}]`);
  console.log(`\n💧 Rejected — water, unresolvable: ${report.rejectedWater.length}`);
  for (const e of report.rejectedWater) console.log(`  ${e.name} (${e.country}) [${e.matched}]`);
  console.log(`\n❓ Needs your call (ambiguous): ${report.ambiguous.length}`);
  for (const e of report.ambiguous) console.log(`  ${e.name} (${e.country}) [${e.matched}]`);
  console.log(`\n⏭️  No place found / already placed: ${report.none}`);
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const report = run({ dryRun });
  printReport(report);
  console.log(`\n${dryRun ? 'DRY RUN — no files written.' : 'Applied to data/landraces.json.'}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
