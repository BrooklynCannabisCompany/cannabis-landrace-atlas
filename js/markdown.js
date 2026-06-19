// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Thin wrapper around the vendored `marked` global (lib/marked.min.js).
// Returns an HTML string for trusted, first-party Markdown (our write-up files).
export function renderMarkdown(md) {
  if (!md) return '';
  return globalThis.marked.parse(md, { gfm: true, breaks: false });
}
