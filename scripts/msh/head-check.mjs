// Measure the desk header band: the row's height, each item's height, and
// the hole each one leaves beneath it (the gate's "dead" rule).
import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8786';
const out = process.argv[3] || '.msh-shots';
const widths = (process.argv[4] || '360,561,600,719,768,1024,1440').split(',').map(Number);

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(base + '/?view=plan', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => document.body.dataset.view === 'plan', null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const head = document.querySelector('.plan-head');
    const hr = head.getBoundingClientRect();
    const kids = [...head.children].map(c => {
      const r = c.getBoundingClientRect();
      return { sel: c.className || c.tagName, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top - hr.top), left: Math.round(r.left - hr.left) };
    });
    const brand = head.querySelector('.brand-blk').getBoundingClientRect();
    const right = head.querySelector('.os-bar-right').getBoundingClientRect();
    return {
      headH: Math.round(hr.height),
      brandH: Math.round(brand.height),
      rightH: Math.round(right.height),
      rightW: Math.round(right.width),
      holeUnderBrand: Math.round(right.top - brand.bottom),
      holeUnderRight: Math.round(hr.bottom - right.bottom),
      kids,
    };
  });
  console.log(`${String(w).padStart(5)}px head=${info.headH} brand=${info.brandH} right=${info.rightH}×${info.rightW} hole(brand)=${info.holeUnderBrand} hole(right)=${info.holeUnderRight}`);
  if (w === 1440 || w === 390 || w === 600) {
    const el = await page.$('.plan-head');
    if (el) await el.screenshot({ path: `${out}/head-${w}.png` });
  }
  await ctx.close();
}
await browser.close();
