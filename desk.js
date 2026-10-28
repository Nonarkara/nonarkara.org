// ════════════════════════════════════════════════════════
// THE DESK — the NON OS, as a document
// ════════════════════════════════════════════════════════
//
// This module is the desk. It imports the words, the data and the theme,
// and it imports NOTHING from the room — no three.js, no pavilion, no
// yard. That is deliberate. The desk is a document, and a document should
// not wait for a 3D world to be assembled before it can be read.
//
// It is also why this file exists as its own entry point: index.html
// loads it beside app.js, so the desk is painted while the room's
// megabyte of JavaScript is still downloading.
//
// What the desk needs from the room, it asks for by event. The room
// listens for 'desk:open' and opens the right thing. A document and a
// room that share a page should not have to share a module.

import { t, setLang, CITIES, PROJECTS, OK_CODE } from './common.js';
import { IOC, IOC_COUNT } from './ioc.js';

// ── A desk named in the URL opens NOW ──────────────────────────
//
// The desk is a document. It does not need the pavilion's 3D world to be
// built before it can be read, and the world takes seconds to assemble.
// Without this, a reader who asked for /?view=plan stares at the sign
// until the whole room has been constructed — and any instrument that
// measures the page in the first few seconds measures the sign rather
// than the desk.
//
// That decision now lives in boot.js, which imports nothing: it lands
// before this module's own dependencies have been fetched. The door
// module in app.js reaches the same conclusion later, from the same URL,
// and sets the view again. This is the same decision, taken early.

// ── The desk's nodes ──────────────────────────────────────
export const planEl  = document.getElementById('plan');
export const planProjEl = document.getElementById('plan-projects');
export const planPersEl = document.getElementById('plan-personal');
export const planPrivEl = document.getElementById('plan-private');
export const planCityEl = document.getElementById('plan-cities');
export const planTimeEl = document.getElementById('plan-time');
export const planDateEl = document.getElementById('plan-date');

// The clock's formats are built here too: the desk shows the time the
// moment it opens, and a clock that starts a second later is a clock that
// is not on the first screen when the reader arrives.
const PLAN_TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok', hour12: false,
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const PLAN_DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
});
const CITY_FMT = new Map();

// ── The IOC wall's cells ──────────────────────────────────
// Twenty systems, one photograph each. A grid of links in the
// document, not objects in the room — so it is built here, with the desk.
// The IOC wall's cells — twenty systems, one photograph each — are a grid
// of links in the document, not objects in the room. They are built here
// for the same reason the desk is.
const iocGrid = document.getElementById('ioc-grid');
const iocCount = document.getElementById('ioc-count');
if (iocGrid) {
  const frag = document.createDocumentFragment();
  for (const s of IOC) {
    const a = document.createElement('a');
    a.className = 'ioc-cell';
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const img = document.createElement('img');
    img.src = s.shot;
    img.alt = s.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    const cap = document.createElement('figcaption');
    const code = document.createElement('span');
    code.className = 'ioc-code';
    code.textContent = s.code;
    const name = document.createElement('span');
    name.className = 'ioc-name';
    name.textContent = s.title;
    cap.append(code, name);
    a.append(img, cap);
    frag.appendChild(a);
  }
  iocGrid.appendChild(frag);
  if (iocCount) iocCount.textContent = `${IOC_COUNT} SYSTEMS`;
}

// ── Paint the desk ────────────────────────────────────────
// The same calls the room makes when it is ready; running them here
// means the desk is standing before the room is.
// Paint the desk. Every one of these is a function declaration further
// down, so they are callable here; what they needed from the module — the
// project list, the city list, the translations, the clock formats — is
// already defined above this point.
try { renderPlan(); } catch (_) {}
try { tickPlanClock(); } catch (_) {}
try { paintBrief(); } catch (_) {}
try { renderWorldMap(); } catch (_) {}
try { paintCouncil(); } catch (_) {}
// The room asks this flag before it re-renders the desk on a language
// change. The desk is ready as soon as it has painted itself.
window.__planReady = true;

