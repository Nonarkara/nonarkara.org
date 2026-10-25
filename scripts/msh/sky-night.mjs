#!/usr/bin/env node
/**
 * THE SKY AT NIGHT — the evidence the sky needs.
 *
 * The room's sky is honest about the time: at 10:24 in the morning there
 * are no stars, and a screenshot taken then shows a blue sky and proves
 * nothing. The night sky has to be captured with the clock moved, or the
 * evidence is the weather.
 *
 * This drives the page with a fixed instant — late evening over Bangkok —
 * and captures the dome at 390, 1024 and 1440, reporting how many stars
 * are actually drawn.
 *
 * Usage: node scripts/msh/sky-night.mjs [--url http://127.0.0.1:8784/index.html] [--out .msh]
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i === -1 ? d : argv[i + 1];
};
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html');
const OUT = path.resolve(arg('out', '.msh'));

// 21:40 on a night in October, over Bangkok. The sky has to be dark, and
// the moon is waxing gibbous, so the dome has both.
const INSTANT = '2026-10-24T21:40:00+07:00';

mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  { w: 390, h: 844, name: 'phone' },
  { w: 1024, h: 768, name: 'tablet' },
  { w: 1440, h: 900, name: 'desktop' },
];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
});

const report = { at: INSTANT, surfaces: [] };

for (const vp of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    timezoneId: 'Asia/Bangkok',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

  // Move the clock before any of the site runs.
  await page.addInitScript((iso) => {
    const FIXED = new Date(iso).getTime();
    const Real = Date;
    const shifted = class extends Real {
      constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
      static now() { return FIXED; }
    };
    // eslint-disable-next-line no-global-assign
    Date = shifted;
  }, INSTANT);

  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('door-guest')?.click());
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('sky-hint')?.click());
  await page.waitForTimeout(4000);

  const state = await page.evaluate(() => {
    const sky = window.__sky;
    const group = window.__skyGroup;
    const drawn = group
      ? group.children.reduce((n, c) => n + (c.geometry?.attributes?.position?.count || 0), 0)
      : 0;
    return {
      sky: document.body.dataset.sky,
      place: document.getElementById('sky-place')?.textContent,
      time: document.getElementById('sky-time')?.textContent,
      ask: document.getElementById('sky-ask')?.textContent?.trim(),
      children: group?.children?.length ?? null,
      // Every star in the catalogue is drawn; the count below is the number
      // of points actually in the scene.
      drawn,
      blend: sky?.blend ?? null,
    };
  });

  await page.screenshot({ path: path.join(OUT, `${vp.name}-${vp.w}-sky-night.png`) });
  report.surfaces.push({ vp: vp.name, width: vp.w, state, errors: [...errors] });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
