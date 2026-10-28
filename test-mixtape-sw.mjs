#!/usr/bin/env node
/**
 * The mixtape must survive Cloudflare's pretty-URL 308.
 *
 * /mixtape.html is a permanent redirect to /mixtape. A navigation request
 * has redirect mode "manual", so the service worker's fetch(event.request)
 * does not follow it. The old worker precached the followed response
 * (redirected still set) and handed that back for the navigation. Chrome
 * answers that with net::ERR_FAILED — the phone screen.
 *
 * This gate stands up the same 308 and the real sw.js, then opens both
 * URLs, online and from the cache.
 *
 *   node test-mixtape-sw.mjs
 */

import assert from 'node:assert';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadChromium } from './scripts/msh/playwright.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const sw = read('./sw.js');
const app = read('./app.js');
const index = read('./index.html');
const ship = read('./ship.sh');
const workflow = read('./.github/workflows/cloudflare-pages.yml');

const version = app.match(/const NON_VERSION = '([^']+)'/)[1];
const cacheVersion = sw.match(/const CACHE_VERSION = '([^']+)'/)[1];
assert.match(cacheVersion, /^non-\d{4}-\d{2}-\d{2}-v/);
assert.match(cacheVersion, new RegExp(`-v${version}$`),
  `CACHE_VERSION ${cacheVersion} must end with NON_VERSION v${version}`);

const shell = sw.slice(sw.indexOf('const SHELL = ['), sw.indexOf('const CDN = ['));
const code = sw.slice(sw.indexOf('const CODE = new Set(['), sw.indexOf('const SHELL = ['));
for (const list of [shell, code]) {
  assert(list.includes("'/mixtape'"), 'mixtape extensionless path missing from a SW list');
  assert(list.includes("'/mixtape.html'"), 'mixtape.html missing from a SW list');
  assert(!list.includes('.mp3'), 'music must not be precached');
}
assert(code.includes("'/heal'"), '/heal must stay network-first so ?reset can reach Clear-Site-Data');
assert(index.includes("location.search.indexOf('reset')"), 'manual nuke path /?reset removed');
assert(index.includes("fetch('/heal'"), '/heal purge removed from the page');
assert(index.includes('href="/mixtape"'), 'the desk tile should open the canonical mixtape URL');
assert(ship.includes('does not end with NON_VERSION'), 'ship.sh must refuse a cache/version mismatch');
assert(workflow.includes('dist/version.json'), 'the deploy stage must stamp version.json');

const ctx = {
  self: {
    addEventListener() {},
    skipWaiting() {},
    clients: { claim() {} },
    location: new URL('https://nonarkara.org/sw.js'),
  },
  caches: {},
  fetch() { throw new Error('fetch at load'); },
  Response, Request, Headers, URL, console,
};
vm.createContext(ctx);
vm.runInContext(sw, ctx);
assert.equal(ctx.canonicalPath('/mixtape.html'), '/mixtape');
assert.equal(ctx.canonicalPath('/index.html'), '/');
assert.equal(ctx.canonicalPath('/reading.html'), '/reading');
assert.equal(ctx.canonicalPath('/podcast-archive/index.html'), '/podcast-archive/');
assert.equal(ctx.canonicalPath('/mixtape'), '/mixtape');
assert.equal(ctx.canonicalPath('/styles.css'), '/styles.css');

const MIXTAPE = read('./mixtape.html');
const TINY_MP3 = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00]);

function fixture(title) {
  return `<!doctype html><title>${title}</title><h1>${title}</h1>`;
}

const HOME = `<!doctype html><title>HOME</title><h1>HOME</h1><script>
if (location.search.indexOf('reset') !== -1) {
  (async () => {
    const ws = await navigator.serviceWorker.getRegistrations();
    await Promise.all(ws.map(r => r.unregister()));
    const ks = await caches.keys();
    await Promise.all(ks.map(k => caches.delete(k)));
    try { await fetch('/heal', { cache: 'no-store' }); } catch (e) {}
    sessionStorage.setItem('reset-did', '1');
    location.replace('/');
  })();
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
</script>`;

