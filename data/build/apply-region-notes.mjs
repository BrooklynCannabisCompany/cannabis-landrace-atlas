// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
// One-time: preserve parenthetical locality detail (removed from `region` during
// normalization) into each strain's write-up Description, so nothing is lost.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cleanRegion } from './lib/normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, '..', 'landraces.json'), 'utf8'));
const MARK = '_Recorded locality detail:';
let touched = 0;

for (const r of data) {
  const { note } = cleanRegion(r.region, r.country);
  if (!note) continue;
  const p = join(__dirname, '..', 'writeups', `${r.id}.md`);
  if (!existsSync(p)) continue;
  let t = readFileSync(p, 'utf8');
  if (t.includes(MARK)) continue; // idempotent
  const sentence = `\n${MARK} ${note}._\n`;
  const idx = t.indexOf('\n## Grow Information');
  if (idx !== -1) t = t.slice(0, idx) + sentence + t.slice(idx);
  else continue;
  writeFileSync(p, t, 'utf8');
  touched++;
}
console.log(`appended locality detail to ${touched} write-ups`);
