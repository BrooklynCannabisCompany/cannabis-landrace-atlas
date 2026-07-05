// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graticuleStep, graticuleFeatures, fmtLat, fmtLng } from './graticule.js';

test('fmtLat / fmtLng label degrees with a hemisphere suffix (none at 0 and ±180)', () => {
  assert.equal(fmtLat(0), '0°');
  assert.equal(fmtLat(30), '30°N');
  assert.equal(fmtLat(-60), '60°S');
  assert.equal(fmtLng(0), '0°');
  assert.equal(fmtLng(90), '90°E');
  assert.equal(fmtLng(-120), '120°W');
  assert.equal(fmtLng(180), '180°');
  assert.equal(fmtLng(-180), '180°');
});

test('graticuleStep gets finer (smaller) as you zoom in, never coarser', () => {
  let prev = Infinity;
  for (let z = 0; z <= 10; z++) {
    const s = graticuleStep(z);
    assert.ok(s > 0, `step at zoom ${z} must be positive`);
    assert.ok(s <= prev, `step at zoom ${z} (${s}) should be <= the lower zoom's step (${prev})`);
    prev = s;
  }
  assert.equal(graticuleStep(0), 30);   // world view: coarse
  assert.ok(graticuleStep(10) <= 2);    // deep zoom: fine
});

test('graticuleFeatures builds meridians and parallels as 2-point line features', () => {
  const step = 30;
  const fc = graticuleFeatures(step);
  assert.equal(fc.type, 'FeatureCollection');
  const meridians = fc.features.filter((f) => f.geometry.coordinates[0][0] === f.geometry.coordinates[1][0]);
  const parallels = fc.features.filter((f) => f.geometry.coordinates[0][1] === f.geometry.coordinates[1][1]);
  assert.equal(meridians.length, 360 / step + 1);   // -180..180 inclusive
  assert.ok(parallels.length >= 5);
  for (const f of fc.features) {
    assert.equal(f.geometry.type, 'LineString');
    assert.equal(f.geometry.coordinates.length, 2);
  }
});

test('graticuleFeatures marks the equator and prime meridian as major', () => {
  const fc = graticuleFeatures(20);
  const primeMeridian = fc.features.find((f) => f.geometry.coordinates[0][0] === 0 && f.geometry.coordinates[1][0] === 0);
  const equator = fc.features.find((f) => f.geometry.coordinates[0][1] === 0 && f.geometry.coordinates[1][1] === 0);
  assert.ok(primeMeridian && primeMeridian.properties.major, 'prime meridian should be major');
  assert.ok(equator && equator.properties.major, 'equator should be major');
  // a non-zero line is not major
  const other = fc.features.find((f) => f.geometry.coordinates[0][0] === 20);
  assert.ok(other && !other.properties.major);
});
