# Name-based Pin Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a manual build script that relocates landrace map pins from country centroids to real sub-country locations by matching place names embedded in each variety's `name`/`region` against the local Natural Earth gazetteer.

**Architecture:** A single ES-module build tool, `data/build/refine-coords.mjs`, exporting small pure helpers (normalize → gazetteer → match → geometry guards → per-record decision) plus a `run()`/`main()` that loads the real data, applies confident matches, writes `data/landraces.json`, and prints a report. Pure helpers are unit-tested in `data/build/refine-coords.test.mjs` with the Node built-in test runner. No runtime/UI code changes.

**Tech Stack:** Plain Node ES modules (`.mjs`), `node:test`, `node:fs`. No dependencies (repo has none).

## Global Constraints

- **No new dependencies.** Use only Node built-ins (`node:fs`, `node:path`, `node:test`, `node:assert`). `devDependencies` is and stays empty.
- **`.geojson` files are NOT requireable** — Node only auto-parses `.json`. Read `data/world.geojson` and `data/geo/lakes.geojson` with `fs.readFileSync` + `JSON.parse`. The `data/labels/*.json` files may be loaded with either.
- **Tool lives under `data/build/`** (pipeline/provenance tooling), never wired into the runtime site. `data/landraces.json` is the only runtime file touched, and only its `lat`/`lng` numbers change; `coordsApproximate` stays `true`; no other fields change.
- **Preserve file formatting exactly.** `data/landraces.json` equals `JSON.stringify(data, null, 2) + "\n"`. Write it back that exact way so the git diff contains only changed coordinates.
- **Coordinates rounded to 3 decimals** (gazetteer precision).
- **Every coordinate is provenance-backed** by a named gazetteer feature — never invent coordinates.
- **Versioning:** bump `js/version.js` `VERSION` in the code commit (patch bump, e.g. `1.08.12` → `1.08.13`).
- **PR discipline (for later, not local commits):** build-tool code and the `data/landraces.json` data change are separate PRs, each ≤ 200 changed lines; the data edit may need splitting across multiple PRs.

## Module API (defined once; tasks build it incrementally)

All exported from `data/build/refine-coords.mjs`. Points are `[lng, lat]` arrays (GeoJSON order) unless noted.

```
normalize(s)                        -> string         (NFD diacritic-strip + lowercase + collapse ws)
loadGazetteer(labelsDir)            -> Map<normName, Array<{name,lat,lng,src,rank}>>
matchPlace(record, gaz)             -> {matchedName, candidates:Array<entry>} | null
pointInPolygon(point, geometry)     -> boolean        (Polygon|MultiPolygon, even-odd, holes-aware)
buildCountryIndex(world)            -> Map<lowerName, Array<geometry>>
resolveCountry(country, index)      -> Array<geometry>
inAny(point, geometries)            -> boolean
ringsCentroid(geometries)           -> [lng,lat]
foothillsOffset(point, centroid, deg=0.25) -> [lng,lat]
inWater(point, lakeGeometries)      -> boolean
nudgeToLand(point, geometries, lakeGeometries, centroid) -> [lng,lat] | null
decideRefinement(record, ctx)       -> {action, lat?, lng?, matched?, reason?, distanceKm?}
                                       action ∈ 'move'|'reject-country'|'reject-water'|'ambiguous'|'none'
                                       ctx = {gaz, countryIndex, lakes, centroidCache}
run({dryRun})                       -> report object  (loads real files; writes unless dryRun)
```

---

### Task 1: Text normalization + gazetteer loader

**Files:**
- Create: `data/build/refine-coords.mjs`
- Test: `data/build/refine-coords.test.mjs`

**Interfaces:**
- Produces: `normalize(s) -> string`; `loadGazetteer(labelsDir) -> Map<normName, Array<{name,lat,lng,src,rank}>>`. `src` is the source file stem (`states`,`cities`,`ranges`,`peaks`,`landforms`,`lakes`,`rivers`). Multiple entries can share a normalized name (kept as an array for later country disambiguation).

- [ ] **Step 1: Write the failing test**

