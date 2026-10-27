// When CAN the gate's settle fire, and what has the app painted by then?
//
// The gate measures the page once it stops moving. "Stops moving" means:
// three identical readings a beat apart, a hundred milliseconds elapsed,
// sixty milliseconds since the last DOM mutation, and everything that can
// arrive late (fonts, images) already here.
//
// This watches the real thing — the gate's own harness, the site inside it —
// and reports the moment the settle could first certify, and what the desk
// looked like at that moment. It is the difference between "the gate
// measured the shell" and "the gate measured the shell BECAUSE ...".
import { loadChromium } from './playwright.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const REPO = process.cwd();
const BASE = process.argv[2] || 'http://127.0.0.1:8786';
const WIDTH = Number(process.argv[3] || 1440);
const ROUTE = process.argv[4] || '/?view=plan';

const src = readFileSync(path.join(REPO, 'scripts/spatial/spatial-check.mjs'), 'utf8');
const start = src.indexOf('const HARNESS = `');
const end = src.indexOf('`;\n\nfunction harnessHtml');
let harness = src.slice(start + 'const HARNESS = `'.length, end);
const PROBE_SRC = readFileSync(path.join(REPO, 'scripts/spatial/spatial-probe.js'), 'utf8');
harness = harness.replace('__WIDTHS__', JSON.stringify([WIDTH]))
  .replace('__ROUTES__', JSON.stringify([ROUTE]))
  .replace('__SKIP__', '0')
  .replace('__PROBE__', JSON.stringify(PROBE_SRC));
const WORK = path.join(REPO, '.msh-fixture');
mkdirSync(WORK, { recursive: true });
writeFileSync(path.join(WORK, 'gate-harness.html'), harness);

const EXEC = process.env.CHROME_EXEC || undefined;
const browser = await (await loadChromium()).launch({
  executablePath: EXEC,
  args: ['--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage',
         '--hide-scrollbars', '--disable-background-timer-throttling',
         '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto(BASE + '/.msh-fixture/gate-harness.html', { waitUntil: 'domcontentloaded', timeout: 120000 });

// Poll the iframe from the OUTSIDE: what the gate's settle would see.
const t0 = Date.now();
const log = [];
for (let i = 0; i < 60; i++) {
  const s = await page.evaluate((ROUTE) => {
    const f = document.getElementById('f');
    let d = null;
    try { d = f.contentDocument; } catch (_) {}
    if (!d) return { t: Date.now(), ready: 'no document' };
    const cells = d.querySelectorAll('.plan-cell').length;
    const iocCells = d.querySelectorAll('.ioc-cell').length;
    let fonts = 'n/a';
    try { fonts = d.fonts.status; } catch (_) {}
    let imgs = 0, imgsDone = 0;
    const il = d.getElementsByTagName('img');
    for (let k = 0; k < il.length; k++) { imgs++; if (il[k].complete) imgsDone++; }
    return {
      ready: d.readyState, view: d.body.dataset.view || '-', theme: d.body.dataset.theme || '-',
      chars: (d.body.innerText || '').length, cells, iocCells, fonts, imgs, imgsDone,
      elems: d.getElementsByTagName('*').length,
    };
  }, ROUTE).catch(e => ({ error: String(e).slice(0, 80) }));
  log.push({ ms: Date.now() - t0, ...s });
  await page.waitForTimeout(50);
}
for (const l of log) {
  if (l.error) { console.log(String(l.ms).padStart(6), 'ERR', l.error); continue; }
  console.log(String(l.ms).padStart(6), String(l.ready).padEnd(12), 'view=' + String(l.view).padEnd(6),
    'theme=' + String(l.theme).padEnd(6), 'chars=' + String(l.chars).padStart(5),
    'cells=' + String(l.cells ?? '-').padStart(3), 'ioc=' + String(l.iocCells ?? '-').padStart(3),
    'fonts=' + String(l.fonts).padEnd(8), 'imgs=' + (l.imgsDone ?? '-') + '/' + (l.imgs ?? '-'),
    'els=' + l.elems);
}
await browser.close();
