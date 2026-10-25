import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,4).join('\n')));
page.on('requestfailed', (r) => logs.push(`REQFAIL ${r.url().slice(0,120)} :: ${r.failure()?.errorText}`));

await page.goto('http://127.0.0.1:8784/index.html', { waitUntil: 'load' });
await page.waitForTimeout(6000);

const state = await page.evaluate(() => ({
  bodyDataset: { ...document.body.dataset },
  boot: (() => { const b = document.getElementById('boot'); return b ? { cls: b.className, display: getComputedStyle(b).display, opacity: getComputedStyle(b).opacity } : null; })(),
  door: (() => { const d = document.getElementById('door'); return d ? { cls: d.className, display: getComputedStyle(d).display } : null; })(),
  canvasCount: document.querySelectorAll('#canvas-root canvas').length,
  nonVersion: window.NON_VERSION,
  appReady: document.body.dataset.appReady,
  webglFallback: (() => { const f = document.getElementById('webgl-fallback'); return f ? getComputedStyle(f).display : 'none-el'; })(),
}));
console.log('STATE:', JSON.stringify(state, null, 2));
console.log('\nLOGS:\n' + logs.slice(0, 40).join('\n'));
await browser.close();
