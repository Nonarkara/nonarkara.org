// Which Chrome flags let the desk paint inside the instrument's budget?
//
// The gate's settle deadline is five seconds. The desk is only reachable if
// the app is alive by then. The gate launches Chrome with a fixed list of
// flags, and the sanctioned way to change the environment (the vendored
// instrument itself is byte-identical and must stay that way) is the wrapper
// script scripts/spatial/chrome-webgl.sh.
//
// A wrapper is only worth anything if it is MEASURED, so this runs the four
// combinations that matter:
//   --disable-gpu          present or absent
//   background throttling  disabled or left alone
//
// and reports when the desk is actually painted, in each case.
import { loadChromium } from './playwright.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8786';
const route = process.argv[3] || '/?view=plan';

const BASE_FLAGS = ['--headless=new', '--hide-scrollbars', '--no-sandbox',
  '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const METAL_FLAGS = ['--headless=new', '--hide-scrollbars', '--no-sandbox',
  '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--enable-unsafe-swiftshader'];
const GPU = ['--disable-gpu'];
const THROTTLE = ['--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'];

async function run(label, args) {
  let browser;
  try {
    browser = await (await loadChromium()).launch({ args });
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await ctx.newPage();
    const t0 = Date.now();
    const marks = {};
    await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 120000 });
    marks.dcl = Date.now() - t0;
    await page.waitForFunction(() => document.body.dataset.view === 'plan', null, { timeout: 60000 }).catch(() => {});
    marks.view = Date.now() - t0;
    await page.waitForFunction(() => document.querySelectorAll('#fleet-lines .fleet-stn').length > 0, null, { timeout: 60000 }).catch(() => {});
    marks.fleet = Date.now() - t0;
    marks.chars = await page.evaluate(() => document.body.innerText.length);
    marks.sceneLive = await page.evaluate(() => document.body.classList.contains('scene-live'));
    console.log(label.padEnd(34), JSON.stringify(marks));
  } catch (e) {
    console.log(label.padEnd(34), 'ERROR', String(e).slice(0, 120));
  } finally {
    try { await browser?.close(); } catch (_) {}
  }
}

await run('--disable-gpu, throttling off', [...BASE_FLAGS, ...GPU]);
await run('--disable-gpu, throttling on ', [...BASE_FLAGS, ...GPU, ...THROTTLE]);
await run('no --disable-gpu, throttling off', [...BASE_FLAGS]);
await run('no --disable-gpu, throttling on ', [...BASE_FLAGS, ...THROTTLE]);
await run('metal ANGLE, throttling off   ', [...METAL_FLAGS]);
await run('metal ANGLE, throttling on    ', [...METAL_FLAGS, ...THROTTLE]);
