import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {
  normalize, loadGazetteer, matchPlace,
  pointInPolygon, buildCountryIndex, resolveCountry, inAny,
  ringsCentroid, foothillsOffset, inWater, nudgeToLand,
  decideRefinement,
} from './refine-coords.mjs';

const LABELS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'labels');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const world = JSON.parse(fs.readFileSync(path.join(ROOT, 'world.geojson'), 'utf8'));

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

test('pointInPolygon: inside vs outside a unit square', () => {
  const square = { type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] };
  assert.equal(pointInPolygon([1, 1], square), true);
  assert.equal(pointInPolygon([3, 3], square), false);
});

test('pointInPolygon: hole subtracts', () => {
  const withHole = { type: 'Polygon', coordinates: [
    [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
    [[4, 4], [4, 6], [6, 6], [6, 4], [4, 4]],
  ] };
  assert.equal(pointInPolygon([1, 1], withHole), true);
  assert.equal(pointInPolygon([5, 5], withHole), false);
});

test('resolveCountry handles aliases and & normalization', () => {
  const idx = buildCountryIndex(world);
  assert.ok(resolveCountry('Mexico', idx).length > 0);
  assert.ok(resolveCountry('DRC', idx).length > 0);
  assert.ok(resolveCountry('Bosnia & Herzegovina', idx).length > 0);
  assert.ok(resolveCountry('Baltics', idx).length >= 3);
});

test('inAny: Oaxaca point is in Mexico, not Brazil', () => {
  const idx = buildCountryIndex(world);
  const oax = [-96.209, 16.94];
  assert.equal(inAny(oax, resolveCountry('Mexico', idx)), true);
  assert.equal(inAny(oax, resolveCountry('Brazil', idx)), false);
});

test('foothillsOffset moves ~0.25 deg toward the centroid', () => {
  const moved = foothillsOffset([0, 0], [10, 0], 0.25);
  assert.ok(Math.abs(moved[0] - 0.25) < 1e-9 && Math.abs(moved[1]) < 1e-9);
});

test('ringsCentroid returns the mean of outer-ring vertices', () => {
  const sq = { type: 'Polygon', coordinates: [[[0, 0], [0, 4], [4, 4], [4, 0], [0, 0]]] };
  const c = ringsCentroid([sq]);
  assert.ok(Math.abs(c[0] - 1.6) < 1e-9 && Math.abs(c[1] - 1.6) < 1e-9);
});

test('inWater detects a point inside a lake polygon', () => {
  const lakes = [{ type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] }];
  assert.equal(inWater([1, 1], lakes), true);
  assert.equal(inWater([5, 5], lakes), false);
});

test('nudgeToLand escapes a lake toward land', () => {
  const land = [{ type: 'Polygon', coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] }];
  const lakes = [{ type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] }];
  const out = nudgeToLand([1, 1], land, lakes, [8, 8]);
  assert.ok(out && inAny(out, land) && !inWater(out, lakes));
});

function makeCtx() {
  const gaz = loadGazetteer(LABELS);
  const countryIndex = buildCountryIndex(world);
  return { gaz, countryIndex, lakes: [], centroidCache: new Map() };
}

test('decideRefinement moves a centroid-pinned Mexican state into that state', () => {
  const ctx = makeCtx();
  const r = { name: 'Oaxaca', region: '', country: 'Mexico', lat: 23.894, lng: -102.415 };
  const d = decideRefinement(r, ctx);
  assert.equal(d.action, 'move');
  // Oaxaca state ~ (16.94, -96.21)
  assert.ok(Math.abs(d.lat - 16.94) < 0.6 && Math.abs(d.lng - -96.21) < 0.6);
  assert.ok(inAny([d.lng, d.lat], resolveCountry('Mexico', ctx.countryIndex)));
});

test('decideRefinement returns none when no place named', () => {
  const ctx = makeCtx();
  const d = decideRefinement({ name: 'Black African Magic', region: '', country: 'DRC', lat: -4, lng: 21 }, ctx);
  assert.equal(d.action, 'none');
});

test('decideRefinement rejects a match that lands outside the country', () => {
  const ctx = makeCtx();
  const gaz = new Map([['narnia', [{ name: 'Narnia', lat: 0, lng: 0, src: 'states', rank: 1 }]]]);
  const ctx2 = { ...ctx, gaz };
  const d = decideRefinement({ name: 'Narnia', region: '', country: 'Mexico', lat: 23, lng: -102 }, ctx2);
  assert.equal(d.action, 'reject-country');
});
