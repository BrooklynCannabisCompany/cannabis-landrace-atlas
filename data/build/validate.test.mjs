// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateRecords, validateLabelPoints } from './validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const labelsDir = join(__dirname, '..', 'labels');
const geoDir = join(__dirname, '..', 'geo');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

test('validateRecords flags bad data', () => {
  const { errors } = validateRecords([
    { id: 'a', name: 'A', category: 'Bogus', coordsApproximate: true, links: [], lat: 0, lng: 0 },
    { id: 'a', name: 'B', category: 'Sativa', coordsApproximate: true, links: [], lat: 200, lng: 0 }
  ]);
  assert.ok(errors.some((e) => /invalid category/.test(e)));
  assert.ok(errors.some((e) => /duplicate id/.test(e)));
  assert.ok(errors.some((e) => /lat out of range/.test(e)));
});

// A record that passes every check, so tests can perturb one field at a time.
const validRecord = {
  id: 'ok', name: 'OK', continent: 'Africa', climate: 'Savanna',
  category: 'Sativa', morphotype: 'Unclassified', chemotype: 'I', domestication: 'Heirloom',
  coordsApproximate: true, links: [], lat: 0, lng: 0, summary: 'x'
};

test('validateRecords flags invalid continent and climate', () => {
  const { errors } = validateRecords([
    { ...validRecord, continent: 'Atlantis' },
    { ...validRecord, id: 'ok2', climate: '' }
  ]);
  assert.ok(errors.some((e) => /invalid continent "Atlantis"/.test(e)));
  assert.ok(errors.some((e) => /invalid climate ""/.test(e)));
});

test('validateRecords reports a null record instead of throwing', () => {
  assert.doesNotThrow(() => validateRecords([null]));
  const { errors } = validateRecords([null]);
  assert.ok(errors.some((e) => /record is null/.test(e)));
});

test('validateRecords flags missing id, missing name, and bad links', () => {
  const { errors } = validateRecords([
    { ...validRecord, id: '', name: '' },
    { ...validRecord, id: 'l1', links: 'nope' },
    { ...validRecord, id: 'l2', links: [{ url: 'https://x', embed: 'yes' }] },
    { ...validRecord, id: 'l3', links: [{ embed: false }] }
  ]);
  assert.ok(errors.some((e) => /missing id/.test(e)));
  assert.ok(errors.some((e) => /missing name/.test(e)));
  assert.ok(errors.some((e) => /links not an array/.test(e)));
  assert.ok(errors.some((e) => /link\.embed not boolean/.test(e)));
  assert.ok(errors.some((e) => /link missing url/.test(e)));
});

test('validateRecords flags lng out of range', () => {
  const { errors } = validateRecords([{ ...validRecord, lng: 999 }]);
  assert.ok(errors.some((e) => /lng out of range/.test(e)));
});

test('validateRecords emits warnings (not errors) for thin data', () => {
  const { errors, warnings } = validateRecords([
    { ...validRecord, id: 'w1', lat: null, lng: null },
    { ...validRecord, id: 'w2', incomplete: true },
    { ...validRecord, id: 'w3', summary: '' }
  ]);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => /missing coordinates/.test(w)));
  assert.ok(warnings.some((w) => /marked incomplete/.test(w)));
  assert.ok(warnings.some((w) => /empty summary/.test(w)));
});

test('generated landraces.json has no validation errors', () => {
  const data = JSON.parse(readFileSync(join(__dirname, '..', 'landraces.json'), 'utf8'));
  const { errors } = validateRecords(data);
  assert.deepEqual(errors, [], `validation errors:\n${errors.join('\n')}`);
});

test('validateLabelPoints flags bad label rows', () => {
  const { errors } = validateLabelPoints([
    { name: 'Good', lat: 10, lng: 20, rank: 1 },
    { name: '', lat: 10, lng: 20, rank: 1 },     // missing name
    { name: 'X', lat: 95, lng: 20, rank: 1 },    // lat out of range
    { name: 'Y', lat: 10, lng: 999, rank: 1 },   // lng out of range
    { name: 'Z', lat: 10, lng: 20, rank: 'x' }   // rank not a number
  ], 'sample');
  assert.equal(errors.length, 4);
  assert.ok(errors.some((e) => /missing name/.test(e)));
  assert.ok(errors.some((e) => /lat out of range/.test(e)));
  assert.ok(errors.some((e) => /lng out of range/.test(e)));
  assert.ok(errors.some((e) => /rank not a number/.test(e)));
});

test('validateLabelPoints rejects a non-array', () => {
  assert.equal(validateLabelPoints({}, 'sample').errors.length, 1);
});

for (const file of ['cities', 'water', 'states', 'lakes', 'rivers', 'ranges', 'peaks', 'landforms']) {
  test(`generated ${file}.json is a valid label-point file`, () => {
    const rows = readJson(join(labelsDir, `${file}.json`));
    assert.ok(Array.isArray(rows) && rows.length > 0, `${file}.json should be a non-empty array`);
    const { errors } = validateLabelPoints(rows, file);
    assert.deepEqual(errors, [], `${file}.json errors:\n${errors.join('\n')}`);
  });
}

test('generated geo files are non-empty FeatureCollections', () => {
  for (const file of ['lakes.geojson', 'rivers.geojson', 'admin1.geojson', 'deserts.geojson']) {
    const g = readJson(join(geoDir, file));
    assert.equal(g.type, 'FeatureCollection', `${file} type`);
    assert.ok(Array.isArray(g.features) && g.features.length > 0, `${file} features`);
  }
});

test('relief.json is an array of in-range [lat,lng,r,lvl] rows', () => {
  const rel = readJson(join(geoDir, 'relief.json'));
  assert.ok(Array.isArray(rel) && rel.length > 0, 'relief.json should be a non-empty array');
  assert.ok(rel.every((p) => Array.isArray(p)
    && p[0] >= -90 && p[0] <= 90 && p[1] >= -180 && p[1] <= 180
    && p[2] >= 0 && p[2] <= 1 && p[3] >= 0 && p[3] <= 2), 'every row in range');
});
