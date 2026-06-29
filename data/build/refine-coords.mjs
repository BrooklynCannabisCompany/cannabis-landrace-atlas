import fs from 'node:fs';
import path from 'node:path';

const GAZ_FILES = ['states', 'cities', 'ranges', 'peaks', 'landforms', 'lakes', 'rivers'];

export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function loadGazetteer(labelsDir) {
  const gaz = new Map();
  for (const src of GAZ_FILES) {
    const file = path.join(labelsDir, `${src}.json`);
    if (!fs.existsSync(file)) continue;
    const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const e of entries) {
      if (typeof e.lat !== 'number' || typeof e.lng !== 'number' || !e.name) continue;
      const key = normalize(e.name);
      if (!key) continue;
      const rec = { name: e.name, lat: e.lat, lng: e.lng, src, rank: e.rank ?? 99 };
      if (!gaz.has(key)) gaz.set(key, []);
      gaz.get(key).push(rec);
    }
  }
  return gaz;
}

const SRC_PRIORITY = { states: 0, cities: 1, ranges: 2, peaks: 2, landforms: 2, lakes: 3, rivers: 3 };

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(haystack, gaz) {
  const norm = normalize(haystack);
  const out = [];
  for (const [name, candidates] of gaz) {
    if (name.length < 3) continue;
    const re = new RegExp(`\\b${escapeRe(name)}\\b`);
    if (re.test(norm)) out.push({ matchedName: name, candidates });
  }
  return out;
}

function bestMatch(matches) {
  if (!matches.length) return null;
  matches.sort((a, b) => {
    if (b.matchedName.length !== a.matchedName.length) return b.matchedName.length - a.matchedName.length;
    const pa = Math.min(...a.candidates.map(c => SRC_PRIORITY[c.src] ?? 9));
    const pb = Math.min(...b.candidates.map(c => SRC_PRIORITY[c.src] ?? 9));
    return pa - pb;
  });
  return matches[0];
}

export function matchPlace(record, gaz) {
  return (
    bestMatch(findMatches(record.name || '', gaz)) ||
    bestMatch(findMatches(record.region || '', gaz)) ||
    null
  );
}
