// Capture one element (the fleet board) and report its row/column geometry.
import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();

const base = process.argv[2] || 'http://127.0.0.1:8786';
const out = process.argv[3] || '.msh-shots';
const widths = (process.argv[4] || '390,1024,1440').split(',').map(Number);

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(base + '/?view=plan', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => document.querySelectorAll('#fleet-lines .fleet-stn').length > 0, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#fleet-lines .fleet-line').forEach(line => {
      const row = line.querySelector('.fleet-stns');
      const stns = [...row.children];
      // band the stops into visual rows
      const bands = [];
      stns.forEach(s => {
        const r = s.getBoundingClientRect();
        const b = bands.find(b => Math.abs(b.top - r.top) < 4);
        if (b) b.n++; else bands.push({ top: r.top, n: 1, w: r.width });
      });
      out.push({
        line: line.dataset.line,
        stops: stns.length,
        cols: getComputedStyle(row).getPropertyValue('--cols').trim(),
        slot: getComputedStyle(row).getPropertyValue('--slot').trim(),
        rows: bands.map(b => `${b.n}×${Math.round(b.w)}`),
        lastRowAlone: bands[bands.length - 1].n === 1,
      });
    });
    return out;
  });
  console.log(`--- ${w}px ---`);
  for (const l of info) console.log(` ${l.line.padEnd(9)} stops=${String(l.stops).padStart(2)} cols=${l.cols} slot=${l.slot} rows=[${l.rows.join(' ')}] lone=${l.lastRowAlone}`);
  const el = await page.$('#fleet-lines');
  if (el) await el.screenshot({ path: `${out}/fleet-new-${w}.png` });
  await ctx.close();
}
await browser.close();
