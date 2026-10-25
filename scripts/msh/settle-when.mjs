#!/usr/bin/env node
/**
 * WHEN DOES THE GATE MEASURE?
 *
 * The gate settles on DOM stillness and then measures. This replays that
 * exact logic against the real page and reports the moment it fires, plus
 * what the page looked like at that moment — so "the gate measured the
 * boot curtain" becomes a timestamp instead of a guess.
 *
 * The logic here is the vendored instrument's, restated:
 *   signature = scrollWidth|scrollHeight|elementCount|svgWidth|textLength
 *   settle when the signature is identical 4 times running (25ms apart),
 *   at least 100ms have passed, no DOM mutation for 60ms, and fonts and
 *   images have arrived.
 *
 *   node scripts/msh/settle-when.mjs --url http://127.0.0.1:8784/index.html?view=plan
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html?view=plan');

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

await page.exposeFunction('__spatialWatch__', () => { /* presence only */ });

const t0 = Date.now();
await page.goto(URL_, { waitUntil: 'domcontentloaded' });

// The gate's watcher: the page reports its own last mutation time.
await page.evaluate(() => {
  window.__wlast = Date.now();
  new MutationObserver(() => { window.__wlast = Date.now(); })
    .observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
});

const result = await page.evaluate(async () => {
  const d = document;
  const win = window;
  const signature = () => {
    const doc = d.documentElement;
    const svgs = d.getElementsByTagName('svg');
    let sw = 0;
    for (let i = 0; i < svgs.length; i++) sw += Math.round(svgs[i].getBoundingClientRect().width);
    const main = d.querySelector('main#content') || d.querySelector('main') || d.body;
    const text = main ? main.textContent.length : 0;
    return [doc.scrollWidth, doc.scrollHeight, d.getElementsByTagName('*').length, sw, text].join('|');
  };
  const arrived = () => {
    try { if (d.fonts && d.fonts.status && d.fonts.status !== 'loaded') return false; } catch (_) {}
    const imgs = d.getElementsByTagName('img');
    for (let i = 0; i < imgs.length; i++) if (!imgs[i].complete) return false;
    return true;
  };
  const visibleChars = () => {
    const main = d.querySelector('main#content') || d.querySelector('main') || d.body;
    let chars = 0;
    for (const el of main.querySelectorAll('*')) {
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let own = '';
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      chars += own.replace(/\s+/g, ' ').trim().length;
    }
    return chars;
  };

  const start = Date.now();
  let tries = 0, last = null, stable = 0;
  const log = [];
  while (tries++ < 600 && Date.now() - start < 5000) {
    const s = signature();
    if (s === last) stable++; else { stable = 0; last = s; }
    const quiet = Date.now() - window.__wlast >= 60;
    if (stable >= 3 && Date.now() - start >= 100 && quiet && arrived()) {
      const boot = d.getElementById('boot');
      const plan = d.getElementById('plan');
      return {
        firedAt: Date.now() - start,
        signature: s,
        visibleChars: visibleChars(),
        boot: boot ? win.getComputedStyle(boot).display : 'gone',
        bootOpacity: boot ? win.getComputedStyle(boot).opacity : '1',
        plan: plan ? win.getComputedStyle(plan).display : 'none',
        view: d.body.dataset.view,
        door: d.body.dataset.door,
        fleet: d.querySelectorAll('.fleet-stns').length,
        log,
      };
    }
    log.push(`${Date.now() - start}ms stable=${stable} quiet=${quiet} arrived=${arrived()} ${s}`);
    await new Promise((r) => setTimeout(r, 25));
  }
  return { firedAt: -1, log };
});

console.log(`settle fired at ${result.firedAt}ms`);
if (result.signature) {
  console.log(`  signature      ${result.signature}`);
  console.log(`  visible chars  ${result.visibleChars}`);
  console.log(`  boot           display=${result.boot} opacity=${result.bootOpacity}`);
  console.log(`  plan           display=${result.plan}`);
  console.log(`  body view      ${result.view}  door=${result.door}`);
  console.log(`  fleet rows     ${result.fleet}`);
}
console.log('\n--- the walk ---');
console.log((result.log || []).slice(0, 40).join('\n'));
await browser.close();
