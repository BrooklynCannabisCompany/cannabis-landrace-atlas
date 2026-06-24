// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Extracts "also known as" names from a strain's raw notes/summary text.
// Source-grounded only: quoted names and explicit "Also <list>" phrasing.
// No fabrication — returns [] when the notes don't name alternates.

function clean(s) {
  return s.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().replace(/[.,;]+$/, '').trim();
}

// A candidate looks like a name: starts uppercase, <=4 words, <=30 chars.
function looksLikeName(s) {
  return /^[A-Z0-9]/.test(s) && s.length <= 30 && s.split(' ').length <= 4;
}

export function extractAka(summary, name) {
  const text = summary || '';
  const found = [];

  // Quoted names: 'X' or "X"
  for (const m of text.matchAll(/['"]([^'"]{2,40})['"]/g)) {
    const c = clean(m[1]);
    if (c && looksLikeName(c)) found.push(c);
  }

  // "Also A, B, C." list
  const also = text.match(/\bAlso\b\s+([^.]+)/i);
  if (also) {
    for (const part of also[1].split(',')) {
      const c = clean(part);
      if (c && looksLikeName(c)) found.push(c);
    }
  }

  // Dedupe (case-insensitive) and drop the strain's own name.
  const out = [];
  const seen = new Set([(name || '').toLowerCase()]);
  for (const f of found) {
    const k = f.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}
