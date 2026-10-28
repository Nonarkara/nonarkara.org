#!/usr/bin/env node
/**
 * WHEN DOES THE FLEET BOARD ARRIVE?
 *
 * The spatial gate measures the page once it stops moving. The fleet board
 * is painted from a live fetch, so the question is: at the moment the gate
 * measures, does the board have its rows, or is it still empty?
 *
 * An empty board is a board with no rows and therefore no spatial problems
 * — which is how a page with a defect gets a clean receipt.
 *
 *   node scripts/msh/fleet-timing.mjs --url http://127.0.0.1:8784/index.html?view=plan
 */

import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html?view=plan');
const CLEAR = arg('clear', '1') === '1';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

if (CLEAR) {
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
}

const t0 = Date.now();
await page.goto(URL_, { waitUntil: 'domcontentloaded' });

const marks = [];
for (let i = 0; i < 120; i++) {
  const s = await page.evaluate(() => {
    const rows = document.querySelectorAll('.fleet-stns');
    let kids = 0;
    for (const r of rows) kids += r.children.length;
    const b = document.getElementById('boot');
    return { rows: rows.length, kids, boot: b ? getComputedStyle(b).display : 'gone' };
  });
  marks.push({ ms: Date.now() - t0, ...s });
  if (s.kids > 0 && s.boot === 'none') break;
  await page.waitForTimeout(100);
}

console.log(`storage cleared before load: ${CLEAR}`);
console.log(`first paint with stations: ${marks[marks.length - 1].ms}ms`);
console.log(marks.filter((m, i) => i % 5 === 0 || i === marks.length - 1)
  .map((m) => `  ${String(m.ms).padStart(6)}ms  boot=${m.boot}  rows=${m.rows}  stations=${m.kids}`).join('\n'));

await browser.close();
