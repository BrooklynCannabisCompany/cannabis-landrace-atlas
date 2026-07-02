// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseSize } from './relief.js';

test('baseSize grows monotonically with zoom and stays small', () => {
  const zooms = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12];
  let prev = 0;
  for (const z of zooms) {
    const s = baseSize(z);
    assert.ok(s >= prev, `baseSize(${z})=${s} should be >= baseSize of a lower zoom (${prev})`);
    assert.ok(s > 0 && s <= 2, `baseSize(${z})=${s} should stay in the small (0,2] range`);
    prev = s;
  }
});

test('baseSize is a step function at the documented zoom boundaries', () => {
  assert.equal(baseSize(3), 0.9);
  assert.equal(baseSize(4), 1.1);
  assert.equal(baseSize(5), 1.3);
  assert.equal(baseSize(6), 1.6);
  assert.equal(baseSize(7), 1.9);
  assert.equal(baseSize(20), 1.9);  // clamps at the top tier
  assert.equal(baseSize(0), 0.9);   // clamps at the bottom tier
});
