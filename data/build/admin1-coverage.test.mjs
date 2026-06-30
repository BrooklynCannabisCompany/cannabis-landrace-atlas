// Regression guard: the States & Provinces overlay (data/geo/admin1.geojson) must carry
// internal border geometry for every allowlisted country. Natural Earth's 50m admin-1 lines
// file omits several countries (Mexico, Colombia, Thailand, …) entirely, which left the
// overlay empty there until genAdmin1 (gen-labels.mjs) backfilled them from the 10m lines.
//
// Each box below sits deep in a country's interior, where only first-order (state/province)
// borders run — no international boundary or coastline. So a vertex landing inside proves a
// real internal border is present. Before the fix every box held zero vertices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GEO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'geo', 'admin1.geojson');
const admin1 = JSON.parse(fs.readFileSync(GEO, 'utf8'));

// [west, east, south, north] — interior of each country the 50m lines file omits.
const INTERIOR_BBOX = {
  Mexico: [-103, -100, 21, 24],
  Argentina: [-64, -61, -34, -31],
  Colombia: [-75, -73, 4, 7],
  Pakistan: [71, 73, 30, 32],
  Afghanistan: [66, 68, 33, 35],
  Nepal: [83, 85, 27.5, 28.5],
  Thailand: [100, 102, 15, 17],
  Morocco: [-7, -5, 32, 34],
  Germany: [9, 11, 50, 52],
};

function* coords(geom) {
  const stack = [geom.coordinates];
  while (stack.length) {
    const c = stack.pop();
    if (typeof c[0] === 'number') yield c;
    else for (const x of c) stack.push(x);
  }
}

function vertexCountInBox([w, e, s, n]) {
  let count = 0;
  for (const f of admin1.features) {
    for (const [x, y] of coords(f.geometry)) {
      if (x >= w && x <= e && y >= s && y <= n) count++;
    }
  }
  return count;
}

for (const [country, box] of Object.entries(INTERIOR_BBOX)) {
  test(`admin1.geojson has interior province borders for ${country}`, () => {
    assert.ok(
      vertexCountInBox(box) > 0,
      `${country}'s interior has no admin-1 border geometry — States & Provinces overlay is empty there`,
    );
  });
}
