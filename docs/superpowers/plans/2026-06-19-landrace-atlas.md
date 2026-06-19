# Landrace Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, no-backend web app that shows cannabis landraces as green-leaf markers on a self-contained world map, with a side panel of curated strain info and a search box with autocomplete.

**Architecture:** Plain HTML/CSS/JS with no build step. Leaflet (vendored locally, no CDN) renders a bundled GeoJSON world layer with no tile provider. The ~300-entry dataset is converted once from raw text files into a static `landraces.json` loaded with `fetch`. Pure logic lives in ES modules importable by both the browser and Node's built-in test runner; Leaflet/DOM rendering is verified by a manual smoke checklist.

**Tech Stack:** HTML5, CSS3, vanilla ES modules, Leaflet 1.9.4 (vendored), Node ≥18 (only for the one-time data conversion + `node --test`; the app itself needs no Node).

---

## Important environment notes

- **This repo is not yet under git** (the user will add it later). Every task ends with a commit step written for when git exists. **Until the user initializes git, treat each commit step as a checkpoint and skip the actual `git` command.** When git is later initialized, the same messages apply. Task 1 includes the optional init.
- **No `npm install` ever runs.** `package.json` exists only to set `"type": "module"` and hold `node --test` scripts. `devDependencies` stays empty.
- The full dataset is already saved verbatim under `data/raw/landraces-part1.txt`, `…-part2.txt`, `…-part3.txt`. The spec is at `docs/superpowers/specs/2026-06-19-landrace-atlas-design.md`.

## Spec → task map

| Spec area | Tasks |
|---|---|
| File structure / scaffold | 1 |
| Vendored Leaflet, world.geojson, leaf icon | 2 |
| Node test harness | 3 |
| Data model + parser | 4 |
| Category normalization | 5 |
| Coordinate derivation | 6 |
| ID generation / dedup | 7 |
| Conversion script → landraces.json | 8 |
| Data validation | 9 |
| Manual data QA pass | 10 |
| Search + autocomplete (pure) | 11 |
| Map module (Leaflet, GeoJSON, markers) | 12 |
| Panel module (info, links, embeds, fallback) | 13 |
| App wiring + index.html + ribbon | 14 |
| Styling / tone / responsive | 15 |
| Error handling | 16 |
| Final manual smoke checklist | 17 |
| Enrichment scraping (future) | "Out of scope" section |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `index.html`
- Create: `css/styles.css` (empty placeholder)
- Create: `js/app.js` (empty placeholder)
- Create directories: `js/`, `css/`, `assets/`, `lib/leaflet/`, `data/lib/`

- [ ] **Step 1: (Optional) initialize git**

Only if the user has said git is ready. Otherwise skip and do this later.

```bash
cd /Volumes/Sugaree/Dev/landrace-map
git init
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "landrace-atlas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Static world map of cannabis landraces.",
  "scripts": {
    "test": "node --test",
    "convert": "node data/convert.mjs",
    "validate": "node data/validate.mjs",
    "serve": "python3 -m http.server 8000"
  },
  "devDependencies": {}
}
```

- [ ] **Step 3: Create `.gitignore`**

```
.DS_Store
*.log
node_modules/
```

- [ ] **Step 4: Create placeholder `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Landrace Atlas</title>
  </head>
  <body>
    <p>Scaffold.</p>
  </body>
</html>
```

- [ ] **Step 5: Create empty placeholders so paths exist**

