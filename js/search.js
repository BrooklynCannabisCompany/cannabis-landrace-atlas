// Pure search/filter logic, shared by the browser UI and Node tests.
const FIELDS = ['name', 'country', 'region', 'continent', 'type', 'category'];

export function filterStrains(query, strains, limit = 12) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const s of strains) {
    let best = Infinity;
    for (const f of FIELDS) {
      const v = (s[f] || '').toString().toLowerCase();
      const idx = v.indexOf(q);
      if (idx === -1) continue;
      // Prefix match on name scores best; earlier index and name field score better.
      let score = idx;
      if (f === 'name' && idx === 0) score = -2;
      else if (idx === 0) score = -1;
      else if (f === 'name') score = idx - 0.5;
      if (score < best) best = score;
    }
    if (best !== Infinity) scored.push({ s, best });
  }
  scored.sort((a, b) => a.best - b.best || a.s.name.localeCompare(b.s.name));
  return scored.slice(0, limit).map((x) => x.s);
}
