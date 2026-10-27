// A PASS on the wrong surface is not a PASS.
//
// The gate's settle deadline is five seconds. If the app has not drawn by
// then, the gate measures the page BEFORE the app ran — the static shell —
// and reports it clean, because the shell really is clean. The receipt then
// certifies the shell and calls it the desk.
//
// This asks each measurement what it actually saw. Every surface has its
// own test, and every test has a reason:
//
//   /            the landing IS the sign: the pavilion is a canvas, and the
//                canvas is not text. The sign's words are the landing's
//                DOM, so the landing is proven by the sign being there.
//
//   /?view=plan  the desk is a document with eighty-two project cells, a
//                clock and a fleet board: tens of thousands of characters.
//                The sign beside it is a few hundred. Anything below the
//                floor is the sign, not the desk.
//
//   /?view=ioc   the wall is twenty systems and their captions. The sign
//                is NOT part of it — the sign is the landing's question,
//                and a wall with the sign still up is the landing wearing
//                a wall's name. So this surface is proven by the ABSENCE
//                of the sign: if the sign's mark is the biggest thing on
//                the page, the gate measured the landing.
//
// Usage: node scripts/msh/gate-guard.mjs <gate-json> [route:minChars ...]
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/msh/gate-guard.mjs <gate-json> [route:minChars ...]');
  process.exit(2);
}

// The floor each surface must clear for the measurement to be of the site
// and not of the shell that shipped in the HTML.
const DEFAULTS = {
  '/': 300,
  '/?view=plan': 20000,
  '/?view=ioc': 0,
};
// Surfaces that must NOT carry the landing's sign. The sign is the door:
// a door left up in front of a desk is the landing, not the desk.
const NO_SIGN = new Set(['/?view=ioc']);
// The sign's own mark — the two letters in the identity corner.
const SIGN_MARK = 'door-mark';

const extra = process.argv.slice(3).map(s => {
  const [route, n] = s.split(':');
  return [route, Number(n)];
});

const j = JSON.parse(readFileSync(file, 'utf8'));
const ms = j.measurements || [];
let bad = 0, judged = 0;
const byRoute = {};
for (const m of ms) {
  (byRoute[m.route] ||= []).push(m);
}

for (const [route, list] of Object.entries(byRoute)) {
  const floor = DEFAULTS[route] ?? 0;
  let worst = null;
  for (const m of list) {
    const chars = m.chars ?? 0;
    const cls = m.hierarchy?.largestInfo?.cls || '-';
    const signUp = String(cls).includes(SIGN_MARK);
    const ok = chars >= floor && !(NO_SIGN.has(route) && signUp);
    judged++;
    if (!ok) {
      bad++;
      const why = chars < floor
        ? `${chars} chars, floor ${floor} — the sign, not the surface`
        : `the sign is still up (${cls}) — the landing, not the surface`;
      if (!worst || !worst.ok) worst = { w: m.w, chars, cls, why, ok };
    }
  }
  const chars = list.map(m => m.chars ?? 0);
  const verdict = worst ? 'SHELL' : 'ok   ';
  console.log(
    `${verdict} ${route.padEnd(13)} ${String(list.length).padStart(3)} measurements · chars ${String(Math.min(...chars)).padStart(6)}…${String(Math.max(...chars)).padEnd(6)}` +
    (worst ? ` · ${worst.w}px: ${worst.why}` : ''),
  );
}
for (const [route, floor] of extra) {
  const list = byRoute[route] || [];
  if (!list.length) { console.log(`SHELL ${route} — not measured at all`); bad++; continue; }
  const min = list.reduce((a, m) => Math.min(a, m.chars ?? 0), Infinity);
  if (min < floor) { console.log(`SHELL ${route} — ${min} chars, floor ${floor}`); bad++; }
}

if (bad) {
  console.error(
    `\n${bad} of ${judged} measurements were of a page the app had not drawn yet.\n` +
    `  A pass over those certifies the shell, not the site. The measurement\n` +
    `  is only evidence when the surface it names is the surface a reader\n` +
    `  gets — run the sweep again, and let the machine breathe.\n`,
  );
  process.exit(1);
}
console.log(`\nAll ${judged} measurements were of the surface a reader gets.`);
