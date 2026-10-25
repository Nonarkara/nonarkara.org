#!/usr/bin/env node
/**
 * OVERLAP DETECTOR — two pieces of chrome on top of each other.
 *
 * The DOM gate measures the DOM, but the failures that matter here are
 * between a HUD and a caption and a key legend: a "BACK DOWN" button
 * printed on top of the J GROUND F FOCUS keys, a ground caption lying
 * across the bottom row of the IOC wall, "Biography & selected work"
 * behind the MENU button on a phone.
 *
 * Two rectangles overlap when they share area AND neither contains the
 * other (a child inside its parent is not an overlap). A view that is
 * not the current view is in the document but not on screen, so its
 * elements are excluded. What is left is a real collision, named.
 *
 *   node scripts/msh/overlap.mjs --url ... --all
 *   node scripts/msh/overlap.mjs --url ... --all --json
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html');
const ALL = argv.includes('--all');
const JSON_OUT = argv.includes('--json');
const INSTANT = arg('instant', '2026-10-24T21:40:00+07:00');

const WIDTHS = ALL
  ? [{ w: 390, h: 844, name: 'phone' }, { w: 1024, h: 768, name: 'tablet' }, { w: 1440, h: 900, name: 'desktop' }]
  : [{ w: +arg('w', 1440), h: +arg('h', 900), name: 'one' }];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
});

const report = [];

for (const vp of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, timezoneId: 'Asia/Bangkok',
  });
  const page = await ctx.newPage();
  await page.addInitScript((iso) => {
    const FIXED = new Date(iso).getTime();
    const Real = Date;
    const shifted = class extends Real {
      constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
      static now() { return FIXED; }
    };
    Date = shifted;
  }, INSTANT);

  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getElementById('door-guest')?.click());
  await page.waitForTimeout(2600);

  const SURFACES = {
    room: async () => {},
    sky: async () => { await page.evaluate(() => document.getElementById('sky-hint')?.click()); await page.waitForTimeout(3200); },
    ground: async () => { await page.evaluate(() => document.getElementById('ground-hint')?.click()); await page.waitForTimeout(4200); },
    ioc: async () => { await page.evaluate(() => document.getElementById('ioc-toggle')?.click()); await page.waitForTimeout(2600); },
  };

  for (const [name, go] of Object.entries(SURFACES)) {
    await go();
    const row = await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      const named = (el) => {
        const cls = (el.className || '').toString().trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        return (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '') || el.tagName.toLowerCase();
      };
      // An element inside a faded-out container is not on screen, even
      // though its own computed opacity is 1.
      const onScreen = (el) => {
        for (let p = el; p && p !== document.body; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (s.display === 'none' || s.visibility === 'hidden') return false;
          if (parseFloat(s.opacity) === 0) return false;
        }
        return true;
      };
      const boxes = [];
      for (const el of document.body.querySelectorAll('*')) {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
        if (!onScreen(el)) continue;
        const b = el.getBoundingClientRect();
        if (b.width < 4 || b.height < 4) continue;
        if (b.right <= 0 || b.bottom <= 0 || b.left >= vw || b.top >= vh) continue;
        // Whole-page containers would "overlap" everything by definition.
        if (b.width >= vw * 0.98 && b.height >= vh * 0.98) continue;
        // A canvas is a surface, not chrome: the CRT signal is meant to
        // be painted over the wall, and the mirrors over the room.
        if (el.tagName === 'CANVAS') continue;
        // A view that is not the current view is still in the document but
        // is not on screen: the plan sits under the wall, the wall under
        // the room. Geometry alone would call that an overlap.
        const view = document.body.dataset.view;
        if (view !== 'plan' && el.closest('#plan')) continue;
        if (view !== 'ioc' && el.closest('#ioc')) continue;
        // Measure the TEXT, not the box. A caption that is centred in a
        // full-width element does not reach the links at the right edge;
        // the element's rectangle would say it did.
        let box = b;
        if (el.children.length === 0 && (el.textContent || '').trim()) {
          const range = document.createRange();
          range.selectNodeContents(el);
          const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
          if (rects.length) {
            const x = Math.min(...rects.map((r) => r.left));
            const y = Math.min(...rects.map((r) => r.top));
            const x2 = Math.max(...rects.map((r) => r.right));
            const y2 = Math.max(...rects.map((r) => r.bottom));
            // Visible text is clipped by its own overflow box: an
            // ellipsised name does not reach the cell next to it.
            const cx1 = Math.max(x, b.left), cy1 = Math.max(y, b.top);
            const cx2 = Math.min(x2, b.right), cy2 = Math.min(y2, b.bottom);
            if (cx2 > cx1 && cy2 > cy1) box = { x: cx1, y: cy1, width: cx2 - cx1, height: cy2 - cy1 };
          }
        }
        boxes.push({
          el: named(el), x: box.x, y: box.y, w: box.width, h: box.height,
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          leaf: el.children.length === 0,
        });
      }
      const leaves = boxes.filter((b) => b.leaf);
      const overlaps = [];
      for (let i = 0; i < leaves.length; i++) {
        for (let j = i + 1; j < leaves.length; j++) {
          const a = leaves[i], b = leaves[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox <= 1 || oy <= 1) continue;
          const contains = (p, q) =>
            p.x <= q.x + 0.5 && p.y <= q.y + 0.5 && p.x + p.w >= q.x + q.w - 0.5 && p.y + p.h >= q.y + q.h - 0.5;
          if (contains(a, b) || contains(b, a)) continue;
          overlaps.push({
            a: a.el, aText: a.text, b: b.el, bText: b.text,
            ox: Math.round(ox), oy: Math.round(oy),
            area: Math.round(ox * oy),
          });
        }
      }
      overlaps.sort((x, y) => y.area - x.area);
      return {
        view: document.body.dataset.view, sky: document.body.dataset.sky,
        ground: document.body.dataset.ground, overlaps,
      };
    });
    report.push({ vp: vp.name, width: vp.w, height: vp.h, surface: name, ...row });
    if (!JSON_OUT) {
      console.log(`\n=== ${vp.name} ${vp.w}×${vp.h} · ${name} (view=${row.view})`);
      if (!row.overlaps.length) console.log('  no overlaps');
      for (const o of row.overlaps.slice(0, 14)) {
        console.log(`  ${String(o.area).padStart(7)}px²  ${o.a} "${o.aText}"  ×  ${o.b} "${o.bText}"`);
      }
    }
  }
  await ctx.close();
}

await browser.close();

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const bad = report.reduce((n, r) => n + r.overlaps.length, 0);
  console.log(`\n${bad} overlap(s) across ${report.length} surfaces`);
}
