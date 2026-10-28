#!/usr/bin/env node
/**
 * MSH MEASURE — the evidence half of the spatial law.
 *
 * This is the project's own driver. It uses the shared instrument from the
 * spatial-law package (vendored at scripts/spatial/) for the geometry, and
 * Playwright for the part the law demands and the gate cannot give: the
 * real interface, captured at 390, 1024 and 1440 px, plus the two surfaces
 * that are Canvas rather than DOM — the room, the ground map and the sky.
 *
 * The gate measures the DOM. The room is WebGL. So the DOM gate alone would
 * report the room as empty and pass it, which is the exact failure §6 of the
 * law exists to prevent: a PASS on a surface nobody measured.
 *
 * Usage:
 *   node scripts/msh/measure.mjs --url http://127.0.0.1:8784/index.html --out .msh
 *   node scripts/msh/measure.mjs --url ... --only ground,sky
 */

import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i === -1 ? d : argv[i + 1];
};
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html');
const OUT = path.resolve(arg('out', '.msh'));
const ONLY = arg('only', null);

const WIDTHS = [
  { w: 390, h: 844, name: 'phone' },
  { w: 1024, h: 768, name: 'tablet' },
  { w: 1440, h: 900, name: 'desktop' },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
});

const report = { url: URL_, at: new Date().toISOString(), surfaces: [] };