```bash
mkdir -p js css assets lib/leaflet data/lib
: > css/styles.css
: > js/app.js
```

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore index.html css/styles.css js/app.js
git commit -m "chore: scaffold landrace atlas project structure"
```

---

### Task 2: Vendor Leaflet, world GeoJSON, and the leaf marker

**Files:**
- Create: `lib/leaflet/leaflet.js`, `lib/leaflet/leaflet.css`, `lib/leaflet/images/*`
- Create: `data/world.geojson`
- Create: `assets/leaf.svg`

- [ ] **Step 1: Download Leaflet 1.9.4 into `lib/leaflet/`**

```bash
cd /Volumes/Sugaree/Dev/landrace-map
curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/leaflet.js  -o lib/leaflet/leaflet.js
curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/leaflet.css -o lib/leaflet/leaflet.css
mkdir -p lib/leaflet/images
curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png      -o lib/leaflet/images/marker-icon.png
curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png   -o lib/leaflet/images/marker-icon-2x.png
curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png    -o lib/leaflet/images/marker-shadow.png
curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/images/layers.png           -o lib/leaflet/images/layers.png
curl -fsSL https://unpkg.com/leaflet@1.9.4/dist/images/layers-2x.png        -o lib/leaflet/images/layers-2x.png
```

- [ ] **Step 2: Verify the files downloaded (not HTML error pages)**

Run:
```bash
head -c 40 lib/leaflet/leaflet.js; echo; wc -c lib/leaflet/leaflet.js
```
Expected: first bytes look like minified JS (e.g. `/* @preserve ... Leaflet 1.9.4`), size > 140000 bytes.

- [ ] **Step 3: Download a lightweight world-countries GeoJSON**

```bash
curl -fsSL https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json -o data/world.geojson
```

Verify:
```bash
head -c 60 data/world.geojson; echo
```
Expected: begins with `{"type":"FeatureCollection"` (a JSON object, not `<!DOCTYPE html>`). If the URL is unavailable, substitute any public-domain/MIT countries GeoJSON of similar size (~250 KB) and keep the filename `data/world.geojson`.

- [ ] **Step 4: Create the green pot-leaf marker `assets/leaf.svg`**

A small, single-color stylized cannabis leaf. Color is set via `fill="currentColor"` so CSS controls it.

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72" width="64" height="72" role="img" aria-label="Cannabis leaf marker">
  <g fill="currentColor">
    <path d="M32 64C32 50 32 44 32 38c-3 4-7 7-12 8 3-3 5-7 5-11-4 4-9 6-14 6 4-3 7-8 8-13-5 3-11 4-16 3 5-2 10-6 13-11-5 1-10 1-15-1 6-1 12-4 16-9-4-1-8-3-11-6 5 1 10 1 14-1-3-3-5-7-6-11 4 3 8 5 12 6-1-5-1-10 1-15 2 5 4 10 7 14 1-5 4-10 7-14 2 5 2 10 1 15 4-1 8-3 12-6-1 4-3 8-6 11 4 2 9 2 14 1-3 3-7 5-11 6 4 5 10 8 16 9-5 2-10 2-15 1 3 5 8 9 13 11-5 1-11 0-16-3 1 5 4 10 8 13-5 0-10-2-14-6 0 4 2 8 5 11-5-1-9-4-12-8 0 6 0 12 0 26z"/>
  </g>
  <rect x="31" y="56" width="2" height="12" fill="currentColor"/>
</svg>
```

- [ ] **Step 5: Commit**

```bash
git add lib/leaflet data/world.geojson assets/leaf.svg
git commit -m "chore: vendor leaflet, world geojson, and leaf marker icon"
```

---

### Task 3: Node test harness sanity check

**Files:**
- Create: `data/lib/smoke.test.mjs` (temporary, deleted at end of task)

- [ ] **Step 1: Write a trivial passing test to confirm the runner works**

`data/lib/smoke.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node test runner works', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 2: Run it**

Run: `npm test`
Expected: output shows `tests 1`, `pass 1`, `fail 0`.

- [ ] **Step 3: Delete the smoke test**

```bash
rm data/lib/smoke.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: confirm node --test harness runs"
```

---

### Task 4: Raw-entry parser

Parses one raw text block into a partial record: `{ name, countryRaw, type, height, flowering, climate, summary, regionRaw, incomplete }`. Continent and final coordinates are added by later modules.

**Files:**
- Create: `data/lib/parse.mjs`
- Test: `data/lib/parse.test.mjs`

- [ ] **Step 1: Write failing tests**

`data/lib/parse.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry } from './parse.mjs';

test('parses a 4-field en-dash entry with parenthetical country', () => {
  const block = [
    'Atlas Mountain (Morocco) – Mountain hash landrace | Medium-tall | 9–12w | Semi-arid mountain',
    'Notes: Traditional Moroccan hash-producing region, drought tolerant and highly resinous.'
  ].join('\n');
  const r = parseEntry(block);
  assert.equal(r.name, 'Atlas Mountain');
  assert.equal(r.countryRaw, 'Morocco');
  assert.equal(r.type, 'Mountain hash landrace');
  assert.equal(r.height, 'Medium-tall');
  assert.equal(r.flowering, '9–12w');
  assert.equal(r.climate, 'Semi-arid mountain');
  assert.match(r.summary, /drought tolerant/);
  assert.equal(r.incomplete, false);
});

test('parses a 5-field entry with explicit type field', () => {
  const block = 'Kenya Highland (Kenya) – Highland African landrace | Sativa | Tall | 11–16w | Equatorial highland\nNotes: Classic East African highland cannabis.';
  const r = parseEntry(block);
  assert.equal(r.name, 'Kenya Highland');
  assert.equal(r.countryRaw, 'Kenya');
  assert.equal(r.type, 'Highland African landrace | Sativa');
  assert.equal(r.height, 'Tall');
  assert.equal(r.flowering, '11–16w');
  assert.equal(r.climate, 'Equatorial highland');
});

test('parses a hyphen-separator entry without country', () => {
  const block = 'Durban basin- Sativa landrace | Tall | 9–11w | Subtropical coastal\nNotes: Licorice anise terps, high thcv, energetic';
  const r = parseEntry(block);
  assert.equal(r.name, 'Durban basin');
  assert.equal(r.countryRaw, null);
  assert.equal(r.type, 'Sativa landrace');
  assert.equal(r.flowering, '9–11w');
});

test('keeps en-dash separator even when name contains a hyphen', () => {
  const block = 'Guinea-Bissau Mangrove (Guinea-Bissau) – Coastal landrace population | Sativa | Tall | 12–18w | Tropical mangrove coast\nNotes: Adapted to salt air.';
  const r = parseEntry(block);
  assert.equal(r.name, 'Guinea-Bissau Mangrove');
  assert.equal(r.countryRaw, 'Guinea-Bissau');
  assert.equal(r.height, 'Tall');
});

test('captures trailing region line that is not Notes', () => {
  const block = 'Shashamane (Ethiopia) – Ethiopian highland landrace | Sativa | Tall | 12–16w | Highland plateau\nNotes: Famous Ethiopian cannabis population.\nShashamane, Oromia Region, Ethiopia';
  const r = parseEntry(block);
  assert.equal(r.regionRaw, 'Shashamane, Oromia Region, Ethiopia');
});

test('flags an incomplete stub', () => {
  const block = 'Colombian Boyaca High Plateau- [incomplete entry; details pending]';
  const r = parseEntry(block);
  assert.equal(r.name, 'Colombian Boyaca High Plateau');
  assert.equal(r.incomplete, true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test data/lib/parse.test.mjs`
Expected: FAIL — `parseEntry` is not exported / not defined.

- [ ] **Step 3: Implement `data/lib/parse.mjs`**

```javascript
// Parses one raw text block (the lines for a single strain) into a partial record.

const HEIGHT_WORDS = [
  'Extremely Tall', 'Very tall', 'Very Tall', 'Medium-tall', 'Medium-short',
  'Short-medium', 'Short-Medium', 'Variable height', 'Tall', 'Medium', 'Short', 'Variable'
];

const FLOWERING_RE = /(\d+\s*[–-]\s*\d+\s*w(?:eeks)?|\d+\s*[–-]\s*\d+\s*weeks|Variable(?:\s*length)?)/i;

function isHeightToken(t) {
  return HEIGHT_WORDS.some((w) => t.toLowerCase() === w.toLowerCase());
}

export function parseEntry(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || '';

  // Notes: everything after a line beginning "Notes:"
  let summary = '';
  let regionRaw = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^Notes:/i.test(line)) {
      summary = line.replace(/^Notes:\s*/i, '').trim();
    } else if (/^Region:/i.test(line)) {
      regionRaw = line.replace(/^Region:\s*/i, '').trim();
    } else if (!summary) {
      // a bare line before any Notes — treat as region context
      regionRaw = regionRaw || line;
    } else {
      // a bare line after Notes — also region context (e.g. "Shashamane, Oromia...")
      regionRaw = regionRaw || line;
    }
  }

  // Split name + parenthetical country from the descriptor.
  // Prefer en dash "–"; fall back to a hyphen that is followed by a space.
  let head = first;
  let rest = '';
  const enDashIdx = first.indexOf('–');
  if (enDashIdx !== -1) {
    head = first.slice(0, enDashIdx);
    rest = first.slice(enDashIdx + 1);
  } else {
    const m = first.match(/-\s+/);
    if (m) {
      head = first.slice(0, m.index);
      rest = first.slice(m.index + m[0].length);
    } else {
      head = first;
      rest = '';
    }
  }
  head = head.trim();
  rest = rest.trim();

  // Country from the last parenthetical group in the head.
  let countryRaw = null;
  let name = head;
  const paren = head.match(/\(([^)]*)\)\s*$/);
  if (paren) {
    countryRaw = paren[1].trim();
    name = head.slice(0, paren.index).trim();
  }

  // Incomplete stub detection.
  const incomplete = /\[incomplete entry/i.test(rest) || (rest === '' && !FLOWERING_RE.test(first));

  // Pipe fields in the descriptor.
  const pieces = rest.split('|').map((p) => p.trim()).filter((p) => p !== '');
  let type = '';
  let height = null;
  let flowering = null;
  let climate = null;

  if (pieces.length > 0 && !incomplete) {
    let flowerIdx = pieces.findIndex((p) => FLOWERING_RE.test(p));
    if (flowerIdx === -1) {
      // No flowering field; first piece is the type, rest unknown.
      type = pieces[0];
    } else {
      flowering = (pieces[flowerIdx].match(FLOWERING_RE) || [pieces[flowerIdx]])[0].trim();
      climate = pieces[flowerIdx + 1] || null;
      const heightIdx = flowerIdx - 1;
      height = heightIdx >= 0 ? pieces[heightIdx] : null;
      // Type = everything before height (or before flowering if no height).
      const typeEnd = heightIdx >= 0 ? heightIdx : flowerIdx;
      type = pieces.slice(0, typeEnd).join(' | ').trim();
      // Guard: if height slot doesn't look like a height, fold it into type.
      if (height && !isHeightToken(height)) {
        type = pieces.slice(0, flowerIdx).join(' | ').trim();
        height = null;
      }
    }
  }

  return {
    name,
    countryRaw: countryRaw || null,
    type: type || (incomplete ? '' : rest),
    height: height || null,
    flowering: flowering || null,
    climate: climate || null,
    summary: summary || '',
    regionRaw: regionRaw || null,
    incomplete
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test data/lib/parse.test.mjs`
Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add data/lib/parse.mjs data/lib/parse.test.mjs
git commit -m "feat: add raw-entry parser with tests"
```

---

### Task 5: Category normalization

Maps a free-text type descriptor to one of the fixed categories.

**Files:**
- Create: `data/lib/category.mjs`
- Test: `data/lib/category.test.mjs`

- [ ] **Step 1: Write failing tests**

`data/lib/category.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCategory, CATEGORIES } from './category.mjs';

test('exposes the fixed category set', () => {
  assert.deepEqual(
    [...CATEGORIES].sort(),
    ['Feral', 'Hemp', 'Hybrid-Intermediate', 'Indica', 'Mixed', 'Ruderalis', 'Sativa'].sort()
  );
});

test('classifies common descriptors', () => {
  assert.equal(normalizeCategory('Indica'), 'Indica');
  assert.equal(normalizeCategory('Sativa landrace'), 'Sativa');
  assert.equal(normalizeCategory('Ruderalis'), 'Ruderalis');
  assert.equal(normalizeCategory('Hemp'), 'Hemp');
  assert.equal(normalizeCategory('Feral sativa complex'), 'Feral');
  assert.equal(normalizeCategory('Intermediate (Indica–Sativa)'), 'Hybrid-Intermediate');
  assert.equal(normalizeCategory('Sativa Subsp. Indica'), 'Sativa');
  assert.equal(normalizeCategory('Mixed landrace'), 'Mixed');
});

test('feral takes priority over the strain type it contains', () => {
  assert.equal(normalizeCategory('Feral hemp'), 'Feral');
  assert.equal(normalizeCategory('Wild-feral cannabis population'), 'Feral');
});

test('falls back to Mixed for unknown', () => {
  assert.equal(normalizeCategory(''), 'Mixed');
  assert.equal(normalizeCategory('Unique heirloom'), 'Mixed');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test data/lib/category.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `data/lib/category.mjs`**

```javascript
export const CATEGORIES = new Set([
  'Sativa', 'Indica', 'Ruderalis', 'Hybrid-Intermediate', 'Hemp', 'Feral', 'Mixed'
]);

// Order matters: earlier rules win.
export function normalizeCategory(typeText) {
  const t = (typeText || '').toLowerCase();
  if (/\bferal\b|\bwild\b/.test(t)) return 'Feral';
  if (/\bhemp\b/.test(t)) return 'Hemp';
  if (/\bruderalis\b|\bauto/.test(t)) return 'Ruderalis';
  if (/intermediate|hybrid|indica[–-]sativa|sativa[–-]indica/.test(t)) return 'Hybrid-Intermediate';
  if (/\bsativa\b/.test(t)) return 'Sativa';
  if (/\bindica\b/.test(t)) return 'Indica';
  if (/\bmixed\b/.test(t)) return 'Mixed';
  return 'Mixed';
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test data/lib/category.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data/lib/category.mjs data/lib/category.test.mjs
git commit -m "feat: add type-to-category normalization with tests"
```

---

### Task 6: Coordinate derivation

Resolves an approximate `{ lat, lng }` for an entry from a country-centroid table plus optional region overrides, then applies a small deterministic jitter (seeded by id) so co-located entries don't stack on the exact same pixel.

**Files:**
- Create: `data/lib/coords.mjs`
- Test: `data/lib/coords.test.mjs`

- [ ] **Step 1: Write failing tests**

`data/lib/coords.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCoords, jitter, COUNTRY_CENTROIDS } from './coords.mjs';

test('resolves a known country to its centroid (with jitter applied)', () => {
  const c = resolveCoords({ countryRaw: 'Morocco', regionRaw: null, id: 'atlas-mountain' });
  const base = COUNTRY_CENTROIDS['Morocco'];
  assert.ok(Math.abs(c.lat - base.lat) <= 0.6, 'lat within jitter band');
  assert.ok(Math.abs(c.lng - base.lng) <= 0.6, 'lng within jitter band');
});

test('multi-country string uses the first recognized country', () => {
  const c = resolveCoords({ countryRaw: 'Kenya–Ethiopia–Tanzania', regionRaw: null, id: 'rift' });
  const base = COUNTRY_CENTROIDS['Kenya'];
  assert.ok(Math.abs(c.lat - base.lat) <= 0.6);
});

test('jitter is deterministic for a given id', () => {
  assert.deepEqual(jitter('abc'), jitter('abc'));
  assert.notDeepEqual(jitter('abc'), jitter('xyz'));
});

test('returns null when no country can be resolved', () => {
  const c = resolveCoords({ countryRaw: 'Atlantis', regionRaw: null, id: 'x' });
  assert.equal(c, null);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test data/lib/coords.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `data/lib/coords.mjs`**

The country table below covers the countries present in the dataset. During Task 10 (QA) add any that the converter reports as unresolved. Coordinates are approximate country/region centroids — precision is intentionally loose (`coordsApproximate: true`).

```javascript
// Approximate centroids [lat, lng] for countries/territories present in the dataset.
export const COUNTRY_CENTROIDS = {
  // Africa
  'Angola': { lat: -11.2, lng: 17.9 }, 'Morocco': { lat: 31.8, lng: -7.1 },
  'Ethiopia': { lat: 9.1, lng: 40.5 }, 'Senegal': { lat: 14.5, lng: -14.4 },
  'Cameroon': { lat: 5.7, lng: 12.7 }, 'Nigeria': { lat: 9.1, lng: 8.7 },
  'Kenya': { lat: 0.2, lng: 37.9 }, 'Tanzania': { lat: -6.4, lng: 34.9 },
  'Uganda': { lat: 1.4, lng: 32.3 }, 'Rwanda': { lat: -1.9, lng: 29.9 },
  'Gabon': { lat: -0.8, lng: 11.6 }, 'Madagascar': { lat: -18.8, lng: 46.9 },
  'Mauritius': { lat: -20.3, lng: 57.6 }, 'Mozambique': { lat: -18.7, lng: 35.5 },
  'Zimbabwe': { lat: -19.0, lng: 29.2 }, 'Namibia': { lat: -22.6, lng: 17.1 },
  'Malawi': { lat: -13.3, lng: 34.3 }, 'South Africa': { lat: -30.6, lng: 24.0 },
  'Lesotho': { lat: -29.6, lng: 28.2 }, 'Sierra Leone': { lat: 8.5, lng: -11.8 },
  'Guinea-Bissau': { lat: 12.0, lng: -15.0 }, 'Equatorial Guinea': { lat: 1.6, lng: 10.3 },
  'DRC': { lat: -2.9, lng: 23.7 }, 'DR Congo': { lat: -2.9, lng: 23.7 },
  'Congo': { lat: -0.7, lng: 15.5 }, 'Central African Republic': { lat: 6.6, lng: 20.9 },
  'Réunion': { lat: -21.1, lng: 55.5 }, 'Eswatini': { lat: -26.5, lng: 31.5 },
  // Middle East / Central Asia
  'Afghanistan': { lat: 33.9, lng: 67.7 }, 'Pakistan': { lat: 30.4, lng: 69.3 },
  'Iran': { lat: 32.4, lng: 53.7 }, 'Turkey': { lat: 39.0, lng: 35.2 },
  'Lebanon': { lat: 33.9, lng: 35.9 }, 'Syria': { lat: 35.0, lng: 38.5 },
  'Egypt': { lat: 26.8, lng: 30.8 }, 'Kazakhstan': { lat: 48.0, lng: 66.9 },
  'Kyrgyzstan': { lat: 41.2, lng: 74.8 }, 'Tajikistan': { lat: 38.9, lng: 71.3 },
  'Uzbekistan': { lat: 41.4, lng: 64.6 }, 'Turkmenistan': { lat: 38.97, lng: 59.6 },
  'China': { lat: 35.9, lng: 104.2 }, 'Mongolia': { lat: 46.9, lng: 103.8 },
  'Russia': { lat: 61.5, lng: 105.3 },
  // South Asia
  'India': { lat: 22.0, lng: 79.0 }, 'Nepal': { lat: 28.4, lng: 84.1 },
  'Bhutan': { lat: 27.5, lng: 90.4 }, 'Bangladesh': { lat: 23.7, lng: 90.4 },
  // Southeast Asia
  'Thailand': { lat: 15.9, lng: 100.99 }, 'Laos': { lat: 19.9, lng: 102.5 },
  'Vietnam': { lat: 14.1, lng: 108.3 }, 'Cambodia': { lat: 12.6, lng: 104.9 },
  'Myanmar': { lat: 21.9, lng: 95.96 }, 'Indonesia': { lat: -2.5, lng: 118.0 },
  'Philippines': { lat: 12.9, lng: 121.8 }, 'Malaysia': { lat: 4.2, lng: 109.5 },
  'Timor-Leste': { lat: -8.8, lng: 125.7 },
  // East Asia / North Asia
  'Japan': { lat: 36.2, lng: 138.3 }, 'North Korea': { lat: 40.3, lng: 127.5 },
  'South Korea': { lat: 36.5, lng: 127.8 }, 'Korea': { lat: 37.5, lng: 127.0 },
  // Europe
  'Albania': { lat: 41.2, lng: 20.2 }, 'Armenia': { lat: 40.1, lng: 45.0 },
  'Azerbaijan': { lat: 40.1, lng: 47.6 }, 'Georgia': { lat: 42.3, lng: 43.4 },
  'Greece': { lat: 39.1, lng: 22.0 }, 'Italy': { lat: 42.8, lng: 12.6 },
  'Spain': { lat: 40.0, lng: -3.7 }, 'Portugal': { lat: 39.5, lng: -8.0 },
  'France': { lat: 46.6, lng: 2.5 }, 'Hungary': { lat: 47.2, lng: 19.5 },
  'Romania': { lat: 45.9, lng: 24.97 }, 'Serbia': { lat: 44.0, lng: 21.0 },
  'Bosnia & Herzegovina': { lat: 43.9, lng: 17.7 }, 'Kosovo': { lat: 42.6, lng: 20.9 },
  'North Macedonia': { lat: 41.6, lng: 21.7 }, 'Montenegro': { lat: 42.7, lng: 19.4 },
  'Ukraine': { lat: 48.4, lng: 31.2 }, 'Belarus': { lat: 53.7, lng: 27.95 },
  'Crimea': { lat: 45.3, lng: 34.4 }, 'Germany': { lat: 51.2, lng: 10.4 },
  'Poland': { lat: 51.9, lng: 19.1 }, 'Czech Republic': { lat: 49.8, lng: 15.5 },
  'Slovakia': { lat: 48.7, lng: 19.7 }, 'Baltics': { lat: 56.9, lng: 24.6 },
  'Cyprus': { lat: 35.1, lng: 33.4 },
  // Oceania
  'Papua New Guinea': { lat: -6.3, lng: 143.96 }, 'Fiji': { lat: -17.7, lng: 178.1 },
  'Vanuatu': { lat: -15.4, lng: 166.96 }, 'Solomon Islands': { lat: -9.6, lng: 160.2 },
  'New Caledonia': { lat: -20.9, lng: 165.6 }, 'New Zealand': { lat: -41.0, lng: 174.0 },
  'Australia': { lat: -25.3, lng: 133.8 }, 'French Polynesia': { lat: -17.7, lng: -149.4 },
  // Americas
  'Mexico': { lat: 23.6, lng: -102.6 }, 'Guatemala': { lat: 15.8, lng: -90.2 },
  'Honduras': { lat: 15.2, lng: -86.2 }, 'Panama': { lat: 8.5, lng: -80.8 },
  'Colombia': { lat: 4.6, lng: -74.3 }, 'Venezuela': { lat: 6.4, lng: -66.6 },
  'Ecuador': { lat: -1.8, lng: -78.2 }, 'Peru': { lat: -9.2, lng: -75.0 },
  'Bolivia': { lat: -16.3, lng: -63.6 }, 'Brazil': { lat: -10.8, lng: -53.1 },
  'Argentina': { lat: -38.4, lng: -63.6 }, 'Paraguay': { lat: -23.4, lng: -58.4 },
  'Guyana': { lat: 4.9, lng: -58.9 }, 'Suriname': { lat: 4.0, lng: -56.0 },
  'Jamaica': { lat: 18.1, lng: -77.3 }, 'Cuba': { lat: 21.5, lng: -79.5 },
  'Puerto Rico': { lat: 18.2, lng: -66.5 }, 'Dominica': { lat: 15.4, lng: -61.4 },
  'Grenada': { lat: 12.1, lng: -61.7 }, 'Guadeloupe': { lat: 16.25, lng: -61.6 },
  'Martinique': { lat: 14.6, lng: -61.0 }, 'Saint Lucia': { lat: 13.9, lng: -61.0 },
  'Saint Kitts & Nevis': { lat: 17.3, lng: -62.75 },
  'Saint Vincent & the Grenadines': { lat: 13.25, lng: -61.2 },
  'Trinidad & Tobago': { lat: 10.5, lng: -61.3 }, 'United States': { lat: 39.8, lng: -98.6 },
  'USA': { lat: 39.8, lng: -98.6 }, 'Canada': { lat: 56.1, lng: -106.3 },
  'Hawaii': { lat: 20.8, lng: -156.3 }
};

// Synonyms / alternate spellings normalized to a table key.
const COUNTRY_ALIASES = {
  'Hawaii, USA': 'Hawaii', 'French Caribbean': 'Martinique', 'Kosovo': 'Kosovo',
  'Czech Republic / Slovakia': 'Czech Republic', 'Republic of Congo': 'Congo'
};

function resolveCountryKey(countryRaw) {
  if (!countryRaw) return null;
  if (COUNTRY_ALIASES[countryRaw]) return COUNTRY_ALIASES[countryRaw];
  if (COUNTRY_CENTROIDS[countryRaw]) return countryRaw;
  // Multi-country strings: split on / – , and take the first recognized.
  const tokens = countryRaw.split(/[\/–,-]/).map((s) => s.trim());
  for (const tok of tokens) {
    if (COUNTRY_CENTROIDS[tok]) return tok;
    if (COUNTRY_ALIASES[tok]) return COUNTRY_ALIASES[tok];
  }
  return null;
}

// Deterministic small offset in degrees from a string seed.
export function jitter(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;      // 0..1
  const b = (((h >>> 10) >>> 0) % 1000) / 1000;
  return { dLat: (a - 0.5) * 1.0, dLng: (b - 0.5) * 1.0 }; // ±0.5°
}

// Optional per-region overrides keyed by an exact regionRaw or name string.
// Populate during QA for localities far from their country centroid.
export const REGION_OVERRIDES = {
  // 'Kona District, Hawaiʻi (Big Island)': { lat: 19.6, lng: -155.9 },
};

export function resolveCoords({ countryRaw, regionRaw, id }) {
  let base = null;
  if (regionRaw && REGION_OVERRIDES[regionRaw]) base = REGION_OVERRIDES[regionRaw];
  if (!base) {
    const key = resolveCountryKey(countryRaw);
    if (key) base = COUNTRY_CENTROIDS[key];
  }
  if (!base) return null;
  const { dLat, dLng } = jitter(id || regionRaw || countryRaw || 'seed');
  return { lat: +(base.lat + dLat).toFixed(4), lng: +(base.lng + dLng).toFixed(4) };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test data/lib/coords.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data/lib/coords.mjs data/lib/coords.test.mjs
git commit -m "feat: add approximate coordinate resolution with tests"
```

---

### Task 7: ID generation and de-duplication

**Files:**
- Create: `data/lib/id.mjs`
- Test: `data/lib/id.test.mjs`

- [ ] **Step 1: Write failing tests**

`data/lib/id.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, makeUniqueId } from './id.mjs';

test('slugify lowercases and kebab-cases, dropping accents/punctuation', () => {
  assert.equal(slugify('Mazar I Sharif'), 'mazar-i-sharif');
  assert.equal(slugify("Owairaka 'Orrible"), 'owairaka-orrible');
  assert.equal(slugify('Réunion Island (Zamal)'), 'reunion-island-zamal');
});

test('makeUniqueId suffixes duplicates deterministically', () => {
  const seen = new Set();
  assert.equal(makeUniqueId('Transkei', seen), 'transkei');
  assert.equal(makeUniqueId('Transkei', seen), 'transkei-2');
  assert.equal(makeUniqueId('Transkei', seen), 'transkei-3');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test data/lib/id.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `data/lib/id.mjs`**

```javascript
export function slugify(name) {
  return (name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[()'".,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function makeUniqueId(name, seen) {
  const base = slugify(name) || 'entry';
  if (!seen.has(base)) {
    seen.add(base);
    return base;
  }
  let n = 2;
  while (seen.has(`${base}-${n}`)) n++;
  const id = `${base}-${n}`;
  seen.add(id);
  return id;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test data/lib/id.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data/lib/id.mjs data/lib/id.test.mjs
git commit -m "feat: add id slugify and dedup helpers with tests"
```

---

### Task 8: Conversion script → `data/landraces.json`

Ties the helpers together: read the three raw files, track the current continent from headers, split into entry blocks, parse, normalize, resolve coords, assign ids, and write `data/landraces.json`. Reports any entries whose country could not be resolved.

**Files:**
- Create: `data/convert.mjs`
- Create (generated): `data/landraces.json`

- [ ] **Step 1: Implement `data/convert.mjs`**

```javascript
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseEntry } from './lib/parse.mjs';
import { normalizeCategory } from './lib/category.mjs';
import { resolveCoords } from './lib/coords.mjs';
import { makeUniqueId } from './lib/id.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Header line -> continent. Lines exactly matching a key switch the current continent.
const HEADERS = {
  'AFRICA': 'Africa',
  'MIDDLE EAST / CENTRAL ASIA': 'Middle East / Central Asia',
  'SOUTH ASIA (HIMALAYAN & SUBCONTINENT)': 'South Asia',
  'SOUTHEAST ASIA': 'Southeast Asia',
  'EAST ASIA / NORTH ASIA': 'East Asia / North Asia',
  'EUROPE': 'Europe',
  'NORTH AMERICA / HAWAII': 'Americas',
  'OCEANIA / PACIFIC / AUSSIE / KIWI': 'Oceania',
  'RUSSIA / FORMER USSR': 'Europe',
  'AMERICAS': 'Americas'
};

const FILES = ['landraces-part1.txt', 'landraces-part2.txt', 'landraces-part3.txt'];

function splitBlocks(text) {
  // Blocks separated by blank lines. Returns { continent, lines } objects in order,
  // emitting a continent marker whenever a header line is seen.
  const out = [];
  let current = null;
  const chunks = text.split(/\n\s*\n/);
  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    // A chunk may start with a header line followed by an entry.
    if (HEADERS[lines[0]]) {
      current = HEADERS[lines[0]];
      lines.shift();
      if (lines.length === 0) continue;
    }
    out.push({ continent: current, block: lines.join('\n') });
  }
  return out;
}

const records = [];
const seen = new Set();
const unresolved = [];

for (const file of FILES) {
  const text = readFileSync(join(__dirname, 'raw', file), 'utf8');
  for (const { continent, block } of splitBlocks(text)) {
    const p = parseEntry(block);
    if (!p.name) continue;
    const id = makeUniqueId(p.name, seen);
    const coords = resolveCoords({ countryRaw: p.countryRaw, regionRaw: p.regionRaw, id });
    if (!coords) unresolved.push({ id, name: p.name, countryRaw: p.countryRaw });
    records.push({
      id,
      name: p.name,
      continent: continent || 'Unknown',
      country: p.countryRaw || '',
      region: p.regionRaw || '',
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
      coordsApproximate: true,
      type: p.type || '',
      category: normalizeCategory(p.type),
      height: p.height || '',
      flowering: p.flowering || '',
      climate: p.climate || '',
      summary: p.summary || '',
      incomplete: p.incomplete,
      links: []
    });
  }
}

writeFileSync(
  join(__dirname, 'landraces.json'),
  JSON.stringify(records, null, 2) + '\n',
  'utf8'
);

console.log(`Wrote ${records.length} entries to data/landraces.json`);
if (unresolved.length) {
  console.log(`\n${unresolved.length} entries had no resolvable coordinates (add to COUNTRY_CENTROIDS or REGION_OVERRIDES):`);
  for (const u of unresolved) console.log(`  - ${u.id} (country: "${u.countryRaw}")`);
}
```

- [ ] **Step 2: Run the conversion**

Run: `npm run convert`
Expected: prints `Wrote <N> entries to data/landraces.json` where N is ~300. It will likely also list some unresolved-coordinate entries — that is expected input for Task 10.

- [ ] **Step 3: Eyeball the output**

Run: `node -e "const d=require('./data/landraces.json'); console.log(d.length); console.log(d[0]); console.log(d.find(x=>x.name==='Afghani'))"`
Expected: a count near 300 and well-formed objects. (Note: `require` works here because Node treats the `.json` read directly; if it errors under `"type":"module"`, use `node --input-type=module -e "import('node:fs').then(...)"` or simply open the file.)

- [ ] **Step 4: Commit**

```bash
git add data/convert.mjs data/landraces.json
git commit -m "feat: convert raw landrace text into landraces.json"
```

---

### Task 9: Data validation

A validation script that doubles as a test: it loads the generated `landraces.json` and asserts the schema invariants from the spec.

**Files:**
- Create: `data/validate.mjs`
- Test: `data/validate.test.mjs`

- [ ] **Step 1: Write the validation module + failing test**

`data/validate.mjs`:
```javascript
import { CATEGORIES } from './lib/category.mjs';

// Returns { errors: string[], warnings: string[] } for an array of records.
export function validateRecords(records) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

  if (!Array.isArray(records)) {
    errors.push('records is not an array');
    return { errors, warnings };
  }

  for (const r of records) {
    const where = r && r.id ? r.id : JSON.stringify(r).slice(0, 40);
    if (!r.id) errors.push(`${where}: missing id`);
    if (ids.has(r.id)) errors.push(`${r.id}: duplicate id`);
    ids.add(r.id);
    if (!r.name) errors.push(`${where}: missing name`);
    if (!CATEGORIES.has(r.category)) errors.push(`${where}: invalid category "${r.category}"`);
    if (typeof r.coordsApproximate !== 'boolean') errors.push(`${where}: coordsApproximate not boolean`);
    if (!Array.isArray(r.links)) errors.push(`${where}: links not an array`);
    for (const link of r.links || []) {
      if (typeof link.embed !== 'boolean') errors.push(`${where}: link.embed not boolean`);
      if (!link.url) errors.push(`${where}: link missing url`);
    }
    // Coordinate checks
    if (r.lat === null || r.lng === null) {
      warnings.push(`${where}: missing coordinates (will not appear on map)`);
    } else {
      if (typeof r.lat !== 'number' || r.lat < -90 || r.lat > 90) errors.push(`${where}: lat out of range`);
      if (typeof r.lng !== 'number' || r.lng < -180 || r.lng > 180) errors.push(`${where}: lng out of range`);
    }
    // Stub / thin-data warnings (do not block build)
    if (r.incomplete) warnings.push(`${where}: marked incomplete (enrichment pending)`);
    else if (!r.summary) warnings.push(`${where}: empty summary`);
  }
  return { errors, warnings };
}
```

`data/validate.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateRecords } from './validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('validateRecords flags bad data', () => {
  const { errors } = validateRecords([
    { id: 'a', name: 'A', category: 'Bogus', coordsApproximate: true, links: [], lat: 0, lng: 0 },
    { id: 'a', name: 'B', category: 'Sativa', coordsApproximate: true, links: [], lat: 200, lng: 0 }
  ]);
  assert.ok(errors.some((e) => /invalid category/.test(e)));
  assert.ok(errors.some((e) => /duplicate id/.test(e)));
  assert.ok(errors.some((e) => /lat out of range/.test(e)));
});

test('generated landraces.json has no validation errors', () => {
  const data = JSON.parse(readFileSync(join(__dirname, 'landraces.json'), 'utf8'));
  const { errors } = validateRecords(data);
  assert.deepEqual(errors, [], `validation errors:\n${errors.join('\n')}`);
});
```

- [ ] **Step 2: Add a CLI wrapper to `validate.mjs` so `npm run validate` works**

Append to `data/validate.mjs`:
```javascript
// CLI entry: node data/validate.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

if (import.meta.url === `file://${process.argv[1]}`) {
  const __d = dirname(fileURLToPath(import.meta.url));
  const data = JSON.parse(readFileSync(join(__d, 'landraces.json'), 'utf8'));
  const { errors, warnings } = validateRecords(data);
  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const e of errors) console.error(`ERROR ${e}`);
  console.log(`\n${data.length} records — ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
}
```

- [ ] **Step 3: Run validation and the test**

Run: `npm run validate`
Expected: prints warnings (incomplete stubs, missing coords) but ideally **0 errors**. If there are errors, fix in Task 10.

Run: `node --test data/validate.test.mjs`
Expected: the `flags bad data` test PASSES. The `no validation errors` test passes once Task 10 cleanup is done — it is acceptable for it to fail here and pass after Task 10.

- [ ] **Step 4: Commit**

```bash
git add data/validate.mjs data/validate.test.mjs
git commit -m "feat: add landraces.json schema validation with tests"
```

---

### Task 10: Manual data QA pass

The conversion is "mostly manual" per the spec. This task resolves whatever the automated pass got wrong. **No code template — these are judgment edits.** Work the checklist, re-running `npm run convert` (then `npm run validate`) after table edits, or editing `data/landraces.json` directly for one-off fixes.

- [ ] **Step 1: Resolve unresolved coordinates**

For each entry the converter listed as unresolved: add its country to `COUNTRY_CENTROIDS`, add an alias to `COUNTRY_ALIASES`, or add a `REGION_OVERRIDES` entry in `data/lib/coords.mjs`. Re-run `npm run convert`. Repeat until the converter reports no unresolved entries.

- [ ] **Step 2: Add region overrides for far-flung localities**

Entries whose specific locality sits far from the country centroid (islands, mountain ranges, specific cities — e.g. Hawaiian districts, Xinjiang oases, Siberian river basins, Canary/Azores islands) should get a `REGION_OVERRIDES` entry keyed by their exact `regionRaw` string so the marker lands in the right place. Re-run convert.

- [ ] **Step 3: Spot-check parsing on tricky entries**

Open `data/landraces.json` and confirm these parsed sensibly (name/type/height/flowering/climate in the right fields): `Réunion Island (Zamal)`, `Australian Bastard Cannabis (ABC)`, `Lebanese`, `Turkestan`, the two `Transkei` entries (ids `transkei` and `transkei-2`), the two `Ogooué Basin` entries, `Sativa Subsp. Indica` types. Fix any misplaced fields directly in the JSON.

- [ ] **Step 4: Confirm stubs are marked, not dropped**

Confirm `Colombian Boyaca High Plateau` and `Southern Ecuador Interior Andean Valley` exist with `"incomplete": true`. They still need coordinates (country = Colombia/Ecuador) so they appear on the map.

- [ ] **Step 5: Re-run validation to green**

Run: `npm run validate`
Expected: **0 errors** (warnings for incomplete stubs are fine).

Run: `node --test data/validate.test.mjs`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add data/landraces.json data/lib/coords.mjs
git commit -m "fix: QA pass on converted landrace data and coordinates"
```

---

### Task 11: Search filtering (pure logic)

**Files:**
- Create: `js/search.js`
- Test: `js/search.test.mjs`

- [ ] **Step 1: Write failing tests**

`js/search.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterStrains } from './search.js';

const data = [
  { id: 'afghani', name: 'Afghani', country: 'Afghanistan', region: 'Northern Afghanistan', continent: 'Middle East / Central Asia', type: 'Indica', category: 'Indica' },
  { id: 'durban', name: 'Durban basin', country: '', region: '', continent: 'Africa', type: 'Sativa landrace', category: 'Sativa' },
  { id: 'oaxaca', name: 'Oaxaca', country: 'Mexico', region: '', continent: 'Americas', type: 'Sativa landrace', category: 'Sativa' }
];

test('returns empty array for empty query', () => {
  assert.deepEqual(filterStrains('', data), []);
});

test('matches name case-insensitively', () => {
  const r = filterStrains('afgh', data);
  assert.equal(r[0].id, 'afghani');
});

test('matches country and continent', () => {
  assert.ok(filterStrains('mexico', data).some((x) => x.id === 'oaxaca'));
  assert.ok(filterStrains('africa', data).some((x) => x.id === 'durban'));
});

test('ranks name-prefix matches above substring matches', () => {
  const local = [
    { id: 'a', name: 'Highland Sativa', country: '', region: '', continent: '', type: '', category: 'Sativa' },
    { id: 'b', name: 'Sativa Gold', country: '', region: '', continent: '', type: '', category: 'Sativa' }
  ];
  const r = filterStrains('sativa', local);
  assert.equal(r[0].id, 'b'); // prefix match ranks first
});

test('limits results', () => {
  const many = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}`, name: `Sativa ${i}`, country: '', region: '', continent: '', type: '', category: 'Sativa' }));
  assert.ok(filterStrains('sativa', many, 10).length <= 10);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test js/search.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `js/search.js`**

```javascript
// Pure search/filter logic, shared by the browser UI and Node tests.
const FIELDS = ['name', 'country', 'region', 'continent', 'type', 'category'];

export function filterStrains(query, strains, limit = 12) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const s of strains) {
    let best = Infinity;
    for (const f of FIELDS) {
      const v = (s[f] || '').toString().toLowerCase();
      const idx = v.indexOf(q);
      if (idx === -1) continue;
      // Prefix match on name scores best; earlier index and name field score better.
      let score = idx;
      if (f === 'name' && idx === 0) score = -2;
      else if (idx === 0) score = -1;
      else if (f === 'name') score = idx - 0.5;
      if (score < best) best = score;
    }
    if (best !== Infinity) scored.push({ s, best });
  }
  scored.sort((a, b) => a.best - b.best || a.s.name.localeCompare(b.s.name));
  return scored.slice(0, limit).map((x) => x.s);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test js/search.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/search.js js/search.test.mjs
git commit -m "feat: add pure search filtering with tests"
```

---

### Task 12: Map module

Leaflet setup with the GeoJSON world layer (no tiles) and leaf markers. Uses the global `L` provided by the vendored classic script. Verified by manual smoke (DOM/Leaflet, not unit-tested).

**Files:**
- Create: `js/map.js`

- [ ] **Step 1: Implement `js/map.js`**

```javascript
// Map module: initializes Leaflet with a GeoJSON base layer (no tile provider)
// and renders green-leaf markers. Exposes init + selection helpers.
// Relies on the global `L` from lib/leaflet/leaflet.js.

const LEAF_ICON = L.icon({
  iconUrl: 'assets/leaf.svg',
  iconSize: [22, 25],
  iconAnchor: [11, 24],
  popupAnchor: [0, -22],
  className: 'leaf-marker'
});

export function createMap(elementId, worldGeoJson) {
  const map = L.map(elementId, {
    center: [20, 10],
    zoom: 2,
    minZoom: 2,
    maxZoom: 7,
    worldCopyJump: true,
    zoomControl: true,
    attributionControl: false
  });

  L.geoJSON(worldGeoJson, {
    style: {
      color: '#c8c5bd',       // soft grey borders
      weight: 0.7,
      fillColor: '#e9e6df',   // pale paper landmass
      fillOpacity: 1
    },
    interactive: false
  }).addTo(map);

  return map;
}

// Adds markers for every strain with coordinates. Calls onSelect(strain) on click.
// Returns a Map of strain id -> Leaflet marker for later programmatic selection.
export function addMarkers(map, strains, onSelect) {
  const byId = new globalThis.Map();
  for (const s of strains) {
    if (s.lat === null || s.lng === null || typeof s.lat !== 'number') continue;
    const marker = L.marker([s.lat, s.lng], { icon: LEAF_ICON, title: s.name });
    marker.on('click', () => onSelect(s));
    marker.addTo(map);
    byId.set(s.id, marker);
  }
  return byId;
}

// Pans/zooms so the marker sits in the visible (left) portion when the panel is open.
export function flyToStrain(map, strain) {
  if (!strain || strain.lat === null) return;
  map.flyTo([strain.lat, strain.lng], Math.max(map.getZoom(), 5), { duration: 0.6 });
}
```

- [ ] **Step 2: Smoke-verify deferred**

This module is exercised in Task 14's smoke run. No standalone command here.

- [ ] **Step 3: Commit**

```bash
git add js/map.js
git commit -m "feat: add leaflet map module with geojson base and leaf markers"
```

---

### Task 13: Panel module

Renders a strain into the side panel: header, type badge, summary, traits, links (outbound + iframe embeds with fallback).

**Files:**
- Create: `js/panel.js`

- [ ] **Step 1: Implement `js/panel.js`**

```javascript
// Panel module: renders a strain's details into the side panel DOM.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function traitRow(dl, label, value) {
  if (!value) return;
  dl.appendChild(el('dt', null, label));
  dl.appendChild(el('dd', null, value));
}

