#!/usr/bin/env node
/**
 * THE HARNESS, REPRODUCED — what the gate actually measures.
 *
 * The gate does not open the page at the top level. It opens the page
 * inside an IFRAME inside a harness page, waits for the iframe's document
 * to parse, and then waits for the page to settle. This does the same
 * thing and reports the state of the page at the moment the measurement
 * would be taken — including the five-second deadline case, where the
 * settle gives up and measures anyway.
 *
 *   node scripts/msh/harness-repro.mjs --url http://127.0.0.1:8784/index.html?view=plan
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const TARGET = arg('url', 'http://127.0.0.1:8784/index.html?view=plan');
const W = Number(arg('w', 1440));
const H = Number(arg('h', 900));

// The harness page: a same-origin iframe, sized to the width being measured.
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
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist', '--allow-running-insecure-content'],
});
const ctx = await browser.newContext({ viewport: { width: W + 40, height: H + 40 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

// The harness must be SAME-ORIGIN with the page it measures, or the probe
// cannot read the iframe's geometry. So we arrive at the site's own origin
// first and write the harness there.
const ORIGIN = new URL(TARGET).origin;
await page.goto(ORIGIN + '/index.html', { waitUntil: 'domcontentloaded' });
await page.evaluate((html) => {
  document.open();
  document.write(html);
  document.close();
}, harness);

// Wait for the iframe's document to parse, exactly as the gate does.
await page.waitForFunction(() => {
  const d = document.getElementById('f').contentDocument;
  return d && d.readyState !== 'loading' && d.location.search.includes('__spatial=1');
}, { timeout: 30000 });

const state = await page.evaluate(() => {
  const d = document.getElementById('f').contentDocument;
  const win = d.defaultView;
  const imgs = [...d.getElementsByTagName('img')].map((i) => ({
    src: i.currentSrc || i.src, complete: i.complete, w: i.naturalWidth,
  }));
  const boot = d.getElementById('boot');
  const plan = d.getElementById('plan');
  return {
    readyState: d.readyState,
    fontsStatus: d.fonts ? d.fonts.status : 'n/a',
    images: imgs,
    imgCount: imgs.length,
    boot: boot ? win.getComputedStyle(boot).display : 'gone',
    bootOpacity: boot ? win.getComputedStyle(boot).opacity : '1',
    plan: plan ? win.getComputedStyle(plan).display : 'none',
    view: d.body.dataset.view,
    door: d.body.dataset.door,
    fleet: d.querySelectorAll('.fleet-stns').length,
    elements: d.getElementsByTagName('*').length,
    textLen: (d.querySelector('main#content') || d.querySelector('main') || d.body).textContent.length,
    visibility: d.visibilityState,
  };
});

console.log(JSON.stringify(state, null, 2));
await browser.close();
