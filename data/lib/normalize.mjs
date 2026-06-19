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
