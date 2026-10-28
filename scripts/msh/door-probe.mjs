#!/usr/bin/env node
/**
 * DOOR PROBE — what is actually on screen behind the landing curtain.
 *
 * The door is opaque, so nothing behind it has ever been photographed. This
 * probe lifts the curtain (background transparent, children hidden) WITHOUT
 * choosing a mode, so the capture shows the app in the state a first-time
 * visitor would see if the curtain were not there.
 */

import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html');
const OUT = path.resolve(arg('out', '.msh2'));
mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  { w: 390, h: 844, name: 'phone' },
  { w: 1024, h: 768, name: 'tablet' },
  { w: 1440, h: 900, name: 'desktop' },
];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
});

for (const vp of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const b = document.getElementById('boot');
    return b && getComputedStyle(b).display === 'none';
  }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const state = await page.evaluate(() => ({
    view: document.body.dataset.view,
    mode: document.body.dataset.mode || null,
    ready: document.body.dataset.appReady || null,
  }));

  // Lift the curtain without choosing anything.
  await page.evaluate(() => {
    const d = document.getElementById('door');
    if (!d) return;
    d.style.background = 'transparent';
    for (const c of d.children) c.style.visibility = 'hidden';
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${vp.name}-${vp.w}-behind.png`) });
  console.log(vp.name, JSON.stringify(state));
  await ctx.close();
}

await browser.close();
