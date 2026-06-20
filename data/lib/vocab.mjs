// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Single source of truth for the project's controlled vocabularies, in display order.
// Imported by the browser (Index facets, submission forms) and by Node (validation),
// so a value is added or renamed in exactly one place. Category VALUES live in
// category.mjs (the validation set + normalizer); CATEGORY_ORDER here is only display order.

export const CONTINENTS = [
  'Africa', 'Americas', 'East Asia / North Asia', 'Europe',
  'Middle East / Central Asia', 'Oceania', 'South Asia', 'Southeast Asia'
];

export const CLIMATES = [
  'Tropical Rainforest', 'Tropical Lowland', 'Tropical Island / Maritime', 'Tropical Highland',
  'Subtropical', 'Mediterranean', 'Steppe / Semi-arid', 'Desert / Arid',
  'Mountain / Highland', 'Alpine / High Mountain', 'Temperate / Continental',
  'Boreal / Subarctic', 'Other', 'Unknown'
];

export const MORPHOTYPES = [
  'Narrow-Leaf Drug', 'Broad-Leaf Drug', 'Narrow-Leaf Hemp', 'Broad-Leaf Hemp',
  'Intermediate (NLD–BLD)', 'Ruderalis (wild-type)', 'Unclassified'
];

export const CHEMOTYPES = ['I', 'II', 'III', 'IV', 'V'];

export const DOMESTICATIONS = ['Heirloom', 'Domesticated', 'Feral (escaped)', 'Wild'];

// Vernacular category display order (validation set lives in category.mjs).
export const CATEGORY_ORDER = ['Hemp', 'Sativa', 'Indica', 'Mixed', 'Hybrid-Intermediate', 'Ruderalis', 'Feral'];

// Ordinal height scale (low → high).
export const HEIGHTS = ['Short', 'Medium-short', 'Medium', 'Medium-tall', 'Tall', 'Very tall', 'Extremely tall'];
