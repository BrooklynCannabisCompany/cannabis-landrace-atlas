// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

import { createMap, addMarkers, flyToStrain, setMarkerSelected, addLabelsControl } from './map.js';
import { createLabels } from './labels.js';
import { renderStrain, setWriteupHtml, setWriteupMissing } from './panel.js';
import { filterStrains } from './search.js';
import { renderMarkdown } from './markdown.js';
import { relatedStrains } from './relations.js';
import { initTooltips } from './tooltip.js';
import { CONTINENTS, CLIMATES, MORPHOTYPES, CHEMOTYPES, DOMESTICATIONS, CATEGORY_ORDER, HEIGHTS } from '../data/vocab.mjs';
import { modal, openContentModal, closeModal, isModalPersistent } from './modal.js';
import { openFeedbackSubmit, openContactForm, openStrainSubmit, openSectionSubmit, repoLink, setCountryOptions } from './forms.js';
import { isValidUrl } from './util.js';
import { makeDualSlider } from './slider.js';
import { VERSION } from './version.js';

const panel = document.getElementById('panel');
const input = document.getElementById('search-input');
const resultsList = document.getElementById('search-results');
const submitBtn = document.getElementById('submit-btn');
const menuBtn = document.getElementById('menu-btn');
const appMenu = document.getElementById('app-menu');
const indexBtn = document.getElementById('index-btn');
const contactBtn = document.getElementById('contact-btn');

// The app title carries the version as a tooltip (also shown in the About dialog).
document.querySelector('.wordmark')?.setAttribute('data-tip', `Version ${VERSION}`);

let strains = [];
let map = null;
let markersById = new Map();
let currentId = null;
let labels = null;          // labels-overlay controller (created in boot)
let labelsControl = null;   // top-left Labels toggle button (created in boot)
let labelsOn = false;

// ---- Labels overlay ----
// Single source of truth for the labels on/off state, shared by the map button and the
// ☰-menu "Labels" item. Persisted so a returning visitor keeps their choice.
const LABELS_KEY = 'cla-labels';
const labelsMenuItem = appMenu.querySelector('[data-menu="labels"]');

function setLabels(on, persist = true) {
  labelsOn = on;
  labels?.setVisible(on);
  labelsControl?.setLabelsActive(on);
  if (labelsMenuItem) {
    labelsMenuItem.classList.toggle('on', on);
    labelsMenuItem.setAttribute('aria-checked', on ? 'true' : 'false');
  }
  if (persist) { try { localStorage.setItem(LABELS_KEY, on ? '1' : '0'); } catch { /* ignore */ } }
}
function toggleLabels() { setLabels(!labelsOn); }

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
  insertRelated(strain);
  fillLinkSections(strain);
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
    let linkList = false;
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
        linkList = true; // text links render one per line (see .section-linklist)
        a.textContent = it.label;
        wrap.appendChild(a);
      }
      rendered += 1;
    });
    if (linkList) wrap.classList.add('section-linklist');
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
// Panel facts and the classification badges share ONE "browse by attribute" surface with
// the search jumps: the Index, opened/scrolled to the clicked facet/value (others folded).
// Maps a data field to its Index heading; Height/Flowering open their slider facet with no
// preset value.
const FIELD_TO_INDEX = {
  continent: 'Region', climate: 'Climate', morphotype: 'Morphotype',
  chemotype: 'Chemotype', domestication: 'Domestication', category: 'Type (vernacular)',
  height: 'Height', flowering: 'Flowering Time'
};
function openFacet(field, token) {
  const label = FIELD_TO_INDEX[field];
  if (!label) return;
  const raw = String(token || '').trim();
  // Sliders (Height/Flowering) carry the raw value so the thumbs preset to it; value-group
  // facets normalise an empty value to the "Unknown" group.
  const value = (field === 'height' || field === 'flowering') ? (raw || null) : (raw || 'Unknown');
  openIndex({ facet: label, value });
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
  ({ about: openAbout, index: openIndex, database: openDatabase, references: openReferences, license: openLicense, labels: toggleLabels, suggest: openFeedbackSubmit, contact: openContactForm }[item.dataset.menu] || (() => {}))();
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
    const cover = document.createElement('img');
    cover.src = 'assets/og-cover.png';
    cover.alt = 'The Cannabis Landrace Atlas';
    cover.className = 'about-cover';
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

    const disclaimer = document.createElement('p');
    disclaimer.className = 'modal-note';
    disclaimer.textContent = 'We do not sell seeds or any other cannabis products.';
    const versionP = document.createElement('p');
    versionP.className = 'about-version';
    versionP.textContent = `Version ${VERSION}`;
    body.append(cover, p1, linksP, disclaimer, versionP);
  }, { divider: true });
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
      ['Map data', 'World geometry and place labels — country names, states/provinces, cities, oceans and seas — from Natural Earth (public domain). Rendering by Leaflet (BSD-2-Clause) and marked (MIT).']
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
  }, { divider: true });
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
  }, { divider: true });
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

