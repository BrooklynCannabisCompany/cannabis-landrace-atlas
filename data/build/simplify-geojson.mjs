// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Shrinks data/world.geojson by rounding coordinates to a fixed precision and dropping
// consecutive duplicate points. At the app's max zoom (7) two decimals (~1.1 km) is
// imperceptible, but it removes the long decimal tails that dominate the file size.
// Idempotent. Usage: node data/build/simplify-geojson.mjs [decimals]

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, '..', 'world.geojson');
const decimals = Number(process.argv[2] || 2);
const factor = 10 ** decimals;
const round = (n) => Math.round(n * factor) / factor;

// Rounds every [lng,lat] pair and removes consecutive duplicates within each ring/line.
function simplify(coords) {
  if (typeof coords[0] === 'number') return [round(coords[0]), round(coords[1])];
  const mapped = coords.map(simplify);
  if (typeof mapped[0][0] === 'number') { // a ring or line of points
    const out = [];
    for (const p of mapped) {
      const last = out[out.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
    }
    return out;
  }
  return mapped;
}

const before = statSync(path).size;
const geo = JSON.parse(readFileSync(path, 'utf8'));
for (const f of geo.features) {
  if (f.geometry && f.geometry.coordinates) f.geometry.coordinates = simplify(f.geometry.coordinates);
}
writeFileSync(path, JSON.stringify(geo));
const after = statSync(path).size;
console.log(`world.geojson: ${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(2)} MB (${decimals} decimals, ${geo.features.length} features)`);
