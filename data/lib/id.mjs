// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
export function slugify(name) {
  return (name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[()'".,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function makeUniqueId(name, seen) {
  const base = slugify(name) || 'entry';
  if (!seen.has(base)) {
    seen.add(base);
    return base;
  }
  let n = 2;
  while (seen.has(`${base}-${n}`)) n++;
  const id = `${base}-${n}`;
  seen.add(id);
  return id;
}
