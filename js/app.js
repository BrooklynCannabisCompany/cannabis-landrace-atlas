// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

import { createMap, addMarkers, flyToStrain, setMarkerSelected } from './map.js';
import { renderStrain, setWriteupHtml, setWriteupMissing } from './panel.js';
import { filterStrains } from './search.js';
import { renderMarkdown } from './markdown.js';
import { relatedStrains } from './relations.js';
import { initTooltips } from './tooltip.js';
import { CONTINENTS, CLIMATES, MORPHOTYPES, CHEMOTYPES, DOMESTICATIONS, CATEGORY_ORDER, HEIGHTS } from '../data/lib/vocab.mjs';
import { modal, openContentModal, closeModal } from './modal.js';
import { openFeedbackSubmit, openContactForm, openStrainSubmit, openSectionSubmit, isValidUrl, repoLink } from './forms.js';

const panel = document.getElementById('panel');
const input = document.getElementById('search-input');
const resultsList = document.getElementById('search-results');
const submitBtn = document.getElementById('submit-btn');
const menuBtn = document.getElementById('menu-btn');
const appMenu = document.getElementById('app-menu');
const indexBtn = document.getElementById('index-btn');
const contactBtn = document.getElementById('contact-btn');

let strains = [];
let map = null;
let markersById = new Map();
let currentId = null;

// ---- Panel ----
function openPanel(strain) {
  if (currentId) setMarkerSelected(markersById.get(currentId), false); // clear previous highlight
  currentId = strain.id;
  setMarkerSelected(markersById.get(strain.id), true);
  input.value = ''; // clear the search box whenever a variety is selected (map/index/links)
  hideResults();
  renderStrain(panel, strain, { onClose: closePanel, onSubmit: openStrainSubmit, onFacet: openFacet });
  document.body.classList.remove('panel-closed');
  document.body.classList.add('panel-open');
  setTimeout(() => map && map.invalidateSize(), 250);
  flyToStrain(map, strain);
  loadWriteup(strain);
}

function closePanel() {
  if (currentId) setMarkerSelected(markersById.get(currentId), false);
  currentId = null;
  document.body.classList.remove('panel-open');
  document.body.classList.add('panel-closed');
  panel.innerHTML = '';
  setTimeout(() => map && map.invalidateSize(), 250);
}

const writeupCache = new Map(); // strain id -> rendered (pre-decoration) HTML

function decorateWriteup(strain) {
  wireDisclaimer(strain);
  insertRelated(strain);
  fillLinkSections(strain);
  addFootnotes(strain);
  decorateWriteupSections(strain);
}

async function loadWriteup(strain) {
  const reqId = strain.id;
  if (writeupCache.has(reqId)) { // instant on re-selection
    setWriteupHtml(panel, writeupCache.get(reqId));
    decorateWriteup(strain);
    return;
  }
  try {
    const res = await fetch(`data/writeups/${strain.id}.md`);
    if (reqId !== currentId) return; // a newer selection won
    if (!res.ok) { setWriteupMissing(panel); return; }
    const md = await res.text();
    if (reqId !== currentId) return;
    const html = renderMarkdown(md);
    writeupCache.set(reqId, html);
    setWriteupHtml(panel, html);
    decorateWriteup(strain);
  } catch {
    if (reqId === currentId) { setWriteupMissing(panel); insertRelated(strain); }
  }
}

// Wires the disclaimer's "Help us improve it." link to the Suggest Corrections flow.
function wireDisclaimer(strain) {
  const link = panel.querySelector('.writeup a[href="#suggest"]');
  if (!link) return;
  link.addEventListener('click', (e) => { e.preventDefault(); openStrainSubmit(strain); });
}

