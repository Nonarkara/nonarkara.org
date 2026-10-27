// When does the desk first touch the DOM?
//
// The spatial instrument settles the page about a hundred milliseconds
// after the document parses, and measures whatever is there. If the desk
// is not painted by then, the instrument measures the sign and calls it
// clean — which is how a receipt for the shell gets written.
//
// This measures the gap between the parse and the desk's first paint.
import { loadChromium } from './playwright.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8786';
const ROUTE = process.argv[3] || '/?view=plan';
const EXEC = process.env.CHROME_EXEC || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await (await loadChromium()).launch({
  executablePath: EXEC,
  args: ['--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});
const page = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
const t0 = Date.now();
let parsed = 0, painted = 0, cells = 0;
await page.goto(BASE + ROUTE, { waitUntil: 'commit', timeout: 90000 });
for (let i = 0; i < 400; i++) {
  const s = await page.evaluate(() => ({
    ready: document.readyState,
    cells: document.querySelectorAll('.plan-cell').length,
    ioc: document.querySelectorAll('.ioc-cell').length,
    view: document.body?.dataset?.view || '-',
  })).catch(() => null);
  if (!s) { await page.waitForTimeout(10); continue; }
  if (!parsed && s.ready !== 'loading') parsed = Date.now() - t0;
  if (!painted && (s.cells > 0 || s.ioc > 0)) { painted = Date.now() - t0; cells = s.cells; }
  if (painted) break;
  await page.waitForTimeout(10);
}
console.log(JSON.stringify({ route: ROUTE, parsedMs: parsed, deskPaintedMs: painted, cells, afterParseMs: painted - parsed }));
await browser.close();
