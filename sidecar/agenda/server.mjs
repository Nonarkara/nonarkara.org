// Optional listener for the host desk. Not started by the site, the
// deploy, or a login item. FloodDash on this machine comes first.

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenOk, allowedOrigin, DEFAULT_ORIGINS, hostGate, syncMinutes, machineBusy } from './lib.mjs';
import { pullCalendars } from './sync.mjs';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function createAgendaServer(opts) {
  const state = {
    token: opts.token,
    origins: opts.origins || DEFAULT_ORIGINS,
    payload: opts.payload || (() => null),
    health: opts.health || (() => ({ ok: false })),
    hits: opts.hits || [],
    maxPerMinute: opts.maxPerMinute || 30,
  };
  const handler = (req, res) => handleAgenda(req, res, state);
  if (opts.tls) return https.createServer(opts.tls, handler);
  return http.createServer(handler);
}

export function handleAgenda(req, res, state) {
  let pathname = '/';
  try { pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname; }
  catch (_) { pathname = '/'; }
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  const browser = Boolean(origin);
  const allowed = !browser || allowedOrigin(origin, state.origins);

  if (req.method === 'OPTIONS') {
    writeCors(res, origin, allowed);
    res.writeHead(allowed ? 204 : 403, JSON_HEADERS);
    res.end();
    return;
  }
  if (!allowed) {
    writeCors(res, origin, false);
    res.writeHead(403, JSON_HEADERS);
    res.end('{"ok":false}');
    return;
  }
  if (req.method !== 'GET' || (pathname !== '/agenda' && pathname !== '/health')) {
    writeCors(res, origin, allowed);
    res.writeHead(404, JSON_HEADERS);
    res.end('{"ok":false}');
    return;
  }
  const got = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!tokenOk(got, state.token)) {
    writeCors(res, origin, allowed);
    res.writeHead(401, JSON_HEADERS);
    res.end('{"ok":false}');
    return;
  }
  if (throttled(state)) {
    writeCors(res, origin, allowed);
    res.writeHead(429, JSON_HEADERS);
    res.end('{"ok":false}');
    return;
  }
  if (pathname === '/health') {
    const body = JSON.stringify(state.health());
    writeCors(res, origin, allowed);
    res.writeHead(200, JSON_HEADERS);
    res.end(body);
    return;
  }
  const payload = state.payload();
  if (!payload || payload.ok !== true) {
    writeCors(res, origin, allowed);
    res.writeHead(503, JSON_HEADERS);
    res.end('{"ok":false}');
    return;
  }
  writeCors(res, origin, allowed);
  res.writeHead(200, JSON_HEADERS);
  res.end(JSON.stringify(payload));
}

function throttled(state) {
  const now = Date.now();
  while (state.hits.length && now - state.hits[0] > 60_000) state.hits.shift();
  if (state.hits.length >= state.maxPerMinute) return true;
  state.hits.push(now);
  return false;
}

function writeCors(res, origin, allowed) {
  if (!allowed || !origin) return;
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('vary', 'origin');
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
  res.setHeader('access-control-allow-headers', 'authorization, accept');
  res.setHeader('access-control-allow-private-network', 'true');
  res.setHeader('access-control-max-age', '600');
}

export function cachePath(env = process.env, home = os.homedir()) {
  if (env.AGENDA_CACHE) return env.AGENDA_CACHE;
  return path.join(home, '.agenda', 'cache.json');
}

export function loadCache(file) {
  try {
    const st = fs.statSync(file);
    if (!st.isFile() || st.size > 256 * 1024) return null;
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!json || json.ok !== true || !Array.isArray(json.today) || !Array.isArray(json.travel)) return null;
    return json;
  } catch (_) {
    return null;
  }
}

