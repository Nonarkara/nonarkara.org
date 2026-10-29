#!/usr/bin/env node
/**
 * THE SHADOW PROOF — does a shadow reach the screen?
 *
 * The estate has had a real sun with a shadow map since it had a sun.
 * Whether the shadow ever ARRIVED is a different question, and the
 * honest way to answer it is to count pixels: render the room twice,
 * once with the shadow receiver and once without, and count the pixels
 * that changed.
 *
 * A shadow system that is wired up, enabled, correctly configured and
 * invisible is still invisible. This measures the pixels.
 *
 * It also checks the one number that decides whether it can work at
 * all: the receiver must sit ON the ground you can see, not under it.
 *
 *   node scripts/msh/shadow-proof.mjs
 */

import { ownPort } from './own-port.mjs';
import { loadChromium } from './playwright.mjs';
import { mkdir } from 'node:fs/promises';

const OUT = new URL('../../.msh-shadow/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const site = await ownPort();
console.log(`serving ${site.base}`);

const chromium = await loadChromium();
const browser = await chromium.launch({
  // The real Chrome, on the real GPU. Playwright's bundled headless
  // shell has no WebGL at all, and the site answers a machine without
  // WebGL with a curtain instead of the room — so measuring through it
  // would be measuring the curtain. This is the same browser the
  // spatial gate measures with.
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
await page.waitForTimeout(2000);

// The door first: the room's HUD lives behind it, and a chip that
// cannot be clicked is not a chip.
const doorUp = await page.evaluate(() => {
  const d = document.getElementById('door');
  return !!d && getComputedStyle(d).display !== 'none' && getComputedStyle(d).opacity !== '0';
});
if (doorUp) {
  await page.click('#door-guest', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
}
await page.waitForFunction(
  () => document.body.dataset.view === 'room',
  { timeout: 120000 },
).catch(() => {});
await page.waitForTimeout(1500);

const facts = await page.evaluate(() => {
  const L = window.__worldLighting;
  if (!L) return { error: 'no world lighting' };
  return {
    casterCount: L.casterCount,
    receiverY: L.receiver.position.y,
    groundY: L.groundY,
    shadowMapEnabled: window.__renderer?.shadowMap?.enabled,
    sunCastShadow: L.sun.castShadow,
    receiverOpacity: L.receiverMaterial.opacity,
    sunAltitude: window.__worldState?.sun?.alt,
  };
});
console.log('scene:', JSON.stringify(facts, null, 2));

// ── The pixel measurement ─────────────────────────────────────────
//
// Force a sun high enough to throw a definite shadow, look at the
// estate from above, and compare the two renders.
const measured = await page.evaluate(() => {
  const renderer = window.__renderer;
  const scene = window.__scene;
  const camera = window.__camera;
  const L = window.__worldLighting;
  if (!renderer || !scene || !camera || !L) return { error: 'no renderer' };

  L.setSun({ alt: 42, az: 205 });

  const gl = renderer.getContext();
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  const grab = () => {
    renderer.render(scene, camera);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };

  // Look down at the estate from above the sun's shadow side.
  camera.position.set(38, 46, 34);
  camera.lookAt(6, 0, -8);

  const withShadow = grab();
  L.receiver.visible = false;
  const without = grab();
  L.receiver.visible = true;

  let changed = 0;
  let total = 0;
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let i = 0; i < withShadow.length; i += 4) {
    const d = Math.abs(withShadow[i] - without[i])
      + Math.abs(withShadow[i + 1] - without[i + 1])
      + Math.abs(withShadow[i + 2] - without[i + 2]);
    if (d > 6) {
      changed++;
      total += d;
      const p = i / 4;
      const x = p % w, y = Math.floor(p / w);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return {
    width: w, height: h,
    changed, total, meanDelta: changed ? total / changed : 0,
    box: changed ? { minX, maxX, minY, maxY } : null,
    receiverOpacity: L.receiverMaterial.opacity,
  };
});
console.log('pixels:', JSON.stringify(measured, null, 2));

await page.screenshot({ path: `${OUT}room-from-above.png` });

// ── And the instrument itself ─────────────────────────────────────
await page.click('#sun-chip', { timeout: 60000 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}sun-panel.png` });
const panel = await page.evaluate(() => {
  const p = document.getElementById('sun-panel');
  const r = p.getBoundingClientRect();
  return {
    open: p.classList.contains('in'),
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    time: document.getElementById('sun-time')?.textContent,
    date: document.getElementById('sun-date')?.textContent,
    altitude: document.getElementById('sun-altitude')?.textContent,
    azimuth: document.getElementById('sun-azimuth')?.textContent,
    rise: document.getElementById('sun-rise')?.textContent,
    set: document.getElementById('sun-set')?.textContent,
    length: document.getElementById('sun-length')?.textContent,
    place: document.getElementById('sun-place')?.textContent,
  };
});
console.log('panel:', JSON.stringify(panel, null, 2));

if (errors.length) console.log('page errors:', errors.slice(0, 5));

await browser.close();
site.stop();

// ── The verdict ───────────────────────────────────────────────────
const ok = measured.changed > 500 && measured.meanDelta > 3;
console.log(ok
  ? `\nPASS — ${measured.changed} pixels changed when the shadow was taken away (mean Δ ${measured.meanDelta.toFixed(1)})`
  : `\nFAIL — only ${measured.changed} pixels changed (mean Δ ${(measured.meanDelta || 0).toFixed(1)}). The shadow is not reaching the screen.`);
process.exit(ok ? 0 : 1);