// One-variety-per-line list, styled like the facet-list rows: name (left) + place (right),
// with a hover highlight. Alphabetical by name.
function varietyLineList(list) {
  const ul = document.createElement('ul');
  ul.className = 'index-list';
  list.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach((s) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'index-variety';
    const name = document.createElement('span');
    name.className = 'r-name'; name.textContent = s.name;
    const place = document.createElement('span');
    place.className = 'r-place'; place.textContent = [s.region, s.country].filter(Boolean).join(', ');
    btn.append(name, place);
    btn.addEventListener('click', () => { closeModal(); openPanel(s); });
    li.appendChild(btn);
    ul.appendChild(li);
  });
  return ul;
}

// Height facet: a checkbox per height name (all on by default), since the heights are a
// short discrete scale. The list shows varieties matching any checked height. Opened from
// a Height fact/search, only that height is checked.
function buildHeightChecks(facet, target) {
  const ranked = strains.map((s) => ({ s, r: heightRank(s.height) })).filter((x) => x.r >= 0);
  const counts = HEIGHT_SCALE.map((_, i) => ranked.filter((x) => x.r === i).length);
  let only = -1;
  if (target && target.facet === 'Height' && target.value) {
    const r = heightRank(target.value);
    if (r >= 0) only = r;
  }
  const box = document.createElement('div'); box.className = 'slider-facet';
  const checks = document.createElement('div'); checks.className = 'height-checks';
  const listHost = document.createElement('div');
  const boxes = [];
  HEIGHT_SCALE.forEach((name, i) => {
    const lab = document.createElement('label'); lab.className = 'height-check';
    const cb = document.createElement('input'); cb.type = 'checkbox';
    cb.checked = only < 0 ? true : i === only;
    cb.disabled = counts[i] === 0;
    cb.addEventListener('change', render);
    lab.append(cb, document.createTextNode(` ${name} (${counts[i]})`));
    checks.appendChild(lab);
    boxes.push(cb);
  });
  function render() {
    const on = boxes.map((b) => b.checked);
    const matched = ranked.filter((x) => on[x.r]).map((x) => x.s);
    listHost.innerHTML = '';
    const count = document.createElement('p'); count.className = 'modal-note'; count.textContent = `${matched.length} varieties`;
    listHost.append(count, varietyLineList(matched));
  }
  box.append(checks, listHost);
  facet.appendChild(box);
  render();
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
// When opened from a Flowering Time fact, the thumbs preset to that variety's week range.
function buildFloweringSlider(facet, target) {
  const ranged = strains.map((s) => ({ s, w: floweringWeeks(s.flowering) })).filter((x) => x.w);
  const absMin = Math.min(...ranged.map((x) => x.w.min));
  const absMax = Math.max(...ranged.map((x) => x.w.max));
  let initLo = absMin; let initHi = absMax;
  if (target && target.facet === 'Flowering Time' && target.value) {
    const w = floweringWeeks(target.value);
    if (w) {
      initLo = Math.max(absMin, w.min); initHi = Math.min(absMax, w.max);
      // A single-week variety still selects a 1-week range (e.g. 9 -> 8–9).
      if (initHi - initLo < 1) {
        if (initLo > absMin) initLo -= 1; else initHi = Math.min(absMax, initLo + 1);
      }
    }
  }
  const box = document.createElement('div'); box.className = 'slider-facet';
  const listHost = document.createElement('div');
  const ds = makeDualSlider(absMin, absMax, (lo, hi) => {
    const matched = ranged.filter((x) => x.w.min <= hi && x.w.max >= lo).map((x) => x.s);
    listHost.innerHTML = '';
    const count = document.createElement('p'); count.className = 'modal-note'; count.textContent = `${matched.length} varieties`;
    listHost.append(count, varietyLineList(matched));
  }, initLo, initHi, 1);
  box.append(ds.wrap, listHost);
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
      const isRangeFacet = label === 'Height' || label === 'Flowering Time';
      // Scroll to the facet itself for range facets (no value group) or a facet opened
      // without a specific value; otherwise the matching value group is the scroll target.
      if (target && target.facet === label && (isRangeFacet || !target.value)) facet.dataset.scrollTarget = '1';
      const fsum = document.createElement('summary');
      fsum.className = 'index-h1';
      // Show the unit in the heading (Index only); the panel keeps the plain "Flowering Time".
      fsum.textContent = label === 'Flowering Time' ? 'Flowering Time (weeks)' : label;
      facet.appendChild(fsum);
      if (label === 'Height') buildHeightChecks(facet, target);
      else if (label === 'Flowering Time') buildFloweringSlider(facet, target);
      else buildValueGroups(facet, label, field, fmt, order, target, state);
      if (!target) facet.addEventListener('toggle', () => { const s = loadIndexState(); s[fkey] = facet.open; saveIndexState(s); });
      body.appendChild(facet);
    });
    if (target) {
      const tEl = body.querySelector('[data-scroll-target]');
      if (tEl) requestAnimationFrame(() => tEl.scrollIntoView({ block: 'start' }));
    }
  }, { indexHeaders: true });
  // The H2 section header pins just below the (sticky) H1 row — measure the H1 height for it.
  requestAnimationFrame(() => {
    const h1 = document.querySelector('#modal-body summary.index-h1');
    if (h1) modal.style.setProperty('--idx-h1-h', `${h1.offsetHeight}px`);
  });
}

