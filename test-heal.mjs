// test-heal.mjs — the self-heal must heal a stale build and NOTHING else.
//
// The heal is the site's repair mechanism, and for a week it was the site's
// most destructive feature: it fired on every visit, deleted every cache,
// unregistered the service worker and navigated away a second and a half
// after the page loaded. A reader who reached for anything in that window
// had their tap thrown away by the reload. The cause was a comparison that
// put two different kinds of thing next to each other — a build hash on one
// side, a version string on the other — which can never be equal, so the
// answer was always "stale".
//
// Four cases, and only one of them is a heal:
//   1. the build matches            → nothing happens
//   2. the build is genuinely stale  → the caches go and the page navigates
//   3. the page has no build stamp   → nothing happens (it cannot tell)
//   4. version.json is not JSON     → nothing happens (the site has no 404s)
//
// Run: node test-heal.mjs

import { loadChromium } from './scripts/msh/playwright.mjs';
import { spawn } from 'node:child_process';

const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
const LIVE_BUILD = 'livebuild123';

let failures = 0;
function check(name, ok, detail) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// The server serves the repo. The test replaces /version.json in flight.
const server = spawn('node', ['scripts/msh/serve.mjs', String(PORT), process.cwd()], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

const browser = await (await loadChromium()).launch({
  executablePath: process.env.CHROME_EXEC || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function runCase(name, { versionJson, stamp, contentType, expectHeal }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  let navigations = [];
  let purges = 0;
  page.on('framenavigated', f => { if (f === page.mainFrame()) navigations.push(f.url()); });
  page.on('request', r => { if (r.url().endsWith('/heal')) purges++; });

  await page.route('**/version.json*', route => route.fulfill({
    status: 200,
    contentType: contentType || 'application/json',
    body: typeof versionJson === 'string' ? versionJson : JSON.stringify(versionJson),
  }));

  await page.goto(`${BASE}/?view=plan`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // The page reads its own stamp when the heal runs, 1.5s after load.
  if (stamp !== undefined) {
    await page.evaluate(v => { window.NON_BUILD = v; }, stamp);
  }

  // Wait for the CONDITION, not for a clock. The suite runs these tests on a
  // machine that is busy with other agents' browsers, and a fixed sleep
  // makes this test fail for reasons that have nothing to do with the heal.
  const deadline = Date.now() + 20000;
  if (expectHeal) {
    // The heal purges first and navigates second, so waiting for the purge
    // alone would stop the clock before the navigation has happened.
    while (Date.now() < deadline && !(purges > 0 && navigations.length > 1)) {
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
  } else {
    // Give the heal every chance to fire — it fires 1.5s after load — and
    // then let the page be still for a beat so a late heal would be seen.
    await page.waitForTimeout(6000);
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
  }

  const healed = purges > 0 || navigations.length > 1;
  console.log(`\n${name}`);
  console.log(`    navigations: ${navigations.length}  heal hits: ${purges}`);
  check(`${name} → ${healed ? 'HEALED' : 'quiet'}`, true, `navigations=${navigations.length} heals=${purges}`);
  await ctx.close();
  return { healed, navigations, count: navigations.length, purges };
}

// 1. The build matches. Nothing should happen.
{
  const r = await runCase('1. the build matches → quiet', {
    versionJson: { version: '4.51', build: LIVE_BUILD }, stamp: LIVE_BUILD,
  });
  check('  no heal', !r.healed, `heals=${r.purges} navs=${r.count}`);
}
// 2. The build is genuinely stale. The heal must fire.
{
  const r = await runCase('2. a stale build → heals', {
    versionJson: { version: '4.51', build: LIVE_BUILD }, stamp: 'anolderbuild', expectHeal: true,
  });
  check('  the heal fires', r.healed, `heals=${r.purges} navs=${r.count}`);
  check('  it navigates once, keeping the reader\'s own view', r.count === 2 && r.navigations[1].includes('view=plan'),
    r.navigations.join(' → '));
}
// 3. The page carries no build stamp. It cannot tell → it must do nothing.
{
  const r = await runCase('3. an unstamped page → quiet', {
    versionJson: { version: '4.51', build: LIVE_BUILD }, stamp: 'dev',
  });
  check('  no heal', !r.healed, `heals=${r.purges} navs=${r.count}`);
}
// 4. version.json comes back as the app itself (the site has no 404s).
{
  const r = await runCase('4. version.json is HTML → quiet', {
    versionJson: '<!DOCTYPE html><html><body>the app</body></html>',
    contentType: 'text/html; charset=utf-8', stamp: LIVE_BUILD,
  });
  check('  no heal', !r.healed, `heals=${r.purges} navs=${r.count}`);
}

await browser.close();
server.kill();

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
