#!/usr/bin/env node
/**
 * WHY DID THE GATE MEASURE THE BOOT CURTAIN?
 *
 * The gate's receipt for the desk route carries fifteen findings. On a
 * re-run they all went GONE — the receipt says the desk's station row
 * breaks and strands one station; the re-run says the desk has no
 * station row at all. Both cannot be true of the same page.
 *
 * This asks the two questions that separate the answers:
 *
 *   1. Does the page request anything that 404s? One missing module
 *      kills the whole module graph, and the app never boots.
 *   2. Does the app boot eventually, and how long does it take?
 *
 *   node scripts/msh/boot-why.mjs --url http://127.0.0.1:8786/index.html?view=plan --wait 30000
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8786/index.html?view=plan');
const WAIT = Number(arg('wait', 30000));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const problems = [];
page.on('requestfailed', (r) => problems.push(`FAIL ${r.failure()?.errorText} ${r.url().slice(0, 120)}`));
page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url().slice(0, 120)}`); });
page.on('pageerror', (e) => problems.push(`PAGEERROR ${e.message.slice(0, 200)}`));

const t0 = Date.now();
await page.goto(URL_, { waitUntil: 'domcontentloaded' });

let booted = null;
while (Date.now() - t0 < WAIT) {
  const s = await page.evaluate(() => ({
    view: document.body.dataset.view,
    plan: document.getElementById('plan') ? getComputedStyle(document.getElementById('plan')).display : 'none',
    boot: document.getElementById('boot') ? getComputedStyle(document.getElementById('boot')).display : 'gone',
    fleet: document.querySelectorAll('.fleet-stns').length,
    els: document.getElementsByTagName('*').length,
    canvases: document.querySelectorAll('canvas').length,
  }));
  if (s.fleet > 0 && s.boot === 'none') { booted = { ms: Date.now() - t0, ...s }; break; }
  await page.waitForTimeout(250);
}

console.log(`booted: ${booted ? booted.ms + 'ms ' + JSON.stringify(booted) : 'NEVER within ' + WAIT + 'ms'}`);
console.log('\n--- requests that failed or 404d ---');
const interesting = problems.filter((p) => !/cloudflareinsights|cdn-cgi\/rum/.test(p));
console.log(interesting.length ? [...new Set(interesting)].join('\n') : '(none)');

await browser.close();
