// Does the URL-named desk actually open, and does it stay open?
//
// A desk named in the URL is a promise: /?view=plan is the desk, not the
// sign. This checks the promise at four moments, and reports the door's
// state, because the sign and the desk are two different first screens.
import { chromeExecutable, loadChromium } from './playwright.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8786';
const ROUTE = process.argv[3] || '/?view=plan';
const EXEC = chromeExecutable();

const browser = await (await loadChromium()).launch({
  executablePath: EXEC,
  args: ['--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});
const page = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push('ERR ' + e.message.slice(0, 200) + ' @ ' + (e.stack || '').split('\n').slice(0,3).join(' | ')));
await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded', timeout: 90000 });
const marks = [];
for (const t of [1000, 1000, 2000, 4000, 8000]) {
  await page.waitForTimeout(t);
  marks.push(await page.evaluate(() => ({
    search: location.search,
    view: document.body.dataset.view || '-',
    door: document.body.dataset.door || '-',
    doorClass: document.getElementById('door')?.className || '-',
    theme: document.body.dataset.theme || '-',
    cells: document.querySelectorAll('.plan-cell').length,
    ioc: document.querySelectorAll('.ioc-cell').length,
    plan: getComputedStyle(document.getElementById('plan')).display,
  })));
}
marks.forEach((m, i) => console.log(i, JSON.stringify(m)));
console.log('errors:', errs.slice(0, 4));
await browser.close();
