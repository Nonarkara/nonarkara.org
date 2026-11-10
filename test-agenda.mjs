// The host desk's agenda. FAKE placeholders only — nothing here is a day
// anybody lives. The pavilion must not grow a public calendar, and a
// failed reading must not grow a sample one.
import assert from 'node:assert';
import { readFileSync, mkdtempSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import {
  normaliseBase, readDeviceConfig, mayReadAgenda, normaliseAgenda,
  formatClock, formatTravelWhen,
} from './agenda-model.js';
import {
  tokenOk, hostOk, syncMinutes, machineBusy, classify, chooseCalendars,
  shouldReadIcs, buildView, parseIcs, fromGoogle, allowedOrigin,
} from './sidecar/agenda/lib.mjs';
import { pullCalendars } from './sidecar/agenda/sync.mjs';
import { createAgendaServer, loadCache, saveCache } from './sidecar/agenda/server.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('./index.html');
const css = read('./styles.css');
const agenda = read('./agenda.js');
const desk = read('./desk.js');
const headers = read('./_headers');
const ignore = read('./.deployignore');

// ── The public pavilion does not carry a day ─────────────────────
{
  assert(html.includes('id="agenda"'), 'the desk needs a place for the agenda');
  assert(!html.includes('href="/calendar"'), 'no public calendar route');
  assert(!/Example block|Example departure|fake-1/.test(html), 'the page must not ship placeholder events');
  assert(css.includes('#agenda { display: none !important; }'), 'the agenda is hidden until the device check');
  assert(css.includes('body[data-mode="host"] #agenda'), 'only the host desk may show it');
  assert(!/gradient|box-shadow|border-radius/.test(css.slice(css.indexOf('/* AGENDA'), css.indexOf('/* HOME GRID'))),
    'the agenda adds no gradient, shadow, or extra radius');
  assert(agenda.includes('textContent'), 'rows are text');
  assert(!agenda.includes('innerHTML') && !agenda.includes('insertAdjacentHTML'),
    'a calendar title must not be parsed as HTML');
  assert(!agenda.includes('location.search'), 'the token must not arrive in the URL');
  assert(desk.includes("import('./agenda.js')"), 'the module waits until the desk asks');
  assert(desk.includes("dataset.mode !== 'host'") && desk.indexOf("dataset.mode !== 'host'") < desk.indexOf("import('./agenda.js')"),
    'a guest never imports the agenda');
  assert(ignore.split('\n').includes('sidecar/'), 'the listener must not be served from the public site');
  assert(headers.includes('https://agentics-macbook-air-5.local'),
    'the pavilion policy has to name the desk machine or the browser will refuse it');
  for (const file of ['./agenda.js', './agenda-model.js', './sidecar/agenda/server.mjs', './sidecar/agenda/sync.mjs', './sidecar/agenda/lib.mjs', './sidecar/agenda/README.md', './sidecar/agenda/env.example']) {
    assert(!/AGENDA_MACHINE_ID=\s*\S/.test(read(file)),
      `${file} must not carry a machine id value`);
  }
}

// ── Device gate ──────────────────────────────────────────────────
{
  const config = { base: 'https://desk.example', token: 'test-token-not-a-secret', configured: true };
  assert.equal(mayReadAgenda('host', config), true);
  assert.equal(mayReadAgenda('guest', config), false);
  assert.equal(mayReadAgenda('', config), false);
  assert.equal(mayReadAgenda('host', { configured: false }), false);
  assert.equal(normaliseBase('javascript:alert(1)'), '');
  assert.equal(normaliseBase('https://user:secret@desk.example/agenda'), '');
  assert.equal(normaliseBase('https://desk.example/agenda/'), 'https://desk.example');
  const stored = readDeviceConfig({
    getItem(k) { return { 'nonarkara.agenda.base': 'http://127.0.0.1:8741/', 'nonarkara.agenda.token': 'test-token-not-a-secret' }[k] || ''; },
  }, { base: 'https://other.example', token: 'ignored' });
  assert.equal(stored.base, 'http://127.0.0.1:8741');
  assert.equal(stored.configured, true);
  const fromRuntime = readDeviceConfig({ getItem() { return ''; } }, {
    base: 'https://desk.example', token: 'test-token-not-a-secret',
  });
  assert.equal(fromRuntime.configured, true);
}

// ── A bad body is not a day ──────────────────────────────────────
{
  const bad = normaliseAgenda({ today: [{ title: 'Example block', start: '2026-01-01T09:00:00+07:00' }] });
  assert.equal(bad.state, 'unavailable');
  assert.equal(bad.today.length, 0);
  const xss = normaliseAgenda({
    ok: true,
    generatedAt: '2026-01-01T02:00:00.000Z',
    today: [{ title: '<img src=x onerror=alert(1)>', start: '2026-01-01T09:00:00+07:00', kind: 'event' }],
    travel: [],
  });
  assert.equal(xss.state, 'ready');
  assert.equal(xss.today[0].title, '<img src=x onerror=alert(1)>');
  assert.equal(xss.today[0].kind, 'event');
  const empty = normaliseAgenda({ ok: true, today: [], travel: [], generatedAt: '2026-01-01T02:00:00.000Z' });
  assert.equal(empty.state, 'empty');
  assert.equal(formatClock('2026-01-01T02:30:00.000Z'), '09:30');
  assert.equal(formatTravelWhen('2026-01-02T23:00:00.000Z', false), '03 JAN · 06:00');
}

// ── Classification and calendar choice. FAKE titles. ────────────
{
  assert.deepEqual(classify('Leave the house', 'primary'), { kind: 'leave', hold: 'leave-the-house' });
  assert.deepEqual(classify('Leave for the airport', 'primary'), { kind: 'leave', hold: 'leave-for-airport' });
  assert.deepEqual(classify('Leave for airport', 'work'), { kind: 'leave', hold: 'leave-for-airport' });
  assert.equal(classify('Department sync', 'primary').kind, 'event');
  assert.equal(classify('household supplies', 'primary').kind, 'event');
  assert.equal(classify('Example departure', 'tripit').kind, 'travel');
  assert.equal(classify('Example block', 'primary').kind, 'event');

  const one = chooseCalendars([
    { id: 'p', summary: 'Main', primary: true },
    { id: 'w', summary: 'Calendar' },
    { id: 't', summary: 'TripIt' },
  ]);
  assert.deepEqual(one.chosen.map((c) => c.role), ['primary', 'work', 'tripit']);
  assert.equal(one.notes.length, 0);

  const ambiguous = chooseCalendars([
    { id: 'p', summary: 'Calendar', primary: true },
    { id: 'a', summary: 'Calendar' },
    { id: 'b', summary: 'Calendar' },
    { id: 't1', summary: 'TripIt A' },
    { id: 't2', summary: 'TripIt B' },
  ]);
  assert.deepEqual(ambiguous.chosen.map((c) => c.role), ['primary']);
  assert.deepEqual(ambiguous.notes, ['work-ambiguous', 'tripit-ambiguous']);
  assert.equal(shouldReadIcs(one, { TRIPIT_ICS_URL: 'https://example.invalid/feed.ics' }), false);
  assert.equal(shouldReadIcs(ambiguous, { TRIPIT_ICS_URL: 'https://example.invalid/feed.ics' }), true);
  assert.equal(shouldReadIcs(ambiguous, {}), false);
}

// ── ICS: FAKE feed. Unknown zones are dropped. ──────────────────
{
  const text = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'SUMMARY:Example departure',
    'DTSTART:20260102T230000Z',
    'DTEND:20260103T020000Z',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Example elsewhere',
    'DTSTART;TZID=Pacific/Auckland:20260102T090000',
    'DTEND;TZID=Pacific/Auckland:20260102T100000',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const events = parseIcs(text);
  assert.equal(events.length, 1);
  assert.equal(events[0].summary, 'Example departure');
  assert.equal(events[0].start, '2026-01-02T23:00:00Z');
}

// ── The view is the Bangkok day plus travel still ahead ─────────
{
  const now = new Date('2026-11-10T04:00:00.000Z'); // 11:00 in Bangkok
  const items = [
    fromGoogle({
      id: 'e1', status: 'confirmed', summary: 'Example block',
      start: { dateTime: '2026-11-10T09:00:00+07:00' },
      end: { dateTime: '2026-11-10T10:00:00+07:00' },
    }, 'primary'),
    fromGoogle({
      id: 'e3', summary: 'Leave the house',
      start: { dateTime: '2026-11-10T05:30:00+07:00' },
      end: { dateTime: '2026-11-10T06:00:00+07:00' },
    }, 'primary'),
    fromGoogle({
      id: 'gone', status: 'cancelled', summary: 'Example block',
      start: { dateTime: '2026-11-10T12:00:00+07:00' },
      end: { dateTime: '2026-11-10T13:00:00+07:00' },
    }, 'primary'),
    fromGoogle({
      id: 'e2', summary: 'Example departure', location: 'Example gate',
      description: 'this must not be copied',
      attendees: [{ email: 'person@example.invalid' }],
      start: { dateTime: '2026-11-12T08:00:00+07:00' },
      end: { dateTime: '2026-11-12T11:00:00+07:00' },
    }, 'tripit'),
    fromGoogle({
      id: 'e4', summary: 'Leave for the airport',
      start: { dateTime: '2026-11-12T05:00:00+07:00' },
      end: { dateTime: '2026-11-12T05:40:00+07:00' },
    }, 'work'),
  ].filter(Boolean);
  const view = buildView(items, now);
  assert.equal(view.ok, true);
  assert.equal(view.tz, 'Asia/Bangkok');
  assert.deepEqual(view.today.map((e) => e.title), ['Leave the house', 'Example block']);
  assert.deepEqual(view.travel.map((e) => e.title), ['Leave for the airport', 'Example departure']);
  assert.equal(view.travel[0].hold, 'leave-for-airport');
  assert.equal(view.travel[1].kind, 'travel');
  assert.equal(view.travel[1].where, 'Example gate');
  assert.equal(JSON.stringify(view).includes('person@example.invalid'), false);
  assert.equal(JSON.stringify(view).includes('must not be copied'), false);
  assert.equal(view.today[0].description, undefined);
}

// ── Machine guards ───────────────────────────────────────────────
{
  assert.equal(tokenOk('test-token-not-a-secret', 'test-token-not-a-secret'), true);
  assert.equal(tokenOk('nope', 'test-token-not-a-secret'), false);
  assert.equal(tokenOk('', 'test-token-not-a-secret'), false);
  assert.equal(hostOk('Agentics-MacBook-Air-5.local', 'agentics-macbook-air-5'), true);
  assert.equal(hostOk('other.local', 'Agentics-MacBook-Air-5.local'), false);
  assert.equal(syncMinutes(undefined), 30);
  assert.equal(syncMinutes(1), 15);
  assert.equal(syncMinutes(500), 180);
  assert.equal(machineBusy({ load1: 8, cpus: 8, rss: 1 }), true);
  assert.equal(machineBusy({ load1: 1, cpus: 8, rss: 1 }), false);
  assert.equal(machineBusy({ load1: 0, cpus: 8, rss: 90 * 1024 * 1024 }), true);
  assert.equal(allowedOrigin('https://evil.example'), false);
  assert.equal(allowedOrigin('https://nonarkara.org'), true);
  assert.equal(allowedOrigin('http://127.0.0.1:5999'), true);
}

// ── Cache stays a file the repo never sees ───────────────────────
{
  const dir = mkdtempSync(path.join(tmpdir(), 'agenda-'));
  const file = path.join(dir, 'cache.json');
  const fake = {
    ok: true, generatedAt: '2026-01-01T00:00:00.000Z', tz: 'Asia/Bangkok',
    today: [{ id: 'fake-1', title: 'Example block', start: '2026-01-01T09:00:00+07:00', end: '2026-01-01T10:00:00+07:00', where: '', allDay: false, kind: 'event', hold: null, role: 'primary' }],
    travel: [],
  };
  saveCache(file, fake);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(loadCache(file).today[0].title, 'Example block');
  assert.equal(loadCache(path.join(dir, 'missing.json')), null);
  saveCache(file, { ok: false });
  assert.equal(loadCache(file).ok, true, 'a failed reading must not wipe the last good cache');
  rmSync(dir, { recursive: true });
}

// ── The listener answers the contract and nothing else ──────────
{
  const FAKE = {
    ok: true,
    generatedAt: '2026-01-01T00:00:00.000Z',
    tz: 'Asia/Bangkok',
    today: [{ id: 'fake-1', title: 'Example block', start: '2026-01-01T09:00:00+07:00', end: '2026-01-01T10:00:00+07:00', where: '', allDay: false, kind: 'event', hold: null, role: 'primary' }],
    travel: [],
  };
  const server = createAgendaServer({
    token: 'test-token-not-a-secret',
    payload: () => FAKE,
    health: () => ({ ok: true, rss: 1 }),
    maxPerMinute: 2,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const ask = (headers, path = '/agenda') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, headers }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
  try {
    const anon = await ask({});
    assert.equal(anon.status, 401);
    assert.equal(anon.body.includes('Example block'), false);

    const evil = await ask({ authorization: 'Bearer test-token-not-a-secret', origin: 'https://evil.example' });
    assert.equal(evil.status, 403);
    assert.equal(evil.body.includes('Example block'), false);
    assert.equal(evil.headers['access-control-allow-origin'], undefined);

    const ok = await ask({ authorization: 'Bearer test-token-not-a-secret', origin: 'https://nonarkara.org' });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['access-control-allow-origin'], 'https://nonarkara.org');
    assert.equal(ok.headers['access-control-allow-private-network'], 'true');
    assert.equal(ok.headers['cache-control'], 'no-store');
    assert.equal(JSON.parse(ok.body).today[0].title, 'Example block');

    const health = await ask({ authorization: 'Bearer test-token-not-a-secret' }, '/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.includes('Example block'), false);

    const opts = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1', port, path: '/agenda', method: 'OPTIONS',
        headers: { origin: 'https://www.nonarkara.org', 'access-control-request-private-network': 'true' },
      }, (res) => {
        res.resume();
        res.on('end', () => resolve(res));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(opts.statusCode, 204);
    assert.equal(opts.headers['access-control-allow-private-network'], 'true');

    let limited = 0;
    for (let i = 0; i < 3; i++) {
      const res = await ask({ authorization: 'Bearer test-token-not-a-secret' });
      if (res.status === 429) limited += 1;
    }
    assert(limited >= 1, 'a burst against the desk machine is refused');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// ── One sync pass. FAKE calendars, no live Google call. ─────────
{
  const calls = [];
  const json = (obj, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => obj,
    arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(obj)).buffer,
    body: { cancel() {} },
  });
  const fakeFetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('oauth2.googleapis.com')) return json({ access_token: 'ya-test-not-a-secret' });
    if (u.includes('/calendarList')) {
      return json({ items: [
        { id: 'p', summary: 'Main', primary: true },
        { id: 'w', summary: 'Calendar' },
        { id: 't', summary: 'TripIt' },
      ] });
    }
    if (u.includes('/calendars/p/')) {
      return json({ items: [
        { id: 'e1', status: 'confirmed', summary: 'Example block', start: { dateTime: '2026-11-10T09:00:00+07:00' }, end: { dateTime: '2026-11-10T10:00:00+07:00' } },
        { id: 'e3', summary: 'Leave the house', start: { dateTime: '2026-11-10T05:30:00+07:00' }, end: { dateTime: '2026-11-10T06:00:00+07:00' } },
      ] });
    }
    if (u.includes('/calendars/w/')) return json({ items: [] });
    if (u.includes('/calendars/t/')) {
      return json({ items: [
        { id: 'e2', summary: 'Example departure', start: { dateTime: '2026-11-12T08:00:00+07:00' }, end: { dateTime: '2026-11-12T11:00:00+07:00' } },
      ] });
    }
    throw new Error(`unexpected ${u}`);
  };
  const { view } = await pullCalendars({
    env: {
      GOOGLE_CLIENT_ID: 'test-client',
      GOOGLE_CLIENT_SECRET: 'test-secret-not-real',
      GOOGLE_REFRESH_TOKEN: 'test-refresh-not-real',
      TRIPIT_ICS_URL: 'https://example.invalid/feed.ics',
    },
    fetch: fakeFetch,
    now: new Date('2026-11-10T04:00:00.000Z'),
  });
  assert.equal(calls.some((u) => u.includes('example.invalid')), false, 'TripIt is not fetched twice');
  assert.deepEqual(view.today.map((e) => e.title), ['Leave the house', 'Example block']);
  assert.equal(view.travel[0].title, 'Example departure');
  assert.equal(view.travel[0].role, 'tripit');
}

console.log('agenda: host only · no sample day · listener refuses a stranger · fake feed stays fake');
