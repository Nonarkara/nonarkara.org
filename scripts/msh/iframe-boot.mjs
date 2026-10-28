#!/usr/bin/env node
/**
 * DOES THE APP BOOT INSIDE AN IFRAME?
 *
 * The gate does not open the page at the top level. It opens it inside an
 * iframe inside a harness page, and it measures that iframe. If the app
 * does not boot in an iframe, the gate has been measuring a page that no
 * reader ever gets — a page with the boot curtain still up and the desk
 * still closed.
 *
 *   node scripts/msh/iframe-boot.mjs --url http://127.0.0.1:8784/index.html?view=plan
 */

import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const TARGET = arg('url', 'http://127.0.0.1:8784/index.html?view=plan');
const WAIT = Number(arg('wait', 9000));

const harness = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0}iframe{border:0;display:block}</style></head><body>
<iframe id="f"></iframe>
<script>
window.__err = [];
window.addEventListener('error', (e) => window.__err.push('parent: ' + e.message));
var f = document.getElementById('f');
f.style.width = 1440 + 'px'; f.style.height = 900 + 'px';
f.src = ${JSON.stringify(TARGET)};
</script></body></html>`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1480, height: 940 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/cloudflareinsights|ERR_FAILED|404|403|api\.github/.test(t)) return;
  errors.push('console: ' + t);
});

const ORIGIN = new URL(TARGET).origin;
await page.goto(ORIGIN + '/index.html', { waitUntil: 'domcontentloaded' });
await page.evaluate((html) => { document.open(); document.write(html); document.close(); }, harness);

for (const t of [1000, 3000, 6000, WAIT]) {
  await page.waitForTimeout(t === 1000 ? 1000 : 2000);
  const s = await page.evaluate(() => {
    const d = document.getElementById('f').contentDocument;
    if (!d) return { none: true };
    const win = d.defaultView;
    const boot = d.getElementById('boot');
    const plan = d.getElementById('plan');
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
    return {
      readyState: d.readyState,
      boot: boot ? win.getComputedStyle(boot).display : 'gone',
      bootOpacity: boot ? win.getComputedStyle(boot).opacity : '1',
      plan: plan ? win.getComputedStyle(plan).display : 'none',
      view: d.body.dataset.view,
      door: d.body.dataset.door,
      fleet: d.querySelectorAll('.fleet-stns').length,
      canvas: !!d.querySelector('#canvas-root canvas'),
      elements: d.getElementsByTagName('*').length,
      visibleChars: chars,
      fonts: d.fonts ? d.fonts.status : 'n/a',
      webgl: (() => { try { return !!d.createElement('canvas').getContext('webgl2'); } catch (_) { return false; } })(),
    };
  });
  console.log(`${t}ms`, JSON.stringify(s));
  if (s.visibleChars > 5000) break;
}

if (errors.length) console.log('errors:', errors.join('\n  '));
await browser.close();
