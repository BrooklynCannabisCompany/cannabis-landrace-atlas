// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidUrl, parseWeeks } from './util.js';

test('isValidUrl accepts http(s) and rejects everything else', () => {
  assert.equal(isValidUrl('https://example.com/a.jpg'), true);
  assert.equal(isValidUrl('http://example.com'), true);
  assert.equal(isValidUrl('javascript:alert(1)'), false);
  assert.equal(isValidUrl('data:text/html,<script>'), false);
  assert.equal(isValidUrl('mailto:x@y.com'), false);
  assert.equal(isValidUrl('not a url'), false);
  assert.equal(isValidUrl(''), false);
});

test('parseWeeks extracts a min/max range', () => {
  assert.deepEqual(parseWeeks('7–9w'), { min: '7', max: '9' });
  assert.deepEqual(parseWeeks('8-11 weeks'), { min: '8', max: '11' });
  assert.deepEqual(parseWeeks('10w'), { min: '10', max: '' });
  assert.deepEqual(parseWeeks('Variable'), { min: '', max: '' });
  assert.deepEqual(parseWeeks(''), { min: '', max: '' });
});
