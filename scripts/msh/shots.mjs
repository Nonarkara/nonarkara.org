// Full-page captures of the real surfaces, at the three law widths.
// Usage: node scripts/msh/shots.mjs <baseUrl> <outDir> [route ...]
import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:8786';
const out = process.argv[3] || '.msh-shots';
const routes = process.argv.slice(4);
if (!routes.length) routes.push('/', '/?view=plan', '/?view=ioc');

const WIDTHS = [
  { w: 390, h: 844, tag: '390' },
  { w: 1024, h: 900, tag: '1024' },
  { w: 1440, h: 900, tag: '1440' },
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});

for (const route of routes) {
  const slug = route.replace(/[^\w]+/g, '_') || 'root';
  for (const { w, h, tag } of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // wait for the real content, not for a curtain: the fleet board is the
    // last thing to paint and it only exists if the app booted.
    await page.waitForFunction(
      () => document.querySelectorAll('#fleet-lines .fleet-stn').length > 0
            || document.querySelectorAll('.ioc-grid .ioc-name').length > 0
            || document.getElementById('canvas-root canvas'),
      null,
      { timeout: 30000 },
    ).catch(() => {});
    await page.waitForTimeout(2500);
    const state = await page.evaluate(() => ({
      view: document.body.dataset.view || null,
      boot: (() => { const b = document.getElementById('boot'); if (!b) return 'none';
        const cs = getComputedStyle(b); return cs.display === 'none' ? 'none' : (cs.opacity === '0' ? 'transparent' : 'up'); })(),
      planH: document.getElementById('plan')?.offsetHeight || 0,
      docH: document.documentElement.scrollHeight,
      fleetLines: document.querySelectorAll('#fleet-lines .fleet-line').length,
      fleetStns: document.querySelectorAll('#fleet-lines .fleet-stn').length,
    }));
    const file = `${out}/${slug}-${tag}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file, JSON.stringify(state));
    await ctx.close();
  }
}
await browser.close();
