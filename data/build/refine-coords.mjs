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
