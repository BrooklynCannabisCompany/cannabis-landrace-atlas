import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const ADMIN1_URL = `${BASE}/ne_10m_admin_1_states_provinces.geojson`;
const CITIES_URL = `${BASE}/ne_10m_populated_places.geojson`;

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

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log('Downloading Natural Earth admin-1 + populated places…');
  const [a1, cities] = await Promise.all([fetchJson(ADMIN1_URL), fetchJson(CITIES_URL)]);
  const entries = [...flattenAdmin1(a1), ...flattenCities(cities)];
  const dest = gazPath();
  fs.writeFileSync(dest, JSON.stringify(entries));
  console.log(`Wrote ${entries.length} gazetteer entries to ${dest}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
