// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Normalizes the display fields so the panel subtitle and top facts read cleanly.
// Anything pulled out of `region` is returned as `note` so it can be preserved in
// the write-up Description (nothing is lost).

// Joins pipe-separated type descriptors into clean comma-separated text.
export function cleanType(type) {
  return String(type || '')
    .split('|')
    .map((t) => t.trim())
    .filter(Boolean)
    .join(', ');
}

// Maps a free-text climate descriptor to a consistent canonical bucket for display
// and faceting. The original is preserved separately (climateFull) so nothing is lost.
// First matching rule wins — order matters.
const CLIMATE_RULES = [
  [/boreal|subarctic|taiga|\barctic\b/, 'Boreal / Subarctic'],
  [/mediterran/, 'Mediterranean'],
  [/cloud forest|afro-montane|tropical mountain|tropical highland|highland tropical|mountain jungle|jungle mountain|jungle highland|highland jungle|alpine equatorial|equatorial (mountain|highland)|montane|andean|volcanic (highland|alpine)|pine mountain|highland savanna/, 'Tropical Highland'],
  [/rainforest|equatorial|\bjungle\b|swamp forest|amazon|congo|rainforest basin|deep jungle/, 'Tropical Rainforest'],
  [/\bisland\b|maritime tropical|tropical maritime|oceanic|caribbean|tropical volcanic|volcanic maritime|volcanic tropical/, 'Tropical Island / Maritime'],
  [/subtropical/, 'Subtropical'],
  [/alpine|high[- ]altitude|high mountain|high alpine|extreme alpine|cold (mountain|high|valley|himalayan|northern)|himalayan|pamir|karakoram|hindu kush|tien shan|tibet|afro-alpine|cold high/, 'Alpine / High Mountain'],
  [/hyper-arid|\barid\b|desert|oasis/, 'Desert / Arid'],
  [/steppe|semi-arid|grassland|semi-desert|\bdry\b|prairie/, 'Steppe / Semi-arid'],
  [/savanna|tropical (lowland|coast|coastal)|lowland tropical|equatorial coast|lakeside|plateau tropical|humid (lowland|coastal|upland|tropical)|river valley tropical|riverline tropical|monsoon|\btropical\b/, 'Tropical Lowland'],
  [/temperate|continental|maritime|forest|river|valley|plains|lowlands|\bcoast/, 'Temperate / Continental'],
  [/mountain|highland|foothill|plateau/, 'Mountain / Highland']
];

export function cleanClimate(climate) {
  const t = String(climate || '').trim();
  if (!t || /^variable$/i.test(t)) return '';
  const lc = t.toLowerCase();
  for (const [re, label] of CLIMATE_RULES) if (re.test(lc)) return label;
  return 'Other';
}

// Returns { region, note }: a clean locality and any removed parenthetical detail.
export function cleanRegion(region, country) {
  let r = String(region || '').trim();
  if (!r) return { region: '', note: '' };

  // "Also …" lines are alternate names (captured as AKA elsewhere), not a locality.
  if (/^also\b/i.test(r)) return { region: '', note: '' };

  // Pull parenthetical detail out as a note, then strip it from the region.
  const parens = [...r.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].trim()).filter(Boolean);
  const note = parens.join('; ');
  r = r.replace(/\([^)]*\)/g, '');

  // Collapse whitespace and stray/duplicate commas, trim trailing punctuation.
  r = r.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/(,\s*)+,/g, ', ')
    .trim().replace(/[,.;]+$/, '').trim();

  // Drop a trailing ", <country>" (possibly repeated) so the subtitle won't echo it.
  if (country) {
    const cc = country.trim().toLowerCase();
    const parts = r.split(',').map((s) => s.trim()).filter(Boolean);
    while (parts.length && parts[parts.length - 1].toLowerCase() === cc) parts.pop();
    r = parts.join(', ');
  }

  return { region: r, note };
}
