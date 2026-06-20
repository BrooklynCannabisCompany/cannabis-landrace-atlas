// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// A single fast, body-anchored tooltip shown for any element carrying `data-tip`.
// Uses fixed positioning so it is never clipped by scrolling panels/modals, and
// appears instantly on hover/focus (unlike the browser's slow native `title`).

let tipEl = null;
let tipTarget = null; // element currently described by the tooltip
const TIP_ID = 'cla-tooltip';

function ensureTip() {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'tooltip';
    tipEl.id = TIP_ID;
    tipEl.setAttribute('role', 'tooltip');
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

function showTip(target) {
  const text = target.getAttribute('data-tip');
  if (!text) return;
  const tip = ensureTip();
  tip.textContent = text;
  tip.hidden = false;
  target.setAttribute('aria-describedby', TIP_ID); // announce to screen readers
  tipTarget = target;
  // Measure after content is set, then place above (flipping below if cramped).
  const r = target.getBoundingClientRect();
  const tr = tip.getBoundingClientRect();
  let top = r.top - tr.height - 8;
  const below = top < 4;
  if (below) top = r.bottom + 8;
  let left = r.left + r.width / 2 - tr.width / 2;
  left = Math.max(6, Math.min(left, window.innerWidth - tr.width - 6));
  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
  tip.classList.toggle('below', below);
}

function hideTip() {
  if (tipEl) tipEl.hidden = true;
  if (tipTarget) { tipTarget.removeAttribute('aria-describedby'); tipTarget = null; }
}

// Wires global delegated listeners once. Any current or future [data-tip] works.
export function initTooltips() {
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-tip]');
    if (t) showTip(t);
  });
  document.addEventListener('mouseout', (e) => {
    const t = e.target.closest('[data-tip]');
    if (t && !t.contains(e.relatedTarget)) hideTip();
  });
  document.addEventListener('focusin', (e) => {
    const t = e.target.closest('[data-tip]');
    if (t) showTip(t);
  });
  document.addEventListener('focusout', hideTip);
  // Hide on any scroll (capture: catches scrolling containers too).
  window.addEventListener('scroll', hideTip, true);
}
