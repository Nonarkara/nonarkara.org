/**
 * NON OS · Service Worker
 *
 * Bump CACHE_VERSION in the same commit as any change to index.html,
 * styles.css, app.js or mixtape.html. The fetch handler is cache-first
 * for same-origin, so a stale version means users keep the old shell.
 */

const CACHE_VERSION = 'non-2026-08-11-v4.17';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// The app's own code. These are always revalidated when online so a
// deploy is visible on the next load, not the load after the load after.
const CODE = new Set([
  '/', '/index.html', '/mixtape.html',
  '/styles.css', '/app.js', '/discover.js', '/sky.js', '/ground.js',
  '/pavilion.js', '/glasshouse.js', '/savoye.js', '/farnsworth.js',
  '/walk.js', '/daylight.js', '/poems.js', '/starlore.js', '/look.js', '/pool.js', '/interiors.js',
  // Must be network-first or the staleness check reads a stale answer
  // about staleness, which is a very good way to never fix anything.
  '/version.json',
  '/heal',
]);

const SHELL = [
  '/',
  '/index.html',
  '/mixtape.html',
  '/styles.css',                    // v2: extracted from inline
  '/app.js',                        // v2: extracted from inline
  '/discover.js',                   // pavilion discovery counter
  '/sky.js',                        // the planetarium — must work offline
  '/pavilion.js',                   // the Barcelona plan
  '/glasshouse.js',                 // New Canaan, 1949
  '/savoye.js',                     // Poissy, 1931
  '/farnsworth.js',                 // Plano, 1951
  '/walk.js',                       // first-person movement
  '/daylight.js',                   // sun, weather, rain
  '/poems.js',                      // the wall, one day at a time
  '/starlore.js',                   // what the constellations mean
  '/look.js',                       // the one owner of the camera
  '/pool.js',                       // the world, reflected in the water
  '/interiors.js',                  // the furniture that IS the plan
  '/ground.js',                     // the satellite floor (tiles need network)
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

  // The code of the app is network-first; everything else is cache-first.
  //
  // This used to be cache-first for all same-origin requests, and app.js
  // was served from cache with no revalidation at all. The effect: after
  // a deploy, a returning visitor kept running the OLD app.js until a new
  // service worker activated — and sw.js itself is edge-cached for four
  // hours. So a shipped change could be invisible for hours on the one
  // browser that mattered, while curl showed the new build live. That is
  // exactly how you conclude "none of the work was committed."
  //
  // Network-first here costs one conditional request per file when online
  // and changes nothing offline: the cache is still written on every
  // success and still answers the moment the network fails.
  if (url.origin === self.location.origin) {
    const isCode = CODE.has(url.pathname) || req.destination === 'document';
    event.respondWith((async () => {
      if (isCode) {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(req, fresh.clone());
            return fresh;
          }
        } catch (e) { /* offline — fall through to cache */ }
        const cachedCode = await caches.match(req);
        if (cachedCode) return cachedCode;
        if (req.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return fetch(req);
      }

      const cached = await caches.match(req);
      if (cached) {
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
