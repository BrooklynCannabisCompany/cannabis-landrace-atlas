// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heatColor, heatAlpha, valueToT, MAX_ALPHA } from './heat.js';

test('heatColor returns the ramp endpoints exactly', () => {
  assert.deepEqual(heatColor(0), [0x3a, 0x6f, 0xd8]);   // blue        (shortest)
  assert.deepEqual(heatColor(1), [0xff, 0x12, 0x14]);   // vivid red   (longest)
});

test('heatColor clamps out-of-range inputs to the endpoints', () => {
  assert.deepEqual(heatColor(-2), heatColor(0));
  assert.deepEqual(heatColor(5), heatColor(1));
});

test('heatColor hits the interior stop colors at their stops', () => {
  assert.deepEqual(heatColor(0.25), [0x9a, 0x50, 0xc9]);  // purple
  assert.deepEqual(heatColor(0.50), [0xd8, 0x3f, 0x88]);  // pink-red
  assert.deepEqual(heatColor(0.75), [0xf5, 0x28, 0x3e]);  // bright red-pink
});

test('heatColor interpolates linearly between stops', () => {
  // midway between stop 0.00 (#3a6fd8) and 0.25 (#9a50c9) is t=0.125
  const mid = heatColor(0.125);
  const a = [0x3a, 0x6f, 0xd8], b = [0x9a, 0x50, 0xc9];
  for (let i = 0; i < 3; i++) {
    assert.equal(mid[i], Math.round(a[i] + (b[i] - a[i]) * 0.5),
      `channel ${i} should be the halfway RGB value`);
  }
});

test('heatColor never passes through green (G is not the dominant channel)', () => {
  for (let t = 0; t <= 1; t += 0.05) {
    const [r, g, b] = heatColor(t);
    assert.ok(g <= r || g <= b,
      `t=${t.toFixed(2)} -> rgb(${r},${g},${b}) reads as green (G dominant)`);
  }
});

test('heatAlpha is zero with no weight and saturates toward MAX_ALPHA', () => {
  assert.equal(heatAlpha(0), 0);
  assert.ok(heatAlpha(1000) > MAX_ALPHA - 1e-6);
  assert.ok(heatAlpha(1000) <= MAX_ALPHA);
});

test('valueToT anchors the absolute flowering scale and clamps the outlier', () => {
  assert.equal(valueToT(8), 0);    // short/normal floor -> fully blue
  assert.equal(valueToT(16), 1);   // very long -> brightest red
  assert.equal(valueToT(4), 0);    // shorter than the floor clamps to blue
  assert.equal(valueToT(24), 1);   // the long-flowering outlier clamps to red, not stretched
});

test('valueToT places grower categories on the expected part of the ramp', () => {
  assert.equal(valueToT(10), 0.25);   // normal/long boundary -> purple
  assert.equal(valueToT(12), 0.5);    // very-long onset -> pink-red (warm)
  assert.ok(valueToT(13) > 0.5, 'a very-long 13w variety should read reddish');
  let prev = -1;
  for (const w of [6, 8, 10, 12, 13, 14, 16, 20]) {
    const t = valueToT(w);
    assert.ok(t >= prev, `valueToT(${w})=${t} should be >= the shorter-flowering value (${prev})`);
    prev = t;
  }
});

test('heatAlpha increases monotonically with kernel weight', () => {
  let prev = -1;
  for (const w of [0, 0.1, 0.25, 0.5, 1, 2, 5, 10]) {
    const a = heatAlpha(w);
    assert.ok(a >= prev, `heatAlpha(${w})=${a} should be >= the lower-weight alpha (${prev})`);
    assert.ok(a >= 0 && a <= MAX_ALPHA, `heatAlpha(${w})=${a} should stay in [0, ${MAX_ALPHA}]`);
    prev = a;
  }
});
