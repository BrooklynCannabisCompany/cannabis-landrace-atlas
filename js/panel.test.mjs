// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeksLabel } from './panel.js';

test('weeksLabel spells out a trailing "w" as " weeks"', () => {
  assert.equal(weeksLabel('7–9w'), '7–9 weeks');
  assert.equal(weeksLabel('10w'), '10 weeks');
  assert.equal(weeksLabel('8-11w'), '8-11 weeks');
});

test('weeksLabel leaves non-week text untouched', () => {
  assert.equal(weeksLabel('Variable'), 'Variable');
  assert.equal(weeksLabel('weeks'), 'weeks');   // no digit before "w", so no rewrite
  assert.equal(weeksLabel(''), '');
  assert.equal(weeksLabel(null), '');
});
