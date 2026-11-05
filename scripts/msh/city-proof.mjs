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
import { loadChromium } from './playwright.mjs';
import { mkdir } from 'node:fs/promises';

const OUT = new URL('../../.msh-city/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const site = await ownPort();
console.log(`serving ${site.base}`);

const chromium = await loadChromium();
const browser = await chromium.launch({
  channel: 'chrome',
  args: [
    '--enable-unsafe-swiftshader',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message || e)));

await page.goto(`${site.base}/?guest`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => {
  const b = document.getElementById('boot');
  return b && getComputedStyle(b).display === 'none';
}, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(2500);

// The door, then the room.
const doorUp = await page.evaluate(() => {
  const d = document.getElementById('door');
  return !!d && getComputedStyle(d).display !== 'none' && getComputedStyle(d).opacity !== '0';
});
if (doorUp) {
  await page.click('#door-guest', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

// Into the ground view, and wait for the plate and the model.
await page.evaluate(() => {
  document.getElementById('ground-hint')?.click();
});
await page.waitForFunction(() => !!window.__cityModel, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(4000);

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
    } : null,
    ground: G ? { y: Number(G.position.y.toFixed(1)), visible: G.group?.visible } : null,
    caption: document.getElementById('ground-cap')?.textContent || null,
    zoom: window.__ground?.getZoom?.() ?? null,
    tiles: document.body.dataset.groundTiles || null,
  };
});
console.log('facts:', JSON.stringify(facts, null, 2));

await page.screenshot({ path: `${OUT}ground-view.png` });

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
await page.evaluate(() => { window.__cityModel.group.visible = false; });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}ground-without-city.png` });
await page.evaluate(() => { window.__cityModel.group.visible = true; });

// And at night, which is when the room is usually used. The map below
// is a photograph and does not change with the hour; the model standing
// on it has to stay legible anyway.
await page.evaluate(() => { window.__sunStudy?.setTime(22 * 60 + 40); });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}ground-at-night.png` });
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
await page.screenshot({ path: `${OUT}city-model.png` });

if (errors.length) console.log('page errors:', errors.slice(0, 5));

await browser.close();
site.stop();

const ok = facts.model && facts.model.vertices > 1000 && facts.model.visible;
console.log(ok
  ? `\nPASS — the city is in the room: ${facts.model.vertices} vertices, relief ×${facts.model.relief}`
  : '\nFAIL — there is no city under the floor.');
process.exit(ok ? 0 : 1);