export function renderPlan() { try { _renderPlanBody(); } catch (e) { /* don't cascade */ } }
function _renderPlanBody() {
  if (!planProjEl || !planPersEl) return;

  // Append live counts to section labels — only on render, so language
  // toggles refresh them too.
  const labelWithCount = (sel, key, n) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.textContent = `${t(key)} · ${n}`;
  };
  labelWithCount('[data-i18n="plan_projects"]', 'plan_projects', PROJECTS.length);
  labelWithCount('[data-i18n="plan_world"]',    'plan_world',    CITIES.length);

  // Projects → tap target grid
  planProjEl.innerHTML = PROJECTS.map(p => `
    <button class="plan-cell" data-code="${p.code}" aria-label="Open ${p.code} · ${p.title}">
      <span class="dot"></span>
      <span class="code">${p.code}</span>
      <span class="title">${p.title}</span>
    </button>
  `).join('');
  planProjEl.querySelectorAll('.plan-cell').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PROJECTS.find(x => x.code === btn.dataset.code);
      if (p) askRoom({ kind: 'url', code: p.code, title: p.title, url: p.url });
    });
  });

  // Personal — identity surfaces + portrait gallery.
  const personal = [
    { glyph: '▢',  key: 'bookshelf',  title: t('cv_title_short'),  meta: 'CV',         click: () => askRoom({ kind: 'furniture', id: 'bookshelf' }) },
    { glyph: '◯',  key: 'pedestal',   title: t('li_title_short'),  meta: 'LINKEDIN',   click: () => askRoom({ kind: 'furniture', id: 'pedestal' }) },
    { glyph: '☕', key: 'coffee',     title: t('co_title_short'),  meta: 'CONTACT',    click: () => askRoom({ kind: 'furniture', id: 'coffee' }) },
    { glyph: '◈',  key: 'portraits',  title: 'portraits · share hi-res', meta: 'PHOTOS', click: () => askRoom({ kind: 'portraits' }) },
    { glyph: '·',  key: 'cup',        title: t('sabai_short'),     meta: '· · ·',      click: () => askRoom({ kind: 'furniture', id: 'cup' }) },
  ];
  planPersEl.innerHTML = personal.map((row, i) => `
    <button class="plan-row" data-i="${i}">
      <span class="glyph">${row.glyph}</span>
      <span class="title">${row.title}</span>
      <span class="meta">${row.meta}</span>
    </button>
  `).join('');
  planPersEl.querySelectorAll('.plan-row').forEach((btn, i) => {
    btn.addEventListener('click', personal[i].click);
  });

  // (PRIVATE/TKC section removed — was leaking the password publicly.)
  // (WORLD · TIME list replaced by SVG world map — see renderWorldMap)

  // Status dots (paint from cached data if present, else dim)
  paintPlanStatus(window.__lastStatusData || null);
}

export function tickPlanClock() { try { _tickPlanClockBody(); } catch (_) {} }
// Intl.DateTimeFormat is expensive to construct; the clock built three
// of them every second, forever. Build each shape once — at the top of
// the module, with the desk, because the desk's clock is on the first
// screen the moment the desk opens.
function cityFmt(tz) {
  let f = CITY_FMT.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
    CITY_FMT.set(tz, f);
  }
  return f;
}
function _tickPlanClockBody() {
  if (!planTimeEl) return;
  const now = new Date();
  const fmt = PLAN_TIME_FMT.format(now);
  const dfmt = PLAN_DATE_FMT.format(now).toUpperCase();
  if (planTimeEl) planTimeEl.textContent = fmt;
  if (planDateEl) planDateEl.textContent = `${dfmt} · BANGKOK · GMT+7`;
  // World map labeled cities — refresh local time text below each
  // labeled dot once a minute (the SVG label text content swap is
  // cheap, runs every tick).
  const svg = document.getElementById('plan-worldmap');
  if (svg) {
    svg.querySelectorAll('text.city-time').forEach(t => {
      const tz = t.dataset.tz;
      if (!tz) return;
      try {
        t.textContent = cityFmt(tz).format(now);
      } catch { /* bad tz */ }
    });
  }
}
setInterval(() => { if (!document.hidden) tickPlanClock(); }, 1000);

