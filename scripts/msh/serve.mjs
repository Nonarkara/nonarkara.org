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

// THE VERSION THIS TREE IS.
//
// The page asks /version.json whether it is the build the reader is looking
// at, and if the answer is "no" it purges the caches and navigates. A
// measurement that is navigating is a measurement of a page that is on its
// way somewhere else — and the sweep measured the desk on one width and the
// sign on the next because the navigation landed in between.
//
// So the server answers from the code it is serving, not from a file that
// can drift. app.js holds the one true version; version.json is written at
// ship time from it and is deliberately not committed. A local server that
// served the committed file would be serving a build that does not exist.
async function treeVersion() {
  try {
    const src = await readFile(path.join(ROOT, 'app.js'), 'utf8');
    const m = src.match(/const NON_VERSION = '([^']+)'/);
    const b = src.match(/const NON_BUILD = '([^']+)'/);
    return { version: m ? m[1] : '0', build: b ? b[1] : 'dev' };
  } catch (_) {
    return { version: '0', build: 'dev' };
  }
}

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

// The gate loads this site ninety-three times — once per route, per width —
// and every load used to re-download the whole module graph, because this
// server said `no-store`. On a loaded machine that is the difference between
// a desk that paints inside the instrument's five-second budget and one that
// does not, which is the difference between a receipt and a shell.
//
// So: revalidation instead of amnesia. The browser keeps the bytes and asks
// whether they are still true; the answer is a 304 with no body when they
// are. Nothing stale is ever served (the ETag changes the moment a file
// does), and nothing is re-downloaded for nothing.
const etagFor = (s) => `W/"${s.size.toString(16)}-${s.mtimeMs.toString(16)}"`;

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    // The build stamp the page reads to decide whether it is stale.
    if (rel === '/version.json') {
      const v = await treeVersion();
      const body = Buffer.from(JSON.stringify(v));
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
      });
      res.end(body);
      return;
    }
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('no'); return; }
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(302, { Location: rel + '/' }).end(); return; }
    const etag = etagFor(s);
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' }).end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      ETag: etag,
    });
    res.end(body);
  } catch (_) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log('serving', ROOT, 'on http://127.0.0.1:' + PORT);
});
