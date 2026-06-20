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

// Parses a flowering value ("7–9w", "8-11 weeks", "10w") into { min, max } strings.
export function parseWeeks(f) {
  const r = String(f || '').match(/(\d+)\s*[–-]\s*(\d+)/);
  if (r) return { min: r[1], max: r[2] };
  const s = String(f || '').match(/(\d+)/);
  return s ? { min: s[1], max: '' } : { min: '', max: '' };
}
