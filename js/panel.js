// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Panel module: renders a strain's facts + write-up into the side panel DOM.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Spells out a flowering value's "w" as " weeks" (e.g. "7–9w" -> "7–9 weeks").
function weeksLabel(value) {
  return String(value || '').replace(/(\d)\s*w\b/g, '$1 weeks');
}

function traitRow(dl, label, value) {
  if (!value) return;
  dl.appendChild(el('dt', null, label));
  dl.appendChild(el('dd', null, value));
}

// A fact row whose value is clickable. Splits on "/" so each part (e.g.
// "Middle East" / "Central Asia") is its own clickable filter chip.
function facetRow(dl, label, field, value, onFacet, title, facetToken) {
  if (!value) return;
  dl.appendChild(el('dt', null, label));
  const dd = el('dd', null);
  if (title && title !== value) dd.setAttribute('data-tip', title); // fast custom tooltip
  if (facetToken) {
    // Single chip with an explicit facet token (e.g. Type displays the descriptor
    // but filters by normalized category).
    const chip = el('button', 'facet', String(value).trim());
    chip.type = 'button';
    chip.setAttribute('aria-label', `Show varieties with ${label.toLowerCase()} ${facetToken}`);
    if (onFacet) chip.addEventListener('click', () => onFacet(field, facetToken));
    dd.appendChild(chip);
  } else {
    const parts = String(value).split('/').map((p) => p.trim()).filter(Boolean);
    parts.forEach((part, i) => {
      if (i > 0) dd.appendChild(document.createTextNode(' / '));
      const chip = el('button', 'facet', part);
      chip.type = 'button';
      chip.setAttribute('aria-label', `Show varieties with ${label.toLowerCase()} ${part}`);
      if (onFacet) chip.addEventListener('click', () => onFacet(field, part));
      dd.appendChild(chip);
    });
  }
  dl.appendChild(dd);
}

// Tooltip definitions for the botanical classifications.
const MORPHOTYPE_DEF = {
  'Narrow-Leaf Drug': 'Historically called "Sativa." From hot, humid regions (India, Africa, Central America). Tall, long flowering cycles, thin narrow leaflets.',
  'Broad-Leaf Drug': 'Historically called "Indica." From cooler, mountainous regions (Afghanistan, Pakistan). Short and bushy, matures quickly, wide leaflets.',
  'Narrow-Leaf Hemp': 'Traditional industrial hemp (Europe/Asia) grown for fiber and seed. Very tall, narrow leaves, almost no THC.',
  'Broad-Leaf Hemp': 'Eastern-Asian broad-leaf hemp, used for fiber and seed rather than intoxicating effect.',
  'Ruderalis (wild-type)': 'Short, auto-flowering wild cannabis (Eastern Europe/Russia). Low THC, aggressively cold-adapted; a feral/wild morphotype.',
  'Intermediate (NLD–BLD)': 'Intermediate between narrow-leaf and broad-leaf drug types.',
  'Unclassified': 'Leaf/biotype not determinable from the available records.'
};
// Vernacular (common-usage) type definitions for the second badge — the seven Index
// categories. Written to match the MORPHOTYPE_DEF tone.
const CATEGORY_DEF = {
  Hemp: 'Low-THC cannabis grown for fiber, seed, or CBD. Not an intoxicant; the common grouping for industrial and food crops rather than drug-type plants.',
  Sativa: 'A tall, late-flowering drug plant with thin, narrow leaflets, loosely tied to hot, humid regions. Roughly matches the "Narrow-Leaf Drug" type.',
  Indica: 'A short, bushy, fast-maturing drug plant with wide leaflets, loosely tied to cool mountain regions. Roughly matches the "Broad-Leaf Drug" type.',
  Mixed: 'A population showing a blend of types with no single dominant form. Plants vary across sativa-like and indica-like traits rather than one consistent look.',
  'Hybrid-Intermediate': 'A population sitting between sativa and indica, mixing traits of both. Neither clearly narrow-leaf nor broad-leaf, but somewhere in the middle.',
  Ruderalis: 'Short, auto-flowering wild cannabis (Eastern Europe/Russia). Low THC, aggressively cold-adapted; a feral/wild morphotype.',
  Feral: 'Naturalized cannabis growing wild outside cultivation. Escaped or abandoned populations now reproducing on their own, often reverting toward weedy wild traits.'
};
const CHEMOTYPE_DEF = {
  I: 'Type I — THC-dominant (THC ≫ CBD). High psychoactivity; intoxicating, euphoric, or relaxing depending on terpenes.',
  II: 'Type II — Balanced ~1:1 THC:CBD. Mild psychoactivity; high therapeutic value with reduced impairment.',
  III: 'Type III — CBD-dominant (CBD ≫ THC). Non-intoxicating; clear-headed, anti-inflammatory.',
  IV: 'Type IV — CBG-dominant. Non-intoxicating; studied for neuroprotective and gastrointestinal benefits.',
  V: 'Type V — Cannabinoid-free. Primarily industrial hemp bred for fiber or seed.'
};
const DOMESTICATION_DEF = {
  Domesticated: 'A cultivated landrace — maintained and selected by growers in its home region.',
  Heirloom: 'A long-cultivated heritage variety, often acclimatized to a new region and passed down through generations.',
  'Feral (escaped)': 'Escaped from cultivation and now self-seeding in the wild, reverting toward wild-type traits.',
  Wild: 'A naturally wild population, never domesticated (McPartland\'s subsp. spontanea / wild-type).'
};

