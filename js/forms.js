// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Contribution UI: the Add / Correction / Contact / section URL forms, and the helpers
// that file a pre-filled GitHub issue. No backend or token — the user submits the issue
// while signed into GitHub. Depends only on the generic modal system and the vocab.

import { openContentModal } from './modal.js';
import { CONTINENTS, CLIMATES, MORPHOTYPES, CHEMOTYPES, DOMESTICATIONS, CATEGORY_ORDER, HEIGHTS } from '../data/lib/vocab.mjs';

// Repository that submission issues are filed against. Update if the repo is renamed.
const REPO = 'BrooklynCannabisCompany/cannabis-landrace-atlas';

export function isValidUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

// An anchor to the GitHub repository.
export function repoLink(text) {
  const a = document.createElement('a');
  a.href = `https://github.com/${REPO}`;
  a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}

// Builds the pre-filled "new issue" URL, opens it in a new tab (via an anchor click —
// more reliable than window.open against pop-up blockers), and returns the URL so callers
// can also show a guaranteed-clickable fallback.
function openIssue(label, title, bodyText) {
  const url = `https://github.com/${REPO}/issues/new?labels=${encodeURIComponent(label)}`
    + `&title=${encodeURIComponent(title)}&body=${encodeURIComponent(bodyText)}`;
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}

// Replaces the modal with a confirmation + a direct link, so submission never depends on
// a pop-up succeeding (and explains the private-repo sign-in requirement).
function showIssueFallback(url) {
  openContentModal('Finish on GitHub', (body) => {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = 'Open the pre-filled issue on GitHub';
    p.append('A new tab should have opened. If it did not, ', a, ', then click “Submit new issue” there to send your request.');
    const note = document.createElement('p');
    note.className = 'modal-note';
    note.textContent = 'The repository is currently private, so you must be signed in to GitHub with access for the page to load.';
    body.append(p, note);
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
  ['sources', 'Sources (required — real, verifiable links)', 'textarea']
];
// Long-form sections rendered as headed blocks in the issue (not "**Label:** value").
const PROSE_KEYS = new Set(['overview', 'history', 'description', 'grow', 'sources']);

// Parses a flowering value ("7–9w", "8 weeks") into { min, max } strings.
function parseWeeks(f) {
  const r = String(f || '').match(/(\d+)\s*[–-]\s*(\d+)/);
  if (r) return { min: r[1], max: r[2] };
  const s = String(f || '').match(/(\d+)/);
  return s ? { min: s[1], max: '' } : { min: '', max: '' };
}

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
  return ref.value.trim();
}

// Builds the add/correction form (mirrors the variety panel) and files an issue on submit.
function buildSubmissionForm(body, mode, strain, sections) {
  const pre = prefillFrom(strain, sections);
  const intro = document.createElement('p');
  intro.className = 'modal-note';
  intro.textContent = mode === 'correct'
    ? `Edit the fields you want changed for "${strain.name}", then submit. This opens a pre-filled GitHub issue for review.`
    : 'Suggest a new variety. Fill in what you know — Name and Sources are required. This opens a pre-filled GitHub issue for review.';
  const form = document.createElement('form');
  form.className = 'submit-form';
  const fields = {};
  for (const [key, label, type] of SUBMIT_FIELDS) {
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
  const submit = document.createElement('button');
  submit.type = 'submit'; submit.className = 'panel-submit'; submit.textContent = 'Submit';
  form.appendChild(submit);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const vals = {};
    for (const [key, , type] of SUBMIT_FIELDS) vals[key] = readField(type, fields[key]);
    if (!vals.name) { window.alert('Name is required.'); return; }
    if (!vals.sources) { window.alert('Please cite at least one real, verifiable source.'); return; }
    const shortLines = [];
    const blocks = [];
    for (const [key, label] of SUBMIT_FIELDS) {
      if (!vals[key]) continue;
      const clean = label.replace(/\s*\(.*\)$/, '');
      if (PROSE_KEYS.has(key)) blocks.push(`### ${clean}\n\n${vals[key]}`);
      else shortLines.push(`**${clean}:** ${vals[key]}`);
    }
    const parts = [shortLines.join('\n'), ...blocks];
    let url;
    if (mode === 'correct') {
      const text = `Correction request for **${strain.name}** (id: \`${strain.id}\`).\n\n${parts.join('\n\n')}\n\n_Submitted via the Atlas correction form._`;
      url = openIssue('update request', `Correction: ${strain.name}`, text);
    } else {
      const text = `New variety submission.\n\n${parts.join('\n\n')}\n\n_Submitted via the Atlas add form._`;
      url = openIssue('add request', `Add: ${vals.name}`, text);
    }
    showIssueFallback(url);
  });

  body.append(intro, form);
}

