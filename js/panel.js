// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Panel module: renders a strain's facts + write-up into the side panel DOM.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
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
  if (title && title !== value) dd.title = title; // preserve the original detail on hover
  if (facetToken) {
    // Single chip with an explicit facet token (e.g. Type displays the descriptor
    // but filters by normalized category).
    const chip = el('button', 'facet', value);
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

  if (strain.category) container.appendChild(el('span', 'panel-badge', strain.category));

  const dl = el('dl', 'panel-traits');
  if (Array.isArray(strain.aka) && strain.aka.length) traitRow(dl, 'AKA', strain.aka.join(', '));
  facetRow(dl, 'Type', 'category', strain.type, onFacet, null, strain.category);
  facetRow(dl, 'Height', 'height', strain.height, onFacet);
  traitRow(dl, 'Flowering', strain.flowering);
  facetRow(dl, 'Climate', 'climate', strain.climate, onFacet, strain.climateFull);
  facetRow(dl, 'Region', 'continent', strain.continent, onFacet);
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
