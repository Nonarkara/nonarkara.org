#!/usr/bin/env node
/**
 * THE CITY PROOF — is there a city under the floor?
 *
 * A model that loads, is in the scene, and has the right numbers is
 * not the same as a model you can SEE. So this drives the room into
 * the ground view, asks the scene what it contains, and photographs
 * what a visitor would see looking down.
 *
 *   node scripts/msh/city-proof.mjs
 */

import { ownPort } from './own-port.mjs';
import { loadChromium, chromeExecutable } from './playwright.mjs';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const OUT = new URL('../../.msh-city/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const site = await ownPort();
console.log(`serving ${site.base}`);

const chromium = await loadChromium();
const executablePath = chromeExecutable();
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: [
    '--enable-unsafe-swiftshader',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const screenshot = (name) => page.screenshot({
  path: `${OUT}${name}`,
  timeout: 120000,
});
const errors = [];
const requests = [];
page.on('pageerror', (e) => errors.push(String(e.message || e)));
page.on('request', (request) => requests.push(new URL(request.url()).pathname));

await page.goto(`${site.base}/?guest`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => document.body.dataset.view === 'room'
  && !!window.__renderer
  && !!document.querySelector('#canvas-root canvas'), null, { timeout: 120000 });
await page.waitForTimeout(2500);

// The door, then the room.
const doorUp = await page.evaluate(() => {
  const d = document.getElementById('door');
  return !!d && getComputedStyle(d).display !== 'none' && getComputedStyle(d).opacity !== '0';
});
if (doorUp) {
  await page.click('#door-guest', { timeout: 60000 });
  await page.waitForTimeout(2500);
}

assert(!requests.some((path) => path === '/citymass.js' || path === '/city-model.js'),
  'the city payload loaded before the ground view was requested');
assert.equal(await page.evaluate(() => window.__cityModel ?? null), null,
  'the city geometry must not be built at boot');

// Into the ground view. Measure the journey, not the settled room: this
// includes the LOOK transition, dynamic import, decode, geometry build and
// the tile arrivals that used to make the map feel stuck.
const transition = await page.evaluate(async () => {
  const started = performance.now();
  const frames = [];
  const longTasks = [];
  let previous = started;
  let cityReadyMs = null;
  let groundReadyMs = null;
  let tilesReadyMs = null;
  let observer = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration);
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch (_) {}

  document.getElementById('ground-hint')?.click();
  let ready = false;
  // Three tile providers each have a 3.5 s timeout. A fully offline proof
  // therefore needs just over 10.5 s to reach an honest failed-tile state.
  while (performance.now() - started < 15000) {
    await new Promise(requestAnimationFrame);
    const now = performance.now();
    frames.push(now - previous);
    previous = now;
    if (cityReadyMs == null && window.__cityModel) cityReadyMs = now - started;
    if (groundReadyMs == null && document.body.dataset.ground === 'on') groundReadyMs = now - started;
    const [loaded, expected] = (document.body.dataset.groundTiles || '0/0').split('/').map(Number);
    const failed = Number(document.body.dataset.groundTileFailures || 0);
    if (tilesReadyMs == null && expected > 0 && loaded + failed >= expected) tilesReadyMs = now - started;
    ready = !!window.__cityModel && document.body.dataset.ground === 'on'
      && expected > 0 && loaded + failed >= expected && !window.__look?.aim;
    if (ready) break;
  }
  observer?.disconnect();
  frames.sort((a, b) => a - b);
  return {
    ready,
    elapsed: performance.now() - started,
    cityReadyMs,
    groundReadyMs,
    tilesReadyMs,
    frames: {
      mean: frames.reduce((sum, ms) => sum + ms, 0) / frames.length,
      p95: frames[Math.floor(frames.length * 0.95)],
      worst: frames[frames.length - 1],
    },
    longTaskMax: longTasks.length ? Math.max(...longTasks) : 0,
  };
});
assert(transition.ready, `ground transition did not settle: ${JSON.stringify(transition)}`);
assert(transition.cityReadyMs < 10000,
  `the ground view waited ${Math.round(transition.cityReadyMs)} ms for its city`);
assert(transition.frames.mean < 40 && transition.frames.p95 < 65 && transition.frames.worst < 200,
  `look-down jank: ${JSON.stringify(transition.frames)}`);
assert(transition.longTaskMax < 200,
  `look-down blocked the main thread for ${transition.longTaskMax.toFixed(1)} ms`);
await page.waitForTimeout(250);

const facts = await page.evaluate(() => {
  const C = window.__cityModel;
  const G = window.__groundGroup;
  return {
    model: C ? {
      vertices: C.vertices,
      maxHeight: C.maxHeight,
      relief: C.reliefFor ? Number(C.reliefFor(G.position.y, C.maxHeight).toFixed(3)) : null,
      scaleY: Number(C.group.scale.y.toFixed(4)),
      visible: C.group.visible,
      ink: C.faces?.material?.color?.getHexString?.() || null,
      edge: C.lines?.material?.color?.getHexString?.() || null,
      paletteLine: window.__worldState?.palette?.line ?? null,
      palettePhase: window.__worldState?.palette?.phase ?? null,
      parent: C.group.parent?.name || null,
      worldY: Number(C.group.matrixWorld.elements[13].toFixed(1)),
      heightSources: C.heightSources || null,
      retrievedOn: C.retrievedOn || null,
    } : null,
    ground: G ? { y: Number(G.position.y.toFixed(1)), visible: G.visible } : null,
    caption: document.getElementById('ground-cap')?.textContent?.replace(/\s+/g, ' ').trim() || null,
    captionMain: document.getElementById('ground-cap-main')?.textContent || null,
    captionMeta: document.getElementById('ground-cap-meta')?.textContent || null,
    attributionHref: document.getElementById('ground-cap-credit')?.href || null,
    zoom: window.__ground?.getZoom?.() ?? null,
    tiles: document.body.dataset.groundTiles || null,
  };
});
console.log('facts:', JSON.stringify(facts, null, 2));
console.log('look-down transition:', JSON.stringify({
  elapsed: Math.round(transition.elapsed),
  cityReady: Math.round(transition.cityReadyMs),
  groundReady: Math.round(transition.groundReadyMs),
  tilesReady: Math.round(transition.tilesReadyMs),
  mean: Number(transition.frames.mean.toFixed(1)),
  p95: Number(transition.frames.p95.toFixed(1)),
  worst: Number(transition.frames.worst.toFixed(1)),
  longTaskMax: Number(transition.longTaskMax.toFixed(1)),
}));

const pacing = await page.evaluate(async () => {
  const frames = [];
  let last = performance.now();
  for (let i = 0; i < 90; i++) {
    await new Promise(requestAnimationFrame);
    const now = performance.now();
    if (i > 4) frames.push(now - last);
    last = now;
  }
  frames.sort((a, b) => a - b);
  return {
    mean: frames.reduce((sum, ms) => sum + ms, 0) / frames.length,
    p95: frames[Math.floor(frames.length * 0.95)],
    worst: frames[frames.length - 1],
  };
});
console.log('frame pacing:', JSON.stringify({
  mean: Number(pacing.mean.toFixed(1)),
  p95: Number(pacing.p95.toFixed(1)),
  worst: Number(pacing.worst.toFixed(1)),
}));
assert(pacing.mean < 40 && pacing.p95 < 65,
  `ground view is not interactive: mean ${pacing.mean.toFixed(1)} ms, p95 ${pacing.p95.toFixed(1)} ms`);

await screenshot('ground-view.png');

// What does the city actually contribute? The same frame with the model
// taken away — the difference is the city's own pixels, measured rather
// than argued about.
const contribution = await page.evaluate(() => {
  const renderer = window.__renderer;
  const scene = window.__scene;
  const camera = window.__camera;
  const gl = renderer.getContext();
  const w = renderer.domElement.width, h = renderer.domElement.height;
  const grab = () => {
    renderer.render(scene, camera);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  const C = window.__cityModel;
  const a = grab();
  C.group.visible = false;
  const b = grab();
  C.group.visible = true;
  let changed = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 8) changed++;
  }
  return { changed, total: w * h, pct: Number((changed / (w * h) * 100).toFixed(1)) };
});
console.log('the city contributes:', JSON.stringify(contribution));
assert(contribution.pct >= 5,
  `the city changes only ${contribution.pct}% of the frame — present in the scene is not visible`);