export function openFeedbackSubmit() {
  openContentModal('Suggest an Addition', (body) => buildSubmissionForm(body, 'add', null, {}));
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
    intro.textContent = 'Send a feature request, bug report, or general feedback. This opens a pre-filled GitHub issue.';
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
    const submit = document.createElement('button');
    submit.type = 'submit'; submit.className = 'panel-submit'; submit.textContent = 'Submit';
    form.appendChild(submit);

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
      showIssueFallback(openIssue(label, `${display}: ${title}`, text));
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

// ⊕ button: a list of URL inputs (add/remove, validated) -> labeled GitHub issue.
export function openSectionSubmit(strain, section) {
  const label = SECTION_LABELS[section] || 'add request';
  openContentModal(`Add ${section} — ${strain.name}`, (body) => {
    const intro = document.createElement('p');
    intro.className = 'modal-note';
    intro.textContent = `Add one or more ${section} URLs for "${strain.name}". Each must be a valid link. Submitting opens a pre-filled GitHub issue for review.`;
    const form = document.createElement('form');
    form.className = 'submit-form';
    const list = document.createElement('div');
    list.className = 'url-list';

    function validate(inp) {
      const v = inp.value.trim();
      inp.classList.toggle('invalid', !!v && !isValidUrl(v));
    }
    function addRow(value) {
      const row = document.createElement('div');
      row.className = 'url-row';
      const inp = document.createElement('input');
      inp.type = 'url'; inp.className = 'url-input'; inp.placeholder = 'https://…';
      if (value) inp.value = value;
      inp.addEventListener('blur', () => validate(inp));
      const rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'url-remove'; rm.textContent = '×';
      rm.setAttribute('aria-label', 'Remove this URL');
      rm.addEventListener('click', () => {
        row.remove();
        if (!list.querySelector('.url-row')) addRow();
      });
      row.append(inp, rm);
      list.appendChild(row);
      inp.focus();
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button'; addBtn.className = 'linklike'; addBtn.textContent = '+ Add another URL';
    addBtn.addEventListener('click', () => {
      const inputs = [...list.querySelectorAll('.url-input')];
      const bad = inputs.find((i) => i.value.trim() && !isValidUrl(i.value.trim()));
      if (bad) { validate(bad); bad.focus(); return; }
      addRow();
    });

    const submit = document.createElement('button');
    submit.type = 'submit'; submit.className = 'panel-submit'; submit.textContent = 'Submit';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const urls = [...list.querySelectorAll('.url-input')].map((i) => i.value.trim()).filter(Boolean);
      if (!urls.length) { window.alert(`Please add at least one ${section} URL.`); return; }
      const invalid = urls.filter((u) => !isValidUrl(u));
      if (invalid.length) {
        [...list.querySelectorAll('.url-input')].forEach(validate);
        window.alert(`These are not valid URLs:\n\n${invalid.join('\n')}`);
        return;
      }
      const text = `Requested **${section}** links for **${strain.name}** (id: \`${strain.id}\`):\n\n`
        + urls.map((u) => `- ${u}`).join('\n')
        + `\n\n_Submitted via the Atlas ${section} form._`;
      showIssueFallback(openIssue(label, `${section}: ${strain.name}`, text));
    });

    form.append(list, addBtn, submit);
    addRow();
    body.append(intro, form);
  });
}
