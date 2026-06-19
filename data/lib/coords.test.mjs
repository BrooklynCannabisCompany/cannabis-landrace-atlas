// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCoords, jitter, COUNTRY_CENTROIDS, inferCountry } from './coords.mjs';

test('resolves a known country to its centroid (with jitter applied)', () => {
  const c = resolveCoords({ countryRaw: 'Morocco', regionRaw: null, id: 'atlas-mountain' });
  const base = COUNTRY_CENTROIDS['Morocco'];
  assert.ok(Math.abs(c.lat - base.lat) <= 0.6, 'lat within jitter band');
  assert.ok(Math.abs(c.lng - base.lng) <= 0.6, 'lng within jitter band');
});

test('multi-country string uses the first recognized country', () => {
  const c = resolveCoords({ countryRaw: 'Kenya–Ethiopia–Tanzania', regionRaw: null, id: 'rift' });
  const base = COUNTRY_CENTROIDS['Kenya'];
  assert.ok(Math.abs(c.lat - base.lat) <= 0.6);
});

test('jitter is deterministic for a given id', () => {
  assert.deepEqual(jitter('abc'), jitter('abc'));
  assert.notDeepEqual(jitter('abc'), jitter('xyz'));
});

test('returns null when no country can be resolved', () => {
  const c = resolveCoords({ countryRaw: 'Atlantis', regionRaw: null, id: 'x' });
  assert.equal(c, null);
});

test('infers country from the name when no parenthetical country', () => {
  assert.ok(resolveCoords({ countryRaw: null, regionRaw: null, name: 'Afghani', id: 'afghani' }));
  assert.ok(resolveCoords({ countryRaw: null, regionRaw: null, name: 'Yunnan Highland/Valley', id: 'y' }));
  assert.ok(resolveCoords({ countryRaw: 'PNG', regionRaw: null, name: 'Enga Province', id: 'e' }));
  assert.equal(inferCountry('zamal réunion island'), 'Réunion');
});
