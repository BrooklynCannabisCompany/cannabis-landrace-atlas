import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ringsCentroid } from './refine-coords.mjs';

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const ADMIN1_URL = `${BASE}/ne_10m_admin_1_states_provinces.geojson`;
const CITIES_URL = `${BASE}/ne_10m_populated_places.geojson`;
const REGIONS_URL = `${BASE}/ne_10m_geography_regions_polys.geojson`;

// Map NE physical FEATURECLA → gazetteer src. Ranges/foothills get the foothills
// offset in decideRefinement; broad landforms are placed at their centroid. Island,
// coast, peninsula, lake, continent etc. are skipped — too vague or sea-adjacent.
const FEATURECLA_SRC = {
  'Range/mtn': 'ranges', Foothills: 'ranges',
  Plateau: 'landforms', Basin: 'landforms', Valley: 'landforms', Desert: 'landforms',
  Depression: 'landforms', Lowland: 'landforms', Plain: 'landforms', Delta: 'landforms',
  Gorge: 'landforms', Tundra: 'landforms', Wetlands: 'landforms', Geoarea: 'landforms',
};

export function gazPath() {
  return process.env.NE_GAZ_PATH || path.join(os.tmpdir(), 'ne-gazetteer.json');
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function flattenAdmin1(geojson) {
  const out = [];
  for (const f of geojson.features || []) {
    const p = f.properties || {};
    const lat = num(p.latitude), lng = num(p.longitude);
    if (!p.name || lat === null || lng === null) continue;
    out.push({ name: p.name, lat, lng, country: p.admin || '', src: 'ne-admin1' });
  }
  return out;
}

export function flattenCities(geojson) {
  const out = [];
  for (const f of geojson.features || []) {
    const p = f.properties || {};
    const lat = num(p.LATITUDE), lng = num(p.LONGITUDE);
    if (!p.NAME || lat === null || lng === null) continue;
    out.push({ name: p.NAME, lat, lng, country: p.ADM0NAME || '', src: 'ne-city' });
  }
  return out;
}

export function flattenRegions(geojson) {
  const out = [];
  for (const f of geojson.features || []) {
    const p = f.properties || {};
    const src = FEATURECLA_SRC[p.FEATURECLA];
    if (!src || !p.NAME || !f.geometry) continue;
    const [lng, lat] = ringsCentroid([f.geometry]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ name: p.NAME, lat, lng, country: '', src });
  }
  return out;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log('Downloading Natural Earth admin-1 + populated places + physical regions…');
  const [a1, cities, regions] = await Promise.all([
    fetchJson(ADMIN1_URL), fetchJson(CITIES_URL), fetchJson(REGIONS_URL),
  ]);
  const entries = [...flattenAdmin1(a1), ...flattenCities(cities), ...flattenRegions(regions)];
  const dest = gazPath();
  fs.writeFileSync(dest, JSON.stringify(entries));
  console.log(`Wrote ${entries.length} gazetteer entries to ${dest}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
