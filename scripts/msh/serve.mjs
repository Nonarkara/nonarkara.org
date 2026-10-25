#!/usr/bin/env node
/**
 * A static server for local measurement.
 *
 * Python's http.server closes the connection after each response under
 * HTTP/1.0 rules. A browser that loads thirty ES modules at once then gets
 * ERR_CONNECTION_RESET on half of them, and the app never boots — which
 * looks exactly like a broken app and is not one. This server speaks
 * HTTP/1.1 with keep-alive, which is what a browser expects.
 *
 *   node scripts/msh/serve.mjs 8783
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.argv[2] || 8783);
const ROOT = path.resolve(process.argv[3] || process.cwd());

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('no'); return; }
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(302, { Location: rel + '/' }).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (_) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log('serving', ROOT, 'on http://127.0.0.1:' + PORT);
});
