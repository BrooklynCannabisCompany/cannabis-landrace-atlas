// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanType, cleanRegion } from './normalize.mjs';

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
