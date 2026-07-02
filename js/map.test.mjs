// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Tests the pure decluster math. map.js touches the Leaflet global `L` at module load
// (it builds the leaf divIcons), so we stub the one method that runs at import time,
// then dynamically import the module.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.L = { divIcon: () => ({}) };
const { declusterPositions } = await import('./map.js');

test('a lone marker keeps its exact coordinates', () => {
  const pos = declusterPositions([{ id: 'a', lat: 10, lng: 20 }]);
  assert.deepEqual(pos.get('a'), [10, 20]);
});

test('markers farther apart than CLUSTER_EPS are left untouched', () => {
  const pos = declusterPositions([
    { id: 'a', lat: 0, lng: 0 },
    { id: 'b', lat: 40, lng: 40 }
  ]);
  assert.deepEqual(pos.get('a'), [0, 0]);
  assert.deepEqual(pos.get('b'), [40, 40]);
});

test('co-located markers are fanned out to distinct positions', () => {
  const strains = [
    { id: 'a', lat: 10, lng: 20 },
    { id: 'b', lat: 10, lng: 20 },
    { id: 'c', lat: 10, lng: 20 }
  ];
  const pos = declusterPositions(strains);
  const coords = ['a', 'b', 'c'].map((id) => pos.get(id).join(','));
  assert.equal(new Set(coords).size, 3, 'all three should land on different points');
});

test('declustering is deterministic and independent of input order', () => {
  const base = [
    { id: 'c', lat: 5, lng: 5 },
    { id: 'a', lat: 5, lng: 5 },
    { id: 'b', lat: 5, lng: 5 }
  ];
  const shuffled = [base[1], base[2], base[0]];
  const p1 = declusterPositions(base);
  const p2 = declusterPositions(shuffled);
  for (const id of ['a', 'b', 'c']) {
    assert.deepEqual(p1.get(id), p2.get(id), `id ${id} should be position-stable across input order`);
  }
});

test('markers without numeric coordinates are dropped', () => {
  const pos = declusterPositions([
    { id: 'a', lat: 10, lng: 20 },
    { id: 'b', lat: null, lng: null }
  ]);
  assert.ok(pos.has('a'));
  assert.ok(!pos.has('b'));
});
