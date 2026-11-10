// Host desk: today's agenda, and the travel still ahead.
//
// Loaded only after this device has chosen NON OS. A guest never imports
// this file. Nothing here is a sample day — if the listener is missing,
// refused, or unreadable, the desk says so and stops.

import { t } from './common.js';
import {
  LS_BASE, LS_TOKEN,
  readDeviceConfig, mayReadAgenda, normaliseAgenda, normaliseBase,
  formatClock, formatTravelWhen,
} from './agenda-model.js';

const REFRESH_MS = 15 * 60 * 1000;
const HOLD_KEY = {
  'leave-the-house': 'agenda_hold_house',
  'leave-for-airport': 'agenda_hold_airport',
};

let wired = false;
let mode = '';
let seq = 0;
let timer = 0;
let lastFetch = 0;
let formOpen = false;
let model = { state: 'unconfigured', today: [], travel: [], checked: '' };

export function startAgenda() {
  if (wired) return;
  const root = document.getElementById('agenda');
  if (!root) return;
  wired = true;
  document.getElementById('agenda-device')?.addEventListener('click', () => {
    if (document.body?.dataset.mode !== 'host') return;
    formOpen = !formOpen;
    paint();
  });
  document.getElementById('agenda-form')?.addEventListener('submit', onSubmit);
  try {
    new MutationObserver(() => sync('attr')).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-mode', 'data-lang'],
    });
  } catch (_) { /* the desk still paints on the first call */ }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync('visible');
  });
  sync('start');
}

function sync(reason) {
  const next = document.body?.dataset.mode || '';
  const entered = next === 'host' && mode !== 'host';
  mode = next;
  if (next !== 'host') {
    seq += 1;
    clearTimeout(timer);
    wipe();
    return;
  }
  const config = readDeviceConfig(safeStorage(), globalThis.NON_AGENDA);
  if (!mayReadAgenda('host', config)) {
    model = { state: 'unconfigured', today: [], travel: [], checked: '' };
    formOpen = true;
    paint();
    return;
  }
  const want = entered || reason === 'start' || reason === 'submit'
    || (reason === 'visible' && Date.now() - lastFetch > REFRESH_MS);
  if (want) {
    // Don't claim the device is unconfigured while a reading is in flight.
    if (model.state !== 'ready' && model.state !== 'empty') {
      const state = document.getElementById('agenda-state');
      if (state) { state.hidden = true; state.textContent = ''; }
    }
    fetchAgenda(config);
  } else paint();
}

function safeStorage() {
  try { return localStorage; }
  catch (_) { return null; }
}

function onSubmit(event) {
  event.preventDefault();
  if (document.body?.dataset.mode !== 'host') return;
  const base = normaliseBase(document.getElementById('agenda-base')?.value || '');
  const typed = String(document.getElementById('agenda-token')?.value || '').trim();
  const prev = readDeviceConfig(safeStorage(), null);
  const token = typed || prev.token;
  if (!base || !token) {
    model = { state: 'unconfigured', today: [], travel: [], checked: '' };
    formOpen = true;
    paint();
    return;
  }
  try {
    localStorage.setItem(LS_BASE, base);
    if (typed) localStorage.setItem(LS_TOKEN, typed);
  } catch (_) { /* the choice cannot stay on this device */ }
  const tokenInput = document.getElementById('agenda-token');
  if (tokenInput) tokenInput.value = '';
  formOpen = false;
  sync('submit');
}

