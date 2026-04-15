#!/usr/bin/env node
/**
 * Minimal HTTP server for the git-dashboard output/ dashboard.
 *
 * Usage:
 *   node serve.mjs            → http://localhost:3000
 *   node serve.mjs --port 8080
 *
 * Only serves files inside the output/ directory (path-traversal protected).
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { exec } from 'node:child_process';

const OUTPUT_DIR = resolve(join(process.cwd(), 'output'));

// ── CLI args ──────────────────────────────────────────────────────────────────
const portArg = process.argv.indexOf('--port');
const PORT = portArg !== -1 ? parseInt(process.argv[portArg + 1], 10) : 3000;

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.ico':  'image/x-icon',
};

// ── Server ────────────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  // Only allow GET / HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }

  // Strip query string and decode
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400); res.end('Bad Request'); return;
  }

  const file = urlPath === '/' ? '/index.html' : urlPath;

  // Resolve and check path traversal
  const filePath = resolve(join(OUTPUT_DIR, file));
  const safePrefix = OUTPUT_DIR.endsWith(sep) ? OUTPUT_DIR : OUTPUT_DIR + sep;
  if (filePath !== OUTPUT_DIR && !filePath.startsWith(safePrefix)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found: ' + file);
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME[ext] ?? 'application/octet-stream';
  const body = readFileSync(filePath);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
  });
  if (req.method === 'HEAD') { res.end(); return; }
  res.end(body);
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🌐  Dashboard : ${url}`);
  console.log('    Press Ctrl+C to stop\n');

  // Auto-open browser (best-effort)
  const opener =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32'  ? 'start' : 'xdg-open';
  exec(`${opener} ${url}`);
});
