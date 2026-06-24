// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Normalizes the "## Description" section of every write-up into a consistent shape:
// a canonically-ordered bullet list of facts (drawn from landraces.json, so data like
// flowering appears even when the prose omitted it) followed by a prose paragraph that
// preserves all existing descriptive content. Nothing is lost: richer detail from an
// existing data bullet (e.g. "Tall, 2–3 m") is kept as that bullet's text, and any
// non-data sentences become the paragraph.
//
// Usage:  node data/build/normalize-writeups.mjs [--dry [id ...]]

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const records = JSON.parse(readFileSync(join(here, '..', 'landraces.json'), 'utf8'));

// Existing bullet labels that correspond to a structured data slot (everything else
// is treated as descriptive prose).
const DATA_LABELS = {
  type: 'vtype', category: 'vtype', 'vernacular type': 'vtype', 'variety type': 'vtype',
  height: 'height',
  flowering: 'flowering', 'flowering time': 'flowering', 'flowering period': 'flowering',
  climate: 'climate', 'climate adaptation': 'climate', habitat: 'climate',
  // Our own regenerated bullets — recognized so re-running stays idempotent (dropped,
  // not swept into the prose).
  morphotype: 'drop', chemotype: 'drop', domestication: 'drop', origin: 'drop'
};

function floweringText(f) {
  const m = String(f || '').trim();
  if (!m) return '';
  return m.replace(/(\d)\s*w\b/g, '$1 weeks'); // spell out "7–9w" -> "7–9 weeks"
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function originText(r) {
  const country = (r.country || '').trim();
  const cont = r.continent && r.continent !== 'Unknown' ? r.continent : '';
  if (country && cont && cont.toLowerCase() !== country.toLowerCase()) return `${country} (${cont})`;
  return country || cont || '';
}

function sentence(s) {
  let t = String(s || '').trim();
  if (!t) return '';
  t = t[0].toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

// Splits a Description body into { data: {slot: richestText}, desc: [sentence...] }.
function parseDescription(body) {
  const data = {};
  const desc = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const mb = line.match(/^[-*]\s+(?:\*\*(.+?):\*\*\s*)?(.+)$/);
    if (mb) {
      const label = (mb[1] || '').trim().toLowerCase();
      const text = mb[2].trim();
      if (label && DATA_LABELS[label]) {
        const slot = DATA_LABELS[label];
        if (!data[slot] || text.length > data[slot].length) data[slot] = text; // keep richer text
      } else {
        desc.push(text); // descriptive bullet (drop its label, keep the content)
      }
    } else {
      desc.push(line); // prose line
    }
  }
  return { data, desc };
}

function buildDescriptionSection(r, parsed) {
  const { data, desc } = parsed;
  // Bullet order mirrors the Index facets (Region≈Origin, Climate, Morphotype, Chemotype,
  // Domestication, Type (vernacular), Height, Flowering Time).
  const bullets = [];
  const origin = originText(r);
  if (origin) bullets.push(`- **Origin:** ${origin}`);
  // Climate: keep the richest available text, and preserve the originally recorded climate
  // (climateFull) when normalization to a bucket dropped wording it doesn't already convey.
  let climate = (data.climate || r.climate || '').replace(/\s*\(recorded as [^)]*\)\s*$/i, '').trim();
  if (climate && r.climateFull) {
    const cf = norm(r.climateFull);
    if (cf && !norm(climate).includes(cf)) climate = `${climate} (recorded as “${r.climateFull}”)`;
  }
  if (climate) bullets.push(`- **Climate:** ${climate}`);
  bullets.push(`- **Morphotype:** ${r.morphotype}`);
  bullets.push(`- **Chemotype:** Type ${r.chemotype} (inferred)`);
  bullets.push(`- **Domestication:** ${r.domestication}`);
  bullets.push(`- **Vernacular type:** ${r.category}`);
  const height = data.height || r.height;
  if (height) bullets.push(`- **Height:** ${height}`);
  const flowering = floweringText(data.flowering || r.flowering);
  if (flowering) bullets.push(`- **Flowering Time:** ${flowering}`);

  let prose = desc.map(sentence).filter(Boolean).join(' ');
  if (!prose) {
    const vt = (data.vtype || r.category || '').toLowerCase();
    const art = /^[aeiou]/.test(vt) ? 'an' : 'a';
    prose = sentence(`${r.name} is ${art} ${vt} landrace (${r.morphotype})${origin ? ` from ${origin}` : ''}`);
  }
  return `## Description\n${bullets.join('\n')}\n\n${prose}\n`;
}

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyIds = args.filter((a) => !a.startsWith('--'));

let changed = 0;
let skipped = 0;
for (const r of records) {
  if (onlyIds.length && !onlyIds.includes(r.id)) continue;
  const path = join(here, '..', 'writeups', `${r.id}.md`);
  let md;
  try { md = readFileSync(path, 'utf8'); } catch { skipped++; continue; }

  const startRe = /^## Description[ \t]*$/m;
  const sm = startRe.exec(md);
  if (!sm) { skipped++; continue; }
  const bodyStart = sm.index + sm[0].length;
  const nextRe = /^## /m;
  const nm = nextRe.exec(md.slice(bodyStart));
  const bodyEnd = nm ? bodyStart + nm.index : md.length;
  const body = md.slice(bodyStart, bodyEnd);

  const section = buildDescriptionSection(r, parseDescription(body));
  const rest = nm ? md.slice(bodyEnd) : '';
  const newMd = `${md.slice(0, sm.index)}${section}${rest ? `\n${rest}` : ''}`;

  if (dry) {
    console.log(`\n===== ${r.id} =====`);
    console.log(section);
  } else if (newMd !== md) {
    writeFileSync(path, newMd);
    changed++;
  }
}
if (!dry) console.log(`Normalized ${changed} write-ups (${skipped} skipped).`);
