#!/usr/bin/env node
/**
 * The CSP hashes for the site's inline scripts, computed — never typed.
 *
 * The Content-Security-Policy in _headers pins every inline <script> by its
 * sha256. That is a good policy and a sharp edge: edit one line of the
 * self-heal and the hash is stale, the browser BLOCKS the script, and the
 * repair mechanism stops existing — silently. Nothing fails. The heal simply
 * is not there any more, and the site goes back to serving a stale build to
 * the people who most needed it repaired.
 *
 * It happened here: the heal was rewritten and the CSP kept the old hash.
 * test-security.mjs caught it. That test is the reason it was caught at all,
 * and it should not have been the last line of defence.
 *
 * So: the hashes are generated from the scripts, written into _headers, and
 * ship.sh runs this before every deploy. The policy and the code cannot
 * drift, because nobody types the hash.
 *
 *   node scripts/msh/csp.mjs          # print the hashes
 *   node scripts/msh/csp.mjs --write  # rewrite _headers
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const inlineScripts = ['index.html', 'mixedtape.html'].flatMap((file) => {
  const html = read(file);
  return [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
});

const hashes = inlineScripts.map(
  (src) => `'sha256-${createHash('sha256').update(src).digest('base64')}'`
);

console.log(`${inlineScripts.length} inline script(s)`);
for (const h of hashes) console.log('  ' + h);

if (!process.argv.includes('--write')) process.exit(0);

const headersPath = new URL('../../_headers', import.meta.url);
const headers = readFileSync(headersPath, 'utf8');
const lines = headers.split('\n');
let written = 0;
for (let i = 0; i < lines.length; i++) {
  if (!/Content-Security-Policy:/.test(lines[i])) continue;
  // Strip every existing hash from script-src, then put the computed ones in.
  const m = lines[i].match(/script-src ([^;]*);/);
  if (!m) { console.error('no script-src directive in the CSP'); process.exit(1); }
  const others = m[1].replace(/'sha256-[^']*'\s*/g, '').trim();
  const rebuilt = `script-src 'self' ${hashes.join(' ')} ${others};`;
  lines[i] = lines[i].replace(/script-src [^;]*;/, rebuilt);
  written++;
}
if (!written) { console.error('no Content-Security-Policy line in _headers'); process.exit(1); }
writeFileSync(headersPath, lines.join('\n'));
console.log(`_headers: ${written} CSP line(s) rewritten with ${hashes.length} hash(es)`);
