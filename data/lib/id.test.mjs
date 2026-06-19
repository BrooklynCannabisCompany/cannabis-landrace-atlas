// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, makeUniqueId } from './id.mjs';

test('slugify lowercases and kebab-cases, dropping accents/punctuation', () => {
  assert.equal(slugify('Mazar I Sharif'), 'mazar-i-sharif');
  assert.equal(slugify("Owairaka 'Orrible"), 'owairaka-orrible');
  assert.equal(slugify('Réunion Island (Zamal)'), 'reunion-island-zamal');
});

test('makeUniqueId suffixes duplicates deterministically', () => {
  const seen = new Set();
  assert.equal(makeUniqueId('Transkei', seen), 'transkei');
  assert.equal(makeUniqueId('Transkei', seen), 'transkei-2');
  assert.equal(makeUniqueId('Transkei', seen), 'transkei-3');
});
