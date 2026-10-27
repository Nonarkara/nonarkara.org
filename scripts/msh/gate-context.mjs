// The gate's own context, reproduced without the gate.
//
// The gate loads the site inside an iframe in a harness page, waits for the
// page to settle (five seconds at most), and asks the vendored probe what it
// sees. Two of its findings on the desk — "scattered" on section.os-grid and
// div#plan-projects — could not be explained from the top-level page, where
// the same controls are quiet.
//
// This script takes the gate's HARNESS verbatim out of the gate's own source,
// swaps in ONE width and ONE route, serves it from the same origin as the
// site (so the iframe is same-origin, as it is in the gate), and then asks
// the probe's loudness question about the elements the gate named. Nothing
// here changes the instrument; the instrument is read, not edited.
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
if (start < 0 || end < 0) { console.error('could not find the HARNESS template'); process.exit(2); }
let harness = src.slice(start + 'const HARNESS = `'.length, end);

const PROBE_SRC = readFileSync(path.join(REPO, 'scripts/spatial/spatial-probe.js'), 'utf8');
harness = harness.replace('__WIDTHS__', JSON.stringify([WIDTH]))
  .replace('__ROUTES__', JSON.stringify([ROUTE]))
  .replace('__SKIP__', '0')
  .replace('__PROBE__', JSON.stringify(PROBE_SRC));

const WORK = path.join(REPO, '.msh-fixture');
mkdirSync(WORK, { recursive: true });
writeFileSync(path.join(WORK, 'gate-harness.html'), harness);

const browser = await (await loadChromium()).launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
         '--disable-dev-shm-usage', '--hide-scrollbars',
         '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
         '--disable-renderer-backgrounding'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });

await page.goto(BASE + '/.msh-fixture/gate-harness.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
// the gate's own settle budget, plus a moment for the measurement
await page.waitForTimeout(9000);

const frames = page.frames();
const target = frames.find(f => f.url().includes('view=plan') || f.url().includes('__spatial'));
if (!target) { console.log('no site frame loaded; frames:', frames.map(f => f.url())); console.log(errs.slice(0, 8)); await browser.close(); process.exit(1); }

const out = await target.evaluate(() => {
  const d = document;
  const win = d.defaultView;
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
  const loudWhy = el => {
    const cs = win.getComputedStyle(el);
    const own = parseColor(cs.backgroundColor);
    if (own && own[3] > 0.5) {
      const b = backdrop(el);
      const dd = dist(own, b.c);
      if (dd > 60) return `bg ${cs.backgroundColor} vs ${b.from} ${b.c} d=${Math.round(dd)}`;
    }
    for (const s2 of ['borderLeftWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth']) {
      if ((parseFloat(cs[s2]) || 0) >= 3) return `border ${s2}=${cs[s2]}`;
    }
    return null;
  };
  const describe = (sel) => {
    const g = d.querySelector(sel);
    if (!g) return { sel, missing: true };
    const cs = win.getComputedStyle(g);
    const r = g.getBoundingClientRect();
    const kids = [...g.children].filter(c => /^(A|BUTTON)$/.test(c.tagName));
    const ctl = kids.filter(k => loudWhy(k));
    const rect = e => e.getBoundingClientRect();
    return {
      sel, display: cs.display, cols: cs.gridTemplateColumns, width: Math.round(r.width),
      kids: g.children.length, ctl: ctl.length,
      loud: ctl.slice(0, 8).map(t => `${t.id || t.className}: ${loudWhy(t)}`),
      quietSample: kids.filter(k => !loudWhy(k)).slice(0, 4).map(t => {
        const kcs = win.getComputedStyle(t);
        const b = backdrop(t);
        return `${t.id || t.className}: bg=${kcs.backgroundColor} borders=${kcs.borderTopWidth}/${kcs.borderRightWidth}/${kcs.borderBottomWidth} backdrop=${b.from}`;
      }),
      allLoud: ctl.length >= 2 ? {
        first: ctl[0].id || ctl[0].className, second: ctl[1].id || ctl[1].className,
        apartPct: Math.round(100 * Math.abs((rect(ctl[0]).left + rect(ctl[0]).width / 2) - (rect(ctl[1]).left + rect(ctl[1]).width / 2)) / r.width),
      } : null,
    };
  };
  let rec = null;
  try { rec = win.__SPATIAL_MEASURE__('/?view=plan', 1440, d); } catch (e) { rec = { error: String(e) }; }
  return {
    url: location.href,
    theme: d.body.dataset.theme || '(none)',
    bodyClass: d.body.getAttribute('class') || '(none)',
    view: d.body.dataset.view || '(none)',
    bodyBg: win.getComputedStyle(d.body).backgroundColor,
    rootBg: win.getComputedStyle(d.documentElement).backgroundColor,
    varBg: win.getComputedStyle(d.documentElement).getPropertyValue('--bg'),
    chars: rec && rec.chars, err: rec && rec.error,
    findings: rec && rec.findings ? rec.findings.map(f => `${f.kind} ${f.sel} :: ${f.detail}`) : [],
    grid: describe('section.os-grid'),
    projects: describe('#plan-projects'),
  };
});
console.log(JSON.stringify(out, null, 1));
console.log('errors:', errs.slice(0, 6));
await browser.close();
