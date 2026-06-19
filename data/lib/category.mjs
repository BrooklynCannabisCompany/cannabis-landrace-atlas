// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
export const CATEGORIES = new Set([
  'Sativa', 'Indica', 'Ruderalis', 'Hybrid-Intermediate', 'Hemp', 'Feral', 'Mixed'
]);

// Order matters: earlier rules win.
export function normalizeCategory(typeText) {
  const t = (typeText || '').toLowerCase();
  if (/\bferal\b|\bwild\b/.test(t)) return 'Feral';
  if (/\bhemp\b/.test(t)) return 'Hemp';
  if (/\bruderalis\b|\bauto/.test(t)) return 'Ruderalis';
  if (/intermediate|hybrid|indica[–-]sativa|sativa[–-]indica/.test(t)) return 'Hybrid-Intermediate';
  if (/\bsativa\b/.test(t)) return 'Sativa';
  if (/\bindica\b/.test(t)) return 'Indica';
  if (/\bmixed\b/.test(t)) return 'Mixed';
  return 'Mixed';
}
