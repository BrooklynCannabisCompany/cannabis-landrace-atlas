# Write-up generation guide

Rules for generating `data/writeups/<id>.md` files for The Cannabis Landrace Atlas.
Every generated write-up MUST follow these rules exactly. Write-ups are licensed
CC BY-SA 4.0.

## Format

- Markdown only. No raw HTML.
- The file MUST begin with this exact disclaimer line (a blockquote):

  ```
  > _AI-generated draft — unverified. Help us improve it via the button in the panel._
  ```

- Then these eight `##` section headings, in this order, every time:

  1. `## Overview`
  2. `## History`
  3. `## Description`
  4. `## Grow Information`
  5. `## Photos`
  6. `## Seed Sources`
  7. `## Forum Discussions`
  8. `## References`

## Input context per strain (disambiguation is mandatory)

Each write-up MUST be generated with the strain's **full record** supplied to the
generator, and the prose MUST be unmistakably about THAT strain in THAT location:

- Always provide and anchor on: `name`, `continent`, `country`, `region`, `type`,
  `category`, `height`, `flowering`, `climate`, and the existing `summary`.
- Many names are ambiguous or shared across regions (e.g. a "Sierra Nevada" exists in
  both Spain and Colombia; "Mérida" in Venezuela; generic "...Highland" / "Sativa
  landrace" names). The write-up must describe the population from the **stated
  country/region**, never a different same-named strain or place.
- Open the Overview by situating the strain in its country/region so the reader (and
  any reviewer) can confirm it's the right one. If the supplied name is generic, lean
  on the country/region/climate to keep it specific.
- If genuine knowledge of that specific population is thin, describe the regional
  landrace context for that exact country/region rather than borrowing facts from a
  better-known strain that merely shares a name.

## The four prose sections (Overview, History, Description, Grow Information)

- Write concise, readable prose (a short paragraph each; Description/Grow may use a
  short bullet list).
- **Use honest hedging.** Cannabis landrace provenance is rarely documented
  rigorously. Prefer "commonly reported", "grower accounts suggest", "is associated
  with", "typically". Never state contested lineage as settled fact.
- **For obscure strains** (remote feral populations, river-basin/corridor entries
  with little documented record): stay to what can be responsibly inferred from the
  region — climate, typical landrace morphology for that latitude/altitude, general
  Cannabis adaptation. Do NOT invent specific history, breeders, dates, or anecdotes.
- Base facts on the strain's known data fields (continent, country, region, type,
  height, flowering, climate) and genuine general knowledge. When unsure, say so or
  keep it general.

## The four link sections (Photos, Seed Sources, Forum Discussions, References)

- **NEVER invent URLs.** Do not write any `http://`, `https://`, or `www.` link in a
  generated write-up. Fabricated citations/links are the worst failure mode for this
  project.
- Each of these four sections contains ONLY the standard empty-slot note (italic):

  - Photos: `_No verified photos yet — use the button below to suggest one._`
  - Seed Sources: `_No verified seed sources yet — use the button below to suggest one._`
  - Forum Discussions: `_No verified forum links yet — use the button below to suggest one._`
  - References: `_No verified references yet — use the button below to suggest one._`

- These sections are filled later from real sources (the seed-bank enrichment phase
  and community submissions), not by generation.

## Validation (run after a batch)

A generated write-up is valid when:
- It begins with the disclaimer blockquote line.
- It contains all eight section headings in order.
- It contains **zero** URLs (`http`, `https`, `www`) — proves no fabricated links.
- It is the file `data/writeups/<id>.md` for an `id` that exists in `landraces.json`.
