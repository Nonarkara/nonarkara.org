// Pure pieces of the desk-machine agenda listener.
// No network, no calendar bodies, no tokens printed.

import { createHash, timingSafeEqual } from 'node:crypto';

export const TZ = 'Asia/Bangkok';
export const DEFAULT_ORIGINS = Object.freeze([
  'https://nonarkara.org',
  'https://www.nonarkara.org',
  'http://localhost:5210',
  'http://127.0.0.1:5210',
]);

export function tokenOk(got, expect) {
  if (!expect || !got) return false;
  const a = createHash('sha256').update(String(got)).digest();
  const b = createHash('sha256').update(String(expect)).digest();
  return timingSafeEqual(a, b);
}

export function hostOk(actual, expected) {
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\.local$/, '');
  return Boolean(norm(actual)) && norm(actual) === norm(expected);
}

// AGENDA_EXPECT_HOST is required. Nothing in the repo names the machine.
// AGENDA_ALLOW_OTHER_HOST=1 is the only way to start without that check.
export function hostGate({ hostname, expectHost, allowOther }) {
  if (String(allowOther || '') === '1') return 'allow';
  const expected = String(expectHost || '').trim();
  if (!expected) return 'missing';
  if (!hostOk(hostname, expected)) return 'mismatch';
  return 'ok';
}

export function syncMinutes(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 30;
  return Math.min(180, Math.max(15, Math.round(n)));
}

// FloodDash is the reason this machine is on. A sync that finds the
// machine already full, or this process already heavy, waits.
export function machineBusy({ load1, cpus, rss, rssCap = 80 * 1024 * 1024 }) {
  if (Number(cpus) > 0 && Number(load1) >= Number(cpus)) return true;
  if (Number(rss) > rssCap) return true;
  return false;
}

