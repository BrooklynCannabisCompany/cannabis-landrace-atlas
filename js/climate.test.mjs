// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rampColor, norm, legendGradient, growDaylight, METRICS } from './climate.js';

test('rampColor returns exact stop colors at their stops and clamps', () => {
  const s = METRICS.temp.stops;
  assert.deepEqual(rampColor(s, 0), s[0][1]);
  assert.deepEqual(rampColor(s, 1), s[s.length - 1][1]);
  assert.deepEqual(rampColor(s, -3), s[0][1]);
  assert.deepEqual(rampColor(s, 9), s[s.length - 1][1]);
});

test('rampColor interpolates linearly between stops', () => {
  const s = [[0, [0, 0, 0]], [1, [100, 200, 40]]];
  assert.deepEqual(rampColor(s, 0.5), [50, 100, 20]);
});

test('norm maps absolute values onto [0,1] against the anchors, clamped', () => {
  assert.equal(norm(5, 5, 30), 0);
  assert.equal(norm(30, 5, 30), 1);
  assert.equal(norm(17.5, 5, 30), 0.5);
  assert.equal(norm(-40, 5, 30), 0);   // Antarctica clamps, doesn't stretch
  assert.equal(norm(99, 5, 30), 1);
});

test('no metric ramp ever passes through green (G is never the sole dominant channel)', () => {
  for (const [name, m] of Object.entries(METRICS)) {
    for (let t = 0; t <= 1; t += 0.01) {
      const [r, g, b] = rampColor(m.stops, t);
      assert.ok(g <= r || g <= b, `${name} t=${t.toFixed(2)} → rgb(${r},${g},${b}) reads green`);
    }
  }
});

test('every metric declares the fields the renderer and legend need', () => {
  for (const [name, m] of Object.entries(METRICS)) {
    assert.ok(m.lo < m.hi, `${name}: lo must be < hi`);
    assert.equal(typeof m.label, 'string');
    assert.equal(typeof m.unit, 'string');
    assert.equal(typeof m.fmt(m.lo), 'string');
    assert.ok(Array.isArray(m.stops) && m.stops.length >= 2);
  }
});

test('growDaylight is ~12h at the equator, longer toward the poles, and hemisphere-symmetric', () => {
  assert.ok(Math.abs(growDaylight(0) - 12) < 0.5, `equator should be ~12h, got ${growDaylight(0)}`);
  assert.ok(growDaylight(55) > growDaylight(30), 'higher latitude → longer growing-season days');
  assert.ok(growDaylight(30) > growDaylight(5), 'monotonic away from the equator');
  assert.ok(Math.abs(growDaylight(45) - growDaylight(-45)) < 0.2, 'N/S hemispheres should be symmetric');
  assert.ok(growDaylight(78) > 20, 'high-Arctic growing season approaches polar day');
});

test('legendGradient produces a CSS linear-gradient with a stop per ramp anchor', () => {
  const g = legendGradient(METRICS.rain.stops);
  assert.match(g, /^linear-gradient\(to right, /);
  assert.equal((g.match(/rgb\(/g) || []).length, METRICS.rain.stops.length);
});
