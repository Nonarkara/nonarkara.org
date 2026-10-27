// Does the theme flip make a cell loud?
//
// The receipt recorded two scattered findings on the desk: section.os-grid and
// div#plan-projects. Both name cells whose background is var(--bg) — the same
// colour as the surface behind them — so they cannot be loud unless one of the
// two has moved and the other has not.
//
// .os-tile and .plan-cell carry `transition: color .12s, background .12s`.
// Their containers carry no background transition. So for 120ms of every theme
// flip, a cell's background is on its way to the new colour while the surface
// behind it has already arrived.
//
// This measures the gap with the real stylesheet, in a real browser, and asks
// the vendored probe's own loudness question at each step of the flip.
import { loadChromium } from './playwright.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8786';

const browser = await (await loadChromium()).launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
         '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
         '--disable-renderer-backgrounding'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + '/.msh-fixture/flip.html', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(400);

const out = await page.evaluate(async () => {
  const win = window;
  const parseColor = c => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const dist = (a, b) => Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
  const backdrop = (el) => {
    let e = el.parentElement;
    while (e) {
      const c = parseColor(win.getComputedStyle(e).backgroundColor);
      if (c && c[3] > 0.5) return { c, from: e.tagName + (e.id ? '#' + e.id : '') + '.' + (e.getAttribute('class') || '') };
      e = e.parentElement;
    }
    return { c: [255, 255, 255, 1], from: 'FALLBACK-WHITE' };
  };
  const loudWhy = (el) => {
    const cs = win.getComputedStyle(el);
    const own = parseColor(cs.backgroundColor);
    if (own && own[3] > 0.5) {
      const b = backdrop(el);
      const dd = dist(own, b.c);
      if (dd > 60) return `LOUD bg ${cs.backgroundColor} vs ${b.from} ${b.c} d=${Math.round(dd)}`;
    }
    for (const s2 of ['borderLeftWidth','borderTopWidth','borderRightWidth','borderBottomWidth']) {
      if ((parseFloat(cs[s2]) || 0) >= 3) return `LOUD border ${s2}=${cs[s2]}`;
    }
    return 'quiet';
  };
  const snap = (label) => {
    const tile = document.getElementById('hud-music');
    const cell = document.querySelector('.plan-cell');
    const grid = document.querySelector('section.os-grid');
    const plan = document.getElementById('plan');
    return {
      label,
      theme: document.body.dataset.theme,
      gridBg: win.getComputedStyle(grid).backgroundColor,
      planBg: win.getComputedStyle(plan).backgroundColor,
      tile: `${win.getComputedStyle(tile).backgroundColor} — ${loudWhy(tile)}`,
      cell: `${win.getComputedStyle(cell).backgroundColor} — ${loudWhy(cell)}`,
    };
  };

  const frames = [snap('before flip')];
  document.body.dataset.theme = 'light';
  let t = 0;
  for (const wait of [16, 24, 40, 60, 100, 200, 400]) {
    t += wait;
    await new Promise(r => setTimeout(r, wait));
    frames.push(snap(`+${t}ms`));
  }
  return frames;
});

for (const f of out) {
  console.log(`${f.label.padEnd(11)} theme=${String(f.theme).padEnd(6)} grid=${String(f.gridBg).padEnd(20)} plan=${String(f.planBg).padEnd(20)}`);
  console.log(`            tile ${f.tile}`);
  console.log(`            cell ${f.cell}`);
}
await browser.close();
