// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

import { createMap, addMarkers, flyToStrain } from './map.js';
import { renderStrain, setWriteupHtml, setWriteupMissing } from './panel.js';
import { filterStrains } from './search.js';
import { renderMarkdown } from './markdown.js';
import { relatedStrains } from './relations.js';

const panel = document.getElementById('panel');
const input = document.getElementById('search-input');
const resultsList = document.getElementById('search-results');
const submitBtn = document.getElementById('submit-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

let strains = [];
let map = null;
let currentId = null;

// ---- Panel ----
function openPanel(strain) {
  currentId = strain.id;
  renderStrain(panel, strain, { onClose: closePanel, onSubmit: openStrainSubmit, onFacet: openFacet });
  document.body.classList.remove('panel-closed');
  document.body.classList.add('panel-open');
  setTimeout(() => map && map.invalidateSize(), 250);
  flyToStrain(map, strain);
  loadWriteup(strain);
}

function closePanel() {
  currentId = null;
  document.body.classList.remove('panel-open');
  document.body.classList.add('panel-closed');
  panel.innerHTML = '';
  setTimeout(() => map && map.invalidateSize(), 250);
}

async function loadWriteup(strain) {
  const reqId = strain.id;
  try {
    const res = await fetch(`data/writeups/${strain.id}.md`);
    if (reqId !== currentId) return; // a newer selection won
    if (!res.ok) { setWriteupMissing(panel); return; }
    const md = await res.text();
    if (reqId !== currentId) return;
    setWriteupHtml(panel, renderMarkdown(md));
    insertRelated(strain);
    fillLinkSections(strain);
    addFootnotes(strain);
    decorateWriteupSections(strain);
  } catch {
    if (reqId === currentId) { setWriteupMissing(panel); insertRelated(strain); }
  }
}

// Adds a "+" submit button beside the link-collecting write-up sections.
const ADDABLE_SECTIONS = ['Photos', 'Seed Sources', 'Forum Discussions'];
function decorateWriteupSections(strain) {
  panel.querySelectorAll('.writeup h2').forEach((h) => {
    const label = h.textContent.trim();
    if (!ADDABLE_SECTIONS.includes(label)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'add-link';
    btn.textContent = '+';
    btn.title = `Suggest ${label}`;
    btn.setAttribute('aria-label', `Suggest ${label} for ${strain.name}`);
    h.appendChild(btn);
    btn.addEventListener('click', () => openSectionSubmit(strain, label));
  });
}

// Adds the matched vendor page to the References list and a "sources" footnote
// marker at the end of each prose section that jumps to the References.
// Honest by design: the marker attributes a section to the real reference set,
// not each sentence (which would be fabricated precision for AI-drafted prose).
function headText(h) { return (h.firstChild ? h.firstChild.textContent : h.textContent).trim(); }

function addFootnotes(strain) {
  const writeup = panel.querySelector('.writeup');
  if (!writeup) return;
  const heads = [...writeup.querySelectorAll('h2')];
  const refH = heads.find((h) => headText(h) === 'References');

  // Add the strain's seed-vendor page(s) as numbered references.
  if (refH && strain.seedSources && strain.seedSources.length) {
    let ul = refH.nextElementSibling;
    while (ul && ul.tagName !== 'UL' && ul.tagName !== 'H2') ul = ul.nextElementSibling;
    if (ul && ul.tagName === 'UL') {
      for (const s of strain.seedSources) {
        const li = document.createElement('li');
        li.appendChild(document.createTextNode('Seed-bank listing — '));
        const a = document.createElement('a');
        a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = `${s.vendor}: ${s.product}`;
        li.appendChild(a);
        ul.appendChild(li);
      }
    }
  }

  // Footnote marker at the end of each prose section.
  for (const label of ['Overview', 'History', 'Description']) {
    const h = heads.find((x) => headText(x) === label);
    if (!h) continue;
    let last = null, el = h.nextElementSibling;
    while (el && el.tagName !== 'H2') { last = el; el = el.nextElementSibling; }
    if (!last) continue;
    const sup = document.createElement('sup');
    sup.className = 'fnref';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'sources';
    btn.title = 'Sources informing this section';
    btn.addEventListener('click', () => {
      if (!refH) return;
      refH.scrollIntoView({ behavior: 'smooth', block: 'center' });
      refH.classList.add('ref-flash');
      setTimeout(() => refH.classList.remove('ref-flash'), 1200);
    });
    sup.appendChild(btn);
    last.appendChild(document.createTextNode(' '));
    last.appendChild(sup);
  }
}

// Replaces a section's empty-slot note with real vendor/forum/photo links when present.
const SECTION_DATA = {
  'Photos': (s) => (s.photos || []).map((url) => ({ img: url })),
  'Seed Sources': (s) => (s.seedSources || []).map((x) => ({ label: `${x.vendor} — ${x.product}`, url: x.url })),
  'Forum Discussions': (s) => (s.forums || []).map((x) => ({ label: x.label, url: x.url }))
};
function fillLinkSections(strain) {
  panel.querySelectorAll('.writeup h2').forEach((h) => {
    const label = (h.firstChild ? h.firstChild.textContent : h.textContent).trim();
    const getter = SECTION_DATA[label];
    if (!getter) return;
    const items = getter(strain);
    if (!items.length) return;
    const note = h.nextElementSibling;
    if (!note || note.tagName !== 'P') return;
    const wrap = document.createElement('p');
    wrap.className = 'section-links';
    items.forEach((it, i) => {
      const a = document.createElement('a');
      a.href = it.img || it.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (it.img) {
        const im = document.createElement('img');
        im.src = it.img; im.alt = strain.name; im.className = 'section-photo';
        a.appendChild(im);
        wrap.appendChild(a);
      } else {
        if (i > 0) wrap.appendChild(document.createTextNode(' · '));
        a.textContent = it.label;
        wrap.appendChild(a);
      }
    });
    note.replaceWith(wrap);
  });
}

// Inserts "Nearby / Regional / Similar Varieties" exploration links right after
// the Grow Information section (i.e. before the Photos heading, or at the end).
function insertRelated(strain) {
  const writeup = panel.querySelector('.writeup');
  if (!writeup) return;
  const { nearby, regional, similar } = relatedStrains(strain, strains);
  const groups = [
    ['Nearby Varieties', nearby],
    ['Regional Varieties', regional],
    ['Similar Varieties', similar]
  ].filter(([, list]) => list.length);
  if (!groups.length) return;

  const frag = document.createDocumentFragment();
  for (const [label, list] of groups) {
    const h = document.createElement('h2');
    h.textContent = label;
    const p = document.createElement('p');
    p.className = 'related-list';
    list.forEach((s, i) => {
      if (i > 0) p.appendChild(document.createTextNode(', '));
      const a = document.createElement('button');
      a.type = 'button';
      a.className = 'related-link';
      a.textContent = s.name;
      a.addEventListener('click', () => openPanel(s));
      p.appendChild(a);
    });
    frag.append(h, p);
  }

  const photos = [...writeup.querySelectorAll('h2')].find((h) => h.textContent.trim() === 'Photos');
  if (photos) writeup.insertBefore(frag, photos);
  else writeup.appendChild(frag);
}

// ---- Facet filter list ----
function openFacet(field, token) {
  const t = token.toLowerCase();
  const matches = strains.filter((s) => String(s[field] || '').toLowerCase().includes(t));
  openListModal(`${token} — ${matches.length} ${matches.length === 1 ? 'variety' : 'varieties'}`, matches);
}

function openListModal(title, list) {
  modalTitle.textContent = title;
  modalBody.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'modal-list';
  for (const s of list) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'modal-list-link';
    const place = [s.region, s.country].filter(Boolean).join(', ');
    btn.innerHTML = '<span class="r-name"></span><span class="r-place"></span>';
    btn.querySelector('.r-name').textContent = s.name;
    btn.querySelector('.r-place').textContent = place;
    btn.addEventListener('click', () => { closeModal(); openPanel(s); });
    li.appendChild(btn);
    ul.appendChild(li);
  }
  modalBody.appendChild(ul);
  modal.hidden = false;
}

// ---- Search ----
function showResults(items) {
  resultsList.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'search-empty';
    li.textContent = 'No matches';
    resultsList.appendChild(li);
    resultsList.hidden = false;
    return;
  }
  for (const s of items) {
    const li = document.createElement('li');
    li.className = 'search-result';
    li.setAttribute('role', 'option');
    li.tabIndex = 0;
    const nameSpan = document.createElement('span');
    nameSpan.className = 'r-name';
    nameSpan.textContent = s.name;
    const placeSpan = document.createElement('span');
    placeSpan.className = 'r-place';
    placeSpan.textContent = [s.region, s.country].filter(Boolean).join(', ');
    li.append(nameSpan, placeSpan);
    const select = () => selectStrain(s);
    li.addEventListener('click', select);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter') select(); });
    resultsList.appendChild(li);
  }
  resultsList.hidden = false;
}