// Adds a "+" submit button beside the link-collecting write-up sections.
const ADDABLE_SECTIONS = ['Photos', 'Seed Sources', 'Forum Discussions', 'References'];
function decorateWriteupSections(strain) {
  panel.querySelectorAll('.writeup h2').forEach((h) => {
    const label = headText(h);
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

function headText(h) { return (h.firstChild ? h.firstChild.textContent : h.textContent).trim(); }

// Adds a "source" footnote marker after each prose section — but ONLY when the strain
// has a real, citable source (its matched seed-vendor listing). The marker jumps to the
// strain's Sources section. General foundational background lives on the global
// References screen (hamburger), so unsourced prose gets no marker.
function addFootnotes(strain) {
  if (!strain.seedSources || !strain.seedSources.length) return;
  const writeup = panel.querySelector('.writeup');
  if (!writeup) return;
  const heads = [...writeup.querySelectorAll('h2')];
  const srcH = heads.find((h) => headText(h) === 'References');
  if (!srcH) return;

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
    btn.textContent = 'source';
    btn.title = 'Source for this variety';
    btn.addEventListener('click', () => {
      srcH.scrollIntoView({ behavior: 'smooth', block: 'center' });
      srcH.classList.add('ref-flash');
      setTimeout(() => srcH.classList.remove('ref-flash'), 1200);
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
  'Forum Discussions': (s) => (s.forums || []).map((x) => ({ label: x.label, url: x.url })),
  // References uses its own `references` field when present; otherwise falls back to the
  // matched seed-vendor listing, which is the citable source the "source" footnotes point to.
  'References': (s) => (Array.isArray(s.references) && s.references.length
    ? s.references.map((x) => ({ label: x.label || x.url, url: x.url }))
    : (s.seedSources || []).map((x) => ({ label: `${x.vendor} — ${x.product}`, url: x.url })))
};
function fillLinkSections(strain) {
  panel.querySelectorAll('.writeup h2').forEach((h) => {
    const label = headText(h);
    const getter = SECTION_DATA[label];
    if (!getter) return;
    const items = getter(strain);
    if (!items.length) return;
    const note = h.nextElementSibling;
    if (!note || note.tagName !== 'P') return;
    const wrap = document.createElement('p');
    wrap.className = 'section-links';
    let rendered = 0;
    items.forEach((it) => {
      const url = it.img || it.url;
      if (!isValidUrl(url)) return; // never render non-http(s) URLs from the dataset
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (it.img) {
        const im = document.createElement('img');
        im.src = url; im.alt = strain.name; im.className = 'section-photo';
        im.loading = 'lazy';
        a.appendChild(im);
        wrap.appendChild(a);
      } else {
        if (rendered > 0) wrap.appendChild(document.createTextNode(' · '));
        a.textContent = it.label;
        wrap.appendChild(a);
      }
      rendered += 1;
    });
    if (rendered) note.replaceWith(wrap); // keep the empty-slot note if nothing valid
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
      // Wrap link + its trailing comma in a nowrap span so the comma can never wrap
      // to the start of the next line; the space between items is the break point.
      const item = document.createElement('span');
      item.className = 'related-item';
      const a = document.createElement('button');
      a.type = 'button';
      a.className = 'related-link';
      a.textContent = s.name;
      a.addEventListener('click', () => openPanel(s));
      item.appendChild(a);
      if (i < list.length - 1) item.appendChild(document.createTextNode(','));
      p.appendChild(item);
      if (i < list.length - 1) p.appendChild(document.createTextNode(' '));
    });
    frag.append(h, p);
  }

  const photos = [...writeup.querySelectorAll('h2')].find((h) => headText(h) === 'Photos');
  if (photos) writeup.insertBefore(frag, photos);
  else writeup.appendChild(frag);
}

// ---- Facet filter list ----
const EXACT_FACET_FIELDS = ['category', 'morphotype', 'chemotype', 'domestication'];
function openFacet(field, token) {
  let matches;
  if (EXACT_FACET_FIELDS.includes(field)) {
    matches = strains.filter((s) => s[field] === token);
  } else {
    const t = token.toLowerCase();
    matches = strains.filter((s) => String(s[field] || '').toLowerCase().includes(t));
  }
  const title = field === 'chemotype' ? `Chemotype ${token}` : token;
  openListModal(`${title} — ${matches.length} ${matches.length === 1 ? 'variety' : 'varieties'}`, matches);
}

function openListModal(title, list) {
  openContentModal(title, (body) => {
    const ul = document.createElement('ul');
    ul.className = 'modal-list';
    for (const s of list) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal-list-link';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'r-name'; nameSpan.textContent = s.name;
      const placeSpan = document.createElement('span');
      placeSpan.className = 'r-place'; placeSpan.textContent = [s.region, s.country].filter(Boolean).join(', ');
      btn.append(nameSpan, placeSpan);
      btn.addEventListener('click', () => { closeModal(); openPanel(s); });
      li.appendChild(btn);
      ul.appendChild(li);
    }
    body.appendChild(ul);
  });
}

// ---- Search ----
let resultEls = [];   // current result <li>s, for keyboard navigation
let activeIndex = -1; // highlighted result (aria-activedescendant), -1 = none

function renderSearch(query) {
  showResults(matchHeadings(query), filterStrains(query, strains));
}

function setActiveResult(i) {
  if (activeIndex >= 0 && resultEls[activeIndex]) {
    resultEls[activeIndex].classList.remove('active');
    resultEls[activeIndex].setAttribute('aria-selected', 'false');
  }
  activeIndex = i;
  const el = resultEls[i];
  if (el) {
    el.classList.add('active');
    el.setAttribute('aria-selected', 'true');
    el.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', el.id);
  } else {
    input.removeAttribute('aria-activedescendant');
  }
}

function showResults(headings, items) {
  resultsList.innerHTML = '';
  if (!headings.length && !items.length) {
    const li = document.createElement('li');
    li.className = 'search-empty';
    li.textContent = 'No matches';
    resultsList.appendChild(li);
    resultEls = []; activeIndex = -1;
    input.setAttribute('aria-expanded', 'true');
    input.removeAttribute('aria-activedescendant');
    resultsList.hidden = false;
    return;
  }
  for (const h of headings) {
    const li = document.createElement('li');
    li.className = 'search-result search-heading';
    li.setAttribute('role', 'option');
    li.tabIndex = 0;
    li.textContent = h.value ? `Index › ${h.facet} › ${h.value}` : `Index › ${h.facet}`;
    const go = () => { hideResults(); openIndex({ facet: h.facet, value: h.value }); };
    li.addEventListener('click', go);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    resultsList.appendChild(li);
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
  resultEls = [...resultsList.querySelectorAll('.search-result')];
  resultEls.forEach((el, i) => { el.id = `sr-${i}`; el.setAttribute('aria-selected', 'false'); });
  activeIndex = -1;
  input.setAttribute('aria-expanded', 'true');
  input.removeAttribute('aria-activedescendant');
  resultsList.hidden = false;
}

function hideResults() {
  resultsList.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  resultEls = []; activeIndex = -1;
}

function selectStrain(s) {
  hideResults();
  openPanel(s); // openPanel clears the search box
}

input.addEventListener('input', () => renderSearch(input.value));
input.addEventListener('focus', () => { if (input.value.trim()) renderSearch(input.value); });
// Keyboard: ↓/↑ move the highlight, Enter selects the highlight (or jumps to an exact
// Index heading / the top strain), Escape closes the list.
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (resultsList.hidden && input.value.trim()) renderSearch(input.value);
    if (!resultEls.length) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown'
      ? Math.min(activeIndex + 1, resultEls.length - 1)
      : Math.max(activeIndex - 1, 0);
    setActiveResult(next);
    return;
  }
  if (e.key === 'Escape') { if (!resultsList.hidden) { e.stopPropagation(); hideResults(); } return; }
  if (e.key !== 'Enter') return;
  if (activeIndex >= 0 && resultEls[activeIndex]) { e.preventDefault(); resultEls[activeIndex].click(); return; }
  const q = input.value.trim();
  if (!q) return;
  const exact = matchHeadings(q).find((h) => h.text.toLowerCase() === q.toLowerCase());
  if (exact) { hideResults(); openIndex({ facet: exact.facet, value: exact.value }); return; }
  const sm = filterStrains(q, strains);
  if (sm.length) selectStrain(sm[0]);
});


submitBtn.addEventListener('click', openFeedbackSubmit);
contactBtn.addEventListener('click', openContactForm);
indexBtn.addEventListener('click', () => openIndex());

// ---- Hamburger menu ----
function toggleMenu(force) {
  const show = force !== undefined ? force : appMenu.hidden;
  appMenu.hidden = !show;
  menuBtn.setAttribute('aria-expanded', String(show));
}
menuBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
appMenu.addEventListener('click', (e) => {
  const item = e.target.closest('.app-menu-item');
  if (!item) return;
  toggleMenu(false);
  ({ about: openAbout, index: openIndex, database: openDatabase, references: openReferences, license: openLicense }[item.dataset.menu] || (() => {}))();
});


function openDatabase() {
  openContentModal('Database', (body) => {
    const note = document.createElement('p');
    note.className = 'modal-note';
    note.append('Searchable database of the ');
    const dsLink = document.createElement('a');
    dsLink.href = 'https://overgrow.com/t/attempted-complete-global-landrace-hemp-heirloom-strain-list/238462';
    dsLink.target = '_blank'; dsLink.rel = 'noopener noreferrer';
    dsLink.textContent = 'original dataset';
    note.append(dsLink, '.');
    const frame = document.createElement('iframe');
    frame.src = 'https://simpletestsite.neocities.org/global%20landraces.HTML';
    frame.className = 'db-frame';
    frame.title = 'Searchable database of original dataset';
    frame.loading = 'lazy';
    // Defense-in-depth for the third-party embed: allow only scripts (treat as an
    // opaque origin — no top navigation, cookies, or storage on the host), send no
    // referrer, and deny all Permissions-Policy features.
    frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('allow', '');
    const fallback = document.createElement('p');
    fallback.className = 'modal-note';
    const a = document.createElement('a');
    a.href = frame.src; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = 'Open the database in a new tab';
    fallback.append('If the embed does not load, ', a, '.');
    body.append(note, frame, fallback);
  });
  modal.classList.add('wide');
}

function openAbout() {
  openContentModal('About', (body) => {
    const p1 = document.createElement('p');
    p1.textContent = 'The Cannabis Landrace Atlas is a free interactive map of traditional cannabis landraces, heirlooms, and wild populations from around the world.';
    const linksP = document.createElement('p');
    linksP.className = 'modal-note';
    const licenseLink = document.createElement('button');
    licenseLink.type = 'button';
    licenseLink.className = 'linklike';
    licenseLink.textContent = 'License';
    licenseLink.addEventListener('click', openLicense);
    linksP.append(licenseLink, ' · ', repoLink('GitHub repository'));
    body.append(p1, linksP);
  });
}

// Appends the shared data-credit text (with the Overgrow link) into an element,
// so References and License show the exact same wording.
function appendDataCredit(el) {
  el.append('Initial dataset adapted from the list compiled by Dankk1 on the ');
  const a = document.createElement('a');
  a.href = 'https://overgrow.com/t/attempted-complete-global-landrace-hemp-heirloom-strain-list/238462';
  a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Overgrow forum';
  el.append(a, '. Used with permission.');
}

function openLicense() {
  openContentModal('License', (body) => {
    const dl = document.createElement('dl');
    dl.className = 'modal-dl';
    for (const [t, d] of [
      ['Code', 'MIT License.'],
      ['Data & write-ups', 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).'],
      ['Map data', 'World geometry from Natural Earth (public domain). Rendering by Leaflet (BSD-2-Clause) and marked (MIT).']
    ]) {
      const dt = document.createElement('dt'); dt.textContent = t;
      const dd = document.createElement('dd'); dd.textContent = d;
      dl.append(dt, dd);
    }
    const p = document.createElement('p');
    p.className = 'modal-note';
    appendDataCredit(p);
    const repoP = document.createElement('p');
    repoP.className = 'modal-note';
    repoP.append('Source code and full license texts: ', repoLink('GitHub repository'), '.');
    body.append(dl, p, repoP);
  });
}

function openReferences() {
  openContentModal('References', (body) => {
    const intro = document.createElement('p');
    intro.textContent = 'General background on cannabis landraces and their ethnobotany:';
    const ul = document.createElement('ul');
    ul.className = 'modal-refs';
    for (const r of [
      'Clarke, R. C., & Merlin, M. D. (2013). Cannabis: Evolution and Ethnobotany. University of California Press.',
      'Clarke, R. C. (1998). Hashish! Red Eye Press.'
    ]) {
      const li = document.createElement('li'); li.textContent = r; ul.appendChild(li);
    }
    const li = document.createElement('li');
    appendDataCredit(li);
    ul.appendChild(li);
    body.append(intro, ul);
  });
}

// Index facets: [label, record field, optional value formatter, optional value order].
// Region first — this atlas is about place. Each facet's groups follow the given order.
const INDEX_FACETS = [
  ['Region', 'continent', null, CONTINENTS],
  ['Climate', 'climate', null, CLIMATES],
  ['Morphotype', 'morphotype', null, MORPHOTYPES],
  ['Chemotype', 'chemotype', (v) => `Type ${v}`, CHEMOTYPES],
  ['Domestication', 'domestication', null, DOMESTICATIONS],
  ['Type (vernacular)', 'category', null, CATEGORY_ORDER],
  ['Height', 'height'],
  ['Flowering Time', 'flowering']
];
const INDEX_STATE_KEY = 'cla-index-state';
function loadIndexState() { try { return JSON.parse(localStorage.getItem(INDEX_STATE_KEY)) || {}; } catch { return {}; } }
function saveIndexState(st) { try { localStorage.setItem(INDEX_STATE_KEY, JSON.stringify(st)); } catch { /* ignore */ } }

// Ordinal height scale for the Height slider (shared vocabulary).
const HEIGHT_SCALE = HEIGHTS;
function heightRank(h) {
  const t = (h || '').toLowerCase();
  if (/extremely/.test(t)) return 6;
  if (/very tall/.test(t)) return 5;
  if (/medium-tall|medium tall/.test(t)) return 3;
  if (/short-medium|medium-short|medium short/.test(t)) return 1;
  if (/\btall\b/.test(t)) return 4;
  if (/\bmedium\b/.test(t)) return 2;
  if (/\bshort\b/.test(t)) return 0;
  return -1; // variable / unknown
}

// One-variety-per-line list of links.
function varietyLineList(list) {
  const wrap = document.createElement('div');
  wrap.className = 'index-list';
  list.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach((s) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'index-variety'; btn.textContent = s.name;
    btn.addEventListener('click', () => { closeModal(); openPanel(s); });
    wrap.appendChild(btn);
  });
  return wrap;
}

