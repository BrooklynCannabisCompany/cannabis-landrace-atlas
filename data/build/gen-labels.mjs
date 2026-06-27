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
// ...and the basemap geometry the hydrography/borders layers fetch:
//
//   data/geo/lakes.geojson   — major inland lakes (polygons, with `name`)
//   data/geo/rivers.geojson  — major rivers (lines, with `name`/`rank`)
//   data/geo/admin1.geojson  — admin-1 boundary lines for the allowlist (geometry only)
//
// Country-name labels need no file; they are derived at runtime from world.geojson.
//
// Usage: node data/build/gen-labels.mjs   (requires network access)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'labels');
const geoOut = join(here, '..', 'geo');
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const round = (n) => Math.round(n * 1000) / 1000; // ~110 m — ample for a label anchor

// Coordinate simplifier for rendered geometry: round to 2 decimals (~1.1 km — imperceptible
// at the app's max zoom 7) and drop consecutive duplicate points. Mirrors simplify-geojson.mjs.
const round2 = (n) => Math.round(n * 100) / 100;
function simplifyCoords(c) {
  if (typeof c[0] === 'number') return [round2(c[0]), round2(c[1])];
  const m = c.map(simplifyCoords);
  if (m.length && typeof m[0][0] === 'number') {
    const o = [];
    for (const p of m) { const l = o[o.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) o.push(p); }
    return o;
  }
  return m;
}
const writeGeo = (name, features) =>
  writeFileSync(join(geoOut, name), `${JSON.stringify({ type: 'FeatureCollection', features })}\n`);

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

// --- Basemap geometry -------------------------------------------------------

// Major inland lakes (polygons). Carries `name` (English) so the runtime can both fill the
// water and place a label. Tiny (110m, ~24 lakes), so it loads at boot and is always shown.
async function genLakes() {
  const g = await getJson(`${NE}/ne_110m_lakes.geojson`);
  const features = g.features
    .filter((f) => f.properties.name || f.properties.name_en)
    .map((f) => ({
      type: 'Feature',
      // Conventional form ("Lake Superior", "Lago Titicaca") reads better than name_en ("Superior").
      properties: { name: f.properties.name || f.properties.name_en, rank: f.properties.scalerank },
      geometry: { type: f.geometry.type, coordinates: simplifyCoords(f.geometry.coordinates) }
    }));
  writeGeo('lakes.geojson', features);
  // Label points (centroid of the largest ring) for the always-on lake labels.
  const labels = features
    .map((f) => {
      const c = largestRingCentroid(f.geometry);
      return c ? { name: f.properties.name, lat: round(c[1]), lng: round(c[0]), rank: f.properties.rank } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  writeFileSync(join(out, 'lakes.json'), `${JSON.stringify(labels, null, 0)}\n`);
  console.log(`lakes.geojson: ${features.length} lakes (+${labels.length} labels)`);
}

// Midpoint vertex of the longest line in a (Multi)LineString — a stable label anchor.
function lineMidpoint(geometry) {
  const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
  let best = null;
  let bestLen = -1;
  for (const line of lines) {
    if (line.length > bestLen) { bestLen = line.length; best = line; }
  }
  return best ? best[Math.floor(best.length / 2)] : null;
}

// Named rivers (centerlines). 50m, every named river (so notable mid-size ones like the
// Hudson and Thames — scalerank 6 — are included); carries `name`/`rank` so the runtime can
// gate the smallest to deeper zooms. Lazy-loaded by the Rivers toggle.
async function genRivers() {
  const g = await getJson(`${NE}/ne_50m_rivers_lake_centerlines.geojson`);
  const features = g.features
    .filter((f) => f.properties.name_en || f.properties.name)
    .map((f) => ({
      type: 'Feature',
      properties: { name: f.properties.name_en || f.properties.name, rank: f.properties.scalerank },
      geometry: { type: f.geometry.type, coordinates: simplifyCoords(f.geometry.coordinates) }
    }));
  writeGeo('rivers.geojson', features);
  // Label points (midpoint of each river's longest line) for the river labels.
  const labels = features
    .map((f) => {
      const m = lineMidpoint(f.geometry);
      return m ? { name: f.properties.name, lat: round(m[1]), lng: round(m[0]), rank: f.properties.rank } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  writeFileSync(join(out, 'rivers.json'), `${JSON.stringify(labels, null, 0)}\n`);
  console.log(`rivers.geojson: ${features.length} rivers (+${labels.length} labels)`);
}

// Admin-1 boundary lines for the allowlist. Hybrid source: the 50m admin-1 *lines* file
// (internal borders, no coastline) covers the big coastline-heavy countries cheaply; the
// remaining allowlist countries fall back to 50m admin-1 *polygon outlines*. Geometry only
// (labels come from states.json). Lazy-loaded by the States & Provinces toggle.
async function genAdmin1() {
  const lines = await getJson(`${NE}/ne_50m_admin_1_states_provinces_lines.geojson`);
  const covered = new Set(lines.features.map((f) => f.properties.ADM0_NAME).filter(Boolean));
  const features = [];
  for (const f of lines.features) {
    if (ADMIN1_COUNTRIES.has(f.properties.ADM0_NAME)) {
      features.push({ type: 'Feature', properties: {}, geometry: { type: f.geometry.type, coordinates: simplifyCoords(f.geometry.coordinates) } });
    }
  }
  const polys = await getJson(`${NE}/ne_50m_admin_1_states_provinces.geojson`);
  for (const f of polys.features) {
    if (ADMIN1_COUNTRIES.has(f.properties.admin) && !covered.has(f.properties.admin)) {
      features.push({ type: 'Feature', properties: {}, geometry: { type: f.geometry.type, coordinates: simplifyCoords(f.geometry.coordinates) } });
    }
  }
  writeGeo('admin1.geojson', features);
  console.log(`admin1.geojson: ${features.length} boundary features`);
}

await genCities();
await genWater();
await genStates();
await genLakes();
await genRivers();
await genAdmin1();
