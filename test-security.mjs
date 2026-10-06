import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('./app.js');
const index = read('./index.html');
const mixtape = read('./mixtape.html');
const headers = read('./_headers');
const worker = read('./worker/src/index.js');
const ship = read('./ship.sh');

assert(!app.includes('ipapi.co'), 'the browser must not disclose visitor IPs to a third party');
assert(!app.includes('script.google.com'), 'the public visitor collector must stay removed');
assert(app.includes("window.open(item.url, '_blank', 'noopener,noreferrer')"),
  'external command results must sever their opener');

for (const directive of [
  "default-src 'self'",
  "script-src-attr 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  'Strict-Transport-Security: max-age=31536000',
  'Permissions-Policy:',
]) assert(headers.includes(directive), `security header missing: ${directive}`);

const inlineScripts = [index, mixtape].flatMap((html) =>
  [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]));
assert.equal(inlineScripts.length, 3, 'review CSP hashes when inline script count changes');
for (const source of inlineScripts) {
  const hash = `sha256-${createHash('sha256').update(source).digest('base64')}`;
  assert(headers.includes(`'${hash}'`), `CSP is missing inline script hash ${hash}`);
}

assert(index.includes('integrity="sha384-lQXOAyZwHXE55JFyrOMB7nY2Wv+m5ZWNtJcHrd1rceRQXAYNLak8ukN5TjBTcIwz"'),
  'QR dependency must retain its verified SRI digest');
for (const token of [
  'isCaptureOriginAllowed',
  'captureRateLimited',
  'CAPTURE_MAX_BYTES',
  'startsWith("application/json")',
]) assert(worker.includes(token), `capture boundary missing: ${token}`);

for (const file of ['./.github/workflows/cloudflare-pages.yml', './.github/workflows/security.yml']) {
  const workflow = read(file);
  for (const use of workflow.matchAll(/uses:\s*[^@\s]+@([^\s#]+)/g)) {
    assert(/^[0-9a-f]{40}$/.test(use[1]), `${file} action is not pinned to a commit: ${use[1]}`);
  }
}

assert(ship.includes('LIVE_BODY=$(curl -fsS'), 'deployment verifier must capture the full response before matching');
assert(!/curl[^\n]+\|\s*grep\s+-m1/.test(ship),
  'deployment verifier must not let an early-exit grep turn a successful curl into a pipefail error');

console.log('security: CSP hashes · SRI · privacy · capture boundary · pinned CI · honest deploy verification');
