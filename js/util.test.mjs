// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidUrl, parseWeeks, floweringWeeks, heightRank, tokenize, diffSegments } from './util.js';

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

test('floweringWeeks returns numeric ranges and is stricter than parseWeeks', () => {
  assert.deepEqual(floweringWeeks('7–9w'), { min: 7, max: 9 });
  assert.deepEqual(floweringWeeks('8-11 weeks'), { min: 8, max: 11 });
  assert.deepEqual(floweringWeeks('10w'), { min: 10, max: 10 });
  // A lone number without "w" is not a week value (unlike parseWeeks, which would take it).
  assert.equal(floweringWeeks('60 days'), null);
  assert.equal(floweringWeeks('Variable'), null);
  assert.equal(floweringWeeks(''), null);
});

test('heightRank orders the scale and prefers compound names over bare ones', () => {
  assert.equal(heightRank('Short'), 0);
  assert.equal(heightRank('Medium-short'), 1);
  assert.equal(heightRank('Medium'), 2);
  assert.equal(heightRank('Medium-tall'), 3);
  assert.equal(heightRank('Tall'), 4);
  assert.equal(heightRank('Very tall'), 5);
  assert.equal(heightRank('Extremely tall'), 6);
  // "Medium-tall" must not be swallowed by the bare "medium" or "tall" checks.
  assert.equal(heightRank('medium-tall'), 3);
  assert.equal(heightRank('short-medium'), 1);
  assert.equal(heightRank('Variable'), -1);
  assert.equal(heightRank(''), -1);
});

test('tokenize round-trips to the original string', () => {
  const s = '  hello   world\n';
  assert.equal(tokenize(s).join(''), s);
  assert.deepEqual(tokenize(''), []);
});

test('diffSegments marks only the changed tokens', () => {
  // Identical input is one unchanged segment.
  assert.deepEqual(diffSegments('same text', 'same text'), [{ text: 'same text', added: false }]);
  // A replaced word: unchanged runs stay unmarked, the new word is added.
  const segs = diffSegments('the quick fox', 'the slow fox');
  assert.equal(segs.map((s) => s.text).join(''), 'the slow fox');
  assert.equal(segs.filter((s) => s.added).map((s) => s.text).join(''), 'slow');
  // Appended text at the end is added.
  const app = diffSegments('alpha', 'alpha beta');
  assert.equal(app.filter((s) => s.added).map((s) => s.text).join(''), ' beta');
  // Building from empty: everything is added.
  assert.deepEqual(diffSegments('', 'new'), [{ text: 'new', added: true }]);
});
