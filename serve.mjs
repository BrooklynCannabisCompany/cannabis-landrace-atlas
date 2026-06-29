// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors
//
// Tiny dependency-free static file server for local development (`npm run serve`).
// It serves the repo as-is, but with `Cache-Control: no-store` so the browser NEVER caches
// JS/CSS/JSON — local edits always show on reload, which avoids the stale-cache confusion
// where an old cached module mismatches fresh ones. NOT used in production (GitHub Pages
// serves the static files directly); this is a dev convenience only.
//
// Usage: node serve.mjs [port]   (default 8000)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2]) || 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    if (pathname.endsWith('/')) pathname += 'index.html';
    // Resolve within root; reject path traversal.
    const filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root)) { res.writeHead(403).end('Forbidden'); return; }

    const info = await stat(filePath);
    const target = info.isDirectory() ? join(filePath, 'index.html') : filePath;
    const body = await readFile(target);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store' // the whole point: never cache during dev
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}).listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}  (no-store; Ctrl+C to stop)`);
});
