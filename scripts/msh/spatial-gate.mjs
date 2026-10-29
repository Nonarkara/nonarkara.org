#!/usr/bin/env node
/**
 * THE SPATIAL GATE — one command, one verdict.
 *
 * The vendored gate (scripts/spatial/spatial-check.mjs) answers: "given this
 * page, what is wrong with it?" It does not answer: "is this the page you
 * meant?" Those are different questions, and a gate that only answers the
 * first one can certify the shell and call it the site — which is exactly
 * what it did: on a slow machine one width of a sweep measured the desk and
 * the next measured the sign, and the receipt said 93 clean measurements of
 * three surfaces, none of which was the one being claimed.
 *
 * So the gate is TWO instruments, and this is the command that runs both:
 *
 *   1. the vendored gate — the findings, against a reviewed receipt
 *   2. the surface check — proof, from the DOM, of which surface was on
 *      screen at every width the sweep measured
 *
 * and the receipt is only accepted when every measurement has a proof. A
 * green gate over an unproven surface is a green gate over nothing.
 *
 *   node scripts/msh/spatial-gate.mjs            check against the receipt
 *   node scripts/msh/spatial-gate.mjs --update   capture a new receipt
 *
 * Exit code 0 means: every measurement agrees with the receipt AND every
 * measurement was of the surface it names.
 */

import { spawn } from 'node:child_process';
import { existsSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
process.chdir(ROOT);

const UPDATE = process.argv.includes('--update');
const PORT = Number((process.argv.find(a => a.startsWith('--port=')) || '').split('=')[1] || 8793);
const BASE = `http://127.0.0.1:${PORT}/`;
const ROUTES = '/,/?view=plan,/?view=ioc';
const RECEIPT = 'design/spatial-baseline.json';
const TMP_BASELINE = '/tmp/spatial-candidate.json';
const TMP_MEASUREMENTS = '/tmp/spatial-measurements.json';
const TMP_SURFACE = '/tmp/spatial-surface.json';
const CHROME_WRAPPER = path.join(ROOT, 'scripts/spatial/chrome-webgl.sh');

const run = (cmd, args, opts = {}) => new Promise((resolve) => {
  const p = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
  p.on('close', code => resolve(code ?? 1));
  p.on('error', () => resolve(1));
});

const say = (s) => console.log(`\n\x1b[1m── ${s}\x1b[0m`);

// ── the server ───────────────────────────────────────────────────────────
say('serving the tree');
const server = spawn('node', ['scripts/msh/serve.mjs', String(PORT), ROOT], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));

let verdict = 0;
try {
  // ── 1. the findings ──────────────────────────────────────────────────
  say('the vendored gate — the findings');
  const gateArgs = [
    'scripts/spatial/spatial-check.mjs',
    '--base', BASE,
    '--routes', ROUTES,
    '--json', TMP_MEASUREMENTS,
  ];
  if (UPDATE) {
    // A capture writes a CANDIDATE receipt. It is not the receipt until the
    // surface check says every measurement was of the surface it names.
    rmSync(TMP_BASELINE, { force: true });
    gateArgs.push('--baseline', TMP_BASELINE, '--update');
  } else {
    if (!existsSync(RECEIPT)) {
      console.error(`no receipt at ${RECEIPT} — nothing has been reviewed, so nothing is known to be deliberate`);
      verdict = 1;
    } else {
      gateArgs.push('--baseline', RECEIPT);
    }
  }
  if (!verdict) {
    const code = await run('node', gateArgs, { env: { ...process.env, CHROME_PATH: CHROME_WRAPPER } });
    if (code !== 0) { console.error('the gate found findings that disagree with the receipt'); verdict = 1; }
  }

  // ── 2. the surfaces ──────────────────────────────────────────────────
  say('the surface check — which surface was on screen');
  const surfaceCode = await run('node', ['scripts/msh/surface-check.mjs', '--base', BASE, '--json', TMP_SURFACE]);
  if (surfaceCode !== 0) { console.error('the surface check failed — a measurement is not of the surface it names'); verdict = 1; }

  // ── 3. the cross-check ───────────────────────────────────────────────
  if (!verdict && existsSync(TMP_MEASUREMENTS)) {
    say('the cross-check — every measurement has a proof');
    const guardCode = await run('node', ['scripts/msh/gate-guard.mjs', TMP_MEASUREMENTS, '--surface', TMP_SURFACE]);
    if (guardCode !== 0) { console.error('the guard rejected the run'); verdict = 1; }
  }

  // ── 4. the receipt ───────────────────────────────────────────────────
  if (!verdict && UPDATE) {
    say('accepting the receipt');
    if (!existsSync(TMP_BASELINE)) { console.error('the capture produced no receipt'); verdict = 1; }
    else {
      copyFileSync(TMP_BASELINE, RECEIPT);
      const r = JSON.parse(readFileSync(RECEIPT, 'utf8'));
      console.log(`   ${RECEIPT} accepted — ${Object.keys(r.routes || {}).length} routes, ${r.measuredWidths?.length || 0} widths`);
    }
  }
} finally {
  server.kill();
}

say(verdict ? 'THE GATE IS RED' : 'THE GATE IS GREEN');
if (verdict) console.log('  The receipt was not changed.');
else console.log('  Every measurement agreed with the receipt, and every measurement was of the surface it names.');
process.exit(verdict);
