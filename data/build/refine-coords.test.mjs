import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalize, loadGazetteer, matchPlace } from './refine-coords.mjs';

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

test('matchPlace finds a state named in the variety name', () => {
  const gaz = loadGazetteer(LABELS);
  const m = matchPlace({ name: 'Oaxaca', region: '', country: 'Mexico' }, gaz);
  assert.equal(m.matchedName, 'oaxaca');
  assert.ok(m.candidates.some(c => c.src === 'states'));
});

test('matchPlace prefers the longest matched place name within a field', () => {
  const gaz = new Map([
    ['santa marta', [{ name: 'Santa Marta', lat: 1, lng: 1, src: 'cities', rank: 1 }]],
    ['sierra nevada de santa marta', [{ name: 'Sierra Nevada de Santa Marta', lat: 2, lng: 2, src: 'ranges', rank: 1 }]],
  ]);
  const m = matchPlace({ name: 'Sierra Nevada de Santa Marta complex', region: '', country: 'Colombia' }, gaz);
  assert.equal(m.matchedName, 'sierra nevada de santa marta');
});

test('matchPlace uses region as a fallback when the name names no place', () => {
  const gaz = new Map([
    ['sierra nevada de santa marta', [{ name: 'Sierra Nevada de Santa Marta', lat: 2, lng: 2, src: 'ranges', rank: 1 }]],
  ]);
  const m = matchPlace({ name: 'Santa Marta Highlands', region: 'Sierra Nevada de Santa Marta', country: 'Colombia' }, gaz);
  assert.equal(m.matchedName, 'sierra nevada de santa marta');
});

test('matchPlace returns null when no place is named', () => {
  const gaz = loadGazetteer(LABELS);
  assert.equal(matchPlace({ name: 'Black African Magic', region: '', country: 'DRC' }, gaz), null);
});
