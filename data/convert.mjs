import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseEntry } from './lib/parse.mjs';
import { normalizeCategory } from './lib/category.mjs';
import { resolveCoords } from './lib/coords.mjs';
import { makeUniqueId } from './lib/id.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Header line -> continent. Lines exactly matching a key switch the current continent.
const HEADERS = {
  'AFRICA': 'Africa',
  'MIDDLE EAST / CENTRAL ASIA': 'Middle East / Central Asia',
  'SOUTH ASIA (HIMALAYAN & SUBCONTINENT)': 'South Asia',
  'SOUTHEAST ASIA': 'Southeast Asia',
  'EAST ASIA / NORTH ASIA': 'East Asia / North Asia',
  'EUROPE': 'Europe',
  'NORTH AMERICA / HAWAII': 'Americas',
  'OCEANIA / PACIFIC / AUSSIE / KIWI': 'Oceania',
  'RUSSIA / FORMER USSR': 'Europe',
  'AMERICAS': 'Americas'
};

const FILES = ['landraces-part1.txt', 'landraces-part2.txt', 'landraces-part3.txt'];

function splitBlocks(text) {
  // Blocks separated by blank lines. Returns { continent, block } objects in order,
  // tracking the current continent whenever a header line is seen.
  const out = [];
  let current = null;
  const chunks = text.split(/\n\s*\n/);
  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    // A chunk may start with a header line followed by an entry.
    if (HEADERS[lines[0]]) {
      current = HEADERS[lines[0]];
      lines.shift();
      if (lines.length === 0) continue;
    }
    out.push({ continent: current, block: lines.join('\n') });
  }
  return out;
}

const records = [];
const seen = new Set();
const unresolved = [];

for (const file of FILES) {
  const text = readFileSync(join(__dirname, 'raw', file), 'utf8');
  for (const { continent, block } of splitBlocks(text)) {
    const p = parseEntry(block);
    if (!p.name) continue;
    const id = makeUniqueId(p.name, seen);
    const coords = resolveCoords({ countryRaw: p.countryRaw, regionRaw: p.regionRaw, name: p.name, id });
    if (!coords) unresolved.push({ id, name: p.name, countryRaw: p.countryRaw });
    records.push({
      id,
      name: p.name,
      continent: continent || 'Unknown',
      country: p.countryRaw || '',
      region: p.regionRaw || '',
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
      coordsApproximate: true,
      type: p.type || '',
      category: normalizeCategory(p.type),
      height: p.height || '',
      flowering: p.flowering || '',
      climate: p.climate || '',
      summary: p.summary || '',
      incomplete: p.incomplete,
      links: []
    });
  }
}

writeFileSync(
  join(__dirname, 'landraces.json'),
  JSON.stringify(records, null, 2) + '\n',
  'utf8'
);

console.log(`Wrote ${records.length} entries to data/landraces.json`);
if (unresolved.length) {
  console.log(`\n${unresolved.length} entries had no resolvable coordinates (add to COUNTRY_CENTROIDS or REGION_OVERRIDES):`);
  for (const u of unresolved) console.log(`  - ${u.id} (country: "${u.countryRaw}")`);
}
