// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Pure (DOM-free) helpers shared by the browser modules — kept here so they can be unit
// tested under `node --test` without a DOM. (Full DOM/Leaflet smoke testing would need
// jsdom + a canvas shim, which the project intentionally avoids to stay build/dependency-free.)

// True only for http(s) URLs — used to gate any URL we put into href/src or file as data.
export function isValidUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

// A "min–max" integer range (en-dash or hyphen), e.g. "7–9" or "8-11". Shared by the two
// flowering parsers below, which differ only in their single-value handling and output type.
const WEEK_RANGE_RE = /(\d+)\s*[–-]\s*(\d+)/;

// Parses a flowering value ("7–9w", "8-11 weeks", "10w") into { min, max } STRINGS, used to
// prefill the correction form's week fields. Lenient: a bare number fills only `min`.
export function parseWeeks(f) {
  const r = String(f || '').match(WEEK_RANGE_RE);
  if (r) return { min: r[1], max: r[2] };
  const s = String(f || '').match(/(\d+)/);
  return s ? { min: s[1], max: '' } : { min: '', max: '' };
}

// Parses a flowering descriptor into a NUMERIC { min, max } week range for the Flowering
// facet's slider math, or null when there is no week value. Unlike parseWeeks this is strict:
// a lone number must be followed by "w" (so "60 days" is not read as 60 weeks), and no match
// returns null so such varieties drop out of the weeks filter instead of filtering on junk.
export function floweringWeeks(f) {
  const r = String(f || '').match(WEEK_RANGE_RE);
  if (r) return { min: +r[1], max: +r[2] };
  const s = String(f || '').match(/(\d+)\s*w/i);
  if (s) return { min: +s[1], max: +s[1] };
  return null;
}

// Ordinal height rank (0 = Short … 6 = Extremely tall), or -1 for variable/unknown. Indices
// map to the HEIGHTS scale order; the ladder tests the compound names (medium-tall,
// short-medium) before the bare "medium"/"tall"/"short" so they aren't swallowed first.
export function heightRank(h) {
  const t = (h || '').toLowerCase();
  if (/extremely/.test(t)) return 6;
  if (/very tall/.test(t)) return 5;
  if (/medium-tall|medium tall/.test(t)) return 3;
  if (/short-medium|medium-short|medium short/.test(t)) return 1;
  if (/\btall\b/.test(t)) return 4;
  if (/\bmedium\b/.test(t)) return 2;
  if (/\bshort\b/.test(t)) return 0;
  return -1; // variable / unknown
}

// Splits a string into whitespace / non-whitespace tokens that concatenate back to it.
export function tokenize(s) { return s.match(/\s+|\S+/g) || []; }

// Token-level diff: returns the CURRENT string as [{ text, added }] segments, where `added`
// marks tokens not present in the original (insertions/changes). Deleted tokens are omitted
// (we only ever show what's in the box now). LCS-based so unchanged runs stay unmarked.
export function diffSegments(orig, cur) {
  if (orig === cur) return [{ text: cur, added: false }];
  const a = tokenize(orig), b = tokenize(cur), n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const segs = [];
  const push = (text, added) => {
    const last = segs[segs.length - 1];
    if (last && last.added === added) last.text += text; else segs.push({ text, added });
  };
  let i = 0, j = 0;
  while (j < m) {
    if (i < n && a[i] === b[j] && dp[i][j] === dp[i + 1][j + 1] + 1) { push(b[j], false); i++; j++; }
    else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) { i++; }    // token only in original → deleted, not shown
    else { push(b[j], true); j++; }                            // token only in current → added/changed
  }
  return segs;
}