```javascript
// data/build/refine-coords.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalize, loadGazetteer } from './refine-coords.mjs';

const LABELS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'labels');

test('normalize strips diacritics, lowercases, collapses whitespace', () => {
  assert.equal(normalize('Michoacán'), 'michoacan');
  assert.equal(normalize('  Sierra   Nevada '), 'sierra nevada');
  assert.equal(normalize('Nariño'), 'narino');
});

test('loadGazetteer indexes states by normalized name with source + coords', () => {
  const gaz = loadGazetteer(LABELS);
  const oax = gaz.get('oaxaca');
  assert.ok(oax && oax.length >= 1);
  const state = oax.find(e => e.src === 'states');
  assert.ok(state, 'Oaxaca present as a state');
  assert.ok(Math.abs(state.lat - 16.94) < 0.2 && Math.abs(state.lng - -96.209) < 0.2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: FAIL — `Cannot find module './refine-coords.mjs'` / export missing.

- [ ] **Step 3: Write minimal implementation**

```javascript
// data/build/refine-coords.mjs
import fs from 'node:fs';
import path from 'node:path';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add data/build/refine-coords.mjs data/build/refine-coords.test.mjs
git commit -m "feat(build): gazetteer loader + name normalization for pin refinement"
```

---

### Task 2: Place matcher

**Files:**
- Modify: `data/build/refine-coords.mjs`
- Test: `data/build/refine-coords.test.mjs`

**Interfaces:**
- Consumes: `normalize`, `loadGazetteer` from Task 1.
- Produces: `matchPlace(record, gaz) -> {matchedName, candidates} | null`. Searches the normalized `name` then `region` for whole-word gazetteer-name matches (word boundaries; names < 3 chars ignored). The **longest matched name** wins; ties break by source priority `states < cities < ranges/peaks/landforms < lakes/rivers` (earlier = preferred). `candidates` is the array of all gazetteer entries sharing `matchedName`.

- [ ] **Step 1: Write the failing test**

```javascript
// append to data/build/refine-coords.test.mjs
import { matchPlace } from './refine-coords.mjs';

test('matchPlace finds a state named in the variety name', () => {
  const gaz = loadGazetteer(LABELS);
  const m = matchPlace({ name: 'Oaxaca', region: '', country: 'Mexico' }, gaz);
  assert.equal(m.matchedName, 'oaxaca');
  assert.ok(m.candidates.some(c => c.src === 'states'));
});

test('matchPlace prefers the longest matched place name', () => {
  const gaz = new Map([
    ['santa marta', [{ name: 'Santa Marta', lat: 1, lng: 1, src: 'cities', rank: 1 }]],
    ['sierra nevada de santa marta', [{ name: 'Sierra Nevada de Santa Marta', lat: 2, lng: 2, src: 'ranges', rank: 1 }]],
  ]);
  const m = matchPlace({ name: 'Santa Marta Highlands', region: 'Sierra Nevada de Santa Marta', country: 'Colombia' }, gaz);
  assert.equal(m.matchedName, 'sierra nevada de santa marta');
});

