import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { flattenAdmin1, flattenCities } from './fetch-ne-gazetteer.mjs';
import { mergeGazetteer, residueKind } from './refine-unresolved.mjs';
import { loadGazetteer, buildCountryIndex, decideRefinement, resolveCountry, inAny } from './refine-coords.mjs';

const DBUILD = path.dirname(fileURLToPath(import.meta.url));
const LABELS = path.join(DBUILD, '..', 'labels');
const world = JSON.parse(fs.readFileSync(path.join(DBUILD, '..', 'world.geojson'), 'utf8'));

test('flattenAdmin1 maps name/admin/latitude/longitude and skips incomplete', () => {
  const gj = { features: [
    { properties: { name: 'Badakhshan', admin: 'Afghanistan', latitude: 36.7, longitude: 70.8 } },
    { properties: { name: 'NoCoords', admin: 'Nowhere' } },
  ] };
  const out = flattenAdmin1(gj);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { name: 'Badakhshan', lat: 36.7, lng: 70.8, country: 'Afghanistan', src: 'ne-admin1' });
});

test('flattenCities maps NAME/ADM0NAME/LATITUDE/LONGITUDE', () => {
  const gj = { features: [
    { properties: { NAME: 'Herat', ADM0NAME: 'Afghanistan', LATITUDE: 34.33, LONGITUDE: 62.17 } },
  ] };
  const out = flattenCities(gj);
  assert.deepEqual(out[0], { name: 'Herat', lat: 34.33, lng: 62.17, country: 'Afghanistan', src: 'ne-city' });
});

test('mergeGazetteer makes an NE-only city resolvable and decideRefinement moves it in-country', () => {
  const local = loadGazetteer(LABELS);
  assert.equal(local.get('kashgar'), undefined, 'Kashgar is absent from the local gazetteer');
  const enriched = mergeGazetteer(local, [
    { name: 'Kashgar', lat: 39.476, lng: 75.97, country: 'China', src: 'ne-city' },
  ]);
  const ctx = { gaz: enriched, countryIndex: buildCountryIndex(world), lakes: [], centroidCache: new Map() };
  const r = { name: 'Kashgar', region: '', country: 'China', lat: 35.0, lng: 103.0 };
  const d = decideRefinement(r, ctx);
  assert.equal(d.action, 'move');
  assert.ok(Math.abs(d.lat - 39.476) < 0.1 && Math.abs(d.lng - 75.97) < 0.1);
  assert.ok(inAny([d.lng, d.lat], resolveCountry('China', ctx.countryIndex)));
});

test('residueKind buckets residue names (country-aware)', () => {
  assert.equal(residueKind('Atlas Mountains', 'Morocco'), 'named-feature');
  assert.equal(residueKind('Bekaa Valley', 'Lebanon'), 'named-feature');
  assert.equal(residueKind('Virunga Highlands', 'DRC'), 'named-feature'); // real toponym + descriptor
  assert.equal(residueKind('Angolan Highland', 'Angola'), 'descriptor');
  assert.equal(residueKind('Madagascar Coastal Lowlands', 'Madagascar'), 'descriptor');
  assert.equal(residueKind('Malagasy Highland', 'Madagascar'), 'descriptor'); // irregular demonym
  assert.equal(residueKind('Nigerian', 'Nigeria'), 'vague');
  assert.equal(residueKind('Afghani', 'Afghanistan'), 'vague');
});
