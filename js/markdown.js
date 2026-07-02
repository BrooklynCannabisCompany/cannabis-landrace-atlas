// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Thin wrapper around the vendored `marked` global (lib/marked.min.js), with an
// allowlist sanitizer applied to the output. Write-ups are first-party Markdown, but
// they accept community contributions, so we never trust raw HTML that may appear in a
// `.md` file. The sanitizer is default-deny: unknown elements are unwrapped (their text
// kept), unknown attributes are stripped, and only http(s)/mailto/# hrefs survive.

// Tag -> allowed attributes. Everything our write-ups legitimately produce.
const ALLOWED = {
  A: ['href', 'title'], P: [], BR: [], HR: [],
  EM: [], STRONG: [], DEL: [], CODE: [], PRE: [], BLOCKQUOTE: [],
  H1: [], H2: [], H3: [], H4: [], H5: [], H6: [],
  UL: [], OL: [], LI: [], SUP: [], SUB: [],
  TABLE: [], THEAD: [], TBODY: [], TR: [], TH: [], TD: []
};
export const SAFE_HREF = /^(https?:|mailto:|#)/i;

function sanitize(html) {
  const tpl = document.createElement('template'); // inert: no scripts run, no images load
  tpl.innerHTML = html;
  for (const el of [...tpl.content.querySelectorAll('*')]) {
    const allowedAttrs = ALLOWED[el.tagName];
    if (!allowedAttrs) { el.replaceWith(...el.childNodes); continue; } // unwrap, keep text
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (!allowedAttrs.includes(name)) { el.removeAttribute(attr.name); continue; }
      if (name === 'href' && !SAFE_HREF.test(attr.value.trim())) el.removeAttribute(attr.name);
    }
  }
  return tpl.innerHTML;
}

// Returns sanitized HTML for first-party Markdown (our write-up files).
export function renderMarkdown(md) {
  if (!md) return '';
  return sanitize(globalThis.marked.parse(md, { gfm: true, breaks: false }));
}
