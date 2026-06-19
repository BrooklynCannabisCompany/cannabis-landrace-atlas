// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Pure logic for cross-linking strains, shared by the browser UI and Node tests.

// Great-circle distance in km between two {lat,lng} points.
export function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Returns { nearby, regional, similar } strain lists for exploration links.
// - nearby: closest by distance
// - regional: same continent (excluding nearby)
// - similar: same category (excluding nearby + regional)
export function relatedStrains(strain, all, limits = {}) {
  const { nearby: nLim = 6, regional: rLim = 8, similar: sLim = 8 } = limits;
  const geo = (s) => typeof s.lat === 'number' && typeof s.lng === 'number';

  const nearby = all
    .filter((s) => s.id !== strain.id && geo(s) && geo(strain))
    .map((s) => ({ s, d: haversineKm(strain, s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, nLim)
    .map((x) => x.s);

  const used = new Set([strain.id, ...nearby.map((s) => s.id)]);

  const regional = all
    .filter((s) => !used.has(s.id) && s.continent === strain.continent)
    .slice(0, rLim);
  for (const s of regional) used.add(s.id);

  const similar = all
    .filter((s) => !used.has(s.id) && s.category === strain.category)
    .slice(0, sLim);

  return { nearby, regional, similar };
}