// Renders into `container`. `onClose` is called when the × is clicked.
export function renderStrain(container, strain, onClose) {
  container.innerHTML = '';

  const closeBtn = el('button', 'panel-close', '×');
  closeBtn.setAttribute('aria-label', 'Close panel');
  closeBtn.addEventListener('click', onClose);
  container.appendChild(closeBtn);

  const place = [strain.region, strain.country].filter(Boolean).join(', ');
  container.appendChild(el('h2', 'panel-name', strain.name));
  if (place) container.appendChild(el('p', 'panel-place', place));

  if (strain.category) {
    const badge = el('span', 'panel-badge', strain.category);
    container.appendChild(badge);
  }

  if (strain.incomplete && !strain.summary) {
    container.appendChild(el('p', 'panel-summary panel-muted', 'Details pending — this entry is awaiting enrichment.'));
  } else if (strain.summary) {
    container.appendChild(el('p', 'panel-summary', strain.summary));
  }

  const dl = el('dl', 'panel-traits');
  traitRow(dl, 'Type', strain.type);
  traitRow(dl, 'Height', strain.height);
  traitRow(dl, 'Flowering', strain.flowering);
  traitRow(dl, 'Climate', strain.climate);
  traitRow(dl, 'Region', strain.continent);
  if (dl.children.length) container.appendChild(dl);

  if (strain.coordsApproximate) {
    container.appendChild(el('p', 'panel-note', 'Location is approximate.'));
  }

  if (Array.isArray(strain.links) && strain.links.length) {
    container.appendChild(el('h3', 'panel-links-title', 'References'));
    for (const link of strain.links) {
      if (link.embed) {
        const wrap = el('figure', 'panel-embed');
        const frame = document.createElement('iframe');
        frame.src = link.url;
        frame.loading = 'lazy';
        frame.title = link.label || link.url;
        // Fallback if the iframe fails / is blocked.
        const fallback = el('figcaption', 'panel-embed-fallback');
        const a = el('a', null, link.label || 'Open source');
        a.href = link.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        fallback.append('Embedded view unavailable — ', a, ' (opens on the source site).');
        frame.addEventListener('error', () => { frame.replaceWith(fallback); });
        wrap.append(frame, el('figcaption', 'panel-embed-cap', link.label || ''));
        container.appendChild(wrap);
      } else {
        const p = el('p', 'panel-link');
        const a = el('a', null, link.label || link.url);
        a.href = link.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        p.appendChild(a);
        container.appendChild(p);
      }
    }
  }
}
```

- [ ] **Step 2: Smoke-verify deferred to Task 14**

- [ ] **Step 3: Commit**

```bash
git add js/panel.js
git commit -m "feat: add strain panel rendering module"
```

---

### Task 14: App wiring + index.html + ribbon

Wires data load → map → markers → search autocomplete → panel open/close. Builds the real `index.html`.

**Files:**
- Modify: `index.html` (replace placeholder)
- Modify: `js/app.js` (replace placeholder)

- [ ] **Step 1: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Landrace Atlas</title>
    <link rel="stylesheet" href="lib/leaflet/leaflet.css" />
    <link rel="stylesheet" href="css/styles.css" />
  </head>
  <body class="panel-closed">
    <header class="ribbon">
      <div class="wordmark">Landrace Atlas</div>
      <div class="search">
        <input id="search-input" type="search" autocomplete="off" spellcheck="false"
               placeholder="Search strains, regions, countries…" aria-label="Search landraces" />
        <ul id="search-results" class="search-results" role="listbox" hidden></ul>
      </div>
    </header>

    <main class="layout">
      <div id="map" class="map"></div>
      <aside id="panel" class="panel" aria-live="polite"></aside>
    </main>

    <!-- Vendored Leaflet (classic global) must load before the module that uses `L`. -->
    <script src="lib/leaflet/leaflet.js"></script>
    <script type="module" src="js/app.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Write `js/app.js`**

```javascript
import { createMap, addMarkers, flyToStrain } from './map.js';
import { renderStrain } from './panel.js';
import { filterStrains } from './search.js';

