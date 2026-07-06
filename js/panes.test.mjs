// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PANE_Z } from './panes.js';

// Regression guard: the heat maps were first added ABOVE the borders/rivers panes, which hid the
// States & Provinces and Rivers geometry whenever a heat map was on. These invariants keep the
// data tints below the reference geometry (and everything below labels/markers).
test('heat/climate data tints stay below the reference geometry lines', () => {
  for (const tint of ['heat', 'climate']) {
    for (const geom of ['lakes', 'relief', 'borders', 'rivers', 'graticule']) {
      assert.ok(PANE_Z[tint] < PANE_Z[geom], `${tint} (${PANE_Z[tint]}) must be below ${geom} (${PANE_Z[geom]})`);
    }
  }
});

test('heat tint still sits above the base desert texture (so it shows in deserts)', () => {
  assert.ok(PANE_Z.heat > PANE_Z.deserts);
  assert.ok(PANE_Z.climate > PANE_Z.deserts);
});

test('the graticule sits above the geometry but below labels', () => {
  assert.ok(PANE_Z.graticule > PANE_Z.rivers);
  assert.ok(PANE_Z.graticuleLabel > PANE_Z.graticule);
  assert.ok(PANE_Z.graticuleLabel < PANE_Z.labels);
});

test('labels and markers are above every other overlay', () => {
  for (const [k, z] of Object.entries(PANE_Z)) {
    if (k !== 'labels' && k !== 'markers') assert.ok(z < PANE_Z.labels, `${k} must be below labels`);
    if (k !== 'markers') assert.ok(z < PANE_Z.markers, `${k} must be below markers`);
  }
});
