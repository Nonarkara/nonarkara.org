#!/usr/bin/env node
/**
 * THE OUTLINE GATE — the document's shape, measured on the real page.
 *
 * The site is a document: a pavilion, a desk, a wall. It had no headings
 * at all. Every section label was a <div>, the wordmark was a <div>, and
 * so the document had no outline: a screen reader met a wall of text,
 * and the spatial instrument's hierarchy rule — "is the title louder than
 * the page?" — had nothing to compare, because there was no title. A
 * rule that has nothing to measure is a rule that has never failed.
 *
 * This gate is what keeps the outline honest. It runs against the real
 * page in a real browser, on the three surfaces the site has, and holds
 * the site to six things:
 *
 *   1. Every surface has exactly ONE visible title (an <h1>).
 *   2. The title is the loudest heading on its surface.
 *   3. Heading levels never skip — an <h2> never follows an <h1> that is
 *      not there.
 *   4. Every heading carries words. An empty heading is a gap.
 *   5. No heading keeps the browser's default margins. The house's labels
 *      have their own type; a heading that wears the UA's margins is a
 *      heading that moved the design.
 *   6. The sign — the first thing on the first screen — comes FIRST in
 *      the document, and no heading lives inside a button.
 *
 *   node test-outline.mjs
 */

import { readFileSync } from 'node:fs';
import { loadChromium } from './scripts/msh/playwright.mjs';
import { ownPort } from './scripts/msh/own-port.mjs';

const site = await ownPort();
process.on('exit', () => site.stop());

let failures = 0;
const ok = (cond, msg) => {
  if (cond) { console.log(`  ✓ ${msg}`); return true; }
  console.log(`  ✗ ${msg}`);
  failures++;
  return false;
};

// ── the source, checked where the source can answer ───────────────
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

// 6a. A heading may not live inside a button: a button's content model
//     is phrasing content, and a heading is not. The desk's masthead
//     therefore wraps the button, not the other way round.
const headingInButton = /<button[^>]*>(?:(?!<\/button>)[\s\S])*?<h[1-6][\s>]/i.test(html);
ok(!headingInButton, 'no heading lives inside a button (the content model would not allow it)');

// 6b. The sign is the first thing on the first screen, so it must be
//     the first thing in the document. A reader using a screen reader
//     used to hear the room's chrome before the question.
const signAt = html.indexOf('<div id="door"');
const roomChromeAt = html.indexOf('<div class="overlay">');
ok(signAt > 0 && roomChromeAt > 0 && signAt < roomChromeAt,
  'the sign comes before the room chrome in the document');

// ── the page, checked where only the page can answer ──────────────
const ROUTES = [
  { route: '/', name: 'the landing', ready: 'sign' },
  { route: '/?view=plan', name: 'the desk', ready: 'desk' },
  { route: '/?view=ioc', name: 'the wall', ready: 'wall' },
  { route: '/mixtape.html', name: 'the mixtape', ready: 'page' },
];

const chromium = await loadChromium();
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});

for (const r of ROUTES) {
  console.log(`\n${r.name} (${r.route})`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(site.base + r.route, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Wait for the SURFACE, not for a stopwatch.
  await page.waitForFunction((which) => {
    const vis = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    if (which === 'sign') {
      const d = document.getElementById('door');
      if (!d) return false;
      if (!(document.body.dataset.door === 'open' || d.classList.contains('skip'))) return false;
      return vis(document.querySelector('.door-panel')) || vis(document.getElementById('brand'));
    }
    if (which === 'page') {
      // A plain page: it is ready when it has parsed and has a title.
      const h = document.querySelector('h1');
      return !!(h && h.getBoundingClientRect().width);
    }
    if (which === 'desk') {
      const p = document.getElementById('plan');
      if (!vis(p)) return false;
      const t = document.querySelector('.plan-clock .time');
      return !!(t && t.textContent.trim());
    }
    const w = document.getElementById('ioc');
    return vis(w) && document.querySelectorAll('#ioc .ioc-name').length > 0;
  }, r.ready, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(700);

  const m = await page.evaluate(() => {
    const visible = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    const all = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    const headings = all.map((el) => ({
      level: Number(el.tagName[1]),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      visible: visible(el),
      size: parseFloat(getComputedStyle(el).fontSize),
      marginTop: getComputedStyle(el).marginTop,
      marginBottom: getComputedStyle(el).marginBottom,
      weight: getComputedStyle(el).fontWeight,
    }));
    // The loudest visible text on the surface — the number the title
    // would have to beat, if the title is meant to win.
    let largest = 0;
    let largestIsHeading = false;
    for (const el of document.body.querySelectorAll('*')) {
      if (!visible(el)) continue;
      let own = '';
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      if (!own.trim()) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size > largest) { largest = size; largestIsHeading = /^H[1-6]$/.test(el.tagName); }
    }
    return {
      headings,
      visibleH1: headings.filter((h) => h.level === 1 && h.visible),
      visibleHeadings: headings.filter((h) => h.visible),
      largest,
      largestIsHeading,
      docTitle: document.title,
    };
  });

  // ── 1. exactly one visible title ─────────────────────────────────
  ok(m.visibleH1.length === 1,
    `the surface has exactly one title (${m.visibleH1.length}: ${m.visibleH1.map((h) => `"${h.text}"`).join(', ') || 'none'})`);

  // ── 2. the title is the loudest heading ──────────────────────────
  const h1 = m.visibleH1[0];
  if (h1) {
    const louder = m.visibleHeadings.filter((h) => h.size > h1.size);
    ok(louder.length === 0,
      `the title is the loudest heading (${h1.size}px${louder.length ? ` — louder: ${louder.map((h) => `${h.text} ${h.size}px`).join(', ')}` : ''})`);
  }

  // ── 3. levels never skip ─────────────────────────────────────────
  const levels = m.visibleHeadings.map((h) => h.level).sort((a, b) => a - b);
  let skipped = null;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) { skipped = `${levels[i - 1]} → ${levels[i]}`; break; }
  }
  ok(!skipped, `the outline does not skip a level (${levels.join(' · ') || 'none'}${skipped ? ` — SKIPS ${skipped}` : ''})`);

  // ── 4. every heading carries words ───────────────────────────────
  const empty = m.headings.filter((h) => !h.text);
  ok(empty.length === 0, `no heading is empty (${empty.length} empty)`);

  // ── 5. no heading wears the browser's default margins ───────────
  //     The UA gives an <h1> 0.67em and an <h2> 0.83em of margin. A
  //     heading that kept them would have moved the label it replaced.
  const withUaMargin = m.headings.filter((h) => parseFloat(h.marginTop) > 0.5);
  ok(withUaMargin.length === 0,
    `no heading keeps the browser's default margin (${withUaMargin.map((h) => `${h.text || '(empty)'} ${h.marginTop}`).join(', ') || 'none'})`);

  // ── the record ───────────────────────────────────────────────────
  console.log(`    · title: "${h1 ? h1.text : '—'}" ${h1 ? h1.size : '—'}px · loudest text on the page: ${m.largest}px${m.largestIsHeading ? ' (a heading)' : ' (not a heading)'}`);
  console.log(`    · outline: ${m.visibleHeadings.map((h) => `h${h.level} "${h.text.slice(0, 26)}"`).join(' · ')}`);

  await ctx.close();
}

await browser.close();
site.stop();

console.log(failures ? `\n${failures} FAILURE(S)` : '\noutline gate: all assertions pass');
process.exit(failures ? 1 : 0);
