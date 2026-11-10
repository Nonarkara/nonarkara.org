// One pass over the calendars Google already has.
// Sequential, bounded, and quiet: counts may be logged, titles may not.

import {
  chooseCalendars, shouldReadIcs, fromGoogle, fromIcs, buildView, parseIcs,
} from './lib.mjs';

export class AgendaError extends Error {
  constructor(status) {
    super('agenda request failed');
    this.status = status || 0;
  }
}

async function readJson(res) {
  if (!res.ok) {
    try { await res.body?.cancel?.(); } catch (_) { /* already closed */ }
    throw new AgendaError(res.status);
  }
  return res.json();
}

export async function pullCalendars({ env, fetch: fetchImpl = globalThis.fetch, now = new Date() }) {
  if (!env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET || !env?.GOOGLE_REFRESH_TOKEN) {
    throw new AgendaError(0);
  }
  const access = await accessToken(env, fetchImpl);
  const list = await getJson(fetchImpl, 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250&fields=items(id,summary,primary)', access);
  const choice = chooseCalendars(list.items || []);
  const items = [];
  const { start, end } = windowFor(now);
  for (const cal of choice.chosen) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('timeMin', start);
    url.searchParams.set('timeMax', end);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('fields', 'items(id,status,summary,location,start,end)');
    const body = await getJson(fetchImpl, url, access);
    for (const ev of body.items || []) {
      const item = fromGoogle(ev, cal.role);
      if (item) items.push(item);
    }
  }
  if (shouldReadIcs(choice, env)) {
    const text = await fetchIcs(env.TRIPIT_ICS_URL, fetchImpl);
    for (const ev of parseIcs(text)) {
      const item = fromIcs(ev);
      if (item) items.push(item);
    }
  }
  return { view: buildView(items, now), notes: choice.notes };
}

function windowFor(now) {
  // Imported lazily through buildView's clock: start of the Bangkok day
  // through three weeks. That is the whole question the desk asks.
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const start = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+07:00`);
  const end = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function accessToken(env, fetchImpl) {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const res = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15000),
  });
  const json = await readJson(res);
  if (!json.access_token) throw new AgendaError(res.status || 401);
  return json.access_token;
}

async function getJson(fetchImpl, url, access) {
  const res = await fetchImpl(url, {
    headers: { authorization: `Bearer ${access}`, accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  return readJson(res);
}

async function fetchIcs(url, fetchImpl) {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
  if (!res.ok) {
    try { await res.body?.cancel?.(); } catch (_) { /* already closed */ }
    throw new AgendaError(res.status);
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 512 * 1024) throw new AgendaError(413);
  return new TextDecoder().decode(buf);
}
