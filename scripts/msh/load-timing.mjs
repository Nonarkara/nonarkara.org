// What does the page's LOAD event wait for? The gate's settle deadline is
// five seconds, and the falsifier's fixtures mount on 'load'. If 'load' is
// late, the fixtures never arrive and the rules look dead.
import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();

const BASE = process.argv[2] || 'http://127.0.0.1:8786';
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
         '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
const page = await ctx.newPage();
const t0 = Date.now();
await page.goto(BASE + '/?view=plan', { waitUntil: 'commit', timeout: 180000 });
const marks = { commit: Date.now() - t0 };
await page.waitForLoadState('domcontentloaded', { timeout: 120000 }).catch(() => {});
marks.domContentLoaded = Date.now() - t0;
await page.waitForLoadState('load', { timeout: 120000 }).catch(() => {});
marks.load = Date.now() - t0;
await page.waitForFunction(() => document.body.dataset.view === 'plan', null, { timeout: 120000 }).catch(() => {});
marks.viewSet = Date.now() - t0;
await page.waitForFunction(() => document.querySelectorAll('#fleet-lines .fleet-stn').length > 0, null, { timeout: 120000 }).catch(() => {});
marks.fleet = Date.now() - t0;

const res = await page.evaluate(() => {
  const e = performance.getEntriesByType('resource')
    .map(r => ({ n: r.name.split('/').pop().slice(0, 42), s: Math.round(r.startTime), e: Math.round(r.responseEnd) }))
    .sort((a, b) => b.e - a.e).slice(0, 8);
  const nav = performance.getEntriesByType('navigation')[0] || {};
  return {
    slowest: e,
    nav: { dcl: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0) },
    count: performance.getEntriesByType('resource').length,
  };
});
console.log(JSON.stringify({ marks, ...res }, null, 1));
await browser.close();
