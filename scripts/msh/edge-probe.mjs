#!/usr/bin/env node
/**
 * EDGE PROBE — elements that hang off the edge of the screen.
 *
 * An element with left < 0 or right > innerWidth is half-off. It reads as
 * a fragment of chrome that belongs to something else, and on a desktop it
 * is the shape a spatial-hallucination audit looks for first.
 */
import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html');
const W = +arg('w', 1440), H = +arg('h', 900);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(URL_, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const b = document.getElementById('boot');
  return b && getComputedStyle(b).display === 'none';
}, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);

const out = await page.evaluate(() => {
  const vw = innerWidth, vh = innerHeight;
  const rows = [];
  for (const el of document.body.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
    if (s.position === 'static' && el.tagName !== 'BODY') {
      // only static elements that are their own box matter
    }
    const b = el.getBoundingClientRect();
    if (b.width === 0 || b.height === 0) continue;
    const offL = b.left < -0.5, offR = b.right > vw + 0.5;
    const offT = b.top < -0.5, offB = b.bottom > vh + 0.5;
    if (!offL && !offR && !offT && !offB) continue;
    rows.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().slice(0, 46),
      id: el.id,
      x: Math.round(b.x), y: Math.round(b.y),
      w: Math.round(b.width), h: Math.round(b.height),
      pos: s.position, z: s.zIndex,
      over: [offL && 'left', offR && 'right', offT && 'top', offB && 'bottom'].filter(Boolean).join(','),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
    });
  }
  return rows;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
