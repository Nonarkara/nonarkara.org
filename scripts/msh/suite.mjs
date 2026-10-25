#!/usr/bin/env node
/**
 * THE SUITE — run every test in this repo, one at a time, and say what passed.
 *
 * A test that cannot run is not a pass. Every suite is executed here; the
 * exit code is the suite's own, and a suite that dies from a missing binary
 * or a port it does not own is reported as a failure, never skipped.
 *
 * Between suites the browser processes the gates leak are killed: 85 stale
 * headless Chromes once starved the machine and made two suites fail for
 * reasons that had nothing to do with this site.
 *
 *   node scripts/msh/suite.mjs
 *   node scripts/msh/suite.mjs test-door.mjs test-overlap.mjs
 */

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PER_SUITE_MS = 300000;

const only = process.argv.slice(2);
const all = (await readdir(ROOT))
  .filter((f) => /^test-.*\.mjs$/.test(f))
  .sort();
const files = only.length ? only : all;

function killChrome() {
  return new Promise((resolve) => {
    const p = spawn('pkill', ['-f', 'Google Chrome.*--headless=new.*--user-data-dir=/']);
    p.on('close', () => resolve());
    p.on('error', () => resolve());
  });
}

function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, file)], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: 124, out: out + `\n[suite] ${file} exceeded ${PER_SUITE_MS / 1000}s and was killed` });
    }, PER_SUITE_MS);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out }); });
  });
}

const results = [];
for (const file of files) {
  const t0 = Date.now();
  process.stdout.write(`running ${file} … `);
  const { code, out } = await run(file);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = code === 0;
  results.push({ file, code, ok, secs, out });
  console.log(ok ? `PASS (${secs}s)` : `FAIL (exit ${code}, ${secs}s)`);
  if (!ok) {
    const tail = out.trim().split('\n').slice(-14).join('\n');
    console.log(tail.split('\n').map((l) => `    ${l}`).join('\n'));
  }
  await killChrome();
}

const failed = results.filter((r) => !r.ok);
console.log('\n════');
console.log(`${results.length - failed.length}/${results.length} suites pass`);
if (failed.length) {
  console.log('failed:');
  for (const f of failed) console.log(`  ${f.file} (exit ${f.code})`);
}
process.exit(failed.length ? 1 : 0);
