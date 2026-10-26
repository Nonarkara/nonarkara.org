// A PASS on the wrong surface is not a PASS.
//
// The gate's settle deadline is five seconds. If the app has not drawn by
// then, the gate measures the page BEFORE the app ran — the static shell —
// and reports it clean, because the shell really is clean. The receipt then
// certifies the shell and calls it the desk.
//
// This checks what the gate actually measured: the character count of the
// surface it saw, and the biggest thing on it. The desk is a long document
// with a clock; the shell is a sign panel. If the gate saw the shell, the
// run is not evidence and this says so.
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
  '/': 400,
  '/?view=plan': 20000,
  '/?view=ioc': 2000,
};
const extra = process.argv.slice(3).map(s => {
  const [route, n] = s.split(':');
  return [route, Number(n)];
});

const j = JSON.parse(readFileSync(file, 'utf8'));
const ms = j.measurements || [];
let bad = 0;
const byRoute = {};
for (const m of ms) {
  const route = m.route;
  (byRoute[route] ||= []).push(m);
}

for (const [route, list] of Object.entries(byRoute)) {
  const floor = DEFAULTS[route] ?? 0;
  const min = list.reduce((a, m) => Math.min(a, m.chars ?? 0), Infinity);
  const max = list.reduce((a, m) => Math.max(a, m.chars ?? 0), 0);
  const largest = list.reduce((a, m) => Math.max(a, m.hierarchy?.largest ?? 0), 0);
  const cls = list.find(m => (m.hierarchy?.largest ?? 0) === largest)?.hierarchy?.largestInfo?.cls || '-';
  const ok = min >= floor;
  if (!ok) bad++;
  console.log(
    `${ok ? 'ok  ' : 'SHELL'} ${route.padEnd(13)} chars ${String(min).padStart(6)}…${String(max).padEnd(6)} ` +
    `largest ${String(largest).padStart(5)} (${cls}) floor ${floor}`,
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
    `\nTHE GATE MEASURED A PAGE THE APP HAD NOT DRAWN YET.\n` +
    `  A pass here certifies the shell, not the site. Free the machine (the\n` +
    `  boot needs headroom) and run the sweep again.\n`,
  );
  process.exit(1);
}
console.log('\nThe gate measured the surfaces a reader gets, not the shell.');
