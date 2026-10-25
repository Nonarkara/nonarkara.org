#!/usr/bin/env node
/**
 * WHAT IS AT — a question asked of the real page in a real browser.
 *
 *   node scripts/msh/what-is-at.mjs --url http://127.0.0.1:8784/index.html --sel ".fleet-stns"
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html');
const SEL = arg('sel', '.fleet-stns');
const WAIT = Number(arg('wait', 6000));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const net = [];
page.on('response', (r) => net.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 110)}`));
page.on('requestfailed', (r) => net.push(`FAIL ${r.url().slice(0, 110)} ${r.failure()?.errorText}`));

await page.goto(URL_, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(WAIT);

const out = await page.evaluate((sel) => {
  const els = [...document.querySelectorAll(sel)];
  return {
    count: els.length,
    detail: els.map((el) => ({
      children: el.children.length,
      rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
      kids: [...el.children].map((c) => {
        const r = c.getBoundingClientRect();
        return { t: (c.textContent || '').trim().slice(0, 14), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
      }),
      html: el.outerHTML.slice(0, 400),
    })),
    fleetHost: document.getElementById('fleet-lines')?.children.length ?? -1,
    view: document.body.dataset.view,
  };
}, SEL);

console.log(JSON.stringify(out, null, 2));
console.log('--- network ---');
console.log(net.join('\n'));
await browser.close();