const mapEl = 'map';
const panel = document.getElementById('panel');
const input = document.getElementById('search-input');
const resultsList = document.getElementById('search-results');

let strains = [];
let markersById = new Map();
let map = null;

function openPanel(strain) {
  renderStrain(panel, strain, closePanel);
  document.body.classList.remove('panel-closed');
  document.body.classList.add('panel-open');
  setTimeout(() => map && map.invalidateSize(), 250); // after CSS reflow
  flyToStrain(map, strain);
}

function closePanel() {
  document.body.classList.remove('panel-open');
  document.body.classList.add('panel-closed');
  panel.innerHTML = '';
  setTimeout(() => map && map.invalidateSize(), 250);
}

function showResults(items) {
  resultsList.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'search-empty';
    li.textContent = 'No matches';
    resultsList.appendChild(li);
    resultsList.hidden = false;
    return;
  }
  for (const s of items) {
    const li = document.createElement('li');
    li.className = 'search-result';
    li.setAttribute('role', 'option');
    li.tabIndex = 0;
    const place = [s.region, s.country].filter(Boolean).join(', ');
    li.innerHTML = `<span class="r-name"></span><span class="r-place"></span>`;
    li.querySelector('.r-name').textContent = s.name;
    li.querySelector('.r-place').textContent = place;
    const select = () => { selectStrain(s); };
    li.addEventListener('click', select);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter') select(); });
    resultsList.appendChild(li);
  }
  resultsList.hidden = false;
}