export function paintBrief() {
  try {
    const b = window.__brief || {};
    if (b.fx) {
      const fx = b.fx;
      const fxV = document.getElementById('brief-fx-val');
      const fxS = document.getElementById('brief-fx-sub');
      if (fxV) fxV.textContent = fx.thb;
      if (fxS) fxS.textContent = `sgd ${fx.sgdThb || '—'}`;
      const sgV = document.getElementById('brief-sgd-val');
      const sgS = document.getElementById('brief-sgd-sub');
      if (sgV) sgV.textContent = fx.sgdThb || '—';
      if (sgS) sgS.textContent = `eur ${fx.eurThb} · gbp ${fx.gbpThb}`;
    }
    const c = b.crypto && b.crypto.btc;
    if (c) {
      const v = document.getElementById('brief-btc-val');
      const s = document.getElementById('brief-btc-sub');
      if (v) v.textContent = c.usd >= 1000
        ? c.usd.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : c.usd.toFixed(2);
      if (s) {
        const up = c.change >= 0;
        s.innerHTML = `<span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(c.change).toFixed(2)} %</span>`;
      }
    }
    if (b.set) {
      const v = document.getElementById('brief-set-val');
      const s = document.getElementById('brief-set-sub');
      if (v) v.textContent = b.set.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
      if (s) {
        const up = b.set.change >= 0;
        s.innerHTML = `<span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(b.set.change).toFixed(2)} %</span>`;
      }
    }
    if (b.wx) {
      const w = b.wx;
      const v = document.getElementById('brief-wx-temp');
      const s = document.getElementById('brief-wx-sub');
      if (v) v.textContent = `${w.temp} °C`;
      if (s) s.textContent = `${w.desc} · humidity ${w.humidity} % · wind ${w.wind} km/h`;
    }
    // Stock market cells — Dow, NASDAQ, NVDA, TSLA, GOOGL
    if (b.stocks) {
      const fmtStock = (key, valId, subId) => {
        const s = b.stocks[key];
        if (!s) return;
        const v = document.getElementById(valId);
        const sub = document.getElementById(subId);
        const price = s.price >= 1000
          ? s.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
          : s.price.toFixed(2);
        if (v) v.textContent = price;
        if (sub) {
          const up = s.change >= 0;
          sub.innerHTML = `<span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(s.change).toFixed(2)} %</span>`;
        }
      };
      fmtStock('dji',    'brief-dji-val',    'brief-dji-sub');
      fmtStock('nasdaq', 'brief-nasdaq-val',  'brief-nasdaq-sub');
      fmtStock('nvda',   'brief-nvda-val',    'brief-nvda-sub');
      fmtStock('tsla',   'brief-tsla-val',    'brief-tsla-sub');
      fmtStock('googl',  'brief-googl-val',   'brief-googl-sub');
      fmtStock('gold',   'brief-gold-val',    'brief-gold-sub');
      fmtStock('brent',  'brief-brent-val',   'brief-brent-sub');
      fmtStock('ptt',    'brief-ptt-val',     'brief-ptt-sub');
    }
    if (b.aqi) {
      const a = b.aqi;
      const v = document.getElementById('brief-aqi-val');
      const s = document.getElementById('brief-aqi-sub');
      const cell = document.getElementById('brief-aqi-cell');
      if (v) v.textContent = a.aqi ?? (a.pm25 != null ? a.pm25.toFixed(1) : '—');
      if (s) {
        const bkkStr = a.pm25 != null ? `bkk ${a.pm25.toFixed(1)} µg/m³` : '';
        const phuketStr = a.pm25_phuket != null ? ` · phuket ${a.pm25_phuket.toFixed(1)}` : '';
        s.textContent = a.pm25 != null
          ? `${a.level} · ${bkkStr}${phuketStr}`
          : a.level;
      }
      // Colour-code the AQI value by level — uses CSS custom property
      // so it respects light/dark theme automatically.
      if (v && cell) {
        const color = a.aqi == null ? ''
          : a.aqi <= 50  ? 'var(--fg)'           // good — neutral
          : a.aqi <= 100 ? 'var(--amber)'         // moderate — amber
          : a.aqi <= 150 ? 'var(--amber)'         // sensitive
          : '#c44';                               // unhealthy+
        v.style.color = color;
        if (a.aqi > 150) cell.style.borderColor = 'rgba(204,68,68,0.4)';
        else cell.style.borderColor = '';
      }
    }
  } catch (_) {}
}

