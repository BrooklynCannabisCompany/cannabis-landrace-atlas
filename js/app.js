// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

import { createMap, addMarkers, flyToStrain } from './map.js';
import { renderStrain, setWriteupHtml, setWriteupMissing } from './panel.js';
import { filterStrains } from './search.js';
import { renderMarkdown } from './markdown.js';

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
  renderStrain(panel, strain, { onClose: closePanel, onSubmit: openStrainSubmit });
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
    decorateWriteupSections(strain);
  } catch {
    if (reqId === currentId) setWriteupMissing(panel);
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
    btn.addEventListener('click', () => openSectionSubmit(strain, label));
    h.appendChild(btn);
  });
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