for (const vp of WIDTHS) {
  if (ONLY && !ONLY.split(',').some((s) => vp.name === s.trim())) continue;

  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    permissions: [],
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  // The boot curtain fades at 1.2 s and is display:none at ~2.1 s. Until it
  // is gone the door is covered — a capture taken earlier photographs the
  // boot logo and calls it "the landing page". Wait for the curtain, and
  // for the door itself to be the thing on screen.
  await page.waitForFunction(
    () => {
      const b = document.getElementById('boot');
      if (b && getComputedStyle(b).display !== 'none') return false;
      const d = document.getElementById('door');
      if (!d || d.classList.contains('skip')) return true;
      return getComputedStyle(d).display !== 'none';
    },
    { timeout: 15000 },
  ).catch(() => {});
  await page.waitForTimeout(600);

  // ── The door / landing screen. This is the first thing a visitor sees,
  //    so it is measured first, before anything is clicked.
  const door = await page.evaluate(() => {
    const el = document.getElementById('door');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const kids = [...el.children].map((c) => {
      const b = c.getBoundingClientRect();
      return {
        tag: c.tagName.toLowerCase(),
        cls: c.className,
        x: Math.round(b.x), y: Math.round(b.y),
        w: Math.round(b.width), h: Math.round(b.height),
        bottom: Math.round(b.bottom),
        text: (c.textContent || '').trim().slice(0, 60),
      };
    });
    return {
      display: cs.display, position: cs.position,
      bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 40),
      zIndex: cs.zIndex,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      viewport: { w: innerWidth, h: innerHeight },
      children: kids,
      // Anything painted OVER the door. The door is a full-screen curtain;
      // anything with a higher z-index that is still visible is furniture
      // from another view sitting on top of the landing page.
      paintedOver: [...document.body.querySelectorAll('*')].filter((e) => {
        if (e.id === 'door' || e.closest('#door')) return false;
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
        if (s.position !== 'fixed' && s.position !== 'absolute') return false;
        const zi = parseInt(s.zIndex, 10);
        if (!(zi >= 9000)) return false;
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && b.top < innerHeight && b.bottom > 0 && b.left < innerWidth && b.right > 0;
      }).map((e) => {
        const b = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return {
          cls: (e.className || '').toString().slice(0, 40), id: e.id,
          z: s.zIndex, opacity: s.opacity,
          x: Math.round(b.x), y: Math.round(b.y),
          w: Math.round(b.width), h: Math.round(b.height),
        };
      }),
      // The chrome that is visible while the door is up. Overlapping chrome
      // is a named mode of SH, and the room HUD sits behind the door.
      visibleBehind: [...document.querySelectorAll('.room-hud, .overlay, .menu-btn, .view-toggle, .intent-line, .shortcut-hints, .tilt-hint, .sky-hint')]
        .filter((e) => {
          const s = getComputedStyle(e);
          if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
          const b = e.getBoundingClientRect();
          return b.width > 0 && b.height > 0 && b.top < innerHeight && b.bottom > 0;
        })
        .map((e) => {
          const b = e.getBoundingClientRect();
          return {
            cls: e.className, id: e.id,
            x: Math.round(b.x), y: Math.round(b.y),
            w: Math.round(b.width), h: Math.round(b.height),
          };
        }),
    };
  });
  await page.screenshot({ path: path.join(OUT, `${vp.name}-${vp.w}-door.png`) });
  report.surfaces.push({ vp: vp.name, width: vp.w, surface: 'door', door, errors: [...errors] });

  // ── Into the room.
  await page.evaluate(() => document.getElementById('door-guest')?.click());
  await page.waitForTimeout(3500);

  const roomState = await page.evaluate(() => ({
    view: document.body.dataset.view,
    ready: document.body.dataset.appReady,
    groundTiles: document.body.dataset.groundTiles,
    sky: document.body.dataset.sky,
    ground: document.body.dataset.ground,
  }));
  await page.screenshot({ path: path.join(OUT, `${vp.name}-${vp.w}-room.png`) });
  report.surfaces.push({ vp: vp.name, width: vp.w, surface: 'room', roomState, errors: [...errors] });

  // ── Look UP: the sky.
  await page.evaluate(() => document.getElementById('sky-hint')?.click());
  await page.waitForTimeout(3000);
  const skyState = await page.evaluate(() => ({
    sky: document.body.dataset.sky,
    place: document.getElementById('sky-place')?.textContent,
    time: document.getElementById('sky-time')?.textContent,
    // The dome's actual geometry: are the constellation figures really
    // where the sky says they are?
    stars: window.__skyGroup?.children?.length ?? null,
  }));
  await page.screenshot({ path: path.join(OUT, `${vp.name}-${vp.w}-sky.png`) });
  report.surfaces.push({ vp: vp.name, width: vp.w, surface: 'sky', skyState, errors: [...errors] });

  // ── Look DOWN: the ground map.
  await page.evaluate(() => document.getElementById('ground-hint')?.click());
  await page.waitForTimeout(4000);
  const groundState = await page.evaluate(() => ({
    ground: document.body.dataset.ground,
    tiles: document.body.dataset.groundTiles,
    failures: document.body.dataset.groundTileFailures,
    zoom: document.body.dataset.groundZoom,
    place: document.getElementById('ground-place')?.textContent,
    cap: document.getElementById('ground-cap')?.textContent,
    depth: window.__ground?.getDepth?.() ?? null,
  }));
  await page.screenshot({ path: path.join(OUT, `${vp.name}-${vp.w}-ground.png`) });
  report.surfaces.push({ vp: vp.name, width: vp.w, surface: 'ground', groundState, errors: [...errors] });

  // ── The IOC wall.
  await page.evaluate(() => document.getElementById('ioc-toggle')?.click());
  await page.waitForTimeout(2500);
  const iocState = await page.evaluate(() => {
    const grid = document.getElementById('ioc-grid');
    const cells = [...(grid?.children || [])];
    const r = grid?.getBoundingClientRect();
    return {
      view: document.body.dataset.view,
      count: cells.length,
      grid: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      // A row that breaks and leaves one cell alone is an absolute failure.
      lastRowFill: cells.length ? cells.slice(-4).map((c) => Math.round(c.getBoundingClientRect().height)) : [],
      cellHeights: cells.map((c) => Math.round(c.getBoundingClientRect().height)),
      docScrollX: document.documentElement.scrollWidth > innerWidth,
    };
  });
  await page.screenshot({ path: path.join(OUT, `${vp.name}-${vp.w}-ioc.png`) });
  report.surfaces.push({ vp: vp.name, width: vp.w, surface: 'ioc', iocState, errors: [...errors] });

  await ctx.close();
}

await browser.close();

writeFileSync(path.join(OUT, 'measure.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log('\nwrote', path.join(OUT, 'measure.json'));