export function paintCouncil() {
  try {
    const data = (window.__brief && window.__brief.council) || null;
    const row = document.getElementById('plan-council');
    if (!row) return;
    if (!data) {
      row.dataset.status = 'unknown';
      document.getElementById('council-status').textContent = '— ';
      document.getElementById('council-meta').textContent = 'checking';
      return;
    }
    const s = data.status || 'unknown';
    row.dataset.status = s;
    const statusEl = document.getElementById('council-status');
    const metaEl = document.getElementById('council-meta');
    statusEl.textContent =
      s === 'healthy'  ? 'HEALTHY' :
      s === 'degraded' ? `DEGRADED · ${data.count}` :
      s === 'down'     ? `DOWN · ${data.count} STRIKES` :
                         '—';
    if (data.ts) {
      const age = Math.max(0, Math.floor((Date.now() - new Date(data.ts).getTime()) / 60000));
      const ago = age < 1 ? 'just now'
                : age < 60 ? age + 'm ago'
                : Math.floor(age / 60) + 'h ago';
      metaEl.textContent = 'last check ' + ago;
    } else {
      metaEl.textContent = '';
    }
  } catch (_) {}
}

export function renderWorldMap() {
  const svg = document.getElementById('plan-worldmap');
  if (!svg) return;
  // Braun "GMT WELTZEIT" travel-clock face, after Dieter Rams.
  // No continent decoration — pure timezone grid: 24 hairline
  // meridians at 15° each, equator + tropic references, hour
  // offsets across the top, cities placed by lat/lon as small
  // dots with their abbreviated names. Bangkok = home in amber.

  // 25 vertical lines (-12h … +12h), every 15° of longitude
  const meridians = [];
  for (let h = -12; h <= 12; h++) {
    const x = h * 15;
    const cls = (h === 0) ? 'meridian prime' : 'meridian';
    meridians.push(`<line class="${cls}" x1="${x}" y1="-72" x2="${x}" y2="72"/>`);
  }

  // Equator + soft tropic reference lines
  const guides = `
    <line class="equator"   x1="-180" y1="0"   x2="180" y2="0"/>
    <line class="reference" x1="-180" y1="-23" x2="180" y2="-23"/>
    <line class="reference" x1="-180" y1="23"  x2="180" y2="23"/>
  `;

  // Hour offset numbers across the top edge — every 3h, plus the meridian
  const hourLabels = [];
  for (let h = -12; h <= 12; h += 3) {
    if (h === 0) { hourLabels.push(`<text class="tz-label gmt" x="0" y="-78" text-anchor="middle">GMT</text>`); continue; }
    const x = h * 15;
    const lbl = h > 0 ? `+${h}` : `${h}`;
    hourLabels.push(`<text class="tz-label" x="${x}" y="-78" text-anchor="middle">${lbl}</text>`);
  }

  // Cities — dot + label + live time. Per-city offsets nudge labels
  // out of overlap zones (Tokyo/Shanghai/Bangkok/Sydney/Honiara all
  // crowd the eastern hemisphere; offsets give each one breathing
  // room without lying about their actual lat/lon dot positions).
  const labeled = ['Bangkok','London','Tokyo','New York','Sydney','Honiara','Shanghai','Dubai'];
  const offsets = {
    // name → { dx, dy, anchor }   in viewBox units
    'Bangkok':  { dx:  3, dy:  2, anchor: 'start' },     // east-down so it doesn't crash into Shanghai
    'London':   { dx:  0, dy: -4, anchor: 'middle' },    // straight up at GMT
    'Tokyo':    { dx:  3, dy: -4, anchor: 'start' },     // up-east
    'Shanghai': { dx: -3, dy: -4, anchor: 'end' },       // up-west of dot
    'New York': { dx:  3, dy: -4, anchor: 'start' },     // up-east
    'Sydney':   { dx:  3, dy:  9, anchor: 'start' },     // below
    'Honiara':  { dx: -3, dy:  9, anchor: 'end' },       // below-west
    'Dubai':    { dx: -3, dy: -4, anchor: 'end' },       // up-west
  };
  const dotSvg = CITIES.map(c => {
    const x = c.lon, y = -c.lat;
    const home = c.home ? ' home' : '';
    const r = c.home ? 2.2 : 1.4;
    const showLabel = c.home || labeled.includes(c.name);
    const o = offsets[c.name] || { dx: 3, dy: -4, anchor: 'start' };
    const labelEls = showLabel ? `
      <text class="city-label${home}" x="${x + o.dx}" y="${y + o.dy}" text-anchor="${o.anchor}">${c.name.toLowerCase()}</text>
      <text class="city-label city-time" data-tz="${c.tz}" x="${x + o.dx}" y="${y + o.dy + 7}" text-anchor="${o.anchor}">--:--</text>
    ` : '';
    return `
      <g class="city-grp" data-name="${c.name}">
        <circle class="city${home}" cx="${x}" cy="${y}" r="${r}"/>
        ${labelEls}
      </g>
    `;
  }).join('');

  // Bottom strip — Braun homage caption
  const homage = `<text class="tz-label gmt" x="-178" y="83" text-anchor="start">GMT · WELTZEIT</text>
                  <text class="tz-label" x="178" y="83" text-anchor="end">15° per hour</text>`;

  svg.innerHTML = guides + meridians.join('') + hourLabels.join('') + dotSvg + homage;

  svg.querySelectorAll('.city-grp').forEach(g => {
    g.style.cursor = 'pointer';
    g.addEventListener('click', () => {
      const c = CITIES.find(x => x.name === g.dataset.name);
      if (c) openCityModal(c);
    });
  });
}

