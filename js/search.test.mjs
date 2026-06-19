// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterStrains } from './search.js';

const data = [
  { id: 'afghani', name: 'Afghani', country: 'Afghanistan', region: 'Northern Afghanistan', continent: 'Middle East / Central Asia', type: 'Indica', category: 'Indica' },
  { id: 'durban', name: 'Durban basin', country: '', region: '', continent: 'Africa', type: 'Sativa landrace', category: 'Sativa' },
  { id: 'oaxaca', name: 'Oaxaca', country: 'Mexico', region: '', continent: 'Americas', type: 'Sativa landrace', category: 'Sativa' }
];

test('returns empty array for empty query', () => {
  assert.deepEqual(filterStrains('', data), []);
});

test('matches name case-insensitively', () => {
  const r = filterStrains('afgh', data);
  assert.equal(r[0].id, 'afghani');
});

test('matches country and continent', () => {
  assert.ok(filterStrains('mexico', data).some((x) => x.id === 'oaxaca'));
  assert.ok(filterStrains('africa', data).some((x) => x.id === 'durban'));
});

test('ranks name-prefix matches above substring matches', () => {
  const local = [
    { id: 'a', name: 'Highland Sativa', country: '', region: '', continent: '', type: '', category: 'Sativa' },
    { id: 'b', name: 'Sativa Gold', country: '', region: '', continent: '', type: '', category: 'Sativa' }
  ];
  const r = filterStrains('sativa', local);
  assert.equal(r[0].id, 'b'); // prefix match ranks first
});

test('limits results', () => {
  const many = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}`, name: `Sativa ${i}`, country: '', region: '', continent: '', type: '', category: 'Sativa' }));
  assert.ok(filterStrains('sativa', many, 10).length <= 10);
});
