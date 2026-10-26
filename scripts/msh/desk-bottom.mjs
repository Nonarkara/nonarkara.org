// Scroll the desk (#plan is a fixed, internally-scrolling panel) to the bottom
// and capture what a reader meets at the end of the scroll.
import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8786';
const out = process.argv[3] || '.msh-shots';
const width = Number(process.argv[4] || 1440);

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(base + '/?view=plan', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForFunction(() => document.querySelectorAll('#fleet-lines .fleet-stn').length > 0, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const plan = document.getElementById('plan');
  const foot = document.querySelector('.plan-foot');
  const footBtns = [...(foot?.children || [])].map(c => {
    const r = c.getBoundingClientRect();
    return { tag: c.tagName, id: c.id, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top) };
  });
  // the footer's grid gaps are painted with --line; count the empty cells
  const fcs = foot ? getComputedStyle(foot) : null;
  return {
    planScrollH: plan?.scrollHeight, planClientH: plan?.clientHeight,
    footRect: foot ? (() => { const r = foot.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top + window.scrollY) }; })() : null,
    footCols: fcs?.gridTemplateColumns, footBg: fcs?.backgroundColor,
    footBtns,
    footChildren: foot?.children.length,
  };
});
console.log(JSON.stringify(info, null, 1));

await page.evaluate(() => { const p = document.getElementById('plan'); p.scrollTop = p.scrollHeight; });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/desk-bottom-${width}.png` });
console.log('shot', `${out}/desk-bottom-${width}.png`);
await browser.close();
