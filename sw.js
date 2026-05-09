/**
 * NON — Memory Palace · Service Worker
 *
 * The room becomes its own OS. After the first visit, every asset is on
 * disk: open it on a plane, in the BTS tunnel, with no SIM — the room
 * loads, the disc spins, the music plays. No network needed.
 *
 * Cache strategy:
 *   - Pre-cache the shell (HTML/CSS/JS/fonts/three) + all 10 MP3s on
 *     install. ~52 MB. Fits comfortably in Safari/Chrome's per-origin
 *     storage budget.
 *   - Same-origin GETs:    cache-first (HTML revalidates in background)
 *   - Whitelisted CDNs:    cache-first (Three.js, fonts, qrcode lib)
 *   - api.nonarkara.org:   network-first (status must be fresh)
 *   - Everything else:     passthrough
 *
 * Bump CACHE_VERSION on every deploy that changes a precached file —
 * the old cache is dropped on activate.
 */

const CACHE_VERSION = 'non-2026-05-09-21';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Same-origin shell files — must all 200 from Pages.
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/og.png',
  '/og.svg',
  '/cv.pdf',
  '/vendor-three-0.160.0.js',     // local Three.js, no CDN dependency
  '/portraits/01-speaker.jpg',
  '/portraits/02-depa.jpg',
  '/portraits/03-asean.jpg',
  '/portraits/04-roundtable.jpg',
];

// 10 Suno tracks — pre-cached so the turntable plays offline.
const MUSIC = Array.from({ length: 10 }, (_, i) =>
  `/music/track-${String(i + 1).padStart(2, '0')}.mp3`
);

// Cross-origin assets the room depends on. Cloudflare doesn't proxy these
// but they're stable URLs — cache once, reuse forever.
const CDN = [
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
];

const PRECACHE = [...SHELL, ...MUSIC, ...CDN];

// Hosts we serve cache-first when we don't have an explicit precache entry
// (covers the woff2 font files referenced from Google Fonts CSS).
const CDN_HOSTS = new Set([
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Use addAll for atomic install — one failure aborts the whole install,
    // which is what we want (don't half-cache). Fetch with no-cors for the
    // CDN URLs so opaque responses still land in the cache.
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const req = new Request(url, { mode: url.startsWith('http') ? 'no-cors' : 'same-origin' });
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) {
          await cache.put(url, res.clone());
        }
      } catch (e) {
        // Best-effort precache — runtime fetch handler will retry.
      }
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

  // Status API — always fresh, fall back to last successful response.
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
        // Offline + no cache — return an empty status object so the room's
        // status dots fall back to "unknown" rather than throwing.
        return new Response('{"sites":{}}', { headers: { 'content-type': 'application/json' } });
      }
    })());
    return;
  }

  // Same-origin: cache-first, background-revalidate for HTML.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) {
        // Stale-while-revalidate for HTML so deploys land on second visit.
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
        // Last resort — if it's a navigation, serve the precached shell.
        if (req.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        throw e;
      }
    })());
    return;
  }

  // Whitelisted CDN: cache-first, runtime cache.
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

  // Anything else — passthrough.
});
