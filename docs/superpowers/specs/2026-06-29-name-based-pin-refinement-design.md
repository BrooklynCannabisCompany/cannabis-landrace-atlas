# Name-based pin refinement — design

**Date:** 2026-06-29
**Status:** Approved (pending spec review)

## Problem

Every landrace record in `data/landraces.json` (446 records, all `coordsApproximate: true`)
was auto-placed in an earlier session from `country` (+ sometimes `region`) data. Records
that resolved only to a country fall on the **country centroid** — e.g. the Mexican varieties
named `Chiapas`, `Guerrero`, `Michoacán`, `Oaxaca`, `Veracruz` all sit at ~(23.7, −102.4),
the center of Mexico, hundreds of km from the state each is named after.

But the place is right there in the data: the variety `name` (and often the `region` string)
frequently names a state, city, or physical feature. We can use it to relocate the pin to a
real sub-country location.

No coordinate is hand-tuned, so there is **nothing to preserve** — we apply the best confident
match wherever one exists.

## Goal

For every record whose `name`/`region` names a place we can resolve against the local
public-domain gazetteer, move the pin to that place's coordinate — as exactly as the gazetteer
allows — provided the result stays in the same country and on land. Keep
`coordsApproximate: true`.

## Data sources (all local, public-domain Natural Earth, already in repo)

- **Gazetteer (point lookups):** `data/labels/{states,cities,ranges,peaks,landforms,lakes,rivers}.json`
  — each entry `{ name, lat, lng, rank }`. ~551 states, ~243 cities, plus physical features.
- **Country guard:** `data/world.geojson` — Natural Earth admin-0 polygons (`NAME`/`ADMIN`).
- **Water guard:** `data/geo/lakes.geojson` — lake polygons.

No network, no new dependencies. Every applied coordinate is provenance-backed by a named
gazetteer feature.

## Mechanism

A new build script **`data/build/refine-coords.mjs`** (build tooling — lives under
`data/build/` per the repo split; not wired into the runtime site). Run manually:
`node data/build/refine-coords.mjs` to apply, `--dry-run` to report without writing.

### 1. Build the gazetteer
Load all label files into one normalized map. Normalize names with NFD diacritic-stripping +
lowercase (so `Michoacán` matches `Michoacan`). Record each entry's source file (`states`,
`cities`, `peaks`, …) for ranking and for the foothills rule.

### 2. Match each record
- Build a haystack from the record's `name`, then its `region` (split on commas/`State`/
  `Department` noise words).
- Find **whole-word** gazetteer-name matches (word-boundary regex; ignore matches < 3 chars).
- **Longest matched name wins** (so `Sierra Nevada de Santa Marta` beats `Santa Marta`).
- Ties break by source priority: `states` → `cities` → `ranges`/`peaks`/`landforms` →
  `lakes`/`rivers`.

### 3. Resolve to the in-country feature
A place name can exist in several countries. Find the country polygon for the record's
`country` (via a `NAME`/`ADMIN` lookup plus a small alias map for dataset-specific spellings:
`DRC` → "Dem. Rep. Congo", `United States` → "United States of America", etc.). Then:
- If exactly one matched feature falls inside that polygon → use it.
- If the matched name resolves only **outside** the country → **reject**, log under
  "would cross country".
- If genuinely ambiguous (multiple same-named features, none clearly in-country) → **do not
  guess**; add to the "needs your call" list to ask the user.

### 4. Mountain → foothills offset
When the chosen match's source is `peaks` or `ranges`, don't drop the pin on the summit/crest
(grows sit on the slopes/valleys). Offset ~0.25° (≈ 25–30 km) from the feature point **toward
the country centroid** (interior / lower, inhabited ground). Each mountain-derived placement is
listed individually in the report for human eyeball.

### 5. Water guard
After computing the final point (post-offset), test it against `data/geo/lakes.geojson` and the
country landmass. If it lands in a lake or off the country's land:
- nudge toward the country centroid in small steps until it is on land and out of water; else
- if it can't be resolved cleanly → **reject** + report (never leave a pin in water).

### 6. Apply
Write new `lat`/`lng` (rounded to 3 decimals, matching gazetteer precision) into
`data/landraces.json`. Leave `coordsApproximate: true`. No other field changes.

### 7. Report (printed at end; also the `--dry-run` output)
- ✅ **Moved** — `name`: old (lat,lng) → new (lat,lng), matched feature + source, distance moved.
- ⛰️ **Moved (mountain, foothills offset applied)** — listed separately for review.
- 🚫 **Rejected — would cross country** — name, matched feature, where it landed.
- 💧 **Rejected — water, unresolvable** — name.
- ❓ **Needs your call (ambiguous)** — name + the candidate features.
- ⏭️ **No place found** — count (and on request, the list).

## Verification

- `npm run validate` — dataset + labels/geo validators must pass.
- `npm test` — full `node --test` suite must pass.
- Spot-check the report: the known broken cluster (Mexican states) must now sit on their states.

## Out of scope

- No runtime/UI changes; the map renders the new coordinates with no code change.
- No new dependencies, no network calls, no changes to the gazetteer files themselves.
- Records with no resolvable place name are left exactly as they are.

## Process notes (repo conventions)

- This is a **data change** (`data/landraces.json`) plus **build tooling**
  (`data/build/refine-coords.mjs`). Per CONTRIBUTING rules, data and code land in **separate
  PRs**, each ≤ 200 changed lines — the coordinate edits may need to be split across more than
  one data PR.
- Bump `js/version.js` `VERSION` per the versioning rule in the commit(s).
