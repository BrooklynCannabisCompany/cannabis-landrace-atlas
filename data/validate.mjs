// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
import { CATEGORIES } from './lib/category.mjs';
import { readFileSync } from 'node:fs';
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

// CLI entry: node data/validate.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const __d = dirname(fileURLToPath(import.meta.url));
  const data = JSON.parse(readFileSync(join(__d, 'landraces.json'), 'utf8'));
  const { errors, warnings } = validateRecords(data);
  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const e of errors) console.error(`ERROR ${e}`);
  console.log(`\n${data.length} records — ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
}
