// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Derives botanically-grounded classifications from the parsed type/category text,
// following McPartland & Russo (see docs/taxonomy-guide.md).
// All are inferred from descriptors — no lab data — and are best-effort.

// Morphotype (primary classification). Leaf-shape + use biotype.
// NLD ≈ vernacular "Sativa"; BLD ≈ vernacular "Indica".
export function deriveMorphotype(category, type) {
  const t = `${type || ''}`.toLowerCase();
  if (/ruderalis/.test(t) || category === 'Ruderalis') return 'Ruderalis (wild-type)';
  if (/\bhemp\b/.test(t) || category === 'Hemp') return 'Narrow-Leaf Hemp';
  if (/intermediate|hybrid|indica[–-]sativa|sativa[–-]indica/.test(t) || category === 'Hybrid-Intermediate') return 'Intermediate (NLD–BLD)';
  if (/\bindica\b/.test(t) || category === 'Indica') return 'Broad-Leaf Drug';
  if (/\bsativa\b/.test(t) || category === 'Sativa') return 'Narrow-Leaf Drug';
  return 'Unclassified';
}

// Domestication status — orthogonal to morphotype (McPartland separates these axes).
export function deriveDomestication(category, type) {
  const t = `${type || ''}`.toLowerCase();
  if (/\bferal\b/.test(t) || category === 'Feral') return 'Feral (escaped)';
  if (/ruderalis/.test(t) || category === 'Ruderalis') return 'Wild';
  if (/\bwild\b/.test(t)) return 'Wild';
  if (/heirloom|acclimatized/.test(t)) return 'Heirloom';
  return 'Domesticated';
}

// Chemotype (inferred — Russo/de Meijer I–V). Returns the roman numeral.
export function deriveChemotype(category, type, summary) {
  const t = `${type || ''} ${summary || ''}`.toLowerCase();
  if (/\bcbg\b/.test(t)) return 'IV';
  if (/high[-\s]?cbd|cbd[-\s]?dominant|\bcbd\b/.test(t)) return 'III';
  if (/\bhemp\b/.test(t) || category === 'Hemp') return 'V';
  if (/ruderalis/.test(t) || category === 'Ruderalis') return 'II';
  return 'I';
}
