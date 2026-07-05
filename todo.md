# To-do

Snapshot of remaining and recommended work. The app is feature-complete and deployed
(GitHub Pages — pushing `master` deploys). See `docs/` for how everything works:
[`implementation-guide.md`](docs/implementation-guide.md),
[`taxonomy-guide.md`](docs/taxonomy-guide.md),
[`writeup-generation-guide.md`](docs/writeup-generation-guide.md).

## Decision pending: map each height label to meters

Idea: give each `HEIGHTS` label a meter range (e.g. shown in a tooltip, or to drive the
Height facet). **Needs a decision on the values before any code change.**

**Data finding:** heights in the dataset are described **qualitatively**, not numerically.
Of 445 `**Height:**` write-up bullets, only **7** contain meters, and 6 just echo a label
that already embeds the figure (`Tall (2–4m)`, etc.). So there's no numeric height data to
average. The usable signals are the few label anchors (`Tall ≈ 2–4 m`, `Very tall ≈ 3–4 m+`)
and the **strong label↔morphotype correlation**: Short = ruderalis + compact Afghan indica;
Tall/Very tall/Extremely tall = NLD sativa (tropical). External refs corroborate the
endpoints: ruderalis ~0.3–1 m (Wikipedia); Afghan indica ~1–2 m; Highland Thai 2–5 m
(The Real Seed Company — a dataset reference vendor); Réunion-type extremes higher.

**Recommended mapping (clean, monotonic):**

| Label | Recommended | Confidence |
|---|---|---|
| Short | under ~1.25 m (≈ 0.4–1.25 m) | High |
| Medium-short | ~1.25–1.5 m | Medium |
| Medium | ~1.5–2 m | Medium |
| Medium-tall | ~2–2.5 m | Medium |
| Tall | ~2.5–3.5 m | Med-High |
| Very tall | ~3.5–4.5 m | High |
| Extremely tall | over ~4.5 m (≈ 4.5–6 m) | High |

Notes:
- Endpoints + ordering are well-supported; the **mid-scale cut points are interpolated**
  (no numeric data there).
- **Alternative** that mirrors the source list's coarser annotations (more overlap):
  Tall 2–4 m / Very tall 3–5 m / Extremely tall 5 m+.
- "Short" is the widest-variance bucket — it lumps dwarf ruderalis (~0.3–1 m) with compact
  Afghan indicas (~1–1.8 m outdoors).
- Optional next step before committing values: spot-check specific varieties against their
  `seedSources`/`references` URLs to tighten the mid-scale numbers.

## Recommended (nice-to-have)

- **Terpene / aroma descriptor.** Per Russo, terpenoid profile drives effect more than
  Sativa/Indica. Add an inferred aroma/terpene field (vocab in `data/vocab.mjs`),
  surfaced near Chemotype. See `docs/taxonomy-guide.md` (Known limitation).
- **Accessibility pass.** Keyboard-only walkthrough of markers → panel → Index; verify
  focus order, ARIA on the Index `<details>` tree, and contrast on badges/links.
- **Photos.** Most varieties have none. Encourage community ⊕ image submissions, or curate
  one license-clean image per famous strain.
- **Basemap payload.** `data/world.geojson` is ~2.5MB; monitor load on mobile and consider
  further simplification or relying on host gzip.
- **Write-up quality spot-check.** Audit obscure write-ups for over-confident claims (the
  generation guide favors hedging). Re-run `node data/build/normalize-writeups.mjs` after any
  data-field changes.
- **More automated coverage.** `node --test` covers pure logic + a DOM smoke test; a small
  browser test (Playwright/devtools) for the Index facet → slider/checkbox flows and the
  submission forms would catch UI regressions.

## Deferred / out of scope (by design)

- No backend, accounts, or live editing — contributions go through pre-filled GitHub issues.
- No hard species nomenclature — single-species treatment only (see taxonomy guide).
- No build step / framework — keep it static, vanilla ES modules.