assert(contribution.pct <= 75,
  `the city changes ${contribution.pct}% of the frame — the map has stopped being the primary surface`);
await page.evaluate(() => { window.__cityModel.group.visible = false; });
await page.waitForTimeout(400);
await screenshot('ground-without-city.png');
await page.evaluate(() => { window.__cityModel.group.visible = true; });

// One surface, three real screens. The caption is the exit of the glance
// path: if it clips or forces sideways scroll, the map has no trustworthy
// scale or attribution on that device.
for (const [name, width, height] of [
  ['phone', 390, 844],
  ['tablet', 1024, 768],
  ['desktop', 1440, 900],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
  const geometry = await page.evaluate(() => {
    const cap = document.getElementById('ground-cap')?.getBoundingClientRect();
    const exit = document.getElementById('ground-exit')?.getBoundingClientRect();
    return {
      sideways: document.documentElement.scrollWidth - window.innerWidth,
      caption: cap && (() => {
        const style = getComputedStyle(document.getElementById('ground-cap'));
        const lineHeight = parseFloat(style.lineHeight);
        const contentHeight = cap.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        return {
          left: cap.left, right: cap.right, top: cap.top, bottom: cap.bottom,
          fontSize: parseFloat(style.fontSize), lineHeight,
          lines: Math.round(contentHeight / lineHeight),
          background: style.backgroundColor,
        };
      })(),
      exit: exit && { left: exit.left, right: exit.right, top: exit.top, bottom: exit.bottom },
      attribution: document.getElementById('ground-cap-credit')?.href || null,
    };
  });
  assert(geometry.sideways <= 1, `${name}: ground view has ${geometry.sideways}px sideways overflow`);
  assert(geometry.caption && geometry.caption.left >= -1 && geometry.caption.right <= width + 1,
    `${name}: ground caption clips horizontally: ${JSON.stringify(geometry.caption)}`);
  assert(geometry.caption.fontSize >= 11 && geometry.caption.lineHeight >= 15,
    `${name}: ground caption is microtext: ${JSON.stringify(geometry.caption)}`);
  assert(geometry.caption.lines <= (name === 'phone' ? 3 : 2),
    `${name}: ground caption became ${geometry.caption.lines} lines`);
  assert(geometry.attribution === 'https://www.openstreetmap.org/copyright',
    `${name}: OpenStreetMap attribution is not linked to its licence`);
  assert(geometry.exit && geometry.exit.left >= -1 && geometry.exit.right <= width + 1
    && geometry.exit.top >= -1 && geometry.exit.bottom <= height + 1,
  `${name}: first useful action is outside the viewport: ${JSON.stringify(geometry.exit)}`);
  await screenshot(`ground-${name}.png`);
}

// And at night, which is when the room is usually used. The map below
// is a photograph and does not change with the hour; the model standing
// on it has to stay legible anyway.
await page.evaluate(() => { window.__sunStudy?.setTime(22 * 60 + 40); });
await page.waitForTimeout(2500);
await screenshot('ground-at-night.png');
const night = await page.evaluate(() => ({
  phase: window.__worldState?.palette?.phase ?? null,
  caption: document.getElementById('ground-cap')?.textContent || null,
}));
console.log('at night:', JSON.stringify(night));

// And from higher up, so the model can be seen as a whole.
await page.evaluate(() => {
  const C = window.__cityModel;
  if (C) C.group.scale.y = 3.0;          // a deliberately exaggerated look
  const cam = window.__camera;
  cam.position.set(0, 120, 120);
  cam.lookAt(0, -30, 0);
});
await page.waitForTimeout(1200);
await screenshot('city-model.png');

// Manual input wins even while a programmatic aim is in flight.
const manualWins = await page.evaluate(() => {
  const look = window.__look;
  const before = { yaw: look.yaw, pitch: look.pitch };
  look.aimAt(look.yaw, 0, 0.1);
  look.addDelta(0.01, 0);
  const cancelled = look.aim === null;
  look.yaw = before.yaw;
  look.pitch = before.pitch;
  return cancelled;
});
assert.equal(manualWins, true, 'manual look input did not cancel the programmed camera aim');

// Reduced motion makes the exit a one-frame state change. Leaving the view
// must then stop rendering its heavy geometry; the group stays cached.
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.click('#ground-exit');
await page.evaluate(() => new Promise(requestAnimationFrame));
const reducedExit = await page.evaluate(() => ({ pitch: window.__look?.pitch, aiming: !!window.__look?.aim }));
assert(Math.abs(reducedExit.pitch) < 0.01 && !reducedExit.aiming,
  `reduced-motion exit still animated: ${JSON.stringify(reducedExit)}`);
await page.waitForFunction(() => window.__groundGroup?.visible === false, null, { timeout: 5000 });
const exited = await page.evaluate(() => ({
  groundVisible: window.__groundGroup?.visible,
  cityCached: !!window.__cityModel,
}));
assert.equal(exited.groundVisible, false, 'ground geometry keeps rendering after the visitor exits');
assert.equal(exited.cityCached, true, 'leaving the ground should not rebuild the city next time');

assert.deepEqual(errors, [], `page errors: ${errors.slice(0, 5).join(' · ')}`);

await browser.close();
site.stop();

const heightCount = facts.model?.heightSources
  ? Object.values(facts.model.heightSources).reduce((sum, n) => sum + n, 0)
  : 0;
const ok = facts.model && facts.model.vertices > 1000 && facts.model.visible
  && facts.model.ink === '2b343c' && facts.model.edge === '2b343c'
  && facts.model.parent === 'ground' && facts.ground?.visible
  && heightCount > 1000 && /\d+ MEASURED · [\d,]+ LEVEL-DERIVED · [\d,]+ EST\./.test(facts.captionMeta || '')
  && facts.attributionHref === 'https://www.openstreetmap.org/copyright';
console.log(ok
  ? `\nPASS — the city is in the room: ${facts.model.vertices} vertices, relief ×${facts.model.relief}`
  : '\nFAIL — there is no city under the floor.');
process.exit(ok ? 0 : 1);