function hideResults() { resultsList.hidden = true; }

function selectStrain(s) {
  input.value = s.name;
  hideResults();
  openPanel(s);
}

input.addEventListener('input', () => {
  showResults(filterStrains(input.value, strains));
});
input.addEventListener('focus', () => {
  if (input.value.trim()) showResults(filterStrains(input.value, strains));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!resultsList.hidden) hideResults();
    else if (document.body.classList.contains('panel-open')) closePanel();
  }
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search')) hideResults();
});

async function boot() {
  try {
    const [data, world] = await Promise.all([
      fetch('data/landraces.json').then((r) => { if (!r.ok) throw new Error('data'); return r.json(); }),
      fetch('data/world.geojson').then((r) => { if (!r.ok) throw new Error('geo'); return r.json(); })
    ]);
    strains = data;
    map = createMap(mapEl, world);
    markersById = addMarkers(map, strains, openPanel);
  } catch (err) {
    document.getElementById('map').innerHTML =
      '<div class="map-error">Unable to load map data.</div>';
    console.error('Landrace Atlas failed to load:', err);
  }
}

boot();
```

- [ ] **Step 3: Serve and smoke-test**

Run: `npm run serve` then open http://localhost:8000 in a browser.
Expected:
- Ribbon spans the top with the wordmark and search box.
- The world map fills the area below, drawn in soft greys with **no tile imagery**.
- Green leaf markers appear across the map.
- Clicking a marker opens the right panel (~1/3 width) and the map reflows to ~2/3.
- The map gently flies to center the clicked marker.

- [ ] **Step 4: Commit**

```bash
git add index.html js/app.js
git commit -m "feat: wire data, map, search, and panel into the app shell"
```

---

### Task 15: Styling, tone, and responsive layout

Implements the calm/academic visual design and the responsive bottom-sheet panel.

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Write `css/styles.css`**

```css
:root {
  --paper: #f6f4ef;
  --ink: #23211c;
  --muted: #6f6b61;
  --line: #d9d5cc;
  --green: #4f7a43;
  --green-dark: #3c5f33;
  --panel-w: 33vw;
  --ribbon-h: 60px;
  --serif: Georgia, 'Times New Roman', serif;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { font-family: var(--sans); color: var(--ink); background: var(--paper); }

/* Ribbon */
.ribbon {
  height: var(--ribbon-h);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; gap: 20px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  position: relative; z-index: 1000;
}
.wordmark {
  font-family: var(--serif); font-size: 20px; letter-spacing: 0.02em;
  color: var(--ink); white-space: nowrap;
}
.search { position: relative; flex: 0 1 380px; }
#search-input {
  width: 100%; padding: 9px 12px; font-size: 14px; font-family: var(--sans);
  color: var(--ink); background: #fff;
  border: 1px solid var(--line); border-radius: 6px; outline: none;
}
#search-input:focus { border-color: var(--green); }