const hits = [];
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  hits.push(url.pathname);
  const send = (status, body, headers) => {
    res.writeHead(status, headers);
    res.end(body);
  };
  if (url.pathname === '/sw.js') {
    send(200, sw, { 'content-type': 'text/javascript', 'cache-control': 'no-cache' });
    return;
  }
  if (url.pathname === '/heal') {
    send(200, '', { 'content-type': 'text/plain', 'cache-control': 'no-store', 'clear-site-data': '"cache"' });
    return;
  }
  if (url.pathname === '/mixtape.html') { send(308, 'redirect', { Location: '/mixtape' }); return; }
  if (url.pathname === '/reading.html') { send(308, 'redirect', { Location: '/reading' }); return; }
  if (url.pathname === '/index.html') { send(308, 'redirect', { Location: '/' }); return; }
  if (url.pathname === '/podcast-archive/index.html' || url.pathname === '/podcast-archive') {
    send(308, 'redirect', { Location: '/podcast-archive/' });
    return;
  }
  if (url.pathname === '/mixtape') {
    send(200, MIXTAPE, { 'content-type': 'text/html; charset=utf-8' });
    return;
  }
  if (url.pathname === '/reading') { send(200, fixture('READING'), { 'content-type': 'text/html' }); return; }
  if (url.pathname === '/podcast-archive/') { send(200, fixture('ARCHIVE'), { 'content-type': 'text/html' }); return; }
  if (url.pathname.startsWith('/music/track-') && url.pathname.endsWith('.mp3')) {
    send(200, TINY_MP3, { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=31536000' });
    return;
  }
  if (url.pathname === '/') { send(200, HOME, { 'content-type': 'text/html' }); return; }
  send(404, 'no', { 'content-type': 'text/plain' });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const chromium = await loadChromium();
const launch = { headless: true };
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
if (!process.env.CI && existsSync(chrome)) launch.executablePath = chrome;
const browser = await chromium.launch(launch);
const context = await browser.newContext();
const page = await context.newPage();
const failed = [];
page.on('requestfailed', (req) => failed.push(`${req.url()} ${req.failure()?.errorText || ''}`));

function navFailed(path, from) {
  return failed.slice(from).filter((line) => {
    const url = line.split(' ')[0];
    try {
      return new URL(url).pathname === path && line.includes('ERR_FAILED');
    } catch (_) {
      return false;
    }
  });
}

async function open(path) {
  const before = failed.length;
  const res = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const title = await page.title();
  const blown = navFailed(path, before);
  assert.equal(blown.length, 0, `${path} failed: ${blown.join('; ')}`);
  if (res) assert.equal(res.status(), 200, `${path} status ${res.status()}`);
  return title;
}

try {
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 });

  const cached = await page.evaluate(async () => {
    const out = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        const res = await cache.match(req);
        out.push({
          cache: name,
          path: new URL(req.url).pathname,
          status: res.status,
          redirected: res.redirected,
          type: res.type,
        });
      }
    }
    return out;
  });
  const precache = cached.filter((row) => row.cache === cacheVersion);
  for (const path of ['/mixtape', '/mixtape.html', '/']) {
    const row = precache.find((r) => r.path === path);
    assert(row, `precache missing ${path}`);
    assert.equal(row.redirected, false, `${path} was stored as a redirected response`);
    assert.equal(row.status, 200, `${path} precache status ${row.status}`);
  }
  assert(!precache.some((row) => row.path.includes('/music/')), 'precache contains music');

  assert.equal(await open('/mixtape.html'), 'A Mixtape from Non');
  assert.equal(await open('/mixtape'), 'A Mixtape from Non');
  assert.equal(await open('/'), 'HOME');
  assert.equal(await open('/index.html'), 'HOME');
  assert.equal(await open('/reading.html'), 'READING');
  assert.equal(await open('/podcast-archive/index.html'), 'ARCHIVE');

  hits.length = 0;
  assert.equal(await open('/mixtape.html'), 'A Mixtape from Non');
  assert(!hits.includes('/mixtape.html'), `navigation still requested the 308: ${hits.join(' ')}`);
  assert(hits.includes('/mixtape'), 'navigation did not fetch the extensionless mixtape');

  await context.setOffline(true);
  assert.equal(await open('/mixtape.html'), 'A Mixtape from Non');
  assert.equal(await open('/mixtape'), 'A Mixtape from Non');
  assert.equal(await open('/'), 'HOME');
  await context.setOffline(false);

  const music = await page.evaluate(async () => {
    const res = await fetch('/music/track-01.mp3');
    const again = await fetch('/music/track-01.mp3');
    const names = await caches.keys();
    const where = [];
    for (const name of names) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      if (keys.some((k) => new URL(k.url).pathname === '/music/track-01.mp3')) where.push(name);
    }
    return { status: res.status, again: again.status, type: res.headers.get('content-type'), where };
  });
  assert.equal(music.status, 200);
  assert.equal(music.again, 200);
  assert.equal(music.type, 'audio/mpeg');
  assert(music.where.some((name) => name.endsWith('-runtime')), `track not in the runtime cache: ${music.where.join(',')}`);
  assert(!music.where.some((name) => name === cacheVersion), 'track was precached');

  hits.length = 0;
  await page.goto(base + '/?reset', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => sessionStorage.getItem('reset-did') === '1', null, { timeout: 10000 });
  assert(hits.includes('/heal'), `/?reset did not reach /heal (${hits.join(' ')})`);

  console.log('mixtape sw: /mixtape.html and /mixtape return the document, online and offline');
} finally {
  await browser.close();
  server.close();
}
