// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveMorphotype, deriveDomestication, deriveChemotype } from './taxonomy.mjs';

test('deriveMorphotype maps leaf/use biotypes', () => {
  assert.equal(deriveMorphotype('Sativa', 'Sativa landrace'), 'Narrow-Leaf Drug');
  assert.equal(deriveMorphotype('Indica', 'Indica'), 'Broad-Leaf Drug');
  assert.equal(deriveMorphotype('Hemp', 'Hemp'), 'Narrow-Leaf Hemp');
  assert.equal(deriveMorphotype('Ruderalis', 'Ruderalis'), 'Ruderalis (wild-type)');
  assert.equal(deriveMorphotype('Hybrid-Intermediate', 'Intermediate (Indica–Sativa)'), 'Intermediate (NLD–BLD)');
  // feral sativa derives from the type text, not the "Feral" category
  assert.equal(deriveMorphotype('Feral', 'Feral sativa complex'), 'Narrow-Leaf Drug');
  assert.equal(deriveMorphotype('Mixed', 'Mixed landrace'), 'Unclassified');
});

test('deriveDomestication is orthogonal to morphotype', () => {
  assert.equal(deriveDomestication('Feral', 'Feral sativa complex'), 'Feral (escaped)');
  assert.equal(deriveDomestication('Sativa', 'Wild sativa population'), 'Wild');
  assert.equal(deriveDomestication('Ruderalis', 'Ruderalis'), 'Wild');
  assert.equal(deriveDomestication('Sativa', 'Acclimatized heirloom sativa'), 'Heirloom');
  assert.equal(deriveDomestication('Sativa', 'Sativa landrace'), 'Domesticated');
});

test('deriveChemotype infers I–V', () => {
  assert.equal(deriveChemotype('Sativa', 'Sativa landrace', 'energetic'), 'I');
  assert.equal(deriveChemotype('Hemp', 'Hemp', 'fiber'), 'V');
  assert.equal(deriveChemotype('Mixed', 'Mixed landrace', 'High-CBD phenotypes'), 'III');
  assert.equal(deriveChemotype('Hemp', 'Feral industrial hemp, low THC, high CBD/CBG', ''), 'IV');
  assert.equal(deriveChemotype('Ruderalis', 'Ruderalis', ''), 'II');
});