// Renders `strain` into `container`. handlers: { onClose, onSubmit, onFacet }.
export function renderStrain(container, strain, handlers = {}) {
  const { onClose, onSubmit, onFacet } = handlers;
  container.innerHTML = '';

  const closeBtn = el('button', 'panel-close', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close panel');
  if (onClose) closeBtn.addEventListener('click', onClose);
  container.appendChild(closeBtn);

  // Subtitle: region + country, but never echo the country if the region already names it.
  const place = (strain.region && strain.country &&
    strain.region.toLowerCase().includes(strain.country.toLowerCase()))
    ? strain.region
    : [strain.region, strain.country].filter(Boolean).join(', ');
  container.appendChild(el('h2', 'panel-name', strain.name));
  if (place) container.appendChild(el('p', 'panel-place', place));

  // Classification badges: morphotype (primary) + vernacular type (one of the seven
  // Index categories). Both are clickable facets.
  if (strain.morphotype || strain.category) {
    const badges = el('div', 'panel-badges');
    if (strain.morphotype) {
      const badge = el('button', 'panel-badge facet-badge', strain.morphotype);
      badge.type = 'button';
      if (MORPHOTYPE_DEF[strain.morphotype]) badge.setAttribute('data-tip', MORPHOTYPE_DEF[strain.morphotype]);
      if (onFacet) badge.addEventListener('click', () => onFacet('morphotype', strain.morphotype));
      badges.appendChild(badge);
    }
    if (strain.category) {
      const tb = el('button', 'panel-badge facet-badge type-badge', strain.category);
      tb.type = 'button';
      tb.setAttribute('data-tip',
        CATEGORY_DEF[strain.category] || 'Vernacular type — the common Sativa/Indica-style grouping.');
      if (onFacet) tb.addEventListener('click', () => onFacet('category', strain.category));
      badges.appendChild(tb);
    }
    container.appendChild(badges);
  }

  // Facts ordered to match the Index facets (Region, Climate, Morphotype[badge above],
  // Chemotype, Domestication, Type, Height, Flowering Time).
  const dl = el('dl', 'panel-traits');
  if (Array.isArray(strain.aka) && strain.aka.length) traitRow(dl, 'AKA', strain.aka.join(', '));
  facetRow(dl, 'Region', 'continent', strain.continent, onFacet);
  facetRow(dl, 'Climate', 'climate', strain.climate, onFacet);
  if (strain.chemotype) {
    facetRow(dl, 'Chemotype', 'chemotype', `Type ${strain.chemotype} (inferred)`, onFacet,
      CHEMOTYPE_DEF[strain.chemotype], strain.chemotype);
  }
  facetRow(dl, 'Domestication', 'domestication', strain.domestication, onFacet,
    DOMESTICATION_DEF[strain.domestication], strain.domestication);
  facetRow(dl, 'Type (vernacular)', 'category', strain.type, onFacet, null, strain.category);
  facetRow(dl, 'Height', 'height', strain.height, onFacet);
  facetRow(dl, 'Flowering Time', 'flowering', weeksLabel(strain.flowering), onFacet, null, strain.flowering);
  if (dl.children.length) container.appendChild(dl);

  if (strain.coordsApproximate) {
    container.appendChild(el('p', 'panel-note', 'Location is approximate.'));
  }

  // Write-up container — filled later via setWriteupHtml / setWriteupMissing.
  const writeup = el('section', 'writeup');
  writeup.appendChild(el('p', 'writeup-status', 'Loading write-up…'));
  container.appendChild(writeup);

  // Structured enrichment links (usually empty for now).
  if (Array.isArray(strain.links) && strain.links.length) {
    const linksWrap = el('section', 'panel-links');
    linksWrap.appendChild(el('h3', 'panel-links-title', 'References & links'));
    for (const link of strain.links) {
      if (link.embed) {
        const fig = el('figure', 'panel-embed');
        const frame = document.createElement('iframe');
        frame.src = link.url; frame.loading = 'lazy';
        frame.title = link.label || link.url;
        const fallback = el('figcaption', 'panel-embed-fallback');
        const fa = el('a', null, link.label || 'Open source');
        fa.href = link.url; fa.target = '_blank'; fa.rel = 'noopener noreferrer';
        fallback.append('Embedded view unavailable — ', fa, ' (opens on the source site).');
        frame.addEventListener('error', () => frame.replaceWith(fallback));
        fig.append(frame, el('figcaption', 'panel-embed-cap', link.label || ''));
        linksWrap.appendChild(fig);
      } else {
        const p = el('p', 'panel-link');
        const a = el('a', null, link.label || link.url);
        a.href = link.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        p.appendChild(a);
        linksWrap.appendChild(p);
      }
    }
    container.appendChild(linksWrap);
  }

  // Bottom submit button (placeholder behavior wired by app.js).
  const submit = el('button', 'panel-submit', 'Suggest Corrections');
  submit.type = 'button';
  if (onSubmit) submit.addEventListener('click', () => onSubmit(strain));
  container.appendChild(submit);
}

// Fills the write-up container with rendered HTML (trusted first-party markdown).
export function setWriteupHtml(container, html) {
  const writeup = container.querySelector('.writeup');
  if (writeup) writeup.innerHTML = html;
}

// Shows the "pending" state when no write-up file exists for a strain.
export function setWriteupMissing(container) {
  const writeup = container.querySelector('.writeup');
  if (!writeup) return;
  writeup.innerHTML = '';
  writeup.appendChild(el('p', 'writeup-status writeup-pending', 'Write-up pending.'));
}
