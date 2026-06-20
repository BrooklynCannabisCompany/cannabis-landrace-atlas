// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseEntry } from './lib/parse.mjs';
import { normalizeCategory } from './lib/category.mjs';
import { resolveCoords, resolveCountryName } from './lib/coords.mjs';
import { makeUniqueId } from './lib/id.mjs';
import { extractAka } from './lib/aka.mjs';
import { cleanType, cleanRegion, cleanClimate } from './lib/normalize.mjs';
import { deriveMorphotype, deriveChemotype, deriveDomestication } from './lib/taxonomy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Real seed-vendor links matched during scraping (RSC). Real URLs only.
const vendorLinks = JSON.parse(readFileSync(join(__dirname, 'vendor-links.json'), 'utf8'));
// Curated, well-attested alternate names (strict generated pass). id -> [names].
const akaGenerated = JSON.parse(readFileSync(join(__dirname, 'aka-generated.json'), 'utf8'));

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
    const country = resolveCountryName({ countryRaw: p.countryRaw, regionRaw: p.regionRaw, name: p.name }) || p.countryRaw || '';
    const cat = normalizeCategory(p.type);
    records.push({
      id,
      name: p.name,
      aka: (() => {
        const src = extractAka([p.summary, p.regionRaw].filter(Boolean).join('. '), p.name);
        const seen = new Set([p.name.toLowerCase()]);
        const out = [];
        for (const a of [...src, ...(akaGenerated[id] || [])]) {
          const k = a.toLowerCase();
          if (!seen.has(k)) { seen.add(k); out.push(a); }
        }
        return out;
      })(),
      continent: continent || 'Unknown',
      country,
      region: cleanRegion(p.regionRaw, country).region,
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
      coordsApproximate: true,
      type: cleanType(p.type),
      category: cat,
      morphotype: deriveMorphotype(cat, p.type),
      chemotype: deriveChemotype(cat, p.type, p.summary),
      chemotypeInferred: true,
      domestication: deriveDomestication(cat, p.type),
      height: p.height || '',
      flowering: p.flowering || '',
      climate: cleanClimate(p.climate),
      climateFull: p.climate || '',
      summary: p.summary || '',
      incomplete: p.incomplete,
      seedSources: (vendorLinks[id] && vendorLinks[id].seed) || [],
      photos: (vendorLinks[id] && vendorLinks[id].photo) ? [vendorLinks[id].photo] : [],
      forums: (vendorLinks[id] && vendorLinks[id].forums) || [],
      references: (vendorLinks[id] && vendorLinks[id].references) || [],
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
