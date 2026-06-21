// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Contribution UI: the Add / Correction / Contact / section URL forms. Submissions POST
// to a Cloudflare Worker (worker/), which files a labeled GitHub issue on the project's
// behalf — so visitors need no GitHub account. A Cloudflare Turnstile token gates spam.
// Depends only on the generic modal system and the vocab.

import { openContentModal } from './modal.js';
import { CONTINENTS, CLIMATES, MORPHOTYPES, CHEMOTYPES, DOMESTICATIONS, CATEGORY_ORDER, HEIGHTS } from '../data/lib/vocab.mjs';
import { isValidUrl, parseWeeks } from './util.js';

// Repository that submission issues are filed against. Update if the repo is renamed.
const REPO = 'BrooklynCannabisCompany/cannabis-landrace-atlas';

// An anchor to the GitHub repository.
export function repoLink(text) {
  const a = document.createElement('a');
  a.href = `https://github.com/${REPO}`;
  a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}

// --- Account-less submission via the Cloudflare Worker proxy ------------------
// The Worker (worker/) files the GitHub issue on the project's behalf, so visitors need
// no GitHub account. A Cloudflare Turnstile token proves the submitter is human.
const WORKER_URL = 'https://cla-submit.brooklyncannabiscompany.workers.dev';
const TURNSTILE_SITE_KEY = '0x4AAAAAADowXrzQkEBGiRWj';

// Renders a Turnstile widget into `container` once the async-loaded script is ready.
// Returns { token, reset }: token() reads the current response; reset() clears it so the
// next attempt gets a fresh token.
function mountTurnstile(container) {
  let widgetId = null;
  const render = () => { widgetId = window.turnstile.render(container, { sitekey: TURNSTILE_SITE_KEY }); };
  if (window.turnstile) render();
  else {
    const timer = setInterval(() => { if (window.turnstile) { clearInterval(timer); render(); } }, 100);
    setTimeout(() => clearInterval(timer), 10000);
  }
  return {
    token: () => (widgetId != null && window.turnstile ? window.turnstile.getResponse(widgetId) : ''),
    reset: () => { if (widgetId != null && window.turnstile) window.turnstile.reset(widgetId); }
  };
}

// POSTs a submission to the Worker (which creates the labeled issue) and shows a
// confirmation. `ts` is the form's Turnstile handle; `btn` is its submit button.
async function submitIssue({ label, title, body }, ts, btn) {
  const turnstileToken = ts.token();
  if (!turnstileToken) { window.alert('Please complete the “Verify you are human” check, then submit again.'); return; }
  const prev = btn.textContent;
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, title, body, turnstileToken })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) { showSubmitSuccess(); return; }
    throw new Error(data.error || 'failed');
  } catch {
    ts.reset();
    btn.disabled = false; btn.textContent = prev;
    window.alert('Sorry — your submission could not be sent. Please check your connection and try again.');
  }
}

// Replaces the modal with a thank-you confirmation. (The created issue isn't surfaced —
// most visitors don't use GitHub, so a link there would only confuse.)
function showSubmitSuccess() {
  openContentModal('Thank you', (body) => {
    const p = document.createElement('p');
    p.textContent = 'Thank you — your suggestion was received and will be reviewed before it appears on the Atlas.';
    body.append(p);
  });
}

