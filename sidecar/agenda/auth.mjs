// One-shot Google refresh token for the agenda listener.
// Run by hand on the M3. Prints the token to stdout and saves nothing.
// The OAuth client must allow the loopback redirect below.

import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = 8742;
const REDIRECT = `http://127.0.0.1:${PORT}/`;
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

async function main() {
  const id = process.env.GOOGLE_CLIENT_ID || '';
  const secret = process.env.GOOGLE_CLIENT_SECRET || '';
  if (!id || !secret) {
    console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment. This script does not write them anywhere.');
    process.exit(1);
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', id);
  url.searchParams.set('redirect_uri', REDIRECT);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  console.error(`Open this URL on this machine. The redirect is ${REDIRECT} and the listener closes after one reply.`);
  console.error(url.toString());
  const code = await waitForCode();
  const body = new URLSearchParams({
    code,
    client_id: id,
    client_secret: secret,
    redirect_uri: REDIRECT,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    try { await res.body?.cancel?.(); } catch (_) { /* already closed */ }
    console.error(`token exchange failed (${res.status}). Nothing was saved.`);
    process.exit(1);
  }
  const json = await res.json();
  if (!json.refresh_token) {
    console.error('Google did not return a refresh token. Nothing was saved.');
    process.exit(1);
  }
  process.stdout.write(`${json.refresh_token}\n`);
  console.error('That line is GOOGLE_REFRESH_TOKEN. Keep it in the M3 environment. Do not commit it.');
}

function waitForCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url || '/', REDIRECT);
      const code = u.searchParams.get('code');
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(code ? 'Signed in. You can close this tab.\n' : 'No code. You can close this tab.\n');
      server.close();
      if (code) resolve(code);
      else reject(new Error('no code'));
    });
    server.listen(PORT, '127.0.0.1');
    setTimeout(() => {
      server.close();
      reject(new Error('timed out'));
    }, 5 * 60 * 1000).unref?.();
  });
}

function invokedDirectly() {
  const arg = process.argv[1];
  if (!arg) return false;
  try { return fs.realpathSync(arg) === fs.realpathSync(fileURLToPath(import.meta.url)); }
  catch (_) { return false; }
}
if (invokedDirectly()) {
  main().catch(() => {
    console.error('agenda auth failed. Nothing was saved.');
    process.exit(1);
  });
}
