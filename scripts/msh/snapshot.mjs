/**
 * A pixel-neutrality instrument.
 *
 * A change of tag is supposed to change NOTHING you can see. That is a
 * claim, and a claim needs evidence: this records where every piece of
 * text on the page actually sits, and what type it is set in, so two
 * snapshots can be compared and the difference argued about.
 *
 *   node scripts/msh/snapshot.mjs <baseUrl> <outDir> [route ...]
 *
 * Then:
 *
 *   node scripts/msh/geometry-diff.mjs <beforeDir> <afterDir>
 *
 * The diff prints every element that moved, changed size, or changed
 * type. "Nothing moved" is the answer this repo wants most often.
 *
 * Text-bearing elements are keyed by tag + class + id + their own text,
 * so an element that is merely re-tagged is still matched to its old
 * self. Elements that appear or vanish are reported as ADDED / REMOVED
 * rather than silently ignored — a heading that was introduced is a
 * change, and it should have to say so.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadChromium } from './playwright.mjs';

const base = process.argv[2] || 'http://127.0.0.1:8786';
const outDir = process.argv[3] || '.msh-snap';
const routes = process.argv.slice(4);
if (!routes.length) routes.push('/', '/?view=plan', '/?view=ioc');

// What "ready" means, per surface. The sign has to have DECIDED (open
// or skipped) before it counts; the desk has to have painted its clock;
// the wall has to have filled its grid.
const READY = {
  '/': () => {
    const d = document.getElementById('door');
    if (!d) return true;
    const decided = document.body.dataset.door === 'open' || d.classList.contains('skip');
    if (!decided) return false;
    const p = document.querySelector('.door-panel');
    const mark = document.getElementById('brand');
    const box = (el) => el && el.getBoundingClientRect().width > 0;
    return box(p) || box(mark);
  },
  '/?view=plan': () => {
    const p = document.getElementById('plan');
    if (!p || !p.getBoundingClientRect().width) return false;
    const t = document.querySelector('.plan-clock .time');
    return !!(t && t.textContent && t.textContent.trim() && t.getBoundingClientRect().width);
  },
  '/?view=ioc': () => {
    const w = document.getElementById('ioc');
    if (!w || !w.getBoundingClientRect().width) return false;
    return document.querySelectorAll('#ioc .ioc-name').length > 0;
  },
};

const RECORD = () => {
  // The page may be mid-navigation (the self-heal replaces the URL when
  // the running build is not the live one). A snapshot of a body that is
  // not there is a snapshot of nothing.
  if (!document.body) return null;
  const ownText = (el) => {
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s.replace(/\s+/g, ' ').trim();
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return !!(r.width && r.height);
  };
  const seen = new Map();
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    const own = ownText(el);
    const rect = el.getBoundingClientRect();
    if (!own && !rect.width && !rect.height) continue;
    const cs = getComputedStyle(el);
    const keyBase = `${el.tagName.toLowerCase()}|${el.className || ''}|${el.id || ''}|${own.slice(0, 40)}`;
    const n = (seen.get(keyBase) || 0) + 1;
    seen.set(keyBase, n);
    out.push({
      key: `${keyBase}#${n}`,
      tag: el.tagName.toLowerCase(),
      cls: String(el.className || ''),
      id: el.id || '',
      own: own.slice(0, 60),
      visible: visible(el),
      rect: {
        x: Math.round(rect.x * 10) / 10,
        y: Math.round(rect.y * 10) / 10,
        w: Math.round(rect.width * 10) / 10,
        h: Math.round(rect.height * 10) / 10,
      },
      type: {
        size: cs.fontSize,
        weight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letter: cs.letterSpacing,
        transform: cs.textTransform,
        color: cs.color,
        display: cs.display,
        margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
        padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
      },
    });
  }
  // The state of the page itself. Two snapshots can only be compared if
  // they are of the SAME state: a page whose sign is up and a page
  // whose sign has been answered are different screens, and comparing
  // them would report every difference as a change.
  const doorEl = document.getElementById('door');
  const state = {
    view: document.body.dataset.view || null,
    mode: document.body.dataset.mode || null,
    door: document.body.dataset.door || null,
    doorSkipped: !!(doorEl && doorEl.classList.contains('skip')),
    storedMode: (() => { try { return localStorage.getItem('nonarkara.mode'); } catch (_) { return null; } })(),
  };

  return { elements: out, state };
};

mkdirSync(outDir, { recursive: true });
const browser = await (await loadChromium()).launch({
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // The analytics beacon is a third-party script that answers slowly and
  // says nothing about geometry. It is not the page.
  await page.route('**://static.cloudflareinsights.com/**', (r) => r.abort());
  // The market and fleet feeds are LIVE: they answer with different
  // numbers every second, so two snapshots taken a minute apart differ
  // in hundreds of elements that never moved. Block them and the desk
  // is the same desk twice, which is the only way to prove that a
  // change did not move it. (The live surface is measured by the
  // spatial gate, which wants the live truth.)
  await page.route(/api\.nonarkara\.org|\/api\//, (r) => r.abort());
  try {
    await page.goto(base + route, { waitUntil: 'commit', timeout: 60000 });
  } catch (err) {
    console.log(`${route}: navigation failed — ${err.message.split('\n')[0]}`);
    await ctx.close();
    continue;
  }
  // Wait for the SURFACE, not for the clock. A stopwatch measures the
  // machine, not the page: under load the sign may not have decided
  // yet, and a snapshot taken before the sign has decided is a
  // snapshot of nothing.
  const ready = READY[route] || READY['/'];
  try {
    await page.waitForFunction(ready, null, { timeout: 40000 });
  } catch {
    console.log(`${route}: the surface never became ready`);
  }
  await page.waitForTimeout(900);
  // Wait for the fonts. A glyph measured against a fallback face is a
  // different width from the same glyph in the face it will finally
  // wear, and that is not the page moving.
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
  await page.waitForTimeout(400);
  let rec = await page.evaluate(RECORD);
  if (!rec) {
    // The page was navigating. Wait for it to settle and ask again.
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(1500);
    rec = await page.evaluate(RECORD);
  }
  if (!rec) {
    console.log(`${route}: the page would not hold still long enough to be measured`);
    await ctx.close();
    continue;
  }
  const state = rec.state;
  const elements = rec.elements;
  const slug = route.replace(/[^\w]+/g, '_') || 'root';
  const file = join(outDir, `${slug}.json`);
  writeFileSync(file, JSON.stringify({ route, width: 1440, height: 900, state, elements }, null, 1) + '\n');
  console.log(`${file}  ${elements.length} elements · view=${state.view} door=${state.door || (state.doorSkipped ? 'skipped' : '-')} mode=${state.mode || '-'}`);
  await ctx.close();
}

await browser.close();