// Fixed-value fields get a dropdown; combo fields get a free-text input with suggestions.
const SUBMIT_OPTIONS = {
  continent: CONTINENTS,
  climate: CLIMATES,
  morphotype: MORPHOTYPES,
  chemotype: CHEMOTYPES,
  domestication: DOMESTICATIONS,
  category: CATEGORY_ORDER,
  height: HEIGHTS
};
const SUBMIT_FIELDS = [
  ['name', 'Name', 'text'],
  ['aka', 'AKA (other names, comma-separated)', 'text'],
  ['continent', 'Region', 'select'],
  ['country', 'Country', 'text'],
  ['region', 'Sub-region / locality', 'text'],
  ['climate', 'Climate', 'select'],
  ['morphotype', 'Morphotype', 'select'],
  ['chemotype', 'Chemotype', 'select'],
  ['domestication', 'Domestication', 'select'],
  ['category', 'Type (vernacular)', 'select'],
  ['type', 'Type descriptor', 'text'],
  ['height', 'Height', 'combo'],
  ['flowering', 'Flowering Time', 'weeks'],
  ['lat', 'Latitude', 'number'],
  ['lng', 'Longitude', 'number'],
  ['overview', 'Overview', 'textarea'],
  ['history', 'History', 'textarea'],
  ['description', 'Description', 'textarea'],
  ['grow', 'Grow Information', 'textarea'],
  ['sources', 'References (Information Sources)', 'linklist']
];
// Long-form sections rendered as headed blocks in the issue (not "**Label:** value").
const PROSE_KEYS = new Set(['overview', 'history', 'description', 'grow', 'sources']);

