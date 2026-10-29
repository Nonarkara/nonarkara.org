#!/usr/bin/env node
/**
 * The surface check — the gate's other half.
 *
 * A spatial gate answers one question: "given this page, what is wrong with
 * it?" It does NOT answer "is this the page you meant?" Those are different
 * questions, and a gate that only answers the first one can certify the
 * shell and call it the site.
 *
 * That is not hypothetical. The gate used to be able to measure the sign
 * when it meant to measure the desk, and the desk when it meant to measure
 * the wall, and it went green every time — because the sign and the desk
 * have no findings. The guard that was supposed to catch this compared a
 * character count (which the desk also satisfies) and a CSS class the probe
 * never actually produces (`door-mark` is an <h1>, and the probe excludes
 * <h1> from its largest-text measurement, so the class it looked for was
 * the one thing that could never appear).
 *
 * So this check does the thing the guard could not: it proves, by
 * VISIBILITY, which surface is on screen, at every width the gate measures.
 *
 *   /            the sign is up, and the desk and the wall are not
 *   /?view=plan  the desk is up and painted, and the sign is not
 *   /?view=ioc   the wall is up and populated, and the sign is not
 *
 * The facts are read from the DOM itself — which element has a box, whether
 * the desk's cells were rendered — not from a class name that a stylesheet
 * might rename tomorrow.
 *
 *   node scripts/msh/surface-check.mjs [--base URL] [--json FILE]
 */

import { loadChromium } from './playwright.mjs';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

// The widths the spatial gate sweeps. One set, so the two instruments
// cannot disagree about what was measured.
export const WIDTHS = [
  360, 479, 480, 481, 559, 560, 561, 599, 600, 601, 602, 639, 640, 641,
  719, 720, 721, 759, 760, 761, 768, 899, 900, 901, 902, 1024, 1039, 1040,
  1041, 1440, 1920,
];

// What must be on screen, and what must not, for each route.
const EXPECT = {
  '/':            { up: 'door',   down: ['plan', 'ioc'], filled: null },
  '/?view=plan':  { up: 'plan',   down: ['door', 'ioc'], filled: '.plan-cell' },
  '/?view=ioc':   { up: 'ioc',    down: ['door', 'plan'], filled: '.ioc-cell' },
};

const PORT = Number(arg('--port', '8792'));
// Routes begin with '/', so a base ending in '/' would build '//' and the
// check would measure a page that is not the site. spatial-gate passes one.
const BASE = arg('--base', `http://127.0.0.1:${PORT}`).replace(/\/+$/, '');

// Wait until the page stops changing. A surface that has not settled is a
// surface nobody has seen yet — the same rule the spatial gate's own settle
// uses, because a measurement of a moving page measures nothing.
const SETTLE = `(ms) => new Promise((resolve) => {
  const w = { last: Date.now() };
  try {
    new MutationObserver(() => { w.last = Date.now(); })
      .observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  } catch (_) {}
  const t0 = Date.now();
  (function check() {
    const quiet = Date.now() - w.last;
    if (quiet >= 150 || Date.now() - t0 > 4000) return resolve();
    setTimeout(check, 25);
  })();
})`;

let server = null;
if (!arg('--base', null)) {
  server = spawn('node', ['scripts/msh/serve.mjs', String(PORT), process.cwd()], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
}

const browser = await (await loadChromium()).launch({
  executablePath: process.env.CHROME_EXEC || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const results = [];

for (const [route, want] of Object.entries(EXPECT)) {
  const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 120)));

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    if (width === WIDTHS[0]) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // Quiet is not the same as booted: the page can be silent for 150ms
      // before its module scripts have run, and every cell then reads
      // "nothing rendered". Wait for the surface the route names to have a
      // box (and its cells, if it has any). If it never does, fall through
      // and measure — that is the honest failure, not a skipped one.
      await page.waitForFunction(({ id, cells }) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0
          && (!cells || document.querySelectorAll(cells).length > 0);
      }, { id: want.up, cells: want.filled }, { timeout: 20000 }).catch(() => {});
    }
    await page.evaluate(SETTLE);

    const seen = await page.evaluate((want) => {
      const box = (id) => {
        const el = document.getElementById(id);
        if (!el) return { present: false, visible: false, w: 0, h: 0 };
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const visible = cs.display !== 'none' && cs.visibility !== 'hidden'
          && Number(cs.opacity) > 0.05 && r.width > 0 && r.height > 0;
        return { present: true, visible, w: Math.round(r.width), h: Math.round(r.height) };
      };
      const out = {
        door: box('door'), plan: box('plan'), ioc: box('ioc'),
        cells: document.querySelectorAll(want.filled || '.plan-cell').length,
        view: document.body.dataset.view || null,
        doorState: document.body.dataset.door || null,
      };
      return out;
    }, want);

    const up = seen[want.up];
    const downWrong = want.down.filter(id => seen[id].visible);
    const ok = up.visible && downWrong.length === 0
      && (want.filled ? seen.cells > 0 : true);

    results.push({
      route, width, ok,
      up: want.up, upVisible: up.visible, upBox: `${up.w}x${up.h}`,
      wronglyVisible: downWrong,
      cells: seen.cells, view: seen.view, doorState: seen.doorState,
      errors: errors.slice(0, 2),
    });
  }
  await ctx.close();
}

await browser.close();
if (server) server.kill();

const failed = results.filter(r => !r.ok);
for (const r of failed) {
  console.log(`  FAIL  ${r.route} @ ${r.width}px — ${r.up} visible=${r.upVisible} (${r.upBox})`
    + (r.wronglyVisible.length ? `, also visible: ${r.wronglyVisible.join(', ')}` : '')
    + (r.cells === 0 ? ', nothing rendered' : ''));
}
console.log(`\nsurface check: ${results.length - failed.length}/${results.length} cells proved the surface they name`);

const json = arg('--json', null);
if (json) {
  writeFileSync(json, JSON.stringify({ results }, null, 1));
  console.log(`written: ${json}`);
}

process.exit(failed.length ? 1 : 0);
