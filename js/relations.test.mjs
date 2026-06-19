// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relatedStrains, haversineKm } from './relations.js';

const all = [
  { id: 'a', lat: 0, lng: 0, continent: 'X', category: 'Indica' },
  { id: 'b', lat: 1, lng: 1, continent: 'X', category: 'Sativa' },   // closest to a
  { id: 'c', lat: 40, lng: 40, continent: 'X', category: 'Indica' }, // far, same continent + category
  { id: 'd', lat: 80, lng: 80, continent: 'Y', category: 'Indica' }, // other continent, same category
  { id: 'e', lat: 5, lng: 5, continent: 'X', category: 'Hemp' }
];

test('haversine is ~0 for identical points and positive otherwise', () => {
  assert.equal(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0);
  assert.ok(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }) > 0);
});

test('nearby is sorted by distance and excludes self', () => {
  const { nearby } = relatedStrains(all[0], all, { nearby: 2 });
  assert.deepEqual(nearby.map((s) => s.id), ['b', 'e']);
  assert.ok(!nearby.some((s) => s.id === 'a'));
});

test('regional is same continent excluding nearby; similar is same category excluding both', () => {
  const { nearby, regional, similar } = relatedStrains(all[0], all, { nearby: 1, regional: 8, similar: 8 });
  assert.deepEqual(nearby.map((s) => s.id), ['b']);
  // regional: continent X, not self, not nearby(b) -> c, e
  assert.deepEqual(regional.map((s) => s.id).sort(), ['c', 'e']);
  // similar: category Indica, not self(a), not nearby(b), not regional(c,e) -> d
  assert.deepEqual(similar.map((s) => s.id), ['d']);
});
