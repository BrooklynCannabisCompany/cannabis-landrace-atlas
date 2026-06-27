// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { CATEGORIES } from './lib/category.mjs';
import { MORPHOTYPES as MORPHOTYPE_LIST, CHEMOTYPES as CHEMOTYPE_LIST, DOMESTICATIONS as DOMESTICATION_LIST } from '../vocab.mjs';
import { readFileSync } from 'node:fs';

const MORPHOTYPES = new Set(MORPHOTYPE_LIST);
const CHEMOTYPES = new Set(CHEMOTYPE_LIST);
const DOMESTICATIONS = new Set(DOMESTICATION_LIST);
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Returns { errors: string[], warnings: string[] } for an array of records.
export function validateRecords(records) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

  if (!Array.isArray(records)) {
    errors.push('records is not an array');
    return { errors, warnings };
  }

  for (const r of records) {
    const where = r && r.id ? r.id : JSON.stringify(r).slice(0, 40);
    if (!r.id) errors.push(`${where}: missing id`);
    if (ids.has(r.id)) errors.push(`${r.id}: duplicate id`);
    ids.add(r.id);
    if (!r.name) errors.push(`${where}: missing name`);
    if (!CATEGORIES.has(r.category)) errors.push(`${where}: invalid category "${r.category}"`);
    if (!MORPHOTYPES.has(r.morphotype)) errors.push(`${where}: invalid morphotype "${r.morphotype}"`);
    if (!CHEMOTYPES.has(r.chemotype)) errors.push(`${where}: invalid chemotype "${r.chemotype}"`);
    if (!DOMESTICATIONS.has(r.domestication)) errors.push(`${where}: invalid domestication "${r.domestication}"`);
    if (typeof r.coordsApproximate !== 'boolean') errors.push(`${where}: coordsApproximate not boolean`);
    if (!Array.isArray(r.links)) errors.push(`${where}: links not an array`);
    for (const link of r.links || []) {
      if (typeof link.embed !== 'boolean') errors.push(`${where}: link.embed not boolean`);
      if (!link.url) errors.push(`${where}: link missing url`);
    }
    // Coordinate checks
    if (r.lat === null || r.lng === null) {
      warnings.push(`${where}: missing coordinates (will not appear on map)`);
    } else {
      if (typeof r.lat !== 'number' || r.lat < -90 || r.lat > 90) errors.push(`${where}: lat out of range`);
      if (typeof r.lng !== 'number' || r.lng < -180 || r.lng > 180) errors.push(`${where}: lng out of range`);
    }
    // Stub / thin-data warnings (do not block build)
    if (r.incomplete) warnings.push(`${where}: marked incomplete (enrichment pending)`);
    else if (!r.summary) warnings.push(`${where}: empty summary`);
  }
  return { errors, warnings };
}

// Validates a label data file (cities/water): an array of { name, lat, lng, rank }.
export function validateLabelPoints(records, kind = 'label') {
  const errors = [];
  if (!Array.isArray(records)) {
    errors.push(`${kind}: not an array`);
    return { errors };
  }
  records.forEach((r, i) => {
    const where = `${kind}[${i}]${r && r.name ? ` "${r.name}"` : ''}`;
    if (!r || typeof r.name !== 'string' || !r.name.trim()) errors.push(`${where}: missing name`);
    if (!r || typeof r.lat !== 'number' || r.lat < -90 || r.lat > 90) errors.push(`${where}: lat out of range`);
    if (!r || typeof r.lng !== 'number' || r.lng < -180 || r.lng > 180) errors.push(`${where}: lng out of range`);
    if (!r || !Number.isFinite(r.rank)) errors.push(`${where}: rank not a number`);
  });
  return { errors };
}

// CLI entry: node data/validate.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const __d = dirname(fileURLToPath(import.meta.url));
  const data = JSON.parse(readFileSync(join(__d, '..', 'landraces.json'), 'utf8'));
  const { errors, warnings } = validateRecords(data);
  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const e of errors) console.error(`ERROR ${e}`);
  console.log(`\n${data.length} records — ${errors.length} errors, ${warnings.length} warnings`);

  // Label data files (optional decoration; validated when present).
  let labelErrors = 0;
  for (const [file, kind] of [['cities.json', 'cities'], ['water.json', 'water'], ['states.json', 'states']]) {
    try {
      const recs = JSON.parse(readFileSync(join(__d, '..', 'labels', file), 'utf8'));
      const res = validateLabelPoints(recs, kind);
      for (const e of res.errors) console.error(`ERROR ${e}`);
      labelErrors += res.errors.length;
      console.log(`${kind}: ${Array.isArray(recs) ? recs.length : 0} points — ${res.errors.length} errors`);
    } catch (e) {
      console.error(`ERROR ${kind}: cannot read data/labels/${file} (${e.message})`);
      labelErrors += 1;
    }
  }

  // Basemap geometry files (optional decoration; validated when present).
  let geoErrors = 0;
  for (const file of ['lakes.geojson', 'rivers.geojson', 'admin1.geojson']) {
    try {
      const g = JSON.parse(readFileSync(join(__d, '..', 'geo', file), 'utf8'));
      const ok = g && g.type === 'FeatureCollection' && Array.isArray(g.features) && g.features.length > 0;
      if (!ok) { console.error(`ERROR geo/${file}: not a non-empty FeatureCollection`); geoErrors += 1; }
      else console.log(`${file}: ${g.features.length} features`);
    } catch (e) {
      console.error(`ERROR geo/${file}: cannot read data/geo/${file} (${e.message})`);
      geoErrors += 1;
    }
  }

  process.exit(errors.length + labelErrors + geoErrors ? 1 : 0);
}