// A single-track dual-thumb slider whose thumbs cannot cross. onChange(lo, hi).
function makeDualSlider(absMin, absMax, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'dual-slider';
  const track = document.createElement('div'); track.className = 'ds-track';
  const fill = document.createElement('div'); fill.className = 'ds-fill';
  track.appendChild(fill);
  const lo = document.createElement('input');
  lo.type = 'range'; lo.min = absMin; lo.max = absMax; lo.value = absMin; lo.className = 'ds-input';
  lo.setAttribute('aria-label', 'Minimum');
  const hi = document.createElement('input');
  hi.type = 'range'; hi.min = absMin; hi.max = absMax; hi.value = absMax; hi.className = 'ds-input';
  hi.setAttribute('aria-label', 'Maximum');
  const span = absMax - absMin || 1;
  const pct = (v) => ((v - absMin) / span) * 100;
  function update() {
    let l = +lo.value; let h = +hi.value;
    if (l > h) { // prevent crossing
      if (document.activeElement === lo) { l = h; lo.value = l; } else { h = l; hi.value = h; }
    }
    fill.style.left = `${pct(l)}%`;
    fill.style.right = `${100 - pct(h)}%`;
    onChange(l, h);
  }
  lo.addEventListener('input', update);
  hi.addEventListener('input', update);
  wrap.append(track, lo, hi);
  return { wrap, update };
}

