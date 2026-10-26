#!/usr/bin/env node
/**
 * THE GATE'S HARNESS, WITH THE PAGE'S CONSOLE ATTACHED.
 *
 * The gate opens the page inside an iframe inside a harness page, waits
 * for the iframe's document to parse, and settles on DOM stillness. This
 * does exactly that, and additionally reports:
 *
 *   · every console error and page error from inside the iframe
 *   · whether the app booted at all
 *   · what the settle saw
 *
 * The question it answers: does the gate measure the site, or does it
 * sometimes measure the shell the page was before its JavaScript ran?
 *
 *   node scripts/msh/gate-harness.mjs --url http://127.0.0.1:8786/index.html?view=plan
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const TARGET = arg('url', 'http://127.0.0.1:8786/index.html?view=plan');
const W = Number(arg('w', 1440));
const H = Number(arg('h', 900));

const harness = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0}iframe{border:0;display:block}</style></head><body>
<iframe id="f"></iframe>
<script>
var f = document.getElementById('f');
f.style.width = ${W} + 'px'; f.style.height = ${H} + 'px';
f.src = ${JSON.stringify(TARGET)} + '&__spatial=1';
</script></body></html>`;

const browser = await chromium.launch({
  args: [
    '--headless=new',
    '--disable-gpu',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--no-sandbox',
  ],
});
const ctx = await browser.newContext({ viewport: { width: W + 40, height: H + 40 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const msgs = [];
page.on('console', (m) => msgs.push(`${m.type()}: ${m.text().slice(0, 200)}`));
page.on('pageerror', (e) => msgs.push('PAGEERROR: ' + e.message.slice(0, 200)));

const ORIGIN = new URL(TARGET).origin;
await page.goto(ORIGIN + '/index.html', { waitUntil: 'domcontentloaded' });
await page.evaluate((html) => { document.open(); document.write(html); document.close(); }, harness);

await page.waitForFunction(() => {
  const d = document.getElementById('f').contentDocument;
  return d && d.readyState !== 'loading' && d.location.search.includes('__spatial=1');
}, { timeout: 30000 });

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
  const snap = (why) => {
    const boot = d.getElementById('boot');
    const plan = d.getElementById('plan');
    return {
      why,
      visibleChars: visibleChars(),
      boot: boot ? win.getComputedStyle(boot).display : 'gone',
      bootOpacity: boot ? win.getComputedStyle(boot).opacity : '1',
      plan: plan ? win.getComputedStyle(plan).display : 'none',
      view: d.body.dataset.view,
      door: d.body.dataset.door,
      fleet: d.querySelectorAll('.fleet-stns').length,
      canvas: !!d.querySelector('#canvas-root canvas'),
      elements: d.getElementsByTagName('*').length,
      fonts: d.fonts ? d.fonts.status : 'n/a',
    };
  };

  const w = { last: Date.now() };
  new win.MutationObserver(() => { w.last = Date.now(); })
    .observe(d.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });

  const start = Date.now();
  let tries = 0, last = null, stable = 0, verified = false;
  const trail = [];
  while (tries++ < 600 && Date.now() - start < 5000) {
    const s = signature();
    if (s === last) stable++; else { stable = 0; last = s; }
    const quiet = Date.now() - w.last >= 60;
    if (stable >= 3 && Date.now() - start >= 100 && quiet && arrived()) {
      if (verified) return { fired: snap('SETTLED'), trail };
      verified = true;
      await new Promise((r) => setTimeout(r, 40));
      if (signature() === last) return { fired: snap('SETTLED'), trail };
      verified = false; stable = 0; last = signature();
      continue;
    }
    if (tries % 20 === 0) trail.push(`${Date.now() - start}ms stable=${stable} quiet=${quiet} arrived=${arrived()} ${s}`);
    await new Promise((r) => setTimeout(r, 25));
  }
  return { fired: snap('DEADLINE — measured anyway'), trail };
});

console.log(JSON.stringify(out.fired, null, 2));
console.log('\n--- trail ---');
console.log((out.trail || []).join('\n'));
if (msgs.length) {
  console.log('\n--- console ---');
  console.log(msgs.slice(0, 25).join('\n'));
}
await browser.close();
