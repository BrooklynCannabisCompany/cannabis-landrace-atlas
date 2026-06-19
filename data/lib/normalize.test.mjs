// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanType, cleanRegion, cleanClimate } from './normalize.mjs';

test('cleanClimate maps varied descriptors to canonical buckets', () => {
  assert.equal(cleanClimate('Tropical mountain'), 'Tropical Highland');
  assert.equal(cleanClimate('Equatorial rainforest'), 'Tropical Rainforest');
  assert.equal(cleanClimate('Mediterranean mountain'), 'Mediterranean');
  assert.equal(cleanClimate('Subarctic'), 'Boreal / Subarctic');
  assert.equal(cleanClimate('Tropical island'), 'Tropical Island / Maritime');
  assert.equal(cleanClimate('Desert oasis'), 'Desert / Arid');
  assert.equal(cleanClimate('Continental steppe'), 'Steppe / Semi-arid');
  assert.equal(cleanClimate('High alpine'), 'Alpine / High Mountain');
  assert.equal(cleanClimate('Temperate'), 'Temperate / Continental');
  assert.equal(cleanClimate(''), '');
  assert.equal(cleanClimate('Variable'), '');
});

test('cleanType joins pipe-separated descriptors', () => {
  assert.equal(cleanType('Highland African landrace | Sativa'), 'Highland African landrace, Sativa');
  assert.equal(cleanType('Indica'), 'Indica');
  assert.equal(cleanType(''), '');
});

test('cleanRegion drops a trailing duplicate country', () => {
  assert.deepEqual(cleanRegion('Shashamane, Oromia Region, Ethiopia', 'Ethiopia'),
    { region: 'Shashamane, Oromia Region', note: '' });
  assert.deepEqual(cleanRegion('Viti Levu Highlands, Fiji', 'Fiji'),
    { region: 'Viti Levu Highlands', note: '' });
});

test('cleanRegion pulls parentheticals into a note', () => {
  assert.deepEqual(cleanRegion('Hindu Kush Mountains, Afghanistan (South-Central Asia)', 'Afghanistan'),
    { region: 'Hindu Kush Mountains', note: 'South-Central Asia' });
  assert.deepEqual(cleanRegion('Northern Thailand Highlands (Chiang Mai / Chiang Rai Region)', 'Thailand'),
    { region: 'Northern Thailand Highlands', note: 'Chiang Mai / Chiang Rai Region' });
});

test('cleanRegion discards "Also …" alternate-name lines', () => {
  assert.deepEqual(cleanRegion('Also Dagga, Transkei Wild, Eastern Cape Wild', 'South Africa'),
    { region: '', note: '' });
});
