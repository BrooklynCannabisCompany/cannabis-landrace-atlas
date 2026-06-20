// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Matches TLT Seeds product pages (data/tlt-urls.txt, from their sitemap) against
// landraces.json. Matches add a TLT seed source (-> Seed Sources + References) and an AKA;
// unmatched strains are queued in data/strains-to-add.json for later addition.
//
//   node data/scrape-tlt.mjs            # dry run: prints match stats + samples
//   node data/scrape-tlt.mjs --write    # updates vendor-links.json, aka-generated.json,
//                                        # strains-to-add.json (run `npm run convert` after)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const records = JSON.parse(readFileSync(join(here, 'landraces.json'), 'utf8'));

// Slugs that are blog posts / articles, not strain products — excluded from matching.
const ARTICLE = /(^news$|^\d+$|history|how-to|hashish|-hash$|water-hash|rosin-hash|charas|11-hour|method|terpenes|plasticity|immune-system|psychosis|intoxication|negative-reactions|expedition|strain-hunting|prohibition|drug-policy|drugs-and|concept-of-drugs|islam|religious|status-in|questions-and|importance-of|why-choose|select-a|know-the-plant|hermaphroditism|archaic|greek-world|islamic|ancient-asia|origins-of-cannabis|cannabis-in-|cannabis-history|cannabis-and-|cannabis-origins|cannabis-status|cannabis-why|the-new-european|from-cannabis|from-landraces|on-southern|on-the-uganda|the-origins-of|the-legendary|the-arrival|southern-local-sativas|historical-background|mauritius-landrace-cannabis|sri-lanka-cannabis|northern-africa-egypt|^black-africa$|^north-asia$|iranian-seeds|maajoune)/;

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function nameFromSlug(slug) {
  let parts = slug.split('-');
  if (parts.length > 1 && /^[12]$/.test(parts[parts.length - 1])) parts = parts.slice(0, -1); // drop dedup -2/-1
  return parts.map((w) => (w === 'x' ? 'x' : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

// Precompute normalized name + akas for each landrace.
const index = records.map((r) => ({
  r,
  keys: new Set([norm(r.name), ...(r.aka || []).map(norm)].filter(Boolean))
}));

const isCross = (name) => /\bx\b/i.test(name); // hybrids/crosses are not landraces — skip

function matchLandrace(tltName) {
  const t = norm(tltName);
  if (t.length < 4 || isCross(tltName)) return null;
  // exact on name or aka (high confidence)
  for (const e of index) if (e.keys.has(t)) return e.r;
  // prefix containment on the NAME only (not akas), guarded by length, to catch
  // base/variant pairs (Guatemala ↔ Guatemala Highlands, Kashmir ↔ Kashmir Purple)
  for (const e of index) {
    const k = norm(e.r.name);
    if (k.length < 7 || t.length < 7) continue;
    if (k.startsWith(t) || t.startsWith(k)) return e.r;
  }
  return null;
}

const urls = readFileSync(join(here, 'tlt-urls.txt'), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const matches = []; // { id, tltName, url }
const unmatched = []; // { name, url }
let skipped = 0;

for (const url of urls) {
  const slug = url.replace(/\/+$/, '').split('/').pop();
  if (ARTICLE.test(slug)) { skipped += 1; continue; }
  const name = nameFromSlug(slug);
  const r = matchLandrace(name);
  if (r) matches.push({ id: r.id, landrace: r.name, tltName: name, url });
  else unmatched.push({ name, url });
}

console.log(`TLT urls: ${urls.length} | articles skipped: ${skipped} | strains: ${matches.length + unmatched.length}`);
console.log(`matched: ${matches.length} | unmatched (queued): ${unmatched.length}`);

if (!process.argv.includes('--write')) {
  console.log('\n--- sample matches ---');
  for (const m of matches.slice(0, 25)) console.log(`  ${m.tltName}  ->  ${m.landrace}`);
  console.log('\n--- sample unmatched ---');
  for (const u of unmatched.slice(0, 25)) console.log(`  ${u.name}`);
  console.log('\n(dry run — pass --write to apply)');
} else {
  const vlPath = join(here, 'vendor-links.json');
  const akaPath = join(here, 'aka-generated.json');
  const vl = JSON.parse(readFileSync(vlPath, 'utf8'));
  const aka = JSON.parse(readFileSync(akaPath, 'utf8'));
  const byId = Object.fromEntries(records.map((r) => [r.id, r]));
  let seedAdds = 0; let akaAdds = 0;

  for (const m of matches) {
    vl[m.id] = vl[m.id] || {};
    vl[m.id].seed = vl[m.id].seed || [];
    if (!vl[m.id].seed.some((s) => s.url === m.url)) {
      vl[m.id].seed.push({ vendor: 'TLT Seeds', product: m.tltName, url: m.url });
      seedAdds += 1;
    }
    // Add the TLT name as an AKA only when it is a shorter BASE form of our name
    // (e.g. "Guatemala" for "Guatemala Highlands") — never a longer variant/cross.
    const r = byId[m.id];
    const nt = norm(m.tltName);
    const nn = norm(r.name);
    const existing = new Set([nn, ...(r.aka || []).map(norm), ...((aka[m.id] || []).map(norm))]);
    if (nt.length >= 4 && nt.length < nn.length && nn.startsWith(nt) && !existing.has(nt)) {
      aka[m.id] = aka[m.id] || [];
      aka[m.id].push(m.tltName);
      akaAdds += 1;
    }
  }
  writeFileSync(vlPath, `${JSON.stringify(vl, null, 2)}\n`);
  writeFileSync(akaPath, `${JSON.stringify(aka, null, 2)}\n`);
  writeFileSync(join(here, 'strains-to-add.json'), `${JSON.stringify(unmatched, null, 2)}\n`);
  console.log(`wrote: +${seedAdds} seed sources, +${akaAdds} akas, ${unmatched.length} queued in strains-to-add.json`);
  console.log('Now run: npm run convert');
}