// Fetches a write-up and extracts the four prose sections (for correction prefill).
async function fetchWriteupSections(id) {
  try {
    const res = await fetch(`data/writeups/${id}.md`);
    if (!res.ok) return {};
    const md = await res.text();
    const sec = (name) => {
      const m = md.match(new RegExp(`^## ${name}[ \\t]*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
      return m ? m[1].trim() : '';
    };
    return { overview: sec('Overview'), history: sec('History'), description: sec('Description'), grow: sec('Grow Information') };
  } catch { return {}; }
}

function prefillFrom(strain, sections) {
  const base = {
    overview: '', history: '', description: '', grow: '', sources: '', ...(sections || {})
  };
  if (!strain) return base;
  return {
    ...base,
    name: strain.name, aka: (strain.aka || []).join(', '), continent: strain.continent,
    country: strain.country, region: strain.region, climate: strain.climate,
    morphotype: strain.morphotype, chemotype: strain.chemotype, domestication: strain.domestication,
    category: strain.category, type: strain.type, height: strain.height, flowering: strain.flowering,
    lat: strain.lat != null ? String(strain.lat) : '', lng: strain.lng != null ? String(strain.lng) : ''
  };
}

function readField(type, ref) {
  if (type === 'weeks') {
    const lo = ref.min.value.trim();
    const hi = ref.max.value.trim();
    if (lo && hi) return `${lo}–${hi} weeks`;
    if (lo) return `${lo} weeks`;
    return '';
  }
  if (type === 'linklist') {
    return ref.entries().map((e) => (e.name ? `- ${e.name} — ${e.url}` : `- ${e.url}`)).join('\n');
  }
  return ref.value.trim();
}

// A reusable add/remove list of entries. With withName, each row is a name input + a URL
// input; otherwise URL-only. Returns the element plus readers used by the submit handlers.
function linkRows(withName, namePlaceholder = 'Name / title') {
  const list = document.createElement('div');
  list.className = 'url-list';
  const rows = () => [...list.querySelectorAll('.url-row')];
  const validate = (urlInput) => {
    const v = urlInput.value.trim();
    urlInput.classList.toggle('invalid', !!v && !isValidUrl(v));
  };
  function addRow() {
    const row = document.createElement('div');
    row.className = 'url-row';
    if (withName) {
      const name = document.createElement('input');
      name.type = 'text'; name.className = 'link-name'; name.placeholder = namePlaceholder;
      row.appendChild(name);
    }
    const url = document.createElement('input');
    url.type = 'url'; url.className = 'url-input'; url.placeholder = 'https://…';
    url.addEventListener('blur', () => validate(url));
    const rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'url-remove'; rm.textContent = '×';
    rm.setAttribute('aria-label', 'Remove this entry');
    rm.addEventListener('click', () => { row.remove(); if (!rows().length) addRow(); });
    row.append(url, rm);
    list.appendChild(row);
    (row.querySelector('input')).focus();
  }
  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'linklike'; addBtn.textContent = '+ Add another';
  addBtn.addEventListener('click', () => {
    const bad = rows().map((r) => r.querySelector('.url-input')).find((i) => i.value.trim() && !isValidUrl(i.value.trim()));
    if (bad) { validate(bad); bad.focus(); return; }
    addRow();
  });
  addRow();
  const el = document.createElement('div');
  el.append(list, addBtn);
  return {
    el,
    entries() {
      return rows().map((r) => ({
        name: withName ? (r.querySelector('.link-name').value.trim()) : '',
        url: r.querySelector('.url-input').value.trim()
      })).filter((e) => e.url);
    },
    invalid() { return rows().map((r) => r.querySelector('.url-input')).filter((i) => i.value.trim() && !isValidUrl(i.value.trim())); },
    markInvalid() { rows().forEach((r) => validate(r.querySelector('.url-input'))); }
  };
}

// --- Location picker ----------------------------------------------------------
// A small click-to-place map for the latitude/longitude fields (most contributors don't
// think in raw coordinates). Reuses the bundled world GeoJSON as a tile-free base — same
// as the main map — so there's still no external tile server. Clicking the map or dragging
// the pin fills two bound number inputs; editing the inputs moves the pin.

let worldGeoPromise = null; // the basemap is fetched once and shared by every picker
function loadWorldGeo() {
  if (!worldGeoPromise) {
    worldGeoPromise = fetch('data/world.geojson').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  }
  return worldGeoPromise;
}

const round4 = (n) => Math.round(n * 1e4) / 1e4; // ~11 m precision; coords are approximate

function coordField(text, placeholder) {
  const label = document.createElement('label');
  label.className = 'loc-coord';
  const span = document.createElement('span');
  span.textContent = text;
  const input = document.createElement('input');
  input.type = 'number'; input.step = 'any'; input.placeholder = placeholder;
  input.setAttribute('aria-label', text === 'Lat' ? 'Latitude' : 'Longitude');
  label.append(span, input);
  return { label, input };
}

// Builds the picker UI and returns { el, latInput, lngInput }. `initLat`/`initLng` are the
// prefilled string values ('' when unknown). The Leaflet map is initialised on the next
// frame, once the modal is visible and the map element has a measurable size.
function locationPicker(initLat, initLng) {
  const wrap = document.createElement('div');
  wrap.className = 'loc-picker';
  const mapEl = document.createElement('div');
  mapEl.className = 'loc-map';
  const coords = document.createElement('div');
  coords.className = 'loc-coords';
  const lat = coordField('Lat', 'latitude');
  const lng = coordField('Lng', 'longitude');
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button'; clearBtn.className = 'linklike loc-clear'; clearBtn.textContent = 'Clear';
  coords.append(lat.label, lng.label, clearBtn);
  wrap.append(mapEl, coords);

  const startLat = initLat !== '' && initLat != null ? Number(initLat) : null;
  const startLng = initLng !== '' && initLng != null ? Number(initLng) : null;
  if (Number.isFinite(startLat)) lat.input.value = startLat;
  if (Number.isFinite(startLng)) lng.input.value = startLng;

  requestAnimationFrame(() => initLocMap(mapEl, lat.input, lng.input, clearBtn, startLat, startLng));
  return { el: wrap, latInput: lat.input, lngInput: lng.input };
}

async function initLocMap(mapEl, latInput, lngInput, clearBtn, startLat, startLng) {
  const hasStart = Number.isFinite(startLat) && Number.isFinite(startLng);
  const map = L.map(mapEl, {
    center: hasStart ? [startLat, startLng] : [20, 10],
    zoom: hasStart ? 4 : 1,
    minZoom: 1, maxZoom: 8,
    worldCopyJump: true, attributionControl: false
  });
  const world = await loadWorldGeo();
  if (world) {
    L.geoJSON(world, {
      style: { color: '#c8c5bd', weight: 0.7, fillColor: '#e9e6df', fillOpacity: 1 },
      interactive: false
    }).addTo(map);
  }
  const PIN = L.divIcon({
    html: '<img src="assets/leaf.svg?v=2" alt="" class="leaf-img" width="26" height="28">',
    iconSize: [26, 28], iconAnchor: [13, 27], className: 'leaf-marker'
  });
  let marker = null;
  function place(la, ln) {
    la = round4(la); ln = round4(ln);
    latInput.value = la; lngInput.value = ln;
    if (!marker) {
      marker = L.marker([la, ln], { icon: PIN, draggable: true }).addTo(map);
      marker.on('dragend', () => { const p = marker.getLatLng(); place(p.lat, p.lng); });
    } else {
      marker.setLatLng([la, ln]);
    }
  }
  if (hasStart) place(startLat, startLng);
  map.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
  clearBtn.addEventListener('click', () => {
    if (marker) { map.removeLayer(marker); marker = null; }
    latInput.value = ''; lngInput.value = '';
  });
  const syncFromInputs = () => {
    const la = parseFloat(latInput.value); const ln = parseFloat(lngInput.value);
    if (Number.isFinite(la) && Number.isFinite(ln)) { place(la, ln); map.panTo([la, ln]); }
  };
  latInput.addEventListener('change', syncFromInputs);
  lngInput.addEventListener('change', syncFromInputs);
  setTimeout(() => map.invalidateSize(), 60); // re-measure once the modal has laid out
}

// Builds the add/correction form (mirrors the variety panel); submits via the Worker proxy.
function buildSubmissionForm(body, mode, strain, sections) {
  const pre = prefillFrom(strain, sections);
  const intro = document.createElement('p');
  intro.className = 'modal-note';
  intro.textContent = mode === 'correct'
    ? `Edit the fields you want changed for "${strain.name}", then submit. Your suggestion is reviewed before it appears.`
    : 'Suggest a new variety. Fill in what you know — only Name is required. Your suggestion is reviewed before it appears.';
  const form = document.createElement('form');
  form.className = 'submit-form';
  const fields = {};
  for (const [key, label, type] of SUBMIT_FIELDS) {
    if (key === 'lng') continue; // the lng input is built with lat inside the location picker
    if (key === 'lat') {
      const block = document.createElement('div');
      block.className = 'submit-field';
      const heading = document.createElement('span');
      heading.className = 'submit-label';
      heading.textContent = 'Location';
      const hint = document.createElement('span');
      hint.className = 'submit-hint';
      hint.textContent = 'Click the map to set the origin, or drag the pin. Coordinates are approximate.';
      const loc = locationPicker(pre.lat, pre.lng);
      fields.lat = loc.latInput;
      fields.lng = loc.lngInput;
      block.append(heading, hint, loc.el);
      form.appendChild(block);
      continue;
    }
    const wrap = document.createElement('label');
    wrap.className = 'submit-field';
    const span = document.createElement('span');
    span.className = 'submit-label';
    span.textContent = label;
    wrap.appendChild(span);
    if (type === 'select') {
      const field = document.createElement('select');
      const blank = document.createElement('option');
      blank.value = ''; blank.textContent = '—';
      field.appendChild(blank);
      for (const o of SUBMIT_OPTIONS[key]) {
        const op = document.createElement('option');
        op.value = o; op.textContent = o;
        field.appendChild(op);
      }
      if (pre[key] != null) field.value = pre[key];
      fields[key] = field; wrap.appendChild(field);
    } else if (type === 'combo') {
      const field = document.createElement('input');
      field.type = 'text'; field.setAttribute('list', `dl-${key}`);
      const dl = document.createElement('datalist'); dl.id = `dl-${key}`;
      for (const o of (SUBMIT_OPTIONS[key] || [])) {
        const op = document.createElement('option'); op.value = o; dl.appendChild(op);
      }
      if (pre[key] != null) field.value = pre[key];
      fields[key] = field; wrap.append(field, dl);
    } else if (type === 'weeks') {
      const row = document.createElement('div'); row.className = 'weeks-row';
      const lo = document.createElement('input'); lo.type = 'number'; lo.min = '1'; lo.placeholder = 'min';
      const hi = document.createElement('input'); hi.type = 'number'; hi.min = '1'; hi.placeholder = 'max';
      const unit = document.createElement('span'); unit.className = 'submit-label'; unit.textContent = 'weeks';
      const pw = parseWeeks(pre.flowering);
      lo.value = pw.min; hi.value = pw.max;
      row.append(lo, document.createTextNode(' – '), hi, unit);
      fields[key] = { min: lo, max: hi }; wrap.appendChild(row);
    } else if (type === 'number') {
      const field = document.createElement('input');
      field.type = 'number'; field.step = 'any';
      if (pre[key] != null) field.value = pre[key];
      fields[key] = field; wrap.appendChild(field);
    } else if (type === 'linklist') {
      const comp = linkRows(true);
      fields[key] = comp; wrap.appendChild(comp.el);
    } else if (type === 'textarea') {
      const field = document.createElement('textarea');
      field.rows = PROSE_KEYS.has(key) ? 4 : 3;
      if (pre[key] != null) field.value = pre[key];
      fields[key] = field; wrap.appendChild(field);
    } else {
      const field = document.createElement('input');
      field.type = 'text';
      if (pre[key] != null) field.value = pre[key];
      fields[key] = field; wrap.appendChild(field);
    }
    form.appendChild(wrap);
  }
  const tsBox = document.createElement('div'); tsBox.className = 'turnstile-box';
  const ts = mountTurnstile(tsBox);
  const submit = document.createElement('button');
  submit.type = 'submit'; submit.className = 'panel-submit'; submit.textContent = 'Submit';
  form.append(tsBox, submit);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const vals = {};
    for (const [key, , type] of SUBMIT_FIELDS) vals[key] = readField(type, fields[key]);
    if (!vals.name) { window.alert('Name is required.'); return; }
    const shortLines = [];
    const blocks = [];
    for (const [key, label] of SUBMIT_FIELDS) {
      if (!vals[key]) continue;
      const clean = label.replace(/\s*\(.*\)$/, '');
      if (PROSE_KEYS.has(key)) blocks.push(`### ${clean}\n\n${vals[key]}`);
      else shortLines.push(`**${clean}:** ${vals[key]}`);
    }
    const parts = [shortLines.join('\n'), ...blocks];
    const payload = mode === 'correct'
      ? { label: 'update request', title: `Correction: ${strain.name}`,
          body: `Correction request for **${strain.name}** (id: \`${strain.id}\`).\n\n${parts.join('\n\n')}\n\n_Submitted via the Atlas correction form._` }
      : { label: 'add request', title: `Add: ${vals.name}`,
          body: `New variety submission.\n\n${parts.join('\n\n')}\n\n_Submitted via the Atlas add form._` };
    submitIssue(payload, ts, submit);
  });

  body.append(intro, form);
}

export function openFeedbackSubmit() {
  openContentModal('Suggest Addition', (body) => buildSubmissionForm(body, 'add', null, {}));
}

export async function openStrainSubmit(strain) {
  const sections = await fetchWriteupSections(strain.id);
  openContentModal('Suggest Corrections', (body) => buildSubmissionForm(body, 'correct', strain, sections));
}

// Contact form: feature request / bug report / general feedback -> labeled GitHub issue.
const CONTACT_TYPES = [
  ['Feature request', 'feature request'],
  ['Bug report', 'bug'],
  ['General feedback', 'feedback']
];
export function openContactForm() {
  openContentModal('Contact Us', (body) => {
    const intro = document.createElement('p');
    intro.className = 'modal-note';
    intro.textContent = 'Send a feature request, bug report, or general feedback.';
    const form = document.createElement('form');
    form.className = 'submit-form';

    function row(labelText, control) {
      const wrap = document.createElement('label');
      wrap.className = 'submit-field';
      const span = document.createElement('span');
      span.className = 'submit-label';
      span.textContent = labelText;
      wrap.append(span, control);
      return wrap;
    }

    const typeSel = document.createElement('select');
    for (const [display] of CONTACT_TYPES) {
      const op = document.createElement('option');
      op.value = display; op.textContent = display;
      typeSel.appendChild(op);
    }
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    const descArea = document.createElement('textarea');
    descArea.rows = 4;
    const emailInput = document.createElement('input');
    emailInput.type = 'email';

    form.append(
      row('Type', typeSel),
      row('Title', titleInput),
      row('Description', descArea),
      row('Your email (optional)', emailInput)
    );
    const tsBox = document.createElement('div'); tsBox.className = 'turnstile-box';
    const ts = mountTurnstile(tsBox);
    const submit = document.createElement('button');
    submit.type = 'submit'; submit.className = 'panel-submit'; submit.textContent = 'Submit';
    form.append(tsBox, submit);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const display = typeSel.value;
      const title = titleInput.value.trim();
      const desc = descArea.value.trim();
      const email = emailInput.value.trim();
      if (!title) { window.alert('Please enter a title.'); return; }
      if (!desc) { window.alert('Please enter a description.'); return; }
      const label = (CONTACT_TYPES.find(([d]) => d === display) || [, 'feedback'])[1];
      const text = `**Type:** ${display}\n\n${desc}\n\n`
        + (email ? `**Contact email:** ${email}\n\n` : '')
        + '_Submitted via the Atlas Contact form._';
      submitIssue({ label, title: `${display}: ${title}`, body: text }, ts, submit);
    });

    body.append(intro, form);
  });
}