export function paintPlanStatus(data) { try { _paintPlanStatusBody(data); } catch (_) {} }
function _paintPlanStatusBody(data) {
  if (!planProjEl) return;
  // Telemetry ribbon stats — derived from the snapshot.
  const ribLast   = document.getElementById('ribbon-last');
  const ribMs     = document.getElementById('ribbon-ms');
  if (data?.ts && ribLast) {
    const age = Math.max(0, Math.floor((Date.now() - new Date(data.ts).getTime()) / 1000));
    ribLast.textContent = age < 60 ? age + 's' : Math.floor(age / 60) + 'm';
  }
  if (data?.sites && ribMs) {
    const ms = Object.values(data.sites).map(s => s.ms).filter(Number.isFinite).sort((a, b) => a - b);
    const median = ms.length ? ms[Math.floor(ms.length / 2)] : 0;
    ribMs.textContent = `${median} ms`;
  }
  let okCount = 0, total = 0;
  planProjEl.querySelectorAll('.plan-cell').forEach(cell => {
    const code = cell.dataset.code;
    const p = PROJECTS.find(x => x.code === code);
    if (!p) return;
    const entry = data?.sites?.[p.dom];
    if (!entry) {
      cell.removeAttribute('data-status');
      return;
    }
    total++;
    const ok = OK_CODE(entry.code);
    cell.dataset.status = ok ? 'ok' : 'fail';
    if (ok) okCount++;
  });
  // The summary line and the 30-day uptime belong to the fleet console —
  // it knows which stations are parked, and counting a closed platform as
  // a failure would make the board lie.
}

// ── Asking the room to open something ─────────────────────
// The desk knows what was tapped. The room knows how to open it.
function askRoom(detail) {
  try { document.dispatchEvent(new CustomEvent('desk:open', { detail })); }
  catch (_) { /* no room listening yet — the click does nothing */ }
}