// ---- Index heading search (jump to a facet/value) ----
let headingEntriesCache = null;
function headingEntries() {
  if (headingEntriesCache) return headingEntriesCache;
  const entries = [];
  for (const [label, field, fmt] of INDEX_FACETS) {
    entries.push({ facet: label, value: null, text: label });
    if (label === 'Height') {
      // Offer the clean height names (not the messy raw strings) so "Tall" jumps cleanly.
      HEIGHT_SCALE.forEach((name, i) => {
        if (strains.some((s) => heightRank(s.height) === i)) entries.push({ facet: label, value: name, text: name });
      });
      continue;
    }
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
  else if (!modal.hidden) { if (!isModalPersistent()) closeModal(); } // persistent forms ignore Escape
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
    // The map fails hard without strains + world geometry; the two label data files are
    // optional decoration, so a missing/broken file degrades to an empty layer.
    const [data, world, cities, water, states] = await Promise.all([
      fetch('data/landraces.json').then((r) => { if (!r.ok) throw new Error('data'); return r.json(); }),
      fetch('data/world.geojson').then((r) => { if (!r.ok) throw new Error('geo'); return r.json(); }),
      fetch('data/labels/cities.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('data/labels/water.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('data/labels/states.json').then((r) => (r.ok ? r.json() : [])).catch(() => [])
    ]);
    strains = data;
    // Distinct dataset countries → suggestions for the submission Country combobox.
    setCountryOptions([...new Set(strains.map((s) => s.country).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
    map = createMap('map', world, closePanel);
    markersById = addMarkers(map, strains, openPanel);
    // Labels overlay + its controls. Restore the persisted on/off choice.
    labels = createLabels(map, world, cities, water, states);
    labelsControl = addLabelsControl(map, { onToggleLabels: toggleLabels });
    let saved = false;
    try { saved = localStorage.getItem(LABELS_KEY) === '1'; } catch { /* ignore */ }
    setLabels(saved, false);
  } catch (err) {
    document.getElementById('map').innerHTML = '<div class="map-error">Unable to load map data.</div>';
    console.error('The Cannabis Landrace Atlas failed to load:', err);
  }
}

initTooltips();
boot();
