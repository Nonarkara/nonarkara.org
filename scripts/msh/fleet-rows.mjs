#!/usr/bin/env node
/**
 * THE FLEET ROWS — how the last row of each line actually breaks.
 *
 * The spatial gate recorded a `wrap` finding on the fleet board's station
 * row: the row breaks and leaves one station alone on the last line. The
 * finding later vanished from the receipt, and a finding that comes and
 * goes with the live data is not a receipt anyone should trust. This asks
 * the board directly, at each width, what the last row holds.
 *
 *   node scripts/msh/fleet-rows.mjs --url http://127.0.0.1:8784/index.html
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html?view=plan');
const WIDTHS = (arg('widths', '360,480,768,1024,1440')).split(',').map(Number);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });

for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const b = document.getElementById('boot');
    return b && getComputedStyle(b).display === 'none';
  }, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3500);

  const rows = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.fleet-stns')) {
      const line = el.closest('.fleet-line');
      const lbl = line?.querySelector('.fleet-line-lbl')?.textContent?.trim() || '?';
      const kids = [...el.children];
      if (!kids.length) continue;
      // Group by the top edge: that is a visual row.
      const byTop = new Map();
      for (const k of kids) {
        const r = k.getBoundingClientRect();
        const key = Math.round(r.top);
        if (!byTop.has(key)) byTop.set(key, []);
        byTop.get(key).push(k);
      }
      const rows = [...byTop.entries()].sort((a, b) => a[0] - b[0]).map(([top, ks]) => {
        const widths = ks.map((k) => Math.round(k.getBoundingClientRect().width));
        const gap = ks.length > 1
          ? Math.round(ks[1].getBoundingClientRect().left - ks[0].getBoundingClientRect().right)
          : 0;
        return { n: ks.length, widths, gap, fill: widths.reduce((a, b) => a + b, 0) };
      });
      const elRect = el.getBoundingClientRect();
      out.push({
        label: lbl,
        total: kids.length,
        rows: rows.map((r) => r.n),
        lastRow: rows[rows.length - 1].n,
        rowWidths: rows[rows.length - 1].widths,
        gap: rows[rows.length - 1].gap,
        containerW: Math.round(elRect.width),
      });
    }
    return out;
  });

  console.log(`\n${w}px`);
  for (const r of rows) {
    const flag = r.lastRow === 1 ? '  ← ONE ALONE' : '';
    console.log(
      `  ${String(r.label).padEnd(14)} ${String(r.total).padStart(2)} stations · rows [${r.rows.join(',')}]` +
      ` · last row ${r.lastRow} × ~${r.rowWidths[0]}px gap ${r.gap} in ${r.containerW}px${flag}`,
    );
  }
  await ctx.close();
}

await browser.close();