export function bangkokDay(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const start = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function classify(summary, role) {
  const s = String(summary || '');
  if (/leave\s+the\s+house\b/i.test(s)) return { kind: 'leave', hold: 'leave-the-house' };
  if (/leave\s+for\s+(the\s+)?airport\b/i.test(s)) return { kind: 'leave', hold: 'leave-for-airport' };
  // "Leave for <place>" and "Leave for <place> — …". The place is not
  // the word airport; those titles are still leave-for-airport holds.
  if (/^leave\s+for\s+[^\s—–-]/i.test(s.trim())) return { kind: 'leave', hold: 'leave-for-airport' };
  if (role === 'tripit' || /\b(flight|airport|boarding)\b/i.test(s)) {
    return { kind: 'travel', hold: null };
  }
  return { kind: 'event', hold: null };
}

// Butter already owns the three feeds. This only chooses which of the
// calendars Google already lists are those three. An ambiguous name is
// skipped rather than merged into the wrong day.
export function chooseCalendars(items) {
  const list = Array.isArray(items) ? items : [];
  const primary = list.find((c) => c && c.primary && c.id);
  const works = list.filter((c) => c && !c.primary && String(c.summary || '').trim() === 'Calendar' && c.id);
  const tripits = list.filter((c) => c && c.id && /tripit/i.test(`${c.summary || ''} ${c.id}`));
  const chosen = [{ id: primary?.id || 'primary', role: 'primary' }];
  const notes = [];
  if (works.length === 1) chosen.push({ id: works[0].id, role: 'work' });
  else if (works.length > 1) notes.push('work-ambiguous');
  if (tripits.length === 1) chosen.push({ id: tripits[0].id, role: 'tripit' });
  else if (tripits.length > 1) notes.push('tripit-ambiguous');
  return { chosen, notes };
}

export function shouldReadIcs(choice, env) {
  if (!env || !env.TRIPIT_ICS_URL) return false;
  if (choice?.chosen?.some((c) => c.role === 'tripit')) return false;
  return true;
}

export function fromGoogle(ev, role) {
  if (!ev || ev.status === 'cancelled') return null;
  const allDay = Boolean(ev.start && ev.start.date && !ev.start.dateTime);
  const startRaw = ev.start?.dateTime || ev.start?.date;
  if (!startRaw) return null;
  const endRaw = ev.end?.dateTime || ev.end?.date || '';
  const start = allDay ? dateOnlyIso(startRaw) : String(startRaw);
  const end = allDay ? (endRaw ? dateOnlyIso(endRaw) : start) : String(endRaw || start);
  if (Number.isNaN(Date.parse(start))) return null;
  const title = clip(ev.summary);
  const cls = classify(title, role);
  return {
    id: String(ev.id || ''),
    title,
    start,
    end: Number.isNaN(Date.parse(end)) ? start : end,
    where: clip(ev.location),
    allDay,
    role,
    kind: cls.kind,
    hold: cls.hold,
  };
}

export function fromIcs(ev) {
  if (!ev || !ev.start) return null;
  const title = clip(ev.summary);
  const cls = classify(title, 'tripit');
  return {
    id: '',
    title,
    start: ev.start,
    end: ev.end || ev.start,
    where: clip(ev.location),
    allDay: Boolean(ev.allDay),
    role: 'tripit',
    kind: cls.kind,
    hold: cls.hold,
  };
}

function clip(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function dateOnlyIso(value) {
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${m[1]}-${m[2]}-${m[3]}T00:00:00+07:00`;
}

export function buildView(items, now = new Date(), horizonDays = 21) {
  const { start, end } = bangkokDay(now);
  const horizon = now.getTime() + horizonDays * 24 * 60 * 60 * 1000;
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    if (!item || !item.start) continue;
    const key = `${item.role}|${item.id}|${item.start}|${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  const byStart = (a, b) => String(a.start).localeCompare(String(b.start));
  const today = unique
    .filter((item) => overlaps(item, start.getTime(), end.getTime()))
    .sort(byStart)
    .slice(0, 24)
    .map(publicItem);
  const travel = unique
    .filter((item) => (item.kind === 'travel' || item.kind === 'leave')
      && Date.parse(item.end || item.start) > now.getTime()
      && Date.parse(item.start) < horizon)
    .sort(byStart)
    .slice(0, 12)
    .map(publicItem);
  return {
    ok: true,
    generatedAt: now.toISOString(),
    tz: TZ,
    today,
    travel,
  };
}

function overlaps(item, dayStart, dayEnd) {
  const s = Date.parse(item.start);
  if (!Number.isFinite(s)) return false;
  let e = Date.parse(item.end || '');
  if (!Number.isFinite(e) || e <= s) e = s + (item.allDay ? 24 * 60 * 60 * 1000 : 60 * 1000);
  return s < dayEnd && e > dayStart;
}

function publicItem(item) {
  return {
    id: item.id || '',
    title: item.title || '—',
    start: item.start,
    end: item.end || item.start,
    where: item.where || '',
    allDay: Boolean(item.allDay),
    kind: item.kind,
    hold: item.hold,
    role: item.role,
  };
}

// A small VEVENT reader for the optional TripIt feed. Unknown zones are
// dropped: a leave hold at the wrong hour is worse than a missing line.
// Floating times are read as Bangkok, which is the desk's clock.
export function parseIcs(text, limit = 40) {
  const unfolded = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '');
  const events = [];
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    if (events.length >= limit) break;
    const body = block.split('END:VEVENT')[0];
    const start = icsWhen(body, 'DTSTART');
    if (!start) continue;
    const end = icsWhen(body, 'DTEND');
    events.push({
      summary: icsText(body, 'SUMMARY'),
      location: icsText(body, 'LOCATION'),
      start: start.iso,
      end: end?.iso || start.iso,
      allDay: start.allDay,
    });
  }
  return events;
}

function icsText(body, name) {
  const m = body.match(new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, 'm'));
  if (!m) return '';
  return m[1]
    .trim()
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function icsWhen(body, name) {
  const m = body.match(new RegExp(`^(${name}(?:;[^:\\n]*)?:)(.*)$`, 'm'));
  if (!m) return null;
  const meta = m[1];
  const value = m[2].trim();
  const tzid = (/TZID=([^;:]+)/.exec(meta) || [])[1] || '';
  if (/^\d{8}$/.test(value)) {
    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00+07:00`;
    return { iso, allDay: true };
  }
  const stamp = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!stamp) return null;
  const [, y, mo, d, h, mi, s, z] = stamp;
  if (z) return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}Z`, allDay: false };
  if (tzid && tzid !== 'Asia/Bangkok') return null;
  return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}+07:00`, allDay: false };
}

export function allowedOrigin(origin, list = DEFAULT_ORIGINS) {
  if (!origin) return false;
  if (list.includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      return true;
    }
  } catch (_) { /* not a browser origin */ }
  return false;
}
