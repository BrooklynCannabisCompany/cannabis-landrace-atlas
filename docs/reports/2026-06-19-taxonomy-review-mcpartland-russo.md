# Taxonomy review — our displayed classification vs McPartland & Russo

**Date:** 2026-06-19 · **Status:** Review/report (no code changes). Informs tasks #22 (category), #23 (morphotype), #24 (chemotype).

This checks the taxonomic information The Cannabis Landrace Atlas displays against the
published positions of **Dr. John M. McPartland** (cannabis systematics) and
**Dr. Ethan B. Russo** (chemotaxonomy / entourage). It lists where we diverge and
suggests reconciliations.

## What we currently display
- **Category badge** (oval): Sativa, Indica, Ruderalis, Hybrid-Intermediate, Hemp, Feral, Mixed.
- **Planned Morphotype (#23):** NLD / BLD / NLH / BLH / Ruderalis.
- **Planned Chemotype (#24):** Types I–V (THC / balanced / CBD / CBG / cannabinoid-free).

## Divergences & suggestions

**1. "Sativa / Indica" is vernacular and contested — don't lead with it.**
McPartland (2018) documents that the vernacular "Indica" (broad-leaf Afghan drug
plants) is essentially *inverted* relative to formal botany, and reassigns those
plants to Vavilov's taxon (*C. afghanica* / *C. sativa* var. *afghanica*). Russo is
blunter: the sativa/indica distinction "as commonly applied… is total nonsense," and
only biochemical/pharmacological differences are meaningful.
→ **Suggestion:** Make **Morphotype (NLD/BLD/NLH/BLH)** the primary, botanically
defensible classification, and present "Sativa/Indica" explicitly as *vernacular*
(historical/common) labels with a caveat tooltip — not as the scientific category.
This is exactly the morphotype framework in #23, so we're already heading the right way.

**2. Our single `category` conflates three independent axes.** McPartland separates
(a) **biotype/morphotype** (leaf shape + use: NLD/BLD/NLH/BLH), (b) **domestication
status** (domesticated / feral-escaped / wild), and (c) **chemotype**. Our `category`
mixes leaf-type (Sativa/Indica/Hemp), domestication ("Feral"), and uncertainty ("Mixed").
→ **Suggestion:** Split into orthogonal fields: morphotype (#23), chemotype (#24), and
a **domestication-status** field (domesticated / heirloom / feral / wild). Retire
**"Feral"** and **"Mixed"** as peers of Sativa/Indica: "Feral" becomes a *status*;
"Mixed" becomes "Intermediate/Unclassified" or is resolved into a morphotype.

**3. Ruderalis — we're aligned.** McPartland treats vernacular "ruderalis" (CBD≈THC,
wild-type morphology, early/auto-flowering) as **feral/wild** *C. sativa* (subsp.
*spontanea*), not a species. Our plan (Ruderalis as a feral/wild morphotype) matches.
→ **Suggestion:** Keep ruderalis as the *wild-type biotype/status*, not a drug-type peer.

**4. NLH / BLH hemp split — aligned.** The narrow- vs broad-leaf hemp distinction
follows Clarke & Merlin (2013) and McPartland. Minor: McPartland uses "putative
ancestor" (NLHA/BLHA) for *wild* hemp; for our cultivated-hemp entries NLH/BLH is fine.

**5. Chemotypes I–V — aligned, and Russo would foreground them.** Our I–V definitions
match the standard chemotype framework (de Meijer/Small, popularized by Russo). Russo's
core position is that **chemotype + terpenoid profile** (the entourage effect), not
sativa/indica, determines effects.
→ **Suggestion:** Foreground chemotype as the functionally meaningful axis, keeping our
honest caveat that for landraces it is **inferred (no assays)**. Our "effects depend on
terpenes" note for Type I is consistent with Russo.

**6. Terpenes (Russo) — currently missing.** Russo emphasizes terpenoid profile as the
real driver of effect. We have none (though raw notes mention aromas).
→ **Suggestion (future):** add an aroma/terpene descriptor field; it's more meaningful
to Russo's framework than Sativa/Indica.

**7. Species nomenclature.** We wisely avoid hard species claims. If we ever add
scientific names, follow McPartland's pragmatic single-species treatment
(*C. sativa* with subspecies/biotypes) rather than asserting *sativa* vs *indica* species.

## Recommended path for #22/#23/#24
1. Implement **Morphotype (#23)** as the primary classification; relabel Sativa/Indica
   as *vernacular* with a caveat.
2. Add a **domestication-status** axis (domesticated/heirloom/feral/wild); retire
   "Feral"/"Mixed" as type peers (#22 category refinement).
3. Implement **Chemotype (#24)** foregrounded and clearly flagged as inferred.
4. (Later) add terpene/aroma descriptors per Russo.

## Sources
- McPartland, J. M. (2018). *Cannabis Systematics at the Levels of Family, Genus, and Species.* Cannabis and Cannabinoid Research. https://www.liebertpub.com/doi/full/10.1089/can.2018.0039
- McPartland & Guy — *Models of Cannabis Taxonomy, Cultural Bias, and Conflicts between Scientific and Vernacular Names.* https://www.researchgate.net/publication/318154669
- Piomelli, D., & Russo, E. B. (2016). *The Cannabis sativa Versus Cannabis indica Debate: An Interview with Ethan Russo, MD.* Cannabis and Cannabinoid Research. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5576603/
- Russo, E. B. (2011). *Taming THC: potential cannabis synergy and phytocannabinoid-terpenoid entourage effects.* British Journal of Pharmacology. https://bpspubs.onlinelibrary.wiley.com/doi/full/10.1111/j.1476-5381.2011.01238.x
- Clarke, R. C., & Merlin, M. D. (2013). *Cannabis: Evolution and Ethnobotany.* University of California Press.
