# To-do

Snapshot of remaining and recommended work. The app is feature-complete and deployed
(GitHub Pages — pushing `master` deploys). See `docs/` for how everything works:
[`implementation-guide.md`](docs/implementation-guide.md),
[`taxonomy-guide.md`](docs/taxonomy-guide.md),
[`writeup-generation-guide.md`](docs/writeup-generation-guide.md).

## In progress

- **Forum + reference links for every variety.** Verified, strain-specific Forum
  Discussions + References (Leafly / GrowDiaries / Weedmaps / SeedFinder) have been added
  for the **34 best-known landraces** (batches 1–4, in `data/vendor-links.json`). The
  recognizable tier is covered; the remaining ~410 are obscure regional populations with
  sparse online coverage.

## Planned

- **Background-agent long-tail sweep.** Run parallel agents to attempt forum/reference
  links for the remaining ~410 varieties; add only real, strain-specific hits to
  `data/vendor-links.json`, then `npm run convert`. (Needs the go-ahead to spawn agents;
  expect many "no result" varieties.)
- **Second, looser scrape-match pass.** Re-match the 262 queued entries in
  `data/strains-to-add.json` against the dataset, and decide which are genuinely new
  varieties worth adding.

## Recommended (nice-to-have)

- **Terpene / aroma descriptor.** Per Russo, terpenoid profile drives effect more than
  Sativa/Indica. Add an inferred aroma/terpene field (vocab in `data/lib/vocab.mjs`),
  surfaced near Chemotype. See `docs/taxonomy-guide.md` (Known limitation).
- **Accessibility pass.** Keyboard-only walkthrough of markers → panel → Index; verify
  focus order, ARIA on the Index `<details>` tree, and contrast on badges/links.
- **Photos.** Most varieties have none. Encourage community ⊕ image submissions, or curate
  one license-clean image per famous strain.
- **Basemap payload.** `data/world.geojson` is ~2.5MB; monitor load on mobile and consider
  further simplification or relying on host gzip.
- **Write-up quality spot-check.** Audit obscure write-ups for over-confident claims (the
  generation guide favors hedging). Re-run `node data/normalize-writeups.mjs` after any
  data-field changes.
- **More automated coverage.** `node --test` covers pure logic + a DOM smoke test; a small
  browser test (Playwright/devtools) for the Index facet → slider/checkbox flows and the
  submission forms would catch UI regressions.

## Deferred / out of scope (by design)

- No backend, accounts, or live editing — contributions go through pre-filled GitHub issues.
- No hard species nomenclature — single-species treatment only (see taxonomy guide).
- No build step / framework — keep it static, vanilla ES modules.
