// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAka } from './aka.mjs';

test('extracts a quoted alternate name', () => {
  assert.deepEqual(extractAka("'Idukki Gold' citrus-spice line", 'Idukki'), ['Idukki Gold']);
});

test('extracts an "Also ..." list, stripping parentheticals and the own name', () => {
  const s = 'Xhosa medicine, Fluffy bud. Also Dagga, Transkei Wild, Eastern Cape Wild, Transkei (if sourced from the coast).';
  assert.deepEqual(extractAka(s, 'Transkei'), ['Dagga', 'Transkei Wild', 'Eastern Cape Wild']);
});

test('ignores prose after "Also" that is not a name', () => {
  const s = 'Denser flower clusters. Also any variants collected from the dry inland river valleys or hills.';
  assert.deepEqual(extractAka(s, 'Transkei'), []);
});

test('returns empty when no alternates are named', () => {
  assert.deepEqual(extractAka('Red Angola lineage, deep earthy sweetness', 'Huambo'), []);
  assert.deepEqual(extractAka('', 'X'), []);
});