function hideResults() { resultsList.hidden = true; }

function selectStrain(s) {
  input.value = s.name;
  hideResults();
  openPanel(s);
}

input.addEventListener('input', () => showResults(filterStrains(input.value, strains)));
input.addEventListener('focus', () => { if (input.value.trim()) showResults(filterStrains(input.value, strains)); });

// ---- Submit modal (placeholder; no network) ----
function openModal(title, body) {
  modalTitle.textContent = title;
  modalBody.textContent = body;
  modal.hidden = false;
}
function closeModal() { modal.hidden = true; }

function openFeedbackSubmit() {
  openModal(
    'Contribute',
    'Feature requests, bug reports, and strain additions will open a pre-filled GitHub issue once The Cannabis Landrace Atlas has a public repository. For now nothing is sent — thank you for your interest.'
  );
}
function openStrainSubmit(strain) {
  openModal(
    'Suggest Corrections',
    `Corrections for "${strain.name}" will open a pre-filled GitHub issue once the project has a public repository. For now nothing is sent.`
  );
}
function openSectionSubmit(strain, section) {
  openModal(
    `Add ${section}`,
    `Submitting ${section.toLowerCase()} for "${strain.name}" will open a pre-filled GitHub issue once the project has a public repository. For now nothing is sent — thank you for your interest.`
  );
}

submitBtn.addEventListener('click', openFeedbackSubmit);
modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeModal(); });

// ---- Global keys / outside click ----
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!modal.hidden) closeModal();
  else if (!resultsList.hidden) hideResults();
  else if (document.body.classList.contains('panel-open')) closePanel();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search')) hideResults();
});

// ---- Boot ----
async function boot() {
  try {
    const [data, world] = await Promise.all([
      fetch('data/landraces.json').then((r) => { if (!r.ok) throw new Error('data'); return r.json(); }),
      fetch('data/world.geojson').then((r) => { if (!r.ok) throw new Error('geo'); return r.json(); })
    ]);
    strains = data;
    map = createMap('map', world);
    addMarkers(map, strains, openPanel);
  } catch (err) {
    document.getElementById('map').innerHTML = '<div class="map-error">Unable to load map data.</div>';
    console.error('The Cannabis Landrace Atlas failed to load:', err);
  }
}

boot();
