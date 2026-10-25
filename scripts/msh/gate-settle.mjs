#!/usr/bin/env node
/**
 * THE GATE'S OWN SETTLE, REPLAYED — with the gate's own browser flags.
 *
 * The gate opens the page in an iframe, waits for the document to parse,
 * and then waits for the page to settle. This does exactly that, under
 * the same Chrome flags the gate uses (headless, software WebGL), and
 * reports the page's state at the instant the measurement would be taken.
 *
 *   node scripts/msh/gate-settle.mjs --url http://127.0.0.1:8784/index.html?view=plan
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const TARGET = arg('url', 'http://127.0.0.1:8784/index.html?view=plan');
const W = Number(arg('w', 1440));
const H = Number(arg('h', 900));

const harness = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0}iframe{border:0;display:block}</style></head><body>
<iframe id="f"></iframe>
<script>
window.__f = document.getElementById('f');
window.__f.style.width = ${W} + 'px';
window.__f.style.height = ${H} + 'px';
window.__f.src = ${JSON.stringify(TARGET)} + '&__spatial=1';
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

  const w = { last: Date.now() };
  new d.defaultView.MutationObserver(() => { w.last = Date.now(); })
    .observe(d.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });

  const start = Date.now();
  let tries = 0, last = null, stable = 0, verified = false;
  const log = [];
  const snap = (why) => {
    const boot = d.getElementById('boot');
    const plan = d.getElementById('plan');
    return {
      why,
      at: Date.now() - start,
      visibleChars: visibleChars(),
      boot: boot ? win.getComputedStyle(boot).display : 'gone',
      bootOpacity: boot ? win.getComputedStyle(boot).opacity : '1',
      plan: plan ? win.getComputedStyle(plan).display : 'none',
      view: d.body.dataset.view,
      door: d.body.dataset.door,
      fleet: d.querySelectorAll('.fleet-stns').length,
      elements: d.getElementsByTagName('*').length,
      fonts: d.fonts ? d.fonts.status : 'n/a',
      arrived: arrived(),
    };
  };

  while (tries++ < 600 && Date.now() - start < 5000) {
    const s = signature();
    if (s === last) stable++; else { stable = 0; last = s; }
    const quiet = Date.now() - w.last >= 60;
    if (stable >= 3 && Date.now() - start >= 100 && quiet && arrived()) {
      if (verified) return { fired: snap('settled'), log };
      verified = true;
      await new Promise((r) => setTimeout(r, 40));
      const again = signature();
      if (again === last) return { fired: snap('settled'), log };
      verified = false; stable = 0; last = again;
      continue;
    }
    log.push(`${Date.now() - start}ms stable=${stable} quiet=${quiet} arrived=${arrived()} ${s}`);
    await new Promise((r) => setTimeout(r, 25));
  }
  return { fired: snap('DEADLINE — the settle gave up and measured anyway'), log };
});

console.log(JSON.stringify(out.fired, null, 2));
console.log('\n--- the walk (first 24) ---');
console.log((out.log || []).slice(0, 24).join('\n'));
await browser.close();