// Height facet: single-bar dual-thumb slider over the ordinal scale + live list.
function buildHeightSlider(facet) {
  const ranked = strains.map((s) => ({ s, r: heightRank(s.height) })).filter((x) => x.r >= 0);
  const box = document.createElement('div'); box.className = 'slider-facet';
  const label = document.createElement('div'); label.className = 'height-range-label';
  const listHost = document.createElement('div');
  const ds = makeDualSlider(0, HEIGHT_SCALE.length - 1, (lo, hi) => {
    label.textContent = `${HEIGHT_SCALE[lo]} – ${HEIGHT_SCALE[hi]}`;
    const matched = ranked.filter((x) => x.r >= lo && x.r <= hi).map((x) => x.s);
    listHost.innerHTML = '';
    const count = document.createElement('p'); count.className = 'modal-note'; count.textContent = `${matched.length} varieties`;
    listHost.append(count, varietyLineList(matched));
  });
  box.append(label, ds.wrap, listHost);
  facet.appendChild(box);
  ds.update();
}

// Parse a flowering descriptor into a week range, or null.
function floweringWeeks(f) {
  const r = String(f || '').match(/(\d+)\s*[–-]\s*(\d+)/);
  if (r) return { min: +r[1], max: +r[2] };
  const s = String(f || '').match(/(\d+)\s*w/i);
  if (s) return { min: +s[1], max: +s[1] };
  return null;
}

