// A PASS on the wrong surface is not a PASS.
//
// The gate's settle deadline is five seconds. If the app has not drawn by
// then, the gate measures the page BEFORE the app ran — the static shell —
// and reports it clean, because the shell really is clean. The receipt then
// certifies the shell and calls it the desk.
//
// THIS USED TO BE A GUESS. The old guard decided which surface a
// measurement was of by counting characters and by looking for a CSS class:
//
//   /            "the landing has at least 300 characters"
//   /?view=plan  "the desk has at least 20,000 characters"
//   /?view=ioc   "the sign's mark is not the biggest text"
//
// Every one of those was wrong. The desk has 25,948 characters, so it clears
// the landing's floor; the wall has 510, so it clears it too. And the third
// rule could never fire at all: the sign's mark is an <h1>, and the probe
// deliberately EXCLUDES <h1> elements from its largest-text measurement — so
// the class it looked for ("door-mark") was the one class that could never
// appear in the field it read. It was dead code that read like a guard.
//
// So the guard now does the only thing that can settle it: it takes the
// SURFACE PROOFS — cells where the DOM itself was asked what was on screen
// — and checks that every measurement the gate took has one.
//
// Usage:
//   node scripts/msh/gate-guard.mjs <gate-json> --surface <surface-json>
//   node scripts/msh/gate-guard.mjs <gate-json>          (weak fallback)
//
// The weak fallback still exists for a quick look, but it says what it is,
// and it can no longer certify a receipt on its own.

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args[0];
const surfaceAt = args.indexOf('--surface');
const surfaceFile = surfaceAt >= 0 ? args[surfaceAt + 1] : null;

if (!file) {
  console.error('usage: node scripts/msh/gate-guard.mjs <gate-json> [--surface <surface-json>]');
  process.exit(2);
}

const j = JSON.parse(readFileSync(file, 'utf8'));
const ms = j.measurements || [];
const byRoute = {};
for (const m of ms) (byRoute[m.route] ||= []).push(m);

// ── The strong path: every measurement has a surface proof ──────────────
if (surfaceFile) {
  const s = JSON.parse(readFileSync(surfaceFile, 'utf8'));
  const proofs = new Map();
  for (const p of s.results || []) proofs.set(`${p.route}@${p.width}`, p);

  let judged = 0, bad = 0;
  const worst = new Map();

  for (const [route, list] of Object.entries(byRoute)) {
    let wrong = 0;
    for (const m of list) {
      judged++;
      const key = `${route}@${m.w}`;
      const p = proofs.get(key);
      if (!p) {
        bad++; wrong++;
        if (!worst.has(route)) worst.set(route, `${m.w}px: no surface proof for this cell`);
        continue;
      }
      if (!p.ok) {
        bad++; wrong++;
        if (!worst.has(route)) {
          worst.set(route, `${m.w}px: the ${p.up} was not the surface on screen`
            + (p.wronglyVisible?.length ? ` (${p.wronglyVisible.join(', ')} also visible)` : '')
            + (p.cells === 0 ? ' — nothing rendered' : ''));
        }
      }
    }
    const verdict = wrong ? 'WRONG ' : 'ok    ';
    console.log(`${verdict} ${route.padEnd(13)} ${String(list.length).padStart(3)} measurements · ${list.length - wrong} proved`);
    if (worst.has(route)) console.log(`         ${worst.get(route)}`);
  }

  if (bad) {
    console.error(
      `\n${bad} of ${judged} measurements were of a surface the page was not showing.\n` +
      `  A pass over those certifies the shell, not the site. The measurement\n` +
      `  is only evidence when the surface it names is the surface a reader\n` +
      `  gets — run the sweep again, and let the machine breathe.\n`,
    );
    process.exit(1);
  }
  console.log(`\nAll ${judged} measurements were of the surface a reader gets.`);
  process.exit(0);
}

// ── The weak fallback: character floors, clearly labelled ──────────────
// The floors are a smoke alarm, not a proof: they catch a shell (a few
// hundred characters) and nothing else. The desk clears the landing's floor
// and the wall clears it too. Never accept a receipt on this alone.
const DEFAULTS = { '/': 300, '/?view=plan': 20000, '/?view=ioc': 0 };
let bad = 0, judged = 0;
for (const [route, list] of Object.entries(byRoute)) {
  const floor = DEFAULTS[route] ?? 0;
  let worst = null;
  for (const m of list) {
    const chars = m.chars ?? 0;
    judged++;
    if (chars < floor) {
      bad++;
      if (!worst) worst = { w: m.w, chars };
    }
  }
  const chars = list.map(m => m.chars ?? 0);
  console.log(
    `${worst ? 'SHELL ' : 'ok    '} ${route.padEnd(13)} ${String(list.length).padStart(3)} measurements · chars ${String(Math.min(...chars)).padStart(6)}…${String(Math.max(...chars)).padEnd(6)}` +
    (worst ? ` · ${worst.w}px: ${worst.chars} chars, floor ${floor} — the shell, not the surface` : ''),
  );
}
if (bad) {
  console.error(`\n${bad} of ${judged} measurements are below the surface's floor.`);
  process.exit(1);
}
console.log(`\n${judged} measurements clear the character floors — a smoke alarm, not a proof.`);
console.log('Run the surface check and pass --surface for a verdict that can accept a receipt.');
process.exit(2);
