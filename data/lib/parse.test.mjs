// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry } from './parse.mjs';

test('parses a 4-field en-dash entry with parenthetical country', () => {
  const block = [
    'Atlas Mountain (Morocco) – Mountain hash landrace | Medium-tall | 9–12w | Semi-arid mountain',
    'Notes: Traditional Moroccan hash-producing region, drought tolerant and highly resinous.'
  ].join('\n');
  const r = parseEntry(block);
  assert.equal(r.name, 'Atlas Mountain');
  assert.equal(r.countryRaw, 'Morocco');
  assert.equal(r.type, 'Mountain hash landrace');
  assert.equal(r.height, 'Medium-tall');
  assert.equal(r.flowering, '9–12w');
  assert.equal(r.climate, 'Semi-arid mountain');
  assert.match(r.summary, /drought tolerant/);
  assert.equal(r.incomplete, false);
});

test('parses a 5-field entry with explicit type field', () => {
  const block = 'Kenya Highland (Kenya) – Highland African landrace | Sativa | Tall | 11–16w | Equatorial highland\nNotes: Classic East African highland cannabis.';
  const r = parseEntry(block);
  assert.equal(r.name, 'Kenya Highland');
  assert.equal(r.countryRaw, 'Kenya');
  assert.equal(r.type, 'Highland African landrace | Sativa');
  assert.equal(r.height, 'Tall');
  assert.equal(r.flowering, '11–16w');
  assert.equal(r.climate, 'Equatorial highland');
});

test('parses a hyphen-separator entry without country', () => {
  const block = 'Durban basin- Sativa landrace | Tall | 9–11w | Subtropical coastal\nNotes: Licorice anise terps, high thcv, energetic';
  const r = parseEntry(block);
  assert.equal(r.name, 'Durban basin');
  assert.equal(r.countryRaw, null);
  assert.equal(r.type, 'Sativa landrace');
  assert.equal(r.flowering, '9–11w');
});

test('keeps en-dash separator even when name contains a hyphen', () => {
  const block = 'Guinea-Bissau Mangrove (Guinea-Bissau) – Coastal landrace population | Sativa | Tall | 12–18w | Tropical mangrove coast\nNotes: Adapted to salt air.';
  const r = parseEntry(block);
  assert.equal(r.name, 'Guinea-Bissau Mangrove');
  assert.equal(r.countryRaw, 'Guinea-Bissau');
  assert.equal(r.height, 'Tall');
});

test('captures trailing region line that is not Notes', () => {
  const block = 'Shashamane (Ethiopia) – Ethiopian highland landrace | Sativa | Tall | 12–16w | Highland plateau\nNotes: Famous Ethiopian cannabis population.\nShashamane, Oromia Region, Ethiopia';
  const r = parseEntry(block);
  assert.equal(r.regionRaw, 'Shashamane, Oromia Region, Ethiopia');
});

test('flags an incomplete stub', () => {
  const block = 'Colombian Boyaca High Plateau- [incomplete entry; details pending]';
  const r = parseEntry(block);
  assert.equal(r.name, 'Colombian Boyaca High Plateau');
  assert.equal(r.incomplete, true);
});

test('does not mistake "Variable height" for the flowering field', () => {
  const block = 'Hungarian Basin- Mixed wild cannabis/ LandRace | Variable height | Variable length | Desert Basin\nNotes: Ancient migration corridor.';
  const r = parseEntry(block);
  assert.equal(r.height, 'Variable height');
  assert.equal(r.flowering, 'Variable length');
  assert.equal(r.climate, 'Desert Basin');
});

test('keeps parenthetical height detail like "Tall (2–4m)"', () => {
  const block = 'Angola Roja (Angola) – Tropical African landrace | Tall (2–4m) | 11–15w | Tropical highland\nNotes: Red-pistil expressions.';
  const r = parseEntry(block);
  assert.equal(r.height, 'Tall (2–4m)');
  assert.equal(r.flowering, '11–15w');
  assert.equal(r.climate, 'Tropical highland');
  assert.equal(r.type, 'Tropical African landrace');
});

test('ignores en-dashes inside a parenthetical country', () => {
  const block = 'Rift Valley Corridor (Kenya–Ethiopia–Tanzania) – Regional landrace complex | Tall | 11–16w | Highland savanna\nNotes: Ancient migration corridor.';
  const r = parseEntry(block);
  assert.equal(r.name, 'Rift Valley Corridor');
  assert.equal(r.countryRaw, 'Kenya–Ethiopia–Tanzania');
  assert.equal(r.type, 'Regional landrace complex');
  assert.equal(r.height, 'Tall');
});