// Flowering Time facet: weeks dual-thumb slider; lists varieties whose range overlaps.
function buildFloweringSlider(facet) {
  const ranged = strains.map((s) => ({ s, w: floweringWeeks(s.flowering) })).filter((x) => x.w);
  const absMin = Math.min(...ranged.map((x) => x.w.min));
  const absMax = Math.max(...ranged.map((x) => x.w.max));
  const box = document.createElement('div'); box.className = 'slider-facet';
  const label = document.createElement('div'); label.className = 'height-range-label';
  const listHost = document.createElement('div');
  const ds = makeDualSlider(absMin, absMax, (lo, hi) => {
    label.textContent = `${lo}–${hi} weeks`;
    const matched = ranged.filter((x) => x.w.min <= hi && x.w.max >= lo).map((x) => x.s);
    listHost.innerHTML = '';
    const count = document.createElement('p'); count.className = 'modal-note'; count.textContent = `${matched.length} varieties`;
    listHost.append(count, varietyLineList(matched));
  });
  box.append(label, ds.wrap, listHost);
  facet.appendChild(box);
  ds.update();
}

// Collapsible value groups (one-per-line lists), with persisted open state.
function buildValueGroups(facet, label, field, fmt, order, target, state) {
  const groups = {};
  for (const s of strains) {
    const v = (s[field] || '').toString().trim() || 'Unknown';
    (groups[v] ||= []).push(s);
  }
  const keys = Object.keys(groups).sort(order
    ? (a, b) => order.indexOf(a) - order.indexOf(b)
    : (a, b) => groups[b].length - groups[a].length);
  for (const v of keys) {
    const g = document.createElement('details');
    g.className = 'index-group';
    const key = `group:${label}::${v}`;
    g.open = target ? (target.facet === label && target.value === v) : !!state[key];
    if (target && target.facet === label && target.value === v) g.dataset.scrollTarget = '1';
    const gsum = document.createElement('summary');
    gsum.className = 'index-h2';
    gsum.textContent = `${fmt ? fmt(v) : v} (${groups[v].length})`;
    g.appendChild(gsum);
    g.appendChild(varietyLineList(groups[v]));
    if (!target) g.addEventListener('toggle', () => { const s = loadIndexState(); s[key] = g.open; saveIndexState(s); });
    facet.appendChild(g);
  }
}