export function saveCache(file, json) {
  if (!json || json.ok !== true) return;
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(json), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

async function machineOk() {
  const want = process.env.AGENDA_MACHINE_ID;
  if (!want) return true;
  if (process.platform !== 'darwin') return false;
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  try {
    const { stdout } = await promisify(execFile)(
      'ioreg',
      ['-rd1', '-c', 'IOPlatformExpertDevice'],
      { timeout: 3000 },
    );
    const found = String(stdout).match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
    if (!found) return false;
    return tokenOk(found[1].toLowerCase(), String(want).toLowerCase());
  } catch (_) {
    return false;
  }
}

async function main() {
  const token = process.env.AGENDA_TOKEN || '';
  if (!token) {
    console.error('agenda sidecar: AGENDA_TOKEN is required. Refusing to listen.');
    process.exit(1);
  }
  const gate = hostGate({
    hostname: os.hostname(),
    expectHost: process.env.AGENDA_EXPECT_HOST,
    allowOther: process.env.AGENDA_ALLOW_OTHER_HOST,
  });
  if (gate === 'missing') {
    console.error('agenda sidecar: AGENDA_EXPECT_HOST is required. Refusing to start.');
    process.exit(1);
  }
  if (gate === 'mismatch') {
    console.error('agenda sidecar: AGENDA_EXPECT_HOST does not match this machine. Refusing to start.');
    process.exit(1);
  }
  if (!(await machineOk())) {
    console.error('agenda sidecar: AGENDA_MACHINE_ID does not match this Mac. Refusing to start.');
    process.exit(1);
  }
  const cert = process.env.AGENDA_TLS_CERT || '';
  const key = process.env.AGENDA_TLS_KEY || '';
  if (Boolean(cert) !== Boolean(key)) {
    console.error('agenda sidecar: set both AGENDA_TLS_CERT and AGENDA_TLS_KEY, or neither.');
    process.exit(1);
  }
  try { os.setPriority(10); } catch (_) { /* not every environment allows it */ }
  process.title = 'non-agenda';

  const file = cachePath();
  let payload = loadCache(file);
  let deferred = false;
  let syncing = false;
  const health = () => ({
    ok: Boolean(payload && payload.ok),
    generatedAt: payload && payload.generatedAt || null,
    rss: process.memoryUsage().rss,
    load1: os.loadavg()[0],
    deferred,
  });
  const extra = String(process.env.AGENDA_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const server = createAgendaServer({
    token,
    origins: extra.length ? [...DEFAULT_ORIGINS, ...extra] : DEFAULT_ORIGINS,
    payload: () => payload,
    health,
    tls: cert ? { cert: fs.readFileSync(cert), key: fs.readFileSync(key) } : null,
  });
  const bind = process.env.AGENDA_BIND || '127.0.0.1';
  const port = Number(process.env.AGENDA_PORT || 8741);
  server.listen(port, bind, () => {
    console.error(`agenda sidecar listening on ${bind}:${port}`);
  });

  const every = syncMinutes(process.env.AGENDA_SYNC_MINUTES) * 60 * 1000;
  const delay = Math.max(0, Number(process.env.AGENDA_SYNC_DELAY_SECONDS ?? 20)) * 1000;

  async function cycle() {
    if (syncing) return;
    const busy = machineBusy({
      load1: os.loadavg()[0],
      cpus: os.cpus().length,
      rss: process.memoryUsage().rss,
    });
    if (busy) {
      deferred = true;
      console.error('agenda sync deferred');
      return;
    }
    deferred = false;
    syncing = true;
    try {
      const { view, notes } = await pullCalendars({ env: process.env, now: new Date() });
      if (notes.length) console.error(`agenda calendars ${notes.join(' ')}`);
      payload = view;
      saveCache(file, view);
      const count = (view.today?.length || 0) + (view.travel?.length || 0);
      console.error(`agenda sync ok count=${count}`);
    } catch (err) {
      const status = err && err.status ? ` ${err.status}` : '';
      console.error(`agenda sync failed${status}`);
    } finally {
      syncing = false;
    }
  }

  const first = setTimeout(cycle, delay);
  const later = setInterval(cycle, every);
  first.unref?.();
  later.unref?.();

  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

function invokedDirectly() {
  const arg = process.argv[1];
  if (!arg) return false;
  try { return fs.realpathSync(arg) === fs.realpathSync(fileURLToPath(import.meta.url)); }
  catch (_) { return false; }
}
if (invokedDirectly()) main();
