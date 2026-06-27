// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// ONE-TIME generator for the map's label data files (provenance, not a live regen path —
// like the other data/build/ tooling). Pulls authoritative, public-domain Natural Earth
// vector data and writes the two small runtime files the labels overlay fetches:
//
//   data/labels/cities.json  — major populated places (name, lat, lng, rank)
//   data/labels/water.json   — oceans + major seas (name, lat, lng, rank)
//   data/labels/states.json  — first-order divisions (states/provinces) for an allowlist
//                              of countries with well-known, landrace-relevant divisions
//
// Country-name labels need no file; they are derived at runtime from world.geojson.
//
// Usage: node data/build/gen-labels.mjs   (requires network access)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'labels');
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const round = (n) => Math.round(n * 1000) / 1000; // ~110 m — ample for a label anchor

// Countries whose first-order divisions are well-known AND landrace-relevant. Matched
// against Natural Earth's admin-1 `admin` field. Edit this one list to add/drop a country.
const ADMIN1_COUNTRIES = new Set([
  'United States of America', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Colombia',
  'India', 'Pakistan', 'Afghanistan', 'Nepal', 'Thailand', 'China', 'Indonesia',
  'Morocco', 'South Africa', 'Australia', 'Russia', 'Germany'
]);

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// Area-weighted centroid of a polygon's largest ring — a representative point that lands
// inside simple/convex water bodies. Good enough for a label anchor; not a survey point.
function largestRingCentroid(geometry) {
  // Collect outer rings from Polygon / MultiPolygon.
  const rings = geometry.type === 'Polygon'
    ? [geometry.coordinates[0]]
    : geometry.coordinates.map((poly) => poly[0]);
  let best = null;
  let bestArea = -1;
  for (const ring of rings) {
    let a = 0; let cx = 0; let cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[j];
      const [x2, y2] = ring[i];
      const cross = x1 * y2 - x2 * y1;
      a += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross;
    }
    a *= 0.5;
    const area = Math.abs(a);
    if (area > bestArea && a !== 0) {
      bestArea = area;
      best = [cx / (6 * a), cy / (6 * a)]; // [lng, lat]
    }
  }
  return best;
}

async function genCities() {
  const g = await getJson(`${NE}/ne_110m_populated_places_simple.geojson`);
  const cities = g.features
    .map((f) => {
      const p = f.properties;
      const [lng, lat] = f.geometry.coordinates;
      return { name: p.name, lat: round(lat), lng: round(lng), rank: p.scalerank };
    })
    .filter((c) => c.name && Number.isFinite(c.lat) && Number.isFinite(c.lng))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  writeFileSync(join(out, 'cities.json'), `${JSON.stringify(cities, null, 0)}\n`);
  console.log(`cities.json: ${cities.length} places`);
}

async function genWater() {
  const g = await getJson(`${NE}/ne_110m_geography_marine_polys.geojson`);
  const water = g.features
    .map((f) => {
      const p = f.properties;
      const c = largestRingCentroid(f.geometry);
      if (!c) return null;
      return { name: p.name, lat: round(c[1]), lng: round(c[0]), rank: p.scalerank };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  writeFileSync(join(out, 'water.json'), `${JSON.stringify(water, null, 0)}\n`);
  console.log(`water.json: ${water.length} bodies`);
}

// First-order divisions (states/provinces/regions) for the allowlisted countries. The
// admin-1 file is a polygon set, but it carries Natural Earth's own label point in the
// latitude/longitude properties, so we read those and ignore the geometry.
async function genStates() {
  const g = await getJson(`${NE}/ne_10m_admin_1_states_provinces.geojson`);
  const states = g.features
    .filter((f) => ADMIN1_COUNTRIES.has(f.properties.admin))
    .map((f) => {
      const p = f.properties;
      const name = p.name_en || p.name; // English form (Bavaria, not Bayern), like the country labels
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { name, lat: round(lat), lng: round(lng), rank: p.scalerank };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  writeFileSync(join(out, 'states.json'), `${JSON.stringify(states, null, 0)}\n`);
  console.log(`states.json: ${states.length} divisions`);
}

await genCities();
await genWater();
await genStates();
