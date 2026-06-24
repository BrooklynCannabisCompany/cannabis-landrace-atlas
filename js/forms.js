// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Contribution UI: the Add / Correction / Contact / section URL forms. Submissions POST
// to a Cloudflare Worker (worker/), which files a labeled GitHub issue on the project's
// behalf — so visitors need no GitHub account. A Cloudflare Turnstile token gates spam.
// Depends only on the generic modal system and the vocab.

import { openContentModal } from './modal.js';
import { CONTINENTS, CLIMATES, MORPHOTYPES, CHEMOTYPES, DOMESTICATIONS, CATEGORY_ORDER, HEIGHTS } from '../data/vocab.mjs';
import { isValidUrl, parseWeeks } from './util.js';
import { makeDualSlider } from './slider.js';

// Flowering Time slider bounds (weeks), mirroring the Index facet's data-derived range.
const FLOWER_MIN = 6;
const FLOWER_MAX = 24;

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
  const reset = () => { ts.reset(); btn.disabled = false; btn.textContent = prev; };
  let res;
  try {
    res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, title, body, turnstileToken })
    });
  } catch (err) {
    // Never reached the Worker (offline, DNS, blocked, CORS).
    console.error('Submission: could not reach the server.', err);
    reset();
    window.alert('Sorry — we could not reach the server. Please check your connection and try again.');
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.url) { showSubmitSuccess(); return; }
  // The Worker was reached but rejected the request — surface the reason.
  console.error('Submission rejected by the server:', res.status, data);
  reset();
  window.alert(`Sorry — your submission was not accepted (error ${res.status}: ${data.error || 'unknown'}). Please try again.`);
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

