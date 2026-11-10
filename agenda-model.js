// The shape of a day, with none of the day in it.
//
// The desk renders whatever the private listener last said. This module
// only accepts that shape. A missing field, a failed fetch, or a body
// that is not a successful reading becomes an empty unavailable state.
// It never invents a block to fill the gap.

export const LS_BASE = 'nonarkara.agenda.base';
export const LS_TOKEN = 'nonarkara.agenda.token';
export const TZ = 'Asia/Bangkok';

const HOLDS = new Set(['leave-the-house', 'leave-for-airport']);
const KINDS = new Set(['event', 'travel', 'leave']);

export function normaliseBase(raw) {
  let url;
  try { url = new URL(String(raw || '').trim()); }
  catch (_) { return ''; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
  if (url.username || url.password) return '';
  url.hash = '';
  url.search = '';
  if (url.pathname === '/agenda' || url.pathname === '/agenda/') url.pathname = '';
  let out = url.toString();
  if (out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

export function readDeviceConfig(storage, runtime) {
  let base = '';
  let token = '';
  try {
    base = storage?.getItem(LS_BASE) || '';
    token = storage?.getItem(LS_TOKEN) || '';
  } catch (_) { /* this device has no storage */ }
  if (!base && runtime && typeof runtime.base === 'string') base = runtime.base;
  if (!token && runtime && typeof runtime.token === 'string') token = runtime.token;
  base = normaliseBase(base);
  token = String(token || '').replace(/[\r\n]/g, '').trim();
  if (token.length > 512) token = '';
  return { base, token, configured: Boolean(base && token) };
}

// The pavilion's device check is the door: host or guest, remembered on
// the device. The agenda is host-only, and it still needs an origin and
// a token that were saved on that same device. Either missing, no fetch.
export function mayReadAgenda(mode, config) {
  return mode === 'host' && Boolean(config && config.configured);
}

export function normaliseAgenda(json) {
  const blank = { state: 'unavailable', today: [], travel: [], checked: '' };
  if (!json || json.ok !== true) return blank;
  if (!Array.isArray(json.today) || !Array.isArray(json.travel)) return blank;
  const today = json.today.slice(0, 24).map(cleanItem).filter(Boolean);
  const travel = json.travel.slice(0, 12).map(cleanItem).filter(Boolean);
  const checked = clock(json.generatedAt);
  if (!today.length && !travel.length) return { state: 'empty', today, travel, checked };
  return { state: 'ready', today, travel, checked };
}

function cleanItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const start = typeof raw.start === 'string' ? raw.start : '';
  if (!start || Number.isNaN(Date.parse(start))) return null;
  const title = String(raw.title || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const where = String(raw.where || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const end = typeof raw.end === 'string' && !Number.isNaN(Date.parse(raw.end)) ? raw.end : '';
  return {
    title: title || '—',
    start,
    end,
    where,
    allDay: raw.allDay === true,
    kind: KINDS.has(raw.kind) ? raw.kind : 'event',
    hold: HOLDS.has(raw.hold) ? raw.hold : '',
  };
}

export function formatClock(iso, timeZone = TZ) {
  return clock(iso, timeZone);
}

function clock(iso, timeZone = TZ) {
  if (typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

export function formatTravelWhen(iso, allDay, timeZone = TZ) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone, day: '2-digit', month: 'short',
  }).format(d).replace(/\s+/g, ' ').toUpperCase();
  if (allDay) return day;
  const hm = clock(iso, timeZone);
  return hm ? `${day} · ${hm}` : day;
}
