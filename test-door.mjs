#!/usr/bin/env node
/**
 * THE DOOR GATE — the landing screen, measured against the law.
 *
 * The door used to be a full-screen black curtain with a 420px column
 * centred in it: a phone column on a desktop (ANTI-SLOP #12), a wall on
 * first load (#10), and zero map on the first screen (map-first rule).
 *
 * These are the assertions that keep it from coming back. They run
 * against the real page in a real browser at the three widths the law
 * names: 390, 1024 and 1440.
 *
 *   node test-door.mjs
 */

import { loadChromium } from './scripts/msh/playwright.mjs';
import { ownPort } from './scripts/msh/own-port.mjs';

// The gate owns its port and proves the bytes are ours. Other projects on
// this machine used to hold 8791 with a Python http.server, so this gate
// was measuring someone else's page and failing on their HTML.
const site = await ownPort();
const URL_ = `${site.base}/index.html`;
process.on('exit', () => site.stop());

const WIDTHS = [
  { w: 390, h: 844, name: 'phone' },
  { w: 1024, h: 768, name: 'tablet' },
  { w: 1440, h: 900, name: 'desktop' },
];

let failures = 0;
const ok = (cond, msg) => {
  if (cond) { console.log(`  ✓ ${msg}`); return true; }
  console.log(`  ✗ ${msg}`);
  failures++;
  return false;
};

// ── a server that keeps the connection alive (python http.server resets
//    module fetches and the app never boots).
const chromium = await loadChromium();
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
});

for (const vp of WIDTHS) {
  console.log(`\n${vp.name} ${vp.w}×${vp.h}`);
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const b = document.getElementById('boot');
    return b && getComputedStyle(b).display === 'none';
  }, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);

  const m = await page.evaluate(() => {
    const door = document.getElementById('door');
    const panel = document.querySelector('.door-panel');
    const cs = getComputedStyle(door);
    const pr = panel.getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight;

    // Every visible element that is a piece of the room's furniture.
    const furniture = ['.room-hud', '.intent-line', '.menu-btn', '.view-toggle',
      '.sky-hint', '.ground-hint', '.tilt-hint', '.shortcut-hints',
      '.overlay .brand', '.overlay .caption', '.overlay .hint', '.overlay .meta'];
    const shown = furniture.filter((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    });

    // Dead space: the largest empty rectangle band of the first screen.
    // Measured as the biggest horizontal gap between the panel and the
    // next thing on screen, and the vertical gap above and below it.
    const buttons = [...document.querySelectorAll('.door-btn')].map((b) => {
      const r = b.getBoundingClientRect();
      return {
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        // a line that wraps leaves an orphan word on the last line
        lines: Math.round(r.height / 18),
      };
    });

    const texts = [...document.querySelectorAll('.door-btn .sub, .door-foot, .door-tag, .door-btn .title, .door-reading')]
      .map((e) => {
        const r = e.getBoundingClientRect();
        return {
          cls: (e.className || '').toString(),
          h: Math.round(r.height),
          w: Math.round(r.width),
          text: (e.textContent || '').trim(),
        };
      });

    return {
      doorBg: cs.backgroundColor,
      doorRect: { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), h: Math.round(pr.height) },
      panelRect: { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), h: Math.round(pr.height) },
      viewport: { w: vw, h: vh },
      shownFurniture: shown,
      buttons,
      texts,
      canvas: (() => {
        const c = document.querySelector('#canvas-root canvas');
        return c ? { w: c.width, h: c.height, cssW: c.getBoundingClientRect().width } : null;
      })(),
      view: document.body.dataset.view,
      doorState: document.body.dataset.door,
      panelAreaPct: Math.round((pr.width * pr.height) / (vw * vh) * 1000) / 10,
    };
  });

  // ── 1. The door is not a curtain. ──────────────────────────────
  ok(m.doorBg === 'rgba(0, 0, 0, 0)', 'the door paints no background over the room');
  ok(m.canvas !== null, 'the room canvas is alive behind the sign');

  // ── 2. The sign is a panel, not a phone column on a desktop. ───
  //     On a phone a full-width sheet is the right pattern (ANTI-SLOP
  //     #9 allows full-width buttons in a phone column); on a desktop
  //     a column floating in the middle of the screen is the defect.
  const isPhone = vp.w <= 640;
  ok(m.panelRect.w <= 380, `the sign is sized to its content (${m.panelRect.w}px wide)`);
  if (!isPhone) {
    ok(m.panelRect.w < m.viewport.w * 0.45,
      `the sign does not own the screen (${m.panelRect.w}px of ${m.viewport.w}px)`);
  }

  // ── 3. The panel must be inside the viewport, with its own margin. ─
  ok(m.panelRect.x >= 0 && m.panelRect.y >= 0 &&
     m.panelRect.x + m.panelRect.w <= m.viewport.w &&
     m.panelRect.y + m.panelRect.h <= m.viewport.h,
    'the sign sits wholly on the screen');

  // ── 4. The room's furniture is withheld: one object on the first
  //      screen, not the room with a second layer of instruments. ───
  ok(m.shownFurniture.length === 0,
    `no room furniture competes with the question (${m.shownFurniture.join(', ') || 'none'})`);

  // ── 5. The pavilion is the first screen, on every device. ───────
  ok(m.view === 'room', `the first screen is the pavilion (view=${m.view})`);

  // ── 6. The sign does not swallow the screen. The map-first rule:
  //      the room keeps the first screen — at least 60% of it. ─────
  ok(m.panelAreaPct <= 40, `the pavilion keeps at least 60% of the first screen (sign is ${m.panelAreaPct}%)`);

  // ── 6b. And the hero itself is never covered: the middle of the
  //       frame, where the pavilion stands, is free. ─────────────
  const cx = m.viewport.w / 2, cy = m.viewport.h / 2;
  const centreCovered =
    m.panelRect.x <= cx && m.panelRect.x + m.panelRect.w >= cx &&
    m.panelRect.y <= cy && m.panelRect.y + m.panelRect.h >= cy;
  ok(!centreCovered, 'the middle of the frame — where the pavilion stands — is clear');

  // ── 7. No orphan line: a wrapped line must not leave one word
  //      alone at the end of a sub-line. ─────────────────────────
  for (const t of m.texts) {
    if (!/sub|foot/.test(t.cls)) continue;
    const words = t.text.split(/\s+/).length;
    const lines = Math.max(1, Math.round(t.h / 15));
    ok(lines === 1 || words > lines * 2,
      `"${t.text.slice(0, 34)}…" is ${lines} line(s) of ${words} words — no orphan`);
  }

  // ── 8. The two choices are siblings: same size, same weight. ───
  const [a, b] = m.buttons;
  ok(a && b && a.w === b.w && a.h === b.h,
    `the two choices are the same size (${a?.w}×${a?.h} / ${b?.w}×${b?.h})`);

  // ── 9. Nothing threw. ──────────────────────────────────────────
  ok(errors.length === 0, `no page errors (${errors.join(' | ') || 'none'})`);

  await ctx.close();
}

await browser.close();
site.stop();

console.log(failures ? `\n${failures} FAILURE(S)` : '\ndoor gate: all assertions pass');
process.exit(failures ? 1 : 0);
