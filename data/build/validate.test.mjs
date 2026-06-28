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
