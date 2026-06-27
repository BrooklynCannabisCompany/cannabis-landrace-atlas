// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
// Unit tests for the pure zoom-gating logic behind the labels overlay.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  visibleAtZoom, countryMinZoom, stateMinZoom, cityMinZoom, waterMinZoom,
  lakeMinZoom, riverMinZoom
} from './labels.js';

test('visibleAtZoom shows a label only at or above its minZoom', () => {
  assert.equal(visibleAtZoom(4, 4), true);
  assert.equal(visibleAtZoom(4, 5), true);
  assert.equal(visibleAtZoom(4, 3), false);
});

test('countryMinZoom maps LABELRANK into the 2..6 range', () => {
  assert.equal(countryMinZoom(2), 2);   // India, USA, Russia — show earliest
  assert.equal(countryMinZoom(3), 3);   // Morocco, Afghanistan
  assert.equal(countryMinZoom(4), 4);   // Jamaica, Eswatini
  assert.equal(countryMinZoom(5), 5);   // Lebanon, Netherlands
  assert.equal(countryMinZoom(6), 6);
  assert.equal(countryMinZoom(7), 6);   // clamped to the max
  assert.equal(countryMinZoom(1), 2);   // clamped to the min
});

test('countryMinZoom falls back for missing/undefined rank', () => {
  assert.equal(countryMinZoom(undefined), 5);
  assert.equal(countryMinZoom(null), 5);
  assert.equal(countryMinZoom(NaN), 5);
});

test('stateMinZoom slots divisions between countries and cities', () => {
  assert.equal(stateMinZoom(2), 4);   // California, Kerala, Yunnan
  assert.equal(stateMinZoom(4), 5);   // Sinaloa, Oaxaca
  assert.equal(stateMinZoom(5), 6);   // Balkh
  assert.equal(stateMinZoom(6), 6);
  assert.equal(stateMinZoom(7), 7);   // smaller divisions only at max zoom
  assert.equal(stateMinZoom(10), 7);
});

test('cityMinZoom keeps cities off until zoomed in, by scale rank', () => {
  assert.equal(cityMinZoom(0), 5);   // world cities
  assert.equal(cityMinZoom(1), 5);
  assert.equal(cityMinZoom(2), 6);
  assert.equal(cityMinZoom(3), 6);
  assert.equal(cityMinZoom(4), 7);   // smaller places only at max zoom
  assert.equal(cityMinZoom(8), 7);
});

test('waterMinZoom shows oceans first, then seas', () => {
  assert.equal(waterMinZoom(0), 2);  // oceans — visible as soon as labels are on
  assert.equal(waterMinZoom(1), 3);  // seas/bays/gulfs
  assert.equal(waterMinZoom(5), 3);
});

test('lakeMinZoom shows the biggest lakes earliest', () => {
  assert.equal(lakeMinZoom(0), 3);   // Superior, Baikal, Victoria
  assert.equal(lakeMinZoom(1), 4);
});

test('riverMinZoom reveals major rivers before minor ones', () => {
  assert.equal(riverMinZoom(1), 4);  // Amazon, Nile, Yangtze
  assert.equal(riverMinZoom(2), 4);  // Mekong
  assert.equal(riverMinZoom(3), 5);
  assert.equal(riverMinZoom(4), 5);
  assert.equal(riverMinZoom(5), 6);
  assert.equal(riverMinZoom(6), 7);  // Hudson, Thames — only at max zoom
});
