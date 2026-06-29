import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalize, loadGazetteer } from './refine-coords.mjs';

const LABELS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'labels');

test('normalize strips diacritics, lowercases, collapses whitespace', () => {
  assert.equal(normalize('Michoacán'), 'michoacan');
  assert.equal(normalize('  Sierra   Nevada '), 'sierra nevada');
  assert.equal(normalize('Nariño'), 'narino');
});

test('loadGazetteer indexes states by normalized name with source + coords', () => {
  const gaz = loadGazetteer(LABELS);
  const oax = gaz.get('oaxaca');
  assert.ok(oax && oax.length >= 1);
  const state = oax.find(e => e.src === 'states');
  assert.ok(state, 'Oaxaca present as a state');
  assert.ok(Math.abs(state.lat - 16.94) < 0.2 && Math.abs(state.lng - -96.209) < 0.2);
});
