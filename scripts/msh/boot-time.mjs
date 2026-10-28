// How long does the app take to boot under the gate's own Chrome flags?
// The gate's settle deadline is 5s; if the app is not alive by then, the
// gate measures the shell, not the site.
import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();

const base = process.argv[2] || 'http://127.0.0.1:8786';
const route = process.argv[3] || '/?view=plan';
const GATE = ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
  '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function run(label, args) {
  const browser = await chromium.launch({ args });
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = {};
  page.on('response', r => {
    if (!marks.firstModule) marks.firstModule = Date.now() - t0;
  });
  await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
  marks.domContentLoaded = Date.now() - t0;
  await page.waitForFunction(() => document.body.dataset.view === 'plan', null, { timeout: 30000 }).catch(() => {});
  marks.viewSet = Date.now() - t0;
  await page.waitForFunction(() => document.querySelectorAll('#fleet-lines .fleet-stn').length > 0, null, { timeout: 30000 }).catch(() => {});
  marks.fleetPainted = Date.now() - t0;
  await page.waitForTimeout(300);
  marks.sceneLive = await page.evaluate(() => document.body.classList.contains('scene-live'));
  marks.chars = await page.evaluate(() => document.body.innerText.length);
  console.log(label, JSON.stringify(marks));
  await browser.close();
}

await run('gate-flags ', GATE);
await run('no-disable-gpu', GATE.filter(a => a !== '--disable-gpu'));
