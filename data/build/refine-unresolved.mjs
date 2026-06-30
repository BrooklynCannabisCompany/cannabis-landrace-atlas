import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gazPath } from './fetch-ne-gazetteer.mjs';
import {
  normalize, loadGazetteer, buildCountryIndex, decideRefinement,
} from './refine-coords.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..');

export function mergeGazetteer(localGaz, enrichedEntries) {
  const gaz = new Map(localGaz);
  for (const e of enrichedEntries) {
    if (typeof e.lat !== 'number' || typeof e.lng !== 'number' || !e.name) continue;
    const key = normalize(e.name);
    if (!key) continue;
    const rec = { name: e.name, lat: e.lat, lng: e.lng, src: e.src, rank: 50, country: e.country };
    if (!gaz.has(key)) gaz.set(key, []);
    gaz.get(key).push(rec);
  }
  return gaz;
}

export function noPlaceRecords(data, ctx) {
  return data.filter((r) => decideRefinement(r, ctx).reason === 'no-place');
}

const DESCRIPTOR_RE = /highland|lowland|coastal|rift valley|jungle|rainforest|forest|delta|basin|steppe|interior|montane|upland|cloud forest|\bplain\b|foothill|plateau/i;
const NOISE_RE = /\b(roja|gold|red|wild|feral|landrace|landraces|population|populations|complex|magic|madness|region|province|corridor|edge|belt|swamp|island|valley|mountains?|highlands?|lowlands?|uplands?|coastal|delta|basin|steppe|interior|montane|plains?|foothills?|jungle|rainforest|forests?|plateau|cloud)\b/gi;
const IRREGULAR_ADJ = /\b(malagasy|thai|hmong|balkan|anatolian|baltic|andean)\b/gi;
const DEMONYM_RE = /^(nigerian|afghani|iranian|angola roja|black african magic)$/i;

export function residueKind(name, country = '') {
  const n = String(name || '').trim();
  if (DEMONYM_RE.test(n)) return 'vague';
  let s = ` ${n.toLowerCase()} `;
  for (const w of String(country || '').toLowerCase().split(/[^a-z]+/).filter((x) => x.length >= 3)) {
    s = s.replace(new RegExp(`\\b${w}\\w*\\b`, 'g'), ' '); // country word + its demonym (angola→angolan)
  }
  s = s.replace(IRREGULAR_ADJ, ' ');
  const hadDescriptor = DESCRIPTOR_RE.test(n);
  s = s.replace(NOISE_RE, ' ').replace(/[#\d/+().,-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s === '') return hadDescriptor ? 'descriptor' : 'vague';
  return 'named-feature';
}

export function run({ dryRun = false } = {}) {
  const data = JSON.parse(fs.readFileSync(path.join(DATA, 'landraces.json'), 'utf8'));
  const world = JSON.parse(fs.readFileSync(path.join(DATA, 'world.geojson'), 'utf8'));
  const lakesGeo = JSON.parse(fs.readFileSync(path.join(DATA, 'geo', 'lakes.geojson'), 'utf8'));
  const p = gazPath();
  if (!fs.existsSync(p)) throw new Error(`enriched gazetteer not found at ${p} — run fetch-ne-gazetteer.mjs first`);
  const enriched = JSON.parse(fs.readFileSync(p, 'utf8'));

  const local = loadGazetteer(path.join(DATA, 'labels'));
  const countryIndex = buildCountryIndex(world);
  const lakes = lakesGeo.features.map((f) => f.geometry);
  const localCtx = { gaz: local, countryIndex, lakes, centroidCache: new Map() };
  const enrichedGaz = mergeGazetteer(local, enriched);
  const enrichedCtx = { gaz: enrichedGaz, countryIndex, lakes, centroidCache: new Map() };

  const targets = noPlaceRecords(data, localCtx);
  const report = { targetCount: targets.length, moved: [], rejectedCountry: [], rejectedWater: [], ambiguous: [], none: 0 };

  for (const r of targets) {
    const d = decideRefinement(r, enrichedCtx);
    const cands = enrichedGaz.get(d.matched) || [];
    const src = (cands[0] && cands[0].src) || '';
    const tag = { name: r.name, country: r.country, matched: d.matched, src };
    switch (d.action) {
      case 'move':
        report.moved.push({ ...tag, from: [r.lat, r.lng], lat: d.lat, lng: d.lng, distanceKm: d.distanceKm });
        if (!dryRun) { r.lat = d.lat; r.lng = d.lng; }
        break;
      case 'reject-country': report.rejectedCountry.push(tag); break;
      case 'reject-water': report.rejectedWater.push(tag); break;
      case 'ambiguous': report.ambiguous.push(tag); break;
      default: report.none++;
    }
  }
  if (!dryRun) fs.writeFileSync(path.join(DATA, 'landraces.json'), JSON.stringify(data, null, 2) + '\n');
  return report;
}

function printReport(report) {
  const line = (e) => `  ${e.name} (${e.country})  →  ${e.lat},${e.lng}  [${e.matched} · ${e.src}, ${e.distanceKm}km]`;
  console.log(`\nTargets (no-place): ${report.targetCount}`);
  console.log(`\n✅ Moved: ${report.moved.length}`);
  for (const e of report.moved) console.log(line(e));
  console.log(`\n🚫 Rejected — would cross country: ${report.rejectedCountry.length}`);
  for (const e of report.rejectedCountry) console.log(`  ${e.name} (${e.country}) [${e.matched} · ${e.src}]`);
  console.log(`\n💧 Rejected — water: ${report.rejectedWater.length}`);
  console.log(`\n❓ Ambiguous: ${report.ambiguous.length}`);
  for (const e of report.ambiguous) console.log(`  ${e.name} (${e.country}) [${e.matched}]`);
  console.log(`\n⏭️  Still unresolved (Phase B residue): ${report.none}`);
}

function listResidue() {
  const data = JSON.parse(fs.readFileSync(path.join(DATA, 'landraces.json'), 'utf8'));
  const world = JSON.parse(fs.readFileSync(path.join(DATA, 'world.geojson'), 'utf8'));
  const lakesGeo = JSON.parse(fs.readFileSync(path.join(DATA, 'geo', 'lakes.geojson'), 'utf8'));
  const ctx = {
    gaz: loadGazetteer(path.join(DATA, 'labels')),
    countryIndex: buildCountryIndex(world),
    lakes: lakesGeo.features.map((f) => f.geometry),
    centroidCache: new Map(),
  };
  for (const r of noPlaceRecords(data, ctx)) {
    console.log(`${residueKind(r.name, r.country).padEnd(14)} ${r.name}  [${r.country}]`);
  }
}

function main() {
  if (process.argv.includes('--list-residue')) { listResidue(); return; }
  const report = run({ dryRun: process.argv.includes('--dry-run') });
  printReport(report);
  console.log(`\n${process.argv.includes('--dry-run') ? 'DRY RUN — no files written.' : 'Applied to data/landraces.json.'}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
