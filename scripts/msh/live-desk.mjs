// Does the live site open a URL-named desk immediately?
import { loadChromium } from './playwright.mjs';

const BASE = process.argv[2] || 'https://nonarkara.org/';
const route = process.argv[3] || '/?view=plan';
const browser = await (await loadChromium()).launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
         '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
const page = await ctx.newPage();
const t0 = Date.now();
await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 120000 });
const marks = {};
const poll = async () => {
  const s = await page.evaluate(() => ({
    view: document.body.dataset.view || null,
    planShown: getComputedStyle(document.getElementById('plan')).display,
    doorSkip: document.getElementById('door')?.classList.contains('skip') ?? null,
    chars: document.body.innerText.length,
    ver: window.NON_VERSION || null,
  })).catch(() => null);
  return s;
};
marks.atCommit = Date.now() - t0;
console.log('committed at', marks.atCommit, 'ms');
let last = null;
for (let i = 0; i < 40; i++) {
  const s = await poll();
  if (!s) { await page.waitForTimeout(200); continue; }
  if (s.view !== last?.view || s.chars !== last?.chars) {
    console.log(`  ${String(Date.now() - t0).padStart(6)}ms view=${s.view} plan=${s.planShown} doorSkip=${s.doorSkip} chars=${s.chars} v=${s.ver}`);
    last = s;
  }
  if (s.view === 'plan' && s.chars > 5000) break;
  await page.waitForTimeout(250);
}
await browser.close();