const SECTION_LABELS = {
  Photos: 'add image request',
  'Seed Sources': 'add seed source request',
  'Forum Discussions': 'add forum request',
  References: 'add reference request'
};

// ⊕ button: an add/remove list -> labeled GitHub issue. Photos collect URLs only; Seed
// Sources / Forum Discussions / References collect a name/title + a link per entry.
export function openSectionSubmit(strain, section) {
  const label = SECTION_LABELS[section] || 'add request';
  const withName = section !== 'Photos';
  const namePh = section === 'Forum Discussions' ? 'Thread title' : 'Name / title';
  openContentModal(`Add ${section} — ${strain.name}`, (body) => {
    const intro = document.createElement('p');
    intro.className = 'modal-note';
    intro.textContent = withName
      ? `Add one or more ${section} for "${strain.name}" — a name/title and a link for each. Reviewed before it goes live.`
      : `Add one or more ${section} URLs for "${strain.name}". Each must be a valid link. Reviewed before it goes live.`;
    const form = document.createElement('form');
    form.className = 'submit-form';
    const list = linkRows(withName, namePh);
    const tsBox = document.createElement('div'); tsBox.className = 'turnstile-box';
    const ts = mountTurnstile(tsBox);
    const submit = document.createElement('button');
    submit.type = 'submit'; submit.className = 'panel-submit'; submit.textContent = 'Submit';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const entries = list.entries();
      if (!entries.length) { window.alert(`Please add at least one ${section} entry.`); return; }
      if (list.invalid().length) { list.markInvalid(); window.alert('Some URLs are not valid.'); return; }
      const lines = entries.map((en) => (en.name ? `- ${en.name} — ${en.url}` : `- ${en.url}`)).join('\n');
      const text = `Requested **${section}** for **${strain.name}** (id: \`${strain.id}\`):\n\n`
        + `${lines}\n\n_Submitted via the Atlas ${section} form._`;
      submitIssue({ label, title: `${section}: ${strain.name}`, body: text }, ts, submit);
    });

    form.append(list.el, tsBox, submit);
    body.append(intro, form);
  });
}
