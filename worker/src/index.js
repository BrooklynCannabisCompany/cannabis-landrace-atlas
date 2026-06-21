// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// Cloudflare Worker: accepts a submission POST from the static site and files a
// pre-filled, labeled GitHub issue on the project's behalf — so visitors need no
// GitHub account. A Cloudflare Turnstile token is verified server-side to block
// spam (the account requirement used to do that for free).
//
// Secrets (set with `wrangler secret put`, never committed):
//   GITHUB_TOKEN      - token that can create issues on REPO (see worker/README.md)
//   TURNSTILE_SECRET  - Cloudflare Turnstile secret key

const REPO = 'BrooklynCannabisCompany/cannabis-landrace-atlas';

// Only the static site's own origin may call this endpoint (CORS).
const ALLOW_ORIGIN = 'https://brooklyncannabiscompany.github.io';

// Allowed issue labels — mirrors the in-app submission types. Anything else is
// rejected so the endpoint can't be used to create arbitrary labels/issues.
const ALLOWED_LABELS = new Set([
  'add request', 'update request', 'feature request', 'bug', 'feedback',
  'add image request', 'add seed source request', 'add forum request', 'add reference request'
]);

const CORS = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    let data;
    try { data = await request.json(); } catch { return json({ error: 'Bad JSON' }, 400); }
    const { label, title, body, turnstileToken } = data || {};

    // Spam gate: verify the Turnstile token before doing anything else.
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET, turnstileToken, request.headers.get('CF-Connecting-IP'));
    if (!ok) return json({ error: 'Spam check failed' }, 403);

    // Validate input (defensive — the front end already constrains these).
    if (!ALLOWED_LABELS.has(label)) return json({ error: 'Invalid label' }, 400);
    if (typeof title !== 'string' || !title.trim() || title.length > 256) return json({ error: 'Invalid title' }, 400);
    if (typeof body !== 'string' || !body.trim() || body.length > 20000) return json({ error: 'Invalid body' }, 400);

    const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'cla-submit-worker',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body, labels: [label] })
    });
    if (!res.ok) return json({ error: 'Could not create issue' }, 502);

    const issue = await res.json();
    return json({ url: issue.html_url }, 200);
  }
};

async function verifyTurnstile(secret, token, ip) {
  if (!secret || !token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const d = await r.json().catch(() => ({}));
  return !!d.success;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}
