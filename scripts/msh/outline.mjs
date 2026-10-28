/**
 * The document outline of every surface, as the browser sees it.
 *
 * The site had no <h1> at all, so the spatial instrument's hierarchy rule
 * had nothing to compare: a page whose title loses to a louder heading is
 * exactly the "false hierarchy" failure the rule exists to catch, and the
 * rule could not catch it here because there was no title to lose.
 *
 * This instrument does not judge. It prints the facts a judge needs:
 *
 *   - every heading element in the document, and whether it is visible
 *   - the h1 the instrument would read (the FIRST one in document order,
 *     hidden or not — the probe does not filter by visibility here)
 *   - the visible text elements with the loudest type, so "the title must
 *     win" can be checked against something real
 *   - the character floor per surface, so a surface cannot pass by being
 *     empty
 *
 * Run:
 *   node scripts/msh/outline.mjs http://127.0.0.1:8786 '/,/??view=plan,/?view=ioc'
 */

import { loadChromium } from './playwright.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8786';
const ROUTES = (process.argv[3] || '/,/?view=plan,/?view=ioc').split(',');

const FACTS = () => {
  const d = document;
  const main = d.querySelector('main#content') || d.querySelector('main') || d.body;
  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return !!(r.width && r.height);
  };
  const ownText = (el) => {
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s.replace(/\s+/g, ' ').trim();
  };

  const headings = [...d.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((el) => ({
    tag: el.tagName.toLowerCase(),
    text: ownText(el) || (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    visible: vis(el),
    size: parseFloat(getComputedStyle(el).fontSize),
    cls: String(el.className || '').slice(0, 40),
  }));

  const h1 = main.querySelector('h1');
  const h1size = h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0;

  // The loudest VISIBLE text on the surface, by the probe's own measure.
  const all = [...main.querySelectorAll('*')];
  const loud = [];
  let totalChars = 0;
  for (const el of all) {
    if (!vis(el)) continue;
    const own = ownText(el);
    if (!own) continue;
    totalChars += own.length;
    loud.push({
      size: parseFloat(getComputedStyle(el).fontSize),
      tag: el.tagName.toLowerCase(),
      cls: String(el.className || '').slice(0, 36),
      text: own.slice(0, 44),
    });
  }
  loud.sort((a, b) => b.size - a.size);

  // The largest text that is not the h1 — this is what the title must beat.
  let largest = 0;
  let largestInfo = null;
  for (const el of all) {
    if (!vis(el)) continue;
    const own = ownText(el);
    if (!own) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (el.tagName !== 'H1' && size > largest) {
      largest = size;
      largestInfo = { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 36), size, text: own.slice(0, 40) };
    }
  }

  return {
    mainTag: main === d.body ? 'body' : main.tagName.toLowerCase(),
    h1Count: main.querySelectorAll('h1').length,
    h1: h1 ? { text: ownText(h1) || (h1.textContent || '').trim().slice(0, 40), size: h1size, visible: vis(h1) } : null,
    largest,
    largestInfo,
    ratio: h1size && largest ? Math.round((h1size / largest) * 100) / 100 : null,
    chars: totalChars,
    headings,
    loudest: loud.slice(0, 8),
  };
};

const chromium = await loadChromium();
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const url = BASE + route;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // The desk paints at the parse; the room needs a frame. Give the surface
  // a moment to become the thing the reader actually sees.
  await page.waitForTimeout(route.includes('view=') ? 1200 : 2500);
  const f = await page.evaluate(FACTS);

  console.log('\n══ ' + route);
  console.log('   main:            ' + f.mainTag);
  console.log('   h1 count:        ' + f.h1Count);
  console.log('   h1:              ' + (f.h1 ? `"${f.h1.text}" ${f.h1.size}px visible=${f.h1.visible}` : 'NONE'));
  console.log('   largest non-h1:  ' + f.largest + 'px ' + (f.largestInfo ? `<${f.largestInfo.tag} class="${f.largestInfo.cls}"> "${f.largestInfo.text}"` : ''));
  console.log('   title ratio:     ' + (f.ratio === null ? 'null (no title to compare)' : f.ratio));
  console.log('   visible chars:   ' + f.chars);
  console.log('   headings:        ' + (f.headings.length ? f.headings.map((h) => `${h.tag}"${h.text}"${h.visible ? '' : ' [hidden]'}`).join(', ') : 'NONE'));
  console.log('   loudest text:');
  for (const l of f.loudest) {
    console.log('      ' + String(l.size).padStart(5) + 'px  <' + l.tag + ' class="' + l.cls + '">  ' + l.text);
  }
  await ctx.close();
}

await browser.close();
