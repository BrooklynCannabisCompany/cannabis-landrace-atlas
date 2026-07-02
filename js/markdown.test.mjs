// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Guards the documented security invariant (CLAUDE.md: "never relax"): the href
// allowlist that sanitize() applies to rendered Markdown. sanitize() itself needs a
// DOM, but the SAFE_HREF regex is pure and is what gates every <a href>. The sanitizer
// trims the value before testing, so these cases use the post-trim string.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAFE_HREF } from './markdown.js';

test('SAFE_HREF admits the intended schemes', () => {
  for (const ok of ['https://example.com', 'http://x.io', 'HTTPS://X', 'mailto:a@b.com', '#anchor']) {
    assert.ok(SAFE_HREF.test(ok), `should admit ${JSON.stringify(ok)}`);
  }
});

test('SAFE_HREF is default-deny for dangerous and non-allowlisted schemes', () => {
  const bad = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'java\tscript:alert(1)',   // tab-obfuscated scheme browsers may still run — not allowlisted
    'file:///etc/passwd',
    'ftp://host/x',
    '//evil.com',              // protocol-relative
    'relative/path'
  ];
  for (const b of bad) {
    assert.equal(SAFE_HREF.test(b), false, `should reject ${JSON.stringify(b)}`);
  }
});

test('SAFE_HREF anchors at the start (post-trim), so leading text defeats the scheme', () => {
  // sanitize() trims first, so leading whitespace is not what protects us here — the
  // anchor is. A value that only reaches an allowed scheme after other text is rejected.
  assert.equal(SAFE_HREF.test('x-javascript:alert(1)'), false);
  assert.equal(SAFE_HREF.test('nothttps://x'), false);
});
