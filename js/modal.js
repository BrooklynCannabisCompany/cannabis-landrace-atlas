// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Generic modal/dialog mechanics: show/close with focus management, a Tab trap, and a
// content builder. No app- or data-specific logic lives here.

export const modal = document.getElementById('modal');
export const modalCard = modal.querySelector('.modal-card');
export const modalTitle = document.getElementById('modal-title');
export const modalBody = document.getElementById('modal-body');

const FOCUSABLE = 'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
let lastFocused = null; // element to restore focus to when a modal closes

// Shows the modal with focus management: remember the opener, move focus into the dialog.
export function showModal() {
  if (!modalCard.contains(document.activeElement)) lastFocused = document.activeElement; // keep opener across modal→modal
  modal.hidden = false;
  const first = modalCard.querySelector(FOCUSABLE);
  (first || modalCard).focus();
}

export function closeModal() {
  modal.hidden = true;
  modal.classList.remove('wide');
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  lastFocused = null;
}

// Clears the modal, sets the title, lets `build(body)` fill it, then shows it.
export function openContentModal(title, build) {
  modal.classList.remove('wide');
  modalTitle.textContent = title;
  modalBody.innerHTML = '';
  build(modalBody);
  showModal();
}

// Backdrop / close-button click.
modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeModal(); });

// Trap Tab within the open dialog.
modal.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || modal.hidden) return;
  const items = [...modalCard.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