// Country suggestions for the Country combobox — the distinct countries already in the
// dataset, supplied by app.js once it boots (free text is still allowed for new ones).
let countryOptions = [];
export function setCountryOptions(list) { countryOptions = Array.isArray(list) ? list : []; }
const optionsFor = (key) => (key === 'country' ? countryOptions : (SUBMIT_OPTIONS[key] || []));
const SUBMIT_FIELDS = [
  ['name', 'Variety Name', 'text'],
  ['aka', 'AKA (other names, comma-separated)', 'text'],
  ['continent', 'Region', 'select'],
  ['country', 'Country', 'combo'],
  ['region', 'Sub-region / locality', 'text'],
  ['climate', 'Climate', 'select'],
  ['morphotype', 'Morphotype', 'select'],
  ['chemotype', 'Chemotype', 'select'],
  ['domestication', 'Domestication', 'select'],
  ['category', 'Type (vernacular)', 'select'],
  ['type', 'Type descriptor', 'text'],
  ['height', 'Height', 'select'],
  ['flowering', 'Flowering Time (weeks)', 'weeks'],
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
  if (type === 'weeks') return ref.read();
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
function locationPicker(initLat, initLng, trackChanges) {
  const wrap = document.createElement('div');
  wrap.className = 'loc-picker';
  const mapEl = document.createElement('div');
  mapEl.className = 'loc-map';
  const coords = document.createElement('div');
  coords.className = 'loc-coords';
  const lat = coordField('Lat', 'latitude');
  const lng = coordField('Lng', 'longitude');
  coords.append(lat.label, lng.label);
  wrap.append(mapEl, coords);

  const startLat = initLat !== '' && initLat != null ? Number(initLat) : null;
  const startLng = initLng !== '' && initLng != null ? Number(initLng) : null;
  if (Number.isFinite(startLat)) lat.input.value = startLat;
  if (Number.isFinite(startLng)) lng.input.value = startLng;

  // Corrections: green the Lat/Lng label once that coordinate differs from the original.
  // Map clicks/drag set the inputs without firing 'input', so onCoordSet re-checks both.
  let onCoordSet = null;
  if (trackChanges) {
    const origLat = lat.input.value, origLng = lng.input.value;
    const markLat = () => lat.label.classList.toggle('changed', lat.input.value !== origLat);
    const markLng = () => lng.label.classList.toggle('changed', lng.input.value !== origLng);
    lat.input.addEventListener('input', markLat);
    lng.input.addEventListener('input', markLng);
    onCoordSet = () => { markLat(); markLng(); };
  }

  requestAnimationFrame(() => initLocMap(mapEl, lat.input, lng.input, startLat, startLng, onCoordSet));
  return { el: wrap, latInput: lat.input, lngInput: lng.input };
}

async function initLocMap(mapEl, latInput, lngInput, startLat, startLng, onSet) {
  const hasStart = Number.isFinite(startLat) && Number.isFinite(startLng);
  const map = L.map(mapEl, {
    center: hasStart ? [startLat, startLng] : [20, 10],
    zoom: hasStart ? 4 : 1,
    minZoom: 0, maxZoom: 8,
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
    if (onSet) onSet(); // map/drag updates don't fire 'input' — re-check the changed labels
    if (!marker) {
      marker = L.marker([la, ln], { icon: PIN, draggable: true }).addTo(map);
      marker.on('dragend', () => { const p = marker.getLatLng(); place(p.lat, p.lng); });
    } else {
      marker.setLatLng([la, ln]);
    }
  }
  if (hasStart) place(startLat, startLng);
  map.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
  const syncFromInputs = () => {
    const la = parseFloat(latInput.value); const ln = parseFloat(lngInput.value);
    if (Number.isFinite(la) && Number.isFinite(ln)) { place(la, ln); map.panTo([la, ln]); }
  };
  latInput.addEventListener('change', syncFromInputs);
  lngInput.addEventListener('change', syncFromInputs);
  setTimeout(() => {
    map.invalidateSize(); // re-measure once the modal has laid out
    if (!hasStart) map.fitWorld({ animate: false }); // no coords yet → show the whole world
  }, 60);
}

// Free-text fields (text inputs + textareas) that get an inline added/changed-text diff in
// the corrections form. The rest of the tracked fields just get the green outline.
const DIFF_TEXT_KEYS = new Set(['name', 'aka', 'country', 'region', 'type', 'overview', 'history', 'description', 'grow']);

// Splits a string into whitespace / non-whitespace tokens that concatenate back to it.
function tokenize(s) { return s.match(/\s+|\S+/g) || []; }

// Token-level diff: returns the CURRENT string as [{ text, added }] segments, where `added`
// marks tokens not present in the original (insertions/changes). Deleted tokens are omitted
// (we only ever show what's in the box now). LCS-based so unchanged runs stay unmarked.
function diffSegments(orig, cur) {
  if (orig === cur) return [{ text: cur, added: false }];
  const a = tokenize(orig), b = tokenize(cur), n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const segs = [];
  const push = (text, added) => {
    const last = segs[segs.length - 1];
    if (last && last.added === added) last.text += text; else segs.push({ text, added });
  };
  let i = 0, j = 0;
  while (j < m) {
    if (i < n && a[i] === b[j] && dp[i][j] === dp[i + 1][j + 1] + 1) { push(b[j], false); i++; j++; }
    else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) { i++; }    // token only in original → deleted, not shown
    else { push(b[j], true); j++; }                            // token only in current → added/changed
  }
  return segs;
}

// Overlays a text input/textarea with a backdrop that renders the same text but paints the
// added/changed words green (native fields can't colour part of their own text). When nothing
// is added the backdrop is hidden and the field looks normal; otherwise the field's own text
// goes transparent and the backdrop shows through. `onChanged(bool)` fires whenever the
// value's edited-state vs the original flips (used to green the field's label).
function attachTextDiff(field, multiline, original, onChanged) {
  const hl = document.createElement('div');
  hl.className = 'hl' + (multiline ? ' hl--multiline' : '');
  const backdrop = document.createElement('div');
  backdrop.className = 'hl-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  field.classList.add('hl-input');
  field.parentNode.replaceChild(hl, field);
  hl.append(backdrop, field);

  const render = () => {
    const segs = diffSegments(original, field.value);
    hl.classList.toggle('diffing', segs.some((s) => s.added)); // overlay only when there's added text
    if (onChanged) onChanged(field.value !== original);
    backdrop.textContent = '';
    for (const s of segs) {
      if (s.added) { const sp = document.createElement('span'); sp.className = 'added'; sp.textContent = s.text; backdrop.appendChild(sp); }
      else backdrop.appendChild(document.createTextNode(s.text));
    }
    if (multiline && field.value.endsWith('\n')) backdrop.appendChild(document.createTextNode(' ')); // show the last empty line
    backdrop.scrollTop = field.scrollTop; backdrop.scrollLeft = field.scrollLeft;
  };
  field.addEventListener('input', render);
  field.addEventListener('scroll', () => { backdrop.scrollTop = field.scrollTop; backdrop.scrollLeft = field.scrollLeft; });
  render();
}

// In the corrections form, flag each field the user has edited by turning its label green
// (a coloured box clashed with the focus outline). Free-text fields additionally get the
// inline word-level diff (see attachTextDiff). lat/lng are handled inside the location picker
// (their own labels); the References list has no single original value to diff against.
function highlightChanges(fields) {
  const SKIP = new Set(['lat', 'lng', 'sources']);
  for (const [key, , type] of SUBMIT_FIELDS) {
    if (SKIP.has(key) || !fields[key]) continue;
    const el = type === 'weeks' ? fields[key].el : fields[key];     // weeks stores its slider wrap
    const container = el.closest('.submit-field');
    const mark = (changed) => container && container.classList.toggle('changed', changed);
    if (DIFF_TEXT_KEYS.has(key)) {
      attachTextDiff(fields[key], type === 'textarea', fields[key].value, mark);
      continue;
    }
    const initial = readField(type, fields[key]);
    const update = () => mark(readField(type, fields[key]) !== initial);
    const controls = type === 'weeks' ? [...el.querySelectorAll('input[type="range"]')] : [el];
    controls.forEach((c) => { c.addEventListener('input', update); c.addEventListener('change', update); });
  }
}

// Builds the add/correction form (mirrors the variety panel); submits via the Worker proxy.
function buildSubmissionForm(body, mode, strain, sections) {
  const pre = prefillFrom(strain, sections);
  const intro = document.createElement('p');
  intro.className = 'modal-note';
  intro.textContent = mode === 'correct'
    ? `Edit the fields you want changed for "${strain.name}", then submit. Your suggestion is reviewed before it appears.`
    : 'Suggest a new variety. Fill in what you know — only the variety name is required. Your suggestion is reviewed before it appears.';
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
      hint.textContent = 'Click the map to set the origin, or drag the leaf. Coordinates are approximate.';
      const loc = locationPicker(pre.lat, pre.lng, mode === 'correct');
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
      // Preserve a prefilled value that isn't one of the standard options (e.g. a free-text
      // height like "Tall (2–4m)") so a correction doesn't silently drop it.
      if (pre[key] && !SUBMIT_OPTIONS[key].includes(pre[key])) {
        const op = document.createElement('option');
        op.value = pre[key]; op.textContent = pre[key];
        field.appendChild(op);
      }
      if (pre[key] != null) field.value = pre[key];
      fields[key] = field; wrap.appendChild(field);
    } else if (type === 'combo') {
      const field = document.createElement('input');
      field.type = 'text'; field.setAttribute('list', `dl-${key}`);
      const dl = document.createElement('datalist'); dl.id = `dl-${key}`;
      for (const o of optionsFor(key)) {
        const op = document.createElement('option'); op.value = o; dl.appendChild(op);
      }
      if (pre[key] != null) field.value = pre[key];
      fields[key] = field; wrap.append(field, dl);
    } else if (type === 'weeks') {
      // Dual-thumb weeks slider (same control as the Index Flowering Time facet). Corrections
      // preset to the variety's existing range; an Add defaults to 9–14 weeks. Widening to the
      // full span still means "unspecified" (read() returns '').
      const clamp = (v) => Math.max(FLOWER_MIN, Math.min(FLOWER_MAX, v));
      const pw = parseWeeks(pre.flowering);
      let lo = mode === 'correct' ? FLOWER_MIN : 9;
      let hi = mode === 'correct' ? FLOWER_MAX : 14;
      if (pw.min !== '' && pw.max !== '') {
        lo = clamp(+pw.min); hi = clamp(+pw.max);
        if (lo > hi) [lo, hi] = [hi, lo];
        if (hi - lo < 1) hi = clamp(lo + 1);
      } else if (pw.min !== '') {
        lo = clamp(+pw.min); hi = clamp(+pw.min + 1);
        if (lo === hi) lo = clamp(hi - 1);
      }
      const cur = { lo, hi };
      const slider = makeDualSlider(FLOWER_MIN, FLOWER_MAX, (l, h) => { cur.lo = l; cur.hi = h; }, lo, hi, 1);
      fields[key] = {
        el: slider.wrap,
        read: () => (cur.lo === FLOWER_MIN && cur.hi === FLOWER_MAX ? '' : `${cur.lo}–${cur.hi} weeks`)
      };
      wrap.appendChild(slider.wrap);
      slider.update();
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
  if (mode === 'correct') highlightChanges(fields); // green outline on edited fields
  const tsBox = document.createElement('div'); tsBox.className = 'turnstile-box';
  const ts = mountTurnstile(tsBox);
  const submit = document.createElement('button');
  submit.type = 'submit'; submit.className = 'panel-submit'; submit.textContent = 'Submit';
  form.append(tsBox, submit);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const vals = {};
    for (const [key, , type] of SUBMIT_FIELDS) vals[key] = readField(type, fields[key]);
    if (!vals.name) { window.alert('Variety name is required.'); return; }
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
  openContentModal('Suggest Addition', (body) => buildSubmissionForm(body, 'add', null, {}), { persistent: true });
}

export async function openStrainSubmit(strain) {
  const sections = await fetchWriteupSections(strain.id);
  openContentModal('Suggest Corrections', (body) => buildSubmissionForm(body, 'correct', strain, sections), { persistent: true });
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
  }, { persistent: true });
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
  }, { persistent: true });
}
