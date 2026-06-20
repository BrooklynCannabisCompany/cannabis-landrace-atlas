# To-do

Snapshot of remaining and recommended work. The app is feature-complete and deployed
(GitHub Pages — pushing `master` deploys). See `docs/` for how everything works:
[`implementation-guide.md`](docs/implementation-guide.md),
[`taxonomy-guide.md`](docs/taxonomy-guide.md),
[`writeup-generation-guide.md`](docs/writeup-generation-guide.md).

Forum + reference link enrichment is **complete**: all 446 varieties were swept (every
URL verified, 0 dead links), leaving **140 with at least one verified link** (124 with
references, 110 with forum threads). The rest are obscure regional populations with no
strain-specific sources online — fillable over time via the ⊕ submission buttons.

## Planned

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
