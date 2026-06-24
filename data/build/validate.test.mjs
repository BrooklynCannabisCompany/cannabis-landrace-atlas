// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateRecords } from './validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('validateRecords flags bad data', () => {
  const { errors } = validateRecords([
    { id: 'a', name: 'A', category: 'Bogus', coordsApproximate: true, links: [], lat: 0, lng: 0 },
    { id: 'a', name: 'B', category: 'Sativa', coordsApproximate: true, links: [], lat: 200, lng: 0 }
  ]);
  assert.ok(errors.some((e) => /invalid category/.test(e)));
  assert.ok(errors.some((e) => /duplicate id/.test(e)));
  assert.ok(errors.some((e) => /lat out of range/.test(e)));
});

test('generated landraces.json has no validation errors', () => {
  const data = JSON.parse(readFileSync(join(__dirname, '..', 'landraces.json'), 'utf8'));
  const { errors } = validateRecords(data);
  assert.deepEqual(errors, [], `validation errors:\n${errors.join('\n')}`);
});
