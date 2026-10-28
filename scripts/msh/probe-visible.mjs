#!/usr/bin/env node
/**
 * WHAT THE PROBE WOULD SEE — the visible text of the page, over time.
 *
 * The spatial gate counts the text a reader can SEE: elements that are
 * displayed and have a box. The plan view is `display:none` until the app
 * opens it, and the boot curtain is a full-screen overlay until it is
 * dismissed — so for a while the page's visible text is the curtain's
 * logo and nothing else.
 *
 * This walks the clock and prints what the gate's own counting would see,
 * so the window in which a measurement can be taken on the wrong surface
 * is a number instead of a suspicion.
 *
 *   node scripts/msh/probe-visible.mjs --url http://127.0.0.1:8784/index.html?view=plan
 */

import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html?view=plan');

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const t0 = Date.now();
await page.goto(URL_, { waitUntil: 'domcontentloaded' });

console.log('  ms   visible-chars  elements  boot        plan-display  fleet-rows');
for (let i = 0; i < 40; i++) {
  const s = await page.evaluate(() => {
    const main = document.querySelector('main#content') || document.querySelector('main') || document.body;
    let chars = 0;
    for (const el of main.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let own = '';
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      chars += own.replace(/\s+/g, ' ').trim().length;
    }
    const boot = document.getElementById('boot');
    const plan = document.getElementById('plan');
    return {
      chars,
      els: document.getElementsByTagName('*').length,
      boot: boot ? getComputedStyle(boot).display : 'gone',
      plan: plan ? getComputedStyle(plan).display : 'none',
      fleet: document.querySelectorAll('.fleet-stns').length,
    };
  });
  console.log(
    `${String(Date.now() - t0).padStart(5)}   ${String(s.chars).padStart(6)}      ` +
    `${String(s.els).padStart(5)}   ${s.boot.padEnd(9)}  ${s.plan.padEnd(12)}  ${s.fleet}`,
  );
  if (s.chars > 5000) break;
  await page.waitForTimeout(150);
}

await browser.close();
