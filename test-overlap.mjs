#!/usr/bin/env node
/**
 * THE OVERLAP GATE — no two pieces of chrome may share the screen.
 *
 * This is the check the DOM-only spatial gate cannot make: the room is
 * WebGL, and the failures are between a HUD and a caption and a key
 * legend. Every surface is opened in a real browser at the three widths
 * the law names, and every visible rectangle is compared with every
 * other one.
 *
 *   node test-overlap.mjs
 */

import { spawn } from 'node:child_process';
import { ownPort } from './scripts/msh/own-port.mjs';

// The gate owns its port and proves the bytes are ours. Port 8792 used to
// be held by another project's http.server, so this gate was measuring
// someone else's page and reporting their layout as our failure.
const site = await ownPort();
process.on('exit', () => site.stop());

const run = spawn(process.execPath, ['scripts/msh/overlap.mjs', '--url', `${site.base}/index.html`, '--all', '--json'], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
let out = '';
run.stdout.on('data', (d) => { out += d; });
const code = await new Promise((r) => run.on('close', r));
site.stop();

if (code !== 0) {
  console.error('the overlap detector itself failed');
  process.exit(1);
}

const report = JSON.parse(out);
let failures = 0;

for (const r of report) {
  const label = `${r.vp} ${r.width}×${r.height} · ${r.surface}`;
  if (!r.overlaps.length) {
    console.log(`  ✓ ${label} — no chrome on top of chrome`);
    continue;
  }
  failures += r.overlaps.length;
  console.log(`  ✗ ${label} — ${r.overlaps.length} overlap(s)`);
  for (const o of r.overlaps.slice(0, 6)) {
    console.log(`      ${o.area}px²  ${o.a} "${o.aText}"  ×  ${o.b} "${o.bText}"`);
  }
}

console.log(failures ? `\n${failures} OVERLAP(S)` : `\noverlap gate: ${report.length} surfaces, all clear`);
process.exit(failures ? 1 : 0);