async function fetchAgenda(config) {
  const my = ++seq;
  try {
    const res = await fetch(`${config.base}/agenda`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${config.token}`,
      },
      cache: 'no-store',
      mode: 'cors',
    });
    if (my !== seq) return;
    if (!res.ok) throw new Error('status');
    const json = await res.json();
    if (my !== seq) return;
    const next = normaliseAgenda(json);
    if (next.state === 'unavailable') throw new Error('shape');
    model = next;
    lastFetch = Date.now();
  } catch (_) {
    if (my !== seq) return;
    // A day we already read stays on the desk, with the time it was read.
    // A day we never read does not get replaced with an example.
    if (model.state !== 'ready' && model.state !== 'empty') {
      model = { state: 'unavailable', today: [], travel: [], checked: '' };
    }
  }
  if (document.body?.dataset.mode !== 'host') {
    wipe();
    return;
  }
  paint();
  arm();
}

function arm() {
  clearTimeout(timer);
  timer = setTimeout(() => sync('visible'), REFRESH_MS);
}

function wipe() {
  model = { state: 'unconfigured', today: [], travel: [], checked: '' };
  formOpen = false;
  const root = document.getElementById('agenda');
  if (root) root.setAttribute('aria-hidden', 'true');
  const state = document.getElementById('agenda-state');
  if (state) { state.textContent = ''; state.hidden = true; }
  const meta = document.getElementById('agenda-meta');
  if (meta) meta.textContent = '';
  const lists = document.getElementById('agenda-lists');
  if (lists) lists.replaceChildren();
  const form = document.getElementById('agenda-form');
  if (form) form.hidden = true;
  const tokenInput = document.getElementById('agenda-token');
  if (tokenInput) tokenInput.value = '';
}

function paint() {
  const root = document.getElementById('agenda');
  if (!root || document.body?.dataset.mode !== 'host') return;
  root.setAttribute('aria-hidden', 'false');
  const state = document.getElementById('agenda-state');
  const meta = document.getElementById('agenda-meta');
  const form = document.getElementById('agenda-form');
  const lists = document.getElementById('agenda-lists');
  const baseInput = document.getElementById('agenda-base');
  const tokenInput = document.getElementById('agenda-token');
  if (baseInput) baseInput.setAttribute('aria-label', t('agenda_origin'));
  if (tokenInput) {
    tokenInput.setAttribute('aria-label', t('agenda_token'));
    tokenInput.placeholder = t('agenda_token');
  }
  if (form) form.hidden = !formOpen;
  if (formOpen && baseInput && document.activeElement !== baseInput && !baseInput.value) {
    const config = readDeviceConfig(safeStorage(), globalThis.NON_AGENDA);
    if (config.base) baseInput.value = config.base;
  }
  if (meta) meta.textContent = model.checked ? `${t('agenda_checked')} ${model.checked}` : '';

  if (model.state === 'unconfigured') {
    if (state) { state.hidden = false; state.textContent = t('agenda_unconfigured'); }
    if (lists) lists.replaceChildren();
    return;
  }
  if (model.state === 'unavailable') {
    if (state) { state.hidden = false; state.textContent = t('agenda_unavailable'); }
    if (lists) lists.replaceChildren();
    return;
  }
  if (model.state === 'empty') {
    if (state) { state.hidden = false; state.textContent = t('agenda_empty'); }
    if (lists) lists.replaceChildren();
    return;
  }

  const today = model.today || [];
  const travel = model.travel || [];
  if (state) {
    if (!today.length && travel.length) {
      state.hidden = false;
      state.textContent = t('agenda_clear');
    } else {
      state.hidden = true;
      state.textContent = '';
    }
  }
  if (!lists) return;
  lists.replaceChildren();
  fill(lists, today, false);
  if (travel.length) {
    const kicker = document.createElement('h3');
    kicker.className = 'agenda-kicker';
    kicker.textContent = t('agenda_travel');
    lists.appendChild(kicker);
    fill(lists, travel, true);
  }
}

function fill(parent, items, travel) {
  const ol = document.createElement('ol');
  ol.className = 'agenda-rows';
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'agenda-row';
    const when = document.createElement('span');
    when.className = 'agenda-when';
    when.textContent = travel
      ? formatTravelWhen(item.start, item.allDay)
      : (item.allDay ? t('agenda_all_day') : formatClock(item.start));
    const body = document.createElement('span');
    body.className = 'agenda-what';
    const title = document.createElement('span');
    title.className = 'agenda-title';
    title.textContent = item.title;
    body.appendChild(title);
    if (item.hold && HOLD_KEY[item.hold]) {
      const label = t(HOLD_KEY[item.hold]);
      if (label.toLowerCase() !== item.title.toLowerCase()) {
        const hold = document.createElement('span');
        hold.className = 'agenda-hold';
        hold.textContent = label;
        body.appendChild(hold);
      }
    } else if (item.where && item.where !== item.title) {
      const where = document.createElement('span');
      where.className = 'agenda-where';
      where.textContent = item.where;
      body.appendChild(where);
    }
    li.append(when, body);
    ol.appendChild(li);
  }
  parent.appendChild(ol);
}
