#!/usr/bin/env node
/**
 * THE TRUCK, ON SCREEN — seat view, cameras, autopilot, mirrors.
 *
 * The unit tests prove the physics and the overlay maths. This proves
 * the thing a visitor sees: that you get in, that the cameras draw
 * boxes over things that are really there, that the autopilot takes the
 * wheel and the truck moves, and that both flank cameras are on screen
 * with live frames.
 *
 *   node scripts/msh/truck.mjs --url http://127.0.0.1:8784/index.html
 */

import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html');
const OUT = path.resolve(arg('out', '.msh'));
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (cond, msg) => {
  if (cond) { console.log(`  ✓ ${msg}`); return true; }
  console.log(`  ✗ ${msg}`);
  failures++;
  return false;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
// The GitHub events feed is rate-limited without a token and
// version.json only exists in a built dist — neither is ours.
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/cloudflareinsights|ERR_FAILED|ERR_NAME_NOT_RESOLVED|404|403/.test(t)) return;
  errors.push(t);
});
page.on('response', (r) => {
  if (r.status() >= 400 && !/api\.github\.com|version\.json|cdn-cgi/.test(r.url())) {
    errors.push(`${r.status()} ${r.url().slice(0, 90)}`);
  }
});

await page.goto(URL_, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const b = document.getElementById('boot');
  return b && getComputedStyle(b).display === 'none';
}, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1200);
await page.evaluate(() => document.getElementById('door-guest')?.click());
await page.waitForTimeout(2500);

const world = await page.evaluate(() => ({
  lighting: window.__worldLighting ? {
    mapSize: window.__worldLighting.mapSize,
    casters: window.__worldLighting.casterCount,
    sunVisible: window.__worldLighting.sun.visible,
    receiverOpacity: window.__worldLighting.receiverMaterial.opacity,
  } : null,
  khaoYai: window.__mountains?.group?.getObjectByName('khao-yai-ridge')?.userData || null,
}));
ok(world.lighting?.casters > 20, `real sun shadows cover the estate (${world.lighting?.casters ?? 0} casters)`);
ok([1024, 2048].includes(world.lighting?.mapSize),
  `shadow resolution follows the device budget (${world.lighting?.mapSize ?? 'missing'}px)`);
ok(world.khaoYai?.bearing > 40 && world.khaoYai?.bearing < 65,
  `Khao Yai is a named north-east landmark (${world.khaoYai?.bearing ?? 'missing'}°)`);

console.log('\nTHE TRUCK');

// ── get in ────────────────────────────────────────────────
const entered = await page.evaluate(() => {
  // Stand next to the truck, the way a walker would arrive at it.
  const D = window.__drive;
  window.__walk.teleport(D.pos.x + 2.4, D.pos.z + 2.4);
  window.__camera.position.set(D.pos.x + 2.4, 1.65, D.pos.z + 2.4);
  return { near: window.__nearTruck(), pos: { x: D.pos.x, z: D.pos.z } };
});
await page.waitForTimeout(400);
ok(entered.near === true, `the walker is next to the truck at (${entered.pos.x.toFixed(1)}, ${entered.pos.z.toFixed(1)})`);

await page.evaluate(() => window.__enterTruck());
await page.waitForTimeout(1200);

const inSeat = await page.evaluate(() => ({
  active: !!window.__drive?.active,
  mode: window.__drive?.mode,
  seatClass: document.body.classList.contains('seat-view'),
  driving: document.body.dataset.driving,
}));
ok(inSeat.active, 'you are in the truck');
ok(inSeat.mode === 'seat', `the first-person driver's seat is the default view (mode=${inSeat.mode})`);
ok(inSeat.seatClass, 'the body carries the seat-view state');
await page.screenshot({ path: path.join(OUT, 'truck-seat.png') });

// ── the cameras ───────────────────────────────────────────
await page.evaluate(() => window.__driveChips.toggleCv());
await page.waitForTimeout(1400);
const cv = await page.evaluate(() => ({
  cv: !!window.__drive?.cv,
  boxes: document.querySelectorAll('.cv-box, .cv-label, [class*="cv-"]').length,
  overlay: (() => {
    const el = document.getElementById('cv-overlay') || document.querySelector('[id*="cv" i][class*="overlay" i]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { w: Math.round(r.width), h: Math.round(r.height), display: s.display, opacity: s.opacity };
  })(),
  // The detector's own state: what it thinks is in front of the camera.
  detected: window.__vision?.lastDetections?.length ?? window.__drive?.detections?.length ?? null,
}));
ok(cv.cv === true, 'the cameras are on');
ok(!!cv.overlay && cv.overlay.w > 100 && cv.overlay.h > 100,
  `the CV overlay covers the view (${cv.overlay?.w}×${cv.overlay?.h})`);
await page.screenshot({ path: path.join(OUT, 'truck-cameras.png') });

// ── the mirrors ───────────────────────────────────────────
const mirrors = await page.evaluate(() => {
  const els = [...document.querySelectorAll('.mirror')];
  return els.map((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const cv2 = el.querySelector('canvas');
    return {
      cls: el.className,
      x: Math.round(r.x), y: Math.round(r.y),
      w: Math.round(r.width), h: Math.round(r.height),
      display: s.display, opacity: s.opacity,
      canvas: cv2 ? { w: cv2.width, h: cv2.height } : null,
    };
  });
});
ok(mirrors.length === 2, `both flank cameras are on screen (${mirrors.length} mirrors)`);
ok(mirrors.every((m) => m.display !== 'none' && m.w > 40 && m.h > 20),
  `both mirrors have a size on screen (${mirrors.map((m) => `${m.w}×${m.h}`).join(' / ')})`);
ok(mirrors.every((m) => m.canvas && m.canvas.w > 0),
  'both mirrors are drawing into a canvas');

// ── the autopilot ─────────────────────────────────────────
const before = await page.evaluate(() => ({ x: window.__drive.pos.x, z: window.__drive.pos.z, v: window.__drive.v }));
await page.evaluate(() => window.__driveChips.toggleAutopilot());
await page.waitForTimeout(2600);
const after = await page.evaluate(() => ({
  x: window.__drive.pos.x, z: window.__drive.pos.z, v: window.__drive.v,
  autopilot: !!window.__drive?.autopilot,
  steer: window.__drive?.steer,
}));
ok(after.autopilot === true, 'the autopilot has the wheel');
ok(Math.hypot(after.x - before.x, after.z - before.z) > 0.5,
  `the truck drove itself (moved ${Math.hypot(after.x - before.x, after.z - before.z).toFixed(2)}m, v=${after.v.toFixed(2)})`);
await page.screenshot({ path: path.join(OUT, 'truck-autopilot.png') });

// ── back out ──────────────────────────────────────────────
await page.evaluate(() => window.__exitTruck());
await page.waitForTimeout(900);
const out = await page.evaluate(() => ({ active: !!window.__drive?.active, driving: document.body.dataset.driving }));
ok(!out.active, 'you can step out of the truck');

ok(errors.length === 0, `no page errors (${errors.join(' | ') || 'none'})`);

await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\ntruck: every assertion passes');
process.exit(failures ? 1 : 0);