.search-results {
  list-style: none; margin: 4px 0 0; padding: 4px;
  position: absolute; top: 100%; right: 0; left: 0; z-index: 1100;
  background: #fff; border: 1px solid var(--line); border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.06); max-height: 60vh; overflow-y: auto;
}
.search-result {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 8px 10px; border-radius: 4px; cursor: pointer;
}
.search-result:hover, .search-result:focus { background: #eef0e9; outline: none; }
.r-name { font-weight: 600; }
.r-place { color: var(--muted); font-size: 12px; }
.search-empty { padding: 8px 10px; color: var(--muted); }

/* Layout */
.layout { height: calc(100% - var(--ribbon-h)); display: flex; }
.map { flex: 1 1 auto; height: 100%; background: #eef1f4; }
.map-error {
  display: flex; height: 100%; align-items: center; justify-content: center;
  color: var(--muted); font-size: 15px;
}

/* Panel */
.panel {
  flex: 0 0 0; width: 0; height: 100%; overflow-y: auto;
  background: #fff; border-left: 1px solid var(--line);
  transition: flex-basis 0.22s ease, width 0.22s ease;
  padding: 0;
}
body.panel-open .panel { flex-basis: var(--panel-w); width: var(--panel-w); padding: 22px 24px 40px; }

.panel-close {
  float: right; border: none; background: none; cursor: pointer;
  font-size: 26px; line-height: 1; color: var(--muted);
}
.panel-close:hover { color: var(--ink); }
.panel-name { font-family: var(--serif); font-size: 24px; margin: 4px 0 2px; }
.panel-place { color: var(--muted); margin: 0 0 12px; font-size: 14px; }
.panel-badge {
  display: inline-block; font-size: 12px; letter-spacing: 0.03em;
  padding: 3px 9px; border-radius: 999px;
  background: #eef0e9; color: var(--green-dark); border: 1px solid #d6ddcf;
}
.panel-summary { font-family: var(--serif); font-size: 15.5px; line-height: 1.55; margin: 14px 0; }
.panel-muted { color: var(--muted); font-style: italic; }
.panel-traits { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; margin: 14px 0; font-size: 14px; }
.panel-traits dt { color: var(--muted); }
.panel-traits dd { margin: 0; }
.panel-note { color: var(--muted); font-size: 12px; }
.panel-links-title { font-family: var(--serif); font-size: 16px; margin: 18px 0 8px; }
.panel-link a, .panel-embed-fallback a { color: var(--green-dark); }
.panel-embed { margin: 0 0 16px; }
.panel-embed iframe { width: 100%; height: 320px; border: 1px solid var(--line); border-radius: 6px; }
.panel-embed-cap { color: var(--muted); font-size: 12px; margin-top: 4px; }
.panel-embed-fallback { color: var(--muted); font-size: 13px; }

/* Marker tint: the SVG uses currentColor */
.leaf-marker { color: var(--green); }

/* Responsive: panel becomes a bottom sheet on narrow screens */
@media (max-width: 720px) {
  :root { --panel-w: 100vw; }
  .layout { display: block; position: relative; }
  .map { height: 100%; }
  .panel {
    position: fixed; left: 0; right: 0; bottom: 0; top: auto;
    width: 100%; height: 0; border-left: none; border-top: 1px solid var(--line);
    border-radius: 14px 14px 0 0; transition: height 0.22s ease;
    box-shadow: 0 -8px 24px rgba(0,0,0,0.12);
  }
  body.panel-open .panel { width: 100%; height: 70vh; padding: 18px 18px 32px; }
  .search { flex-basis: 220px; }
}
```

- [ ] **Step 2: Reload and smoke-test the look**

Run: `npm run serve` then reload http://localhost:8000.
Expected:
- Paper/ink palette, serif strain names, muted green markers and accents — calm and academic.
- Panel slides to ~1/3 width on desktop; map reflows without breaking.
- Narrow the window below 720px: the panel becomes a bottom sheet (~70vh) and the map stays full-width.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: add academic/calm styling and responsive bottom-sheet panel"
```

---

### Task 16: Error-handling verification

Confirms the quiet-degradation behaviors from the spec. Most logic already exists (Task 14 boot try/catch, Task 12 marker skip, Task 13 iframe fallback); this task verifies them and fills any gap.

- [ ] **Step 1: Verify data-load failure message**

Temporarily rename the data file and reload:
```bash
mv data/landraces.json data/landraces.json.bak
```
Reload http://localhost:8000. Expected: the map area shows "Unable to load map data." (not a blank page). Then restore:
```bash
mv data/landraces.json.bak data/landraces.json
```

- [ ] **Step 2: Verify bad-coordinate skip**

Confirm in `js/map.js` that `addMarkers` skips entries where `lat`/`lng` is `null` or non-numeric (it does). Confirm the app still renders all other markers when some entries lack coordinates (incomplete stubs that couldn't be geocoded). No code change expected.

- [ ] **Step 3: Verify search "No matches"**

In the running app, type a nonsense query (e.g. `zzzzzz`). Expected: the dropdown shows a single quiet "No matches" row.

- [ ] **Step 4: Verify iframe fallback wiring**

Temporarily add a test embed link to one entry in `data/landraces.json`, e.g. for `afghani`:
```json
"links": [{ "label": "Test embed", "url": "https://example.com/", "embed": true }]
```
Reload, open Afghani. Expected: an embedded frame appears with the caption; if the source refuses framing, the fallback link text appears instead of a broken box. Remove the test link afterward.

- [ ] **Step 5: Commit (only if any file changed)**

```bash
git add -A
git commit -m "test: verify quiet error-handling behaviors"
```

---

### Task 17: Final manual smoke checklist

Run the full spec smoke checklist against the running app (`npm run serve`, http://localhost:8000). Check each box only after observing it.

- [ ] Map renders with the GeoJSON base layer (soft greys, no tiles).
- [ ] Leaf markers appear at plausible locations across all continents.
- [ ] Clicking a marker opens the panel with the correct strain content.
- [ ] Search + autocomplete matches name/country/region/continent/type/category; selecting a result opens the panel and flies the map to its marker.
- [ ] Escape closes the open results dropdown, then (pressed again) closes the panel; the × button also closes the panel; map returns to full width.
- [ ] Responsive bottom-sheet works below 720px.
- [ ] An `embed: true` link renders as an inline iframe (with caption); an `embed: false` link renders as an outbound link opening in a new tab. (Use the Task 16 temporary link to confirm, then remove.)
- [ ] `npm test` passes (all module + data tests).
- [ ] `npm run validate` reports 0 errors.

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore: pass final landrace atlas smoke checklist"
```

---

## Out of scope (future plan): enrichment scraping

Per the spec's "Enrichment sources" section, scraping The Real Seed Company and TLT Seeds to improve summaries and add per-strain reference links is a **separate, later phase** and gets its own plan. That plan will cover: a rate-limited offline scraper respecting each site's `robots.txt`/ToS, a local cache of scraped pages, a fuzzy + human-reviewed matcher from vendor product names to our `id`s, paraphrased summary/region enrichment back into `landraces.json`, and population of `links[]` (outbound `embed:false` unless a page is confirmed iframe-friendly). It does not change the app's runtime architecture — only the data file.

---

## Addendum (2026-06-19): write-ups, submissions, licensing, rename

After Tasks 1–11 were implemented, the project gained new requirements. App renamed
to **"The Cannabis Landrace Atlas."** Decisions: write-ups are **prose-only drafts
with no fabricated links**; **MIT (code) + CC BY-SA 4.0 (data)**; **≤200 changed
lines per contribution**; **generate all ~446 write-ups** after the display system is
verified. These revise/extend the remaining tasks. The data dataset is ~446 entries
(not ~300).

### Task 12: Map module — unchanged (see original Task 12 above).

### Task A1: Vendor a Markdown renderer + wrapper
- Vendor `marked` locally (no CDN): `curl -fsSL https://cdn.jsdelivr.net/npm/marked@12/marked.min.js -o lib/marked.min.js` (verify it's real JS, >20KB; `marked` is MIT). Keep upstream license — do NOT add our SPDX header to vendored files.
- Create `js/markdown.js`: a thin first-party ES module wrapping the global `marked`, e.g. `export function renderMarkdown(md){ return marked.parse(md, { breaks:false, gfm:true }); }`. Loaded after `lib/marked.min.js`. Add SPDX header.
- Smoke: rendered in Task 13/14.

### Task 13 (revised): Panel module
Renders, in order: name + place header; category badge; quick-facts `<dl>` (type, height, flowering, climate, region; "Location is approximate" note when `coordsApproximate`); a **write-up container** (filled by the caller after a lazy fetch — `renderStrain` accepts the strain and exposes a `setWriteupHtml(html)` / `setWriteupState('loading'|'missing')` hook, OR app.js fetches then calls a `renderWriteup(container, html)`); structured `links[]` (iframe w/ fallback for `embed:true`, outbound for `embed:false`); and a **bottom submit button** ("Suggest a correction / add forum & seed links") that calls an injected `onSubmit(strain)` callback. SPDX header. Keep DOM-built (no innerHTML for strain fields); write-up HTML is the one place innerHTML is used (trusted first-party content).

### Task 14 (revised): App wiring + index.html + ribbon
- index.html: title + wordmark "The Cannabis Landrace Atlas"; ribbon gets a **Submit** button; include `<script src="lib/marked.min.js"></script>` before the module script; add a hidden modal container.
- app.js: on marker/search select → open panel, then `fetch('data/writeups/'+id+'.md')` → on ok render via `renderMarkdown`; on 404 set "Write-up pending"; on network error quiet message. Ribbon Submit and panel submit both open a shared **placeholder modal**: heading + body "Submissions open once The Cannabis Landrace Atlas has a public GitHub repository. For now, thank you for your interest." + close button + Escape/backdrop close. No network calls. SPDX headers.

### Task 15 (revised): Styling
Original academic styling PLUS: `.writeup` typography (headings, paragraphs, lists, links, `img{max-width:100%}`), the disclaimer line style (muted/italic), the empty-slot note style, ribbon `.submit-btn`, panel `.panel-submit` button, and `.modal`/`.modal-backdrop` styles. Responsive bottom-sheet unchanged.

### Task B1: Write-up system + samples + generation guide
- Create `data/writeups/` and `data/writeups/TEMPLATE.md` (the section skeleton + disclaimer).
- Create `docs/writeup-generation-guide.md`: the rules a generator (subagent) MUST follow — sections/order; disclaimer first line; prose-only for the 4 prose sections; honest hedging; obscure strains stay to regional generalities; **never invent URLs**; Photos/Seed Sources/Forum Discussions/References are empty labeled slots with the standard "No verified links yet — use the button below to suggest one." note; CC BY-SA 4.0; markdown only (no HTML).
- Write 2–3 real sample write-ups (well-known strains: `afghani`, `acapulco-gold`, `durban-basin` or similar real ids — confirm ids from landraces.json) to verify rendering end-to-end in the browser.

**Write-up file template (`data/writeups/<id>.md`):**
```markdown
> _AI-generated draft — unverified. Help us improve it via the button in the panel._

## Overview
<2–4 sentences; hedged where uncertain>

## History
<origin/lineage; "commonly reported"/"grower accounts" hedging; generalities if obscure>

## Description
<morphology, aroma, effect as reported>

## Grow Information
<climate fit, height, flowering, vigor, resistances>

## Photos
_No verified photos yet — use the button below to suggest one._

## Seed Sources
_No verified seed sources yet — use the button below to suggest one._

## Forum Discussions
_No verified forum links yet — use the button below to suggest one._

## References
_No verified references yet — use the button below to suggest one._
```

### Task C1: Project docs + licensing
- `LICENSE` — MIT, copyright "The Cannabis Landrace Atlas contributors", year 2026.
- `LICENSE-DATA` — CC BY-SA 4.0 full text (or the standard CC deed pointer + summary), covering `data/` and `data/writeups/`.
- `README.md` — what the app is; how to run (`npm run serve`); the no-backend/static design; **prominent data credit** to Dankk1 on Overgrow (https://overgrow.com/t/attempted-complete-global-landrace-hemp-heirloom-strain-list/238462); the licensing split (MIT code / CC BY-SA 4.0 data); a note that write-ups are AI-generated unverified drafts; link to CONTRIBUTING.
- `CONTRIBUTING.md` — data vs code changes in **separate** PRs; **≤200 changed lines** per submission; clear complete description + evidence of testing (`npm test`/`npm run validate` for data/logic, screenshot/note for UI); the "always credit sources" principle; how the Submit buttons will map to issues later.
- **SPDX headers** on first-party source files (`index.html`, `css/styles.css`, `js/*.js`, `data/*.mjs`, `data/lib/*.mjs`): `SPDX-License-Identifier: MIT` + `Copyright (c) 2026 The Cannabis Landrace Atlas contributors`, in the correct comment syntax per file type (HTML comment, CSS/JS block comment). Do NOT add headers to vendored `lib/` files or to data/JSON/markdown.

### Task D1: Generate all ~446 write-ups (batched)
After B1/C1 verify rendering: generate `data/writeups/<id>.md` for every strain in `landraces.json`, in batches (group by continent/region), each batch a subagent following `docs/writeup-generation-guide.md` exactly. **Each strain's full record is passed to the generator** (id, name, continent, country, region, type, category, height, flowering, climate, summary) so the write-up is unmistakably about the correct strain in the correct country/region — names are often ambiguous or shared across regions, so the prose must anchor on the supplied country/region and never describe a different same-named strain/place. The batch dispatch gives the subagent the exact records (as JSON) plus the guide; the subagent writes one file per record. Validate after: every id has a file; every file starts with the disclaimer and contains the 8 section headings; no `http`/`https`/`www` URLs appear in any generated file (assert zero URLs — proves no fabricated links). Commit per batch.

### Task 16 (revised): Error handling — adds write-up 404 → "Write-up pending"; submit modal opens/closes (Escape/backdrop); existing data-load/marker/iframe/search behaviors unchanged.

### Task 17 (revised): Final smoke — original checklist PLUS: write-up renders as styled markdown for a strain that has one; "Write-up pending" shows for one without; ribbon Submit and panel Submit both open the placeholder modal and close cleanly; README/LICENSE/LICENSE-DATA/CONTRIBUTING exist; SPDX headers present on first-party source; `npm test` + `npm run validate` green.

## Self-review notes

- **Spec coverage:** scaffold (T1), vendored deps/icon (T2), data model + ingestion + stub handling (T4–T10), coordinates approximate + flag (T6), search incl. all six fields (T11), map with GeoJSON-no-tiles + leaf markers + fly-to (T12), panel order/badge/traits/links/embeds + fallback (T13), ribbon/layout/default-closed/reflow (T14), tone + responsive bottom sheet (T15), all four error-handling behaviors (T16), full smoke + data-validation test (T9, T17), enrichment flagged out of scope. No spec section left without a task.
- **Type consistency:** `parseEntry` returns `{name, countryRaw, type, height, flowering, climate, summary, regionRaw, incomplete}`; the converter maps those to the record fields used by `validateRecords`, `filterStrains`, `addMarkers`, and `renderStrain`. Record field names (`category`, `coordsApproximate`, `links`, `lat`, `lng`) are identical across T8/T9/T11/T12/T13.
- **Tests:** pure logic is TDD'd via `node --test` (T4,5,6,7,9,11); DOM/Leaflet is manual smoke (T12–T17), as the spec requires no heavyweight framework.
```
