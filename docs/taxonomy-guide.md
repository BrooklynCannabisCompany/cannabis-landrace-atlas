# Taxonomy guide

How The Cannabis Landrace Atlas classifies varieties, why, and exactly how each field is
derived. Grounded in **McPartland** (cannabis systematics) and **Russo** (chemotaxonomy /
entourage). The derivation lives in `data/lib/taxonomy.mjs`; the displayed tooltips live in
`js/panel.js` (`MORPHOTYPE_DEF`, `CHEMOTYPE_DEF`, `DOMESTICATION_DEF`, `CATEGORY_DEF`).

## Guiding principles

- **"Sativa / Indica" is vernacular and contested — don't lead with it.** McPartland
  (2018) shows the vernacular "Indica" (broad-leaf Afghan drug plants) is essentially
  *inverted* relative to formal botany; Russo calls the common sativa/indica distinction
  "total nonsense," holding that only biochemical/pharmacological differences matter.
  So we lead with **morphotype** and present Sativa/Indica only as the common *vernacular
  type*, with a caveat tooltip.
- **Three orthogonal axes, not one.** McPartland separates (a) **morphotype** (leaf shape +
  use), (b) **domestication status**, and (c) **chemotype**. We keep these as three
  independent fields rather than one conflated "category".
- **Honest about inference.** For landraces we have no assays, so chemotype is always shown
  as **inferred**, and everything is best-effort from descriptors.
- **No hard species claims.** If scientific names are ever added, follow McPartland's
  pragmatic single-species treatment (*C. sativa* with subspecies/biotypes), never assert
  *sativa* vs *indica* as species.

## The four classification fields

Each record carries: `morphotype`, `chemotype` (+ `chemotypeInferred`), `domestication`,
and `category` (the vernacular type). The panel shows morphotype + vernacular type as the
two badges; chemotype and domestication as trait rows. Controlled values live in
`data/lib/vocab.mjs`.

### 1. Morphotype (primary classification)

Leaf-shape + use biotype. Vocab: **Narrow-Leaf Drug**, **Broad-Leaf Drug**,
**Narrow-Leaf Hemp**, **Broad-Leaf Hemp**, **Intermediate (NLD–BLD)**,
**Ruderalis (wild-type)**, **Unclassified**.

- NLD ≈ vernacular "Sativa"; BLD ≈ vernacular "Indica" (note the deliberate decoupling).
- NLH/BLH (hemp split) follows Clarke & Merlin (2013) and McPartland. McPartland reserves
  "putative ancestor" (NLHA/BLHA) for *wild* hemp; our cultivated-hemp entries use NLH/BLH.

**Derivation** (`deriveMorphotype(category, type)`), first match wins:
1. ruderalis → `Ruderalis (wild-type)`
2. hemp → `Narrow-Leaf Hemp`
3. intermediate / hybrid / indica–sativa → `Intermediate (NLD–BLD)`
4. indica → `Broad-Leaf Drug`
5. sativa → `Narrow-Leaf Drug`
6. otherwise → `Unclassified`

### 2. Chemotype (foregrounded as the functional axis; inferred)

Russo's position: **chemotype + terpenoid profile** (the entourage effect), not
sativa/indica, determines effect. Vocab (de Meijer/Small, popularized by Russo):

- **I** — THC-dominant
- **II** — balanced THC:CBD
- **III** — CBD-dominant
- **IV** — CBG-dominant
- **V** — cannabinoid-free (typically fiber/seed hemp)

Always displayed as **"Type N (inferred)"** — we have no lab assays for landraces. The
Type I tooltip notes that effects depend on terpenes (consistent with Russo).

**Derivation** (`deriveChemotype(category, type, summary)`), first match wins:
CBG→IV; high-CBD/CBD→III; hemp→V; ruderalis→II; otherwise→I.

### 3. Domestication status (orthogonal axis)

Vocab: **Heirloom**, **Domesticated**, **Feral (escaped)**, **Wild**. "Feral" is a
*status* here, not a type peer of Sativa/Indica.

**Derivation** (`deriveDomestication(category, type)`), first match wins:
feral→`Feral (escaped)`; ruderalis→`Wild`; wild→`Wild`; heirloom/acclimatized→`Heirloom`;
otherwise→`Domesticated`.

(Ruderalis: McPartland treats vernacular "ruderalis" — CBD≈THC, wild-type, auto-flowering —
as feral/wild *C. sativa* subsp. *spontanea*, not a species. Hence morphotype
`Ruderalis (wild-type)`, chemotype `II`, status `Wild`.)

### 4. Vernacular type (`category`, common usage only)

The everyday Sativa/Indica-style grouping, kept for familiarity and search, **not** as the
scientific category. Vocab (`CATEGORY_ORDER`): **Hemp, Sativa, Indica, Mixed,
Hybrid-Intermediate, Ruderalis, Feral**. Derived upstream by
`data/lib/category.mjs` (`normalizeCategory`). Its badge tooltip (`CATEGORY_DEF`) defines
each in plain terms and avoids the word "vernacular" in the user-facing copy.

## Known limitation / future work

- **Terpenes (Russo) — currently missing.** Russo emphasizes terpenoid profile as the real
  driver of effect; we have no terpene field (raw notes mention aromas). A future
  aroma/terpene descriptor would be more meaningful than Sativa/Indica. If added, surface
  it near chemotype, keep it inferred for landraces, and add it to `vocab.mjs`.

## Sources

- McPartland, J. M. (2018). *Cannabis Systematics at the Levels of Family, Genus, and Species.* Cannabis and Cannabinoid Research. https://www.liebertpub.com/doi/full/10.1089/can.2018.0039
- McPartland & Guy — *Models of Cannabis Taxonomy, Cultural Bias, and Conflicts between Scientific and Vernacular Names.* https://www.researchgate.net/publication/318154669
- Piomelli, D., & Russo, E. B. (2016). *The Cannabis sativa Versus Cannabis indica Debate: An Interview with Ethan Russo, MD.* https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5576603/
- Russo, E. B. (2011). *Taming THC: potential cannabis synergy and phytocannabinoid-terpenoid entourage effects.* British Journal of Pharmacology. https://bpspubs.onlinelibrary.wiley.com/doi/full/10.1111/j.1476-5381.2011.01238.x
- Clarke, R. C., & Merlin, M. D. (2013). *Cannabis: Evolution and Ethnobotany.* University of California Press.
