// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Single source of truth for the map overlay panes' stacking order (z-index), bottom → top.
// Every module that creates a Leaflet pane reads its z-index from here so the order can't drift.
//
// The load-bearing invariant (guarded in panes.test.mjs): the heat/climate DATA TINTS sit BELOW
// the reference geometry (lakes, relief, borders, rivers) and the graticule, so those lines stay
// visible over an active heat map. Labels and the leaf-pin markers are always on top. (This is
// what broke States & Provinces / Rivers when the heat maps were first added above them.)
export const PANE_Z = {
  deserts: 407,          // sandy terrain tint — base land texture
  climate: 408,          // summer-temp / rainfall tints  ─┐ mutually exclusive heat maps,
  heat: 409,             // flowering-time tint            ─┘ kept below the reference geometry
  lakes: 410,            // inland water (aqua)
  relief: 411,           // mountain triangle field
  borders: 412,          // admin-1 boundary lines
  rivers: 414,           // river centerlines
  graticule: 416,        // lat/long grid lines
  graticuleLabel: 417,   // lat/long degree labels (canvas)
  labels: 450,           // place-name text
  markers: 600           // Leaflet's built-in marker pane (leaf pins) — always on top
};
