// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Matches The Real Seed Company product pages (data/build/rsc-urls.txt, from their sitemap)
// against landraces.json. Matches add an RSC seed source (-> Seed Sources + References)
// and an AKA (when the RSC name is a shorter base form); unmatched strains are merged into
// data/build/strains-to-add.json. Mirrors scrape-tlt.mjs.
//
// Provenance tool only — not a live path (see CLAUDE.md / implementation-guide §6).
//   node data/build/scrape-rsc.mjs            # dry run
//   node data/build/scrape-rsc.mjs --write    # apply

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const records = JSON.parse(readFileSync(join(here, '..', 'landraces.json'), 'utf8'));
const VENDOR = 'The Real Seed Company';

// Non-product slugs (podcasts, projects, books) to skip.
const NONPRODUCT = /(podcast|project|syndicate|breeders|fortress)/;
// Boilerplate tokens stripped from the end of an RSC slug to get the strain name.
const STOP = new Set(['landrace', 'strain', 'stain', 'cannabis', 'seeds', 'seed', 'heirloom', 'ibl', 'ganja', 'sativa', 'indica']);

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function nameFromSlug(slug) {
  let parts = slug.split('-');
  while (parts.length > 1 && STOP.has(parts[parts.length - 1])) parts = parts.slice(0, -1);
  while (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) parts = parts.slice(0, -1); // drop trailing dedup/variant digits
  return parts.map((w) => (w === 'x' ? 'x' : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

const index = records.map((r) => ({
  r, keys: new Set([norm(r.name), ...(r.aka || []).map(norm)].filter(Boolean))
}));
const isCross = (name) => /\bx\b/i.test(name);

function matchLandrace(name) {
  const t = norm(name);
  if (t.length < 4 || isCross(name)) return null;
  for (const e of index) if (e.keys.has(t)) return e.r;
  for (const e of index) {
    const k = norm(e.r.name);
    if (k.length < 7 || t.length < 7) continue;
    if (k.startsWith(t) || t.startsWith(k)) return e.r;
  }
  return null;
}

const urls = readFileSync(join(here, 'rsc-urls.txt'), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const matches = [];
const unmatched = [];
let skipped = 0;

for (const url of urls) {
  const slug = url.replace(/\/+$/, '').split('/').pop();
  if (NONPRODUCT.test(slug)) { skipped += 1; continue; }
  const name = nameFromSlug(slug);
  const r = matchLandrace(name);
  if (r) matches.push({ id: r.id, landrace: r.name, name, url });
  else unmatched.push({ name, url });
}

console.log(`RSC urls: ${urls.length} | non-products skipped: ${skipped}`);
console.log(`matched: ${matches.length} | unmatched (queued): ${unmatched.length}`);

if (!process.argv.includes('--write')) {
  console.log('\n--- sample matches ---');
  for (const m of matches.slice(0, 30)) console.log(`  ${m.name}  ->  ${m.landrace}`);
  console.log('\n--- sample unmatched ---');
  for (const u of unmatched.slice(0, 20)) console.log(`  ${u.name}`);
  console.log('\n(dry run — pass --write to apply)');
} else {
  const vlPath = join(here, 'vendor-links.json');
  const akaPath = join(here, 'aka-generated.json');
  const addPath = join(here, 'strains-to-add.json');
  const vl = JSON.parse(readFileSync(vlPath, 'utf8'));
  const aka = JSON.parse(readFileSync(akaPath, 'utf8'));
  const byId = Object.fromEntries(records.map((r) => [r.id, r]));
  let seedAdds = 0; let akaAdds = 0;

  for (const m of matches) {
    vl[m.id] = vl[m.id] || {};
    vl[m.id].seed = vl[m.id].seed || [];
    if (!vl[m.id].seed.some((s) => s.url === m.url)) {
      vl[m.id].seed.push({ vendor: VENDOR, product: m.name, url: m.url });
      seedAdds += 1;
    }
    const r = byId[m.id];
    const nt = norm(m.name); const nn = norm(r.name);
    const existing = new Set([nn, ...(r.aka || []).map(norm), ...((aka[m.id] || []).map(norm))]);
    if (nt.length >= 4 && nt.length < nn.length && nn.startsWith(nt) && !existing.has(nt)) {
      aka[m.id] = aka[m.id] || [];
      aka[m.id].push(m.name);
      akaAdds += 1;
    }
  }

  // merge unmatched into the shared queue, deduped by url
  let queue = [];
  try { queue = JSON.parse(readFileSync(addPath, 'utf8')); } catch { queue = []; }
  const seen = new Set(queue.map((q) => q.url));
  let queued = 0;
  for (const u of unmatched) if (!seen.has(u.url)) { queue.push(u); seen.add(u.url); queued += 1; }

  writeFileSync(vlPath, `${JSON.stringify(vl, null, 2)}\n`);
  writeFileSync(akaPath, `${JSON.stringify(aka, null, 2)}\n`);
  writeFileSync(addPath, `${JSON.stringify(queue, null, 2)}\n`);
  console.log(`wrote: +${seedAdds} seed sources, +${akaAdds} akas, +${queued} queued (queue now ${queue.length})`);
  console.log('Wrote enrichment files (historical pipeline; convert is not re-run).');
}
