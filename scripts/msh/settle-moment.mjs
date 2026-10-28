#!/usr/bin/env node
/**
 * WHAT THE GATE SEES AT THE SETTLE MOMENT.
 *
 * The gate's settle fires when the DOM stops changing for a beat, the
 * fonts have loaded and the images have arrived. That can be BEFORE the
 * app's JavaScript has run — the static HTML is already parsed, already
 * still, and already has its fonts.
 *
 * This reproduces the gate's harness (an iframe inside a same-origin
 * page) and prints, at the settle moment: what is visible, what the body
 * looks like, and whether the app has booted at all.
 *
 *   node scripts/msh/settle-moment.mjs --url http://127.0.0.1:8784/index.html?view=plan
 */

import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const TARGET = arg('url', 'http://127.0.0.1:8784/index.html?view=plan');
const W = Number(arg('w', 1440));

const harness = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0}iframe{border:0;display:block}</style></head><body>
<iframe id="f"></iframe>
<script>
var f = document.getElementById('f');
f.style.width = ${W} + 'px'; f.style.height = '900px';
f.src = ${JSON.stringify(TARGET)} + '&__spatial=1';
</script></body></html>`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W + 40, height: 940 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const ORIGIN = new URL(TARGET).origin;
await page.goto(ORIGIN + '/index.html', { waitUntil: 'domcontentloaded' });
await page.evaluate((html) => { document.open(); document.write(html); document.close(); }, harness);

// The harness polls for the document the way the gate does.
const t0 = Date.now();
let poll = 0;
await page.waitForFunction(() => {
  const d = document.getElementById('f').contentDocument;
  return d && d.readyState !== 'loading' && d.location.search.includes('__spatial=1');
}, { timeout: 30000 });
const parsedAt = Date.now() - t0;

const out = await page.evaluate(async () => {
  const d = document.getElementById('f').contentDocument;
  const win = d.defaultView;
  const signature = () => {
    const doc = d.documentElement;
    const svgs = d.getElementsByTagName('svg');
    let sw = 0;
    for (let i = 0; i < svgs.length; i++) sw += Math.round(svgs[i].getBoundingClientRect().width);
    const main = d.querySelector('main#content') || d.querySelector('main') || d.body;
    return [doc.scrollWidth, doc.scrollHeight, d.getElementsByTagName('*').length, sw,
      main ? main.textContent.length : 0].join('|');
  };
  const arrived = () => {
    try { if (d.fonts && d.fonts.status && d.fonts.status !== 'loaded') return false; } catch (_) {}
    const imgs = d.getElementsByTagName('img');
    for (let i = 0; i < imgs.length; i++) if (!imgs[i].complete) return false;
    return true;
  };
  const visible = () => {
    const main = d.querySelector('main#content') || d.querySelector('main') || d.body;
    const out = [];
    for (const el of main.querySelectorAll('*')) {
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let own = '';
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      own = own.replace(/\s+/g, ' ').trim();
      if (!own) continue;
      out.push({ sel: el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0], own: own.slice(0, 30) });
    }
    return out;
  };

  const w = { last: Date.now() };
  new win.MutationObserver(() => { w.last = Date.now(); })
    .observe(d.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });

  const start = Date.now();
  let tries = 0, last = null, stable = 0;
  while (tries++ < 600 && Date.now() - start < 5000) {
    const s = signature();
    if (s === last) stable++; else { stable = 0; last = s; }
    const quiet = Date.now() - w.last >= 60;
    if (stable >= 3 && Date.now() - start >= 100 && quiet && arrived()) {
      const boot = d.getElementById('boot');
      const plan = d.getElementById('plan');
      return {
        fired: true,
        at: Date.now() - start,
        visible: visible(),
        boot: boot ? win.getComputedStyle(boot).display : 'gone',
        plan: plan ? win.getComputedStyle(plan).display : 'none',
        view: d.body.dataset.view,
        door: d.body.dataset.door,
        fleet: d.querySelectorAll('.fleet-stns').length,
        canvas: !!d.querySelector('#canvas-root canvas'),
        modulesRan: !!win.__drive || !!win.__lastStatusData,
      };
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  return { fired: false };
});

console.log(`document parsed at ${parsedAt}ms`);
console.log(JSON.stringify(out, null, 2));
await browser.close();