// Opens the Index. `target` = { facet, value } forces only that heading open (others folded).
function openIndex(target) {
  openContentModal('Index', (body) => {
    const state = target ? {} : loadIndexState();
    INDEX_FACETS.forEach(([label, field, fmt, order]) => {
      const facet = document.createElement('details');
      facet.className = 'index-facet';
      const fkey = `facet:${label}`;
      facet.open = target ? (target.facet === label) : !!state[fkey];
      if (target && target.facet === label && !target.value) facet.dataset.scrollTarget = '1';
      const fsum = document.createElement('summary');
      fsum.className = 'index-h1';
      fsum.textContent = label;
      facet.appendChild(fsum);
      if (label === 'Height') buildHeightSlider(facet);
      else if (label === 'Flowering Time') buildFloweringSlider(facet);
      else buildValueGroups(facet, label, field, fmt, order, target, state);
      if (!target) facet.addEventListener('toggle', () => { const s = loadIndexState(); s[fkey] = facet.open; saveIndexState(s); });
      body.appendChild(facet);
    });
    if (target) {
      const tEl = body.querySelector('[data-scroll-target]');
      if (tEl) requestAnimationFrame(() => tEl.scrollIntoView({ block: 'start' }));
    }
  });
}

// ---- Index heading search (jump to a facet/value) ----
let headingEntriesCache = null;
function headingEntries() {
  if (headingEntriesCache) return headingEntriesCache;
  const entries = [];
  for (const [label, field, fmt] of INDEX_FACETS) {
    entries.push({ facet: label, value: null, text: label });
    const vals = new Set();
    for (const s of strains) { const v = (s[field] || '').toString().trim(); if (v) vals.add(v); }
    for (const v of vals) entries.push({ facet: label, value: v, text: fmt ? fmt(v) : v });
  }
  headingEntriesCache = entries;
  return entries;
}
function matchHeadings(q) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const scored = [];
  for (const e of headingEntries()) {
    const lt = e.text.toLowerCase();
    if (lt === t) scored.push({ e, s: 0 });
    else if (lt.startsWith(t)) scored.push({ e, s: 1 });
    else if (lt.includes(t)) scored.push({ e, s: 2 });
  }
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, 5).map((x) => x.e);
}

// ---- Global keys / outside click ----
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!appMenu.hidden) toggleMenu(false);
  else if (!modal.hidden) closeModal();
  else if (!resultsList.hidden) hideResults();
  else if (document.body.classList.contains('panel-open')) closePanel();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search')) hideResults();
  if (!e.target.closest('.app-menu') && !e.target.closest('.menu-btn')) toggleMenu(false);
});

// ---- Boot ----
async function boot() {
  try {
    const [data, world] = await Promise.all([
      fetch('data/landraces.json').then((r) => { if (!r.ok) throw new Error('data'); return r.json(); }),
      fetch('data/world.geojson').then((r) => { if (!r.ok) throw new Error('geo'); return r.json(); })
    ]);
    strains = data;
    map = createMap('map', world, closePanel);
    markersById = addMarkers(map, strains, openPanel);
  } catch (err) {
    document.getElementById('map').innerHTML = '<div class="map-error">Unable to load map data.</div>';
    console.error('The Cannabis Landrace Atlas failed to load:', err);
  }
}

initTooltips();
boot();