test('matchPlace returns null when no place is named', () => {
  const gaz = loadGazetteer(LABELS);
  assert.equal(matchPlace({ name: 'Black African Magic', region: '', country: 'DRC' }, gaz), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: FAIL — `matchPlace is not a function`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// add to data/build/refine-coords.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add data/build/refine-coords.mjs data/build/refine-coords.test.mjs
git commit -m "feat(build): longest-match place matcher over name + region"
```

---

### Task 3: Geometry — point-in-polygon + country resolver

**Files:**
- Modify: `data/build/refine-coords.mjs`
- Test: `data/build/refine-coords.test.mjs`

**Interfaces:**
- Produces:
  - `pointInPolygon([lng,lat], geometry) -> boolean` for `Polygon`/`MultiPolygon`, even-odd ray casting summed across all rings (so holes subtract).
  - `buildCountryIndex(world) -> Map<lowerName, Array<geometry>>` keyed by lowercased `NAME`, `ADMIN`, `NAME_LONG`.
  - `resolveCountry(country, index) -> Array<geometry>`: tries the lowercased name, then with `&`→`and`, then an alias map for `{alaska, hawaii → united states of america; drc, dr congo → dem. rep. congo; baltics → estonia/latvia/lithuania; crimea → ukraine/russia}`. Returns `[]` if unresolved.
  - `inAny(point, geometries) -> boolean`.

- [ ] **Step 1: Write the failing test**

```javascript
// append to data/build/refine-coords.test.mjs
import fs from 'node:fs';
import { pointInPolygon, buildCountryIndex, resolveCountry, inAny } from './refine-coords.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'world.geojson'), 'utf8'));

test('pointInPolygon: inside vs outside a unit square', () => {
  const square = { type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] };
  assert.equal(pointInPolygon([1, 1], square), true);
  assert.equal(pointInPolygon([3, 3], square), false);
});

test('pointInPolygon: hole subtracts', () => {
  const withHole = { type: 'Polygon', coordinates: [
    [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
    [[4, 4], [4, 6], [6, 6], [6, 4], [4, 4]],
  ] };
  assert.equal(pointInPolygon([1, 1], withHole), true);
  assert.equal(pointInPolygon([5, 5], withHole), false);
});

test('resolveCountry handles aliases and & normalization', () => {
  const idx = buildCountryIndex(world);
  assert.ok(resolveCountry('Mexico', idx).length > 0);
  assert.ok(resolveCountry('DRC', idx).length > 0);
  assert.ok(resolveCountry('Bosnia & Herzegovina', idx).length > 0);
  assert.ok(resolveCountry('Baltics', idx).length >= 3);
});

test('inAny: Oaxaca point is in Mexico, not Brazil', () => {
  const idx = buildCountryIndex(world);
  const oax = [-96.209, 16.94];
  assert.equal(inAny(oax, resolveCountry('Mexico', idx)), true);
  assert.equal(inAny(oax, resolveCountry('Brazil', idx)), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: FAIL — `pointInPolygon is not a function`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// add to data/build/refine-coords.mjs
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
  const tries = [];
  const lc = String(country || '').toLowerCase();
  tries.push(lc);
  tries.push(lc.replace(/\s*&\s*/g, ' and '));
  for (const t of tries) if (index.has(t)) return index.get(t);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add data/build/refine-coords.mjs data/build/refine-coords.test.mjs
git commit -m "feat(build): point-in-polygon + country resolver with alias map"
```

---

### Task 4: Foothills offset + water/land guard

**Files:**
- Modify: `data/build/refine-coords.mjs`
- Test: `data/build/refine-coords.test.mjs`

**Interfaces:**
- Consumes: `pointInPolygon`, `inAny` from Task 3.
- Produces:
  - `ringsCentroid(geometries) -> [lng,lat]`: mean of all outer-ring vertices across the geometries (rough interior point).
  - `foothillsOffset(point, centroid, deg=0.25) -> [lng,lat]`: move `point` `deg` degrees toward `centroid` (unit vector × deg); if `point`≈`centroid`, return `point` unchanged.
  - `inWater(point, lakeGeometries) -> boolean`.
  - `nudgeToLand(point, geometries, lakeGeometries, centroid) -> [lng,lat] | null`: step from `point` toward `centroid` in 0.1° increments (≤ 25 steps); return first point that is `inAny(geometries)` and not `inWater`; `null` if none qualifies.

- [ ] **Step 1: Write the failing test**

```javascript
// append to data/build/refine-coords.test.mjs
import { ringsCentroid, foothillsOffset, inWater, nudgeToLand } from './refine-coords.mjs';

test('foothillsOffset moves ~0.25 deg toward the centroid', () => {
  const moved = foothillsOffset([0, 0], [10, 0], 0.25);
  assert.ok(Math.abs(moved[0] - 0.25) < 1e-9 && Math.abs(moved[1]) < 1e-9);
});

test('inWater detects a point inside a lake polygon', () => {
  const lakes = [{ type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] }];
  assert.equal(inWater([1, 1], lakes), true);
  assert.equal(inWater([5, 5], lakes), false);
});

test('nudgeToLand escapes a lake toward land', () => {
  const land = [{ type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] }];
  const lakes = [{ type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] }];
  const out = nudgeToLand([1, 1], land, lakes, [8, 8]);
  assert.ok(out && inAny(out, land) && !inWater(out, lakes));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: FAIL — `foothillsOffset is not a function`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// add to data/build/refine-coords.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add data/build/refine-coords.mjs data/build/refine-coords.test.mjs
git commit -m "feat(build): foothills offset + lake/land guard helpers"
```

---

### Task 5: Per-record decision

**Files:**
- Modify: `data/build/refine-coords.mjs`
- Test: `data/build/refine-coords.test.mjs`

**Interfaces:**
- Consumes: all helpers from Tasks 1–4.
- Produces: `decideRefinement(record, ctx) -> {action, lat?, lng?, matched?, reason?, distanceKm?}` where `ctx = {gaz, countryIndex, lakes, centroidCache}` (`centroidCache` is a `Map<country, [lng,lat]>` the function fills lazily). Logic:
  1. `m = matchPlace`; if null → `{action:'none', reason:'no-place'}`.
  2. `geos = resolveCountry`; if empty → `{action:'none', reason:'country-unresolved', matched:m.matchedName}`.
  3. `inCountry = m.candidates.filter(c => inAny([c.lng,c.lat], geos))`; if empty → `{action:'reject-country', matched:m.matchedName, reason:'match only outside country'}`.
  4. If `inCountry` has ≥2 entries spread > 1.0° apart → `{action:'ambiguous', matched:m.matchedName, reason:'multiple in-country matches'}`.
  5. Pick the best in-country candidate (lowest `SRC_PRIORITY`, then lowest `rank`). `pt=[c.lng,c.lat]`.
  6. If `src` ∈ {peaks,ranges} → `pt = foothillsOffset(pt, centroid)`.
  7. If `!inAny(pt,geos) || inWater(pt,lakes)` → `pt = nudgeToLand(...)`; if null → `{action:'reject-water', matched:m.matchedName}`.
  8. Round to 3 dp. If equal to current `lat`/`lng` → `{action:'none', reason:'already-placed'}`. Else `{action:'move', lat, lng, matched:m.matchedName, distanceKm}`.

  `haversineKm(aLat,aLng,bLat,bLng)` is a small internal helper for `distanceKm` (report only).

- [ ] **Step 1: Write the failing test**

```javascript
// append to data/build/refine-coords.test.mjs
import { decideRefinement } from './refine-coords.mjs';

function makeCtx() {
  const gaz = loadGazetteer(LABELS);
  const countryIndex = buildCountryIndex(world);
  return { gaz, countryIndex, lakes: [], centroidCache: new Map() };
}

test('decideRefinement moves a centroid-pinned Mexican state into that state', () => {
  const ctx = makeCtx();
  const r = { name: 'Oaxaca', region: '', country: 'Mexico', lat: 23.894, lng: -102.415 };
  const d = decideRefinement(r, ctx);
  assert.equal(d.action, 'move');
  // Oaxaca state ~ (16.94, -96.21)
  assert.ok(Math.abs(d.lat - 16.94) < 0.6 && Math.abs(d.lng - -96.21) < 0.6);
  assert.ok(inAny([d.lng, d.lat], resolveCountry('Mexico', ctx.countryIndex)));
});

test('decideRefinement returns none when no place named', () => {
  const ctx = makeCtx();
  const d = decideRefinement({ name: 'Black African Magic', region: '', country: 'DRC', lat: -4, lng: 21 }, ctx);
  assert.equal(d.action, 'none');
});

test('decideRefinement rejects a match that lands outside the country', () => {
  const ctx = makeCtx();
  // 'Veracruz' also exists outside Mexico in some gazetteers; constructed cross-country guard:
  // place a fake record whose only matched candidate sits outside the claimed country.
  const gaz = new Map([['narnia', [{ name: 'Narnia', lat: 0, lng: 0, src: 'states', rank: 1 }]]]);
  const ctx2 = { ...ctx, gaz };
  const d = decideRefinement({ name: 'Narnia', region: '', country: 'Mexico', lat: 23, lng: -102 }, ctx2);
  assert.equal(d.action, 'reject-country');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: FAIL — `decideRefinement is not a function`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// add to data/build/refine-coords.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: PASS (15 tests).

- [ ] **Step 5: Commit**

```bash
git add data/build/refine-coords.mjs data/build/refine-coords.test.mjs
git commit -m "feat(build): per-record refinement decision with all guards"
```

---

### Task 6: Orchestration — run(), report, CLI, integration test

**Files:**
- Modify: `data/build/refine-coords.mjs`
- Test: `data/build/refine-coords.test.mjs`

**Interfaces:**
- Consumes: `decideRefinement` and all loaders.
- Produces: `run({dryRun}) -> report`. Loads `data/landraces.json`, `data/labels/`, `data/world.geojson`, `data/geo/lakes.geojson`; builds `ctx`; runs `decideRefinement` on every record; collects results into `report = {moved:[], mountains:[], rejectedCountry:[], rejectedWater:[], ambiguous:[], none:number}`. `moved` entries that came from a peak/range source are ALSO pushed to `mountains` (for separate eyeballing). When `!dryRun`, applies `lat`/`lng` to the records and writes `JSON.stringify(data, null, 2) + "\n"`. A `printReport(report)` formats the summary. `main()` reads `--dry-run` from `process.argv` and is invoked only when the module is run directly.

- [ ] **Step 1: Write the failing test**

```javascript
// append to data/build/refine-coords.test.mjs
import { run } from './refine-coords.mjs';

test('run(dry-run) moves the Mexican state cluster and never crosses a country', () => {
  const report = run({ dryRun: true });
  // Every move stays inside its own country (guard holds across the real dataset).
  const idx = buildCountryIndex(world);
  for (const mv of report.moved) {
    const geos = resolveCountry(mv.country, idx);
    if (geos.length) assert.ok(inAny([mv.lng, mv.lat], geos), `${mv.name} stayed in ${mv.country}`);
  }
  // The known-broken cluster gets relocated.
  const oax = report.moved.find(m => m.name === 'Oaxaca');
  assert.ok(oax && oax.lat < 20, 'Oaxaca moved south into Oaxaca state');
  // Dry run does not write: file still parses and is unchanged length.
  assert.ok(typeof report.none === 'number');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: FAIL — `run is not a function`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// add to data/build/refine-coords.mjs
import { fileURLToPath } from 'node:url';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test data/build/refine-coords.test.mjs`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add data/build/refine-coords.mjs data/build/refine-coords.test.mjs
git commit -m "feat(build): run() orchestration, report, and CLI for pin refinement"
```

---

### Task 7: Dry-run review, resolve ambiguities, apply, validate, commit data

**Files:**
- Modify: `data/landraces.json` (coordinates only, via the script)
- Modify: `js/version.js` (version bump)

**Interfaces:**
- Consumes: the finished `data/build/refine-coords.mjs`.

- [ ] **Step 1: Dry-run and capture the report**

Run: `node data/build/refine-coords.mjs --dry-run | tee /private/tmp/claude-502/-Volumes-Sugaree-Dev-landrace-map/30ccf537-72e4-44c9-86d7-9c95059580a4/scratchpad/refine-report.txt`
Expected: a printed report with non-empty "Moved" (incl. the Mexican states moving south), a "Mountain" list, and possibly "Rejected"/"ambiguous" sections.

- [ ] **Step 2: Review report; ASK THE USER about flagged cases**

Read the report. Per the spec, **stop and ask the user** to adjudicate:
- every entry under **❓ ambiguous** (which candidate is correct, or skip),
- every entry under **🚫 reject-country** and **💧 reject-water** (confirm leaving them as-is),
- skim the **⛰️ mountain** list for any placement that looks clearly wrong.
Do not proceed to apply until the user has responded. If the user wants a specific record handled differently (e.g. a manual coordinate, or excluded), note it; small targeted manual fixes to `data/landraces.json` after the script run are acceptable and must cite the gazetteer/source.

- [ ] **Step 3: Apply for real**

Run: `node data/build/refine-coords.mjs`
Expected: "Applied to data/landraces.json."

- [ ] **Step 4: Validate the dataset and confirm a clean, minimal diff**

Run: `npm run validate && npm test`
Expected: validator passes; full test suite passes.

Run: `git diff --stat data/landraces.json` and `git diff data/landraces.json | grep -E '^[-+]' | grep -vE '"(lat|lng)"' | grep -vE '^(\+\+\+|---)'`
Expected: the stat shows only `data/landraces.json` changed; the second command prints **nothing** (only `lat`/`lng` lines changed — no other fields touched).

- [ ] **Step 5: Bump version and commit the data change**

Edit `js/version.js`: bump `VERSION` one patch step (e.g. `1.08.12` → `1.08.13`).

```bash
git add data/landraces.json js/version.js
git commit -m "data: refine pin coordinates from place names in variety names

Relocates pins from country centroids to gazetteer-matched states/cities/
features (Natural Earth). coordsApproximate stays true. Generated by
data/build/refine-coords.mjs."
```

Note (PR discipline): if this work is later split for PRs, the tool code (Tasks 1–6) and this data change go in **separate PRs**, each ≤ 200 lines; the data diff may need splitting.

---

## Self-Review Notes

- **Spec coverage:** gazetteer load (T1) ✓; longest-match name/region (T2) ✓; same-country guard + alias map (T3) ✓; foothills offset + water guard (T4) ✓; per-record decision incl. ambiguity (T5) ✓; auto-apply + report + dry-run + report categories (T6) ✓; ask-user on flagged cases + validate + version bump + report at end (T7) ✓.
- **Type consistency:** points are `[lng,lat]` throughout; `decideRefinement` returns `{action,lat,lng,matched,reason,distanceKm}` consumed verbatim by `run()`; `ctx` shape `{gaz,countryIndex,lakes,centroidCache}` identical in T5/T6; `SRC_PRIORITY` defined in T2, reused in T5.
- **`.geojson` via `fs`+`JSON.parse`** everywhere (never `require`).
- **Clean diff:** `JSON.stringify(data,null,2)+"\n"` round-trips the file (verified).
