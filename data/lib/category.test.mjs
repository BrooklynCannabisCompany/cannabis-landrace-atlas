// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
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
