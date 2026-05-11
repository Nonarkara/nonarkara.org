/**
 * NON — Memory Palace · Service Worker (v2)
 *
 * v2 changes:
 *   - Split monolith: index.html + styles.css + app.js
 *   - Added to precache: /styles.css, /app.js
 *   - Cache version bumped
 */

const CACHE_VERSION = 'non-2026-05-12-v2';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL = [
  '/',
  '/index.html',
  '/styles.css',                    // v2: extracted from inline
  '/app.js',                        // v2: extracted from inline
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/og.png',
  '/og.svg',
  '/cv.pdf',
  '/art-manifest.json',
  '/vendor-three-0.160.0.js',
  '/portraits/01-speaker.jpg',
  '/portraits/02-depa.jpg',
  '/portraits/03-asean.jpg',
  '/portraits/04-roundtable.jpg',
  '/portraits/total-domination.jpg',
  '/portraits/p-01-formal-2024.jpg',
  '/portraits/p-02-formal-2026.jpg',
  '/portraits/p-03-formal-alt.jpg',
  '/portraits/p-04-john-wick.jpg',
  '/portraits/p-05-blue-suit-window.jpg',
  '/portraits/p-06-leap-east-2026.jpg',
  '/portraits/p-07-civil-service.jpg',
  '/city-photos/bangkok.jpg',
  '/city-photos/london.jpg',
  '/city-photos/tokyo.jpg',
  '/city-photos/new-york.jpg',
  '/city-photos/sydney.jpg',
];

const MUSIC = Array.from({ length: 10 }, (_, i) =>
  `/music/track-${String(i + 1).padStart(2, '0')}.mp3`
);

const CDN = [
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
];

const PRECACHE = [...SHELL, ...MUSIC, ...CDN];

const CDN_HOSTS = new Set([
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'images.metmuseum.org',
  'www.artic.edu',
]);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const req = new Request(url, { mode: url.startsWith('http') ? 'no-cors' : 'same-origin' });
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) {
          await cache.put(url, res.clone());
        }
      } catch (e) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k !== CACHE_VERSION && k !== RUNTIME_CACHE)
      .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'api.nonarkara.org') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response('{"sites":{}}', { headers: { 'content-type': 'application/json' } });
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) {
        if (req.destination === 'document') {
          fetch(req).then(res => {
            if (res && res.ok) caches.open(CACHE_VERSION).then(c => c.put(req, res));
          }).catch(() => {});
        }
        return cached;
      }
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        if (req.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        throw e;
      }
    })());
    return;
  }

  if (CDN_HOSTS.has(url.hostname)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req, { mode: req.mode === 'navigate' ? 'navigate' : 'no-cors' });
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return cached || Response.error();
      }
    })());
    return;
  }
});
