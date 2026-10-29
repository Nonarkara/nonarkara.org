/**
 * SUN & SHADOW — the instrument that says where the sun is.
 *
 * TWO INSTRUMENTS, ONE CLOCK.
 *
 *   The chart   the sun's path across a chosen day, seen from the
 *               middle of the estate: azimuth around the rim, altitude
 *               from the rim (0°) to the centre (90°). The part of the
 *               path above the horizon is solid; the part below is
 *               dashed, because it is the sun's absence.
 *   The dial    a twenty-four hour face with the length of the day
 *               drawn on its rim. Drag it and the sun moves over the
 *               estate. The shadows follow, because they are the same
 *               sun.
 *
 * NOTHING HERE IS AUTHORED. Every number — the altitude, the azimuth,
 * the sunrise, the length of the day — is computed from the site's own
 * coordinates by the same astronomy.js the sky and the palette already
 * use, so the chart cannot disagree with the room it sits beside. A
 * chart that says the sun sets at 18:04 while the room shows noon is
 * worse than no chart.
 */

import {
  cardinal, solarEvents, sunHorizontal,
} from './astronomy.js';

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

/**
 * The clock the whole site already speaks.
 *
 * The compass in the room prints sunrise and sunset with the
 * browser's own clock, so the study must print them the same way: a
 * visitor in Bangkok reads ICT, a visitor in Europe reads their own
 * evening, and the two are never quietly different. The day being
 * charted is the visitor's calendar day, sampled from their midnight
 * to their midnight.
 *
 * (The site's astronomy keeps a mean-solar day for deciding which day
 * an event belongs to — that is a question about the sun's own day at
 * that longitude, and it is the right question for finding sunrise.
 * It is not the question a person asks when they want to know what
 * time the sun rises on their wall clock.)
 */
const dayStart = (day) => new Date(day.year, day.month, day.day, 0, 0, 0, 0);

/** The instant of a clock time on the visitor's calendar day. */
export const instantAt = (day, minutes) =>
  new Date(dayStart(day).getTime() + minutes * 60000);

/** The visitor's calendar day, as the date picker's own numbers. */
export const today = (now = new Date()) => ({
  year: now.getFullYear(),
  month: now.getMonth(),
  day: now.getDate(),
});

/** The visitor's minutes past their own midnight. */
export const nowMinutes = (now = new Date()) =>
  now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

/**
 * The sun's path across one day, sampled every `stepMinutes`.
 *
 * Each sample is the sun at a real instant — the visitor's own clock,
 * not a fictional one — so the curve is the sun's path on that day at
 * that place, not the path it would take somewhere else.
 */
export function sunPath(day, site, stepMinutes = 10) {
  const start = dayStart(day).getTime();
  const points = [];
  for (let minutes = 0; minutes < 1440; minutes += stepMinutes) {
    const instant = new Date(start + minutes * 60000);
    const { alt, az } = sunHorizontal(instant, site.lat, site.lon);
    points.push({ minutes, alt, az, lit: alt > 0 });
  }
  return points;
}

/** Sunrise, sunset and the length of the day, in the visitor's minutes. */
export function dayEvents(day, site) {
  const noon = instantAt(day, 720);
  const events = solarEvents(noon, site.lat, site.lon);
  const riseDate = events.sunrise?.date || null;
  const setDate = events.sunset?.date || null;
  const clockMinutes = (d) => (d ? d.getHours() * 60 + d.getMinutes() : null);
  // The length of the day is measured between two INSTANTS, never
  // between two clock readings: when the visitor's clock is far from
  // the sun's, sunrise and sunset fall on different clock-days, and
  // subtracting the readings would report a day of minus twelve hours.
  const dayLength = riseDate && setDate ? (setDate - riseDate) / 60000 : 0;
  const noonDate = riseDate && setDate
    ? new Date((riseDate.getTime() + setDate.getTime()) / 2)
    : null;
  return {
    sunrise: clockMinutes(riseDate),
    sunset: clockMinutes(setDate),
    solarNoon: noonDate ? clockMinutes(noonDate) : 720,
    solarNoonInstant: noonDate,
    dayLength,
    riseAz: events.sunrise ? events.sunrise.az : null,
    setAz: events.sunset ? events.sunset.az : null,
    polarDay: events.polarDay,
    polarNight: events.polarNight,
  };
}

/** Local clock time, as "06:42". */
export const clock = (minutes) => {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—';
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** The day's own date, as "29 OCT 2026". */
export const dateLabel = (day) =>
  `${String(day.day).padStart(2, '0')} ${MONTHS[day.month]} ${day.year}`;

/** A hairline theme read from the page, so the chart follows the theme. */
function theme() {
  const cs = getComputedStyle(document.documentElement);
  const pick = (name, fallback) => (cs.getPropertyValue(name) || '').trim() || fallback;
  return {
    fg: pick('--fg', '#f5f5f0'),
    amber: pick('--amber', '#f59e0b'),
    dim: pick('--dim', 'rgba(245,245,240,0.35)'),
    line: pick('--line', 'rgba(245,245,240,0.55)'),
    bg: pick('--bg', '#000000'),
  };
}

/** A canvas that is crisp on the screen it is drawn on. */
function fitCanvas(canvas) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  if (!w || !h) return null;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

const mono = (size, weight = 500) =>
  `${weight} ${size}px "JetBrains Mono", ui-monospace, monospace`;

/**
 * THE CHART — the sun's path across the day.
 *
 * Azimuth runs clockwise from north around the rim; altitude runs from
 * the rim to the centre. This is the standard sun-path diagram, and it
 * is drawn to be read: the horizon is a firm circle, the altitude
 * rings are hairlines, and the sun is the only filled thing on it.
 */
export function drawChart(canvas, path, current, events, colors = theme()) {
  const fit = fitCanvas(canvas);
  if (!fit) return;
  const { ctx, w, h } = fit;
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) / 2 - Math.max(26, Math.min(w, h) * 0.09);
  if (R <= 10) return;

  ctx.save();
  ctx.translate(cx, cy);

  // The horizon, and the altitude rings inside it.
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = colors.dim;
  ctx.beginPath();
  ctx.arc(0, 0, R * (1 - 30 / 90), 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, R * (1 - 60 / 90), 0, TAU);
  ctx.stroke();

  // The cardinal points. The compass is the site's, so it is the true one.
  ctx.fillStyle = colors.dim;
  ctx.font = mono(Math.max(9, Math.min(w, h) * 0.045));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, az] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
    const t = (az - 90) * D2R;
    ctx.fillText(label, Math.cos(t) * (R + 12), Math.sin(t) * (R + 12));
  }

  // The path: solid where the sun is up, dashed where it is not.
  //
  // The part below the horizon is drawn ALONG THE RIM, not straight
  // across the middle. A point below the horizon has no altitude to
  // show, so it sits on the rim — and joining those points with
  // straight lines would draw a chord across the chart, which reads as
  // a path in the sky when it is the absence of one. The sun's absence
  // belongs on the horizon, under the ground.
  const point = (p) => {
    const t = (p.az - 90) * D2R;
    const r = R * (1 - Math.max(0, Math.min(90, p.alt)) / 90);
    return [Math.cos(t) * r, Math.sin(t) * r, t];
  };
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  // Above the horizon: the real path.
  ctx.beginPath();
  let started = false;
  for (const p of path) {
    if (!p.lit) { started = false; continue; }
    const [x, y] = point(p);
    if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = colors.amber;
  ctx.setLineDash([]);
  ctx.stroke();

  // Below the horizon: the rim itself, dashed, one arc at a time.
  ctx.strokeStyle = colors.dim;
  ctx.setLineDash([3, 4]);
  for (let i = 1; i < path.length; i++) {
    if (path[i].lit || path[i - 1].lit) continue;
    const a = (path[i - 1].az - 90) * D2R;
    const b = (path[i].az - 90) * D2R;
    ctx.beginPath();
    // The short way round, so the arc follows the rim rather than
    // sweeping the long way across the whole chart.
    let delta = b - a;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    ctx.arc(0, 0, R, a, a + delta, delta < 0);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Sunrise and sunset, marked where the path meets the horizon.
  for (const [minutes, label] of [[events.sunrise, 'RISE'], [events.sunset, 'SET']]) {
    if (minutes === null) continue;
    let best = path[0];
    for (const p of path) {
      if (Math.abs(p.minutes - minutes) < Math.abs(best.minutes - minutes)) best = p;
    }
    const [x, y] = point(best);
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, TAU);
    ctx.fill();
    ctx.font = mono(Math.max(8, Math.min(w, h) * 0.038));
    ctx.fillStyle = colors.dim;
    ctx.fillText(label, x, y - 13);
  }

  // Where the sun is now. The only filled disc on the chart.
  const [sx, sy] = point(current);
  ctx.fillStyle = current.alt > 0 ? colors.amber : colors.dim;
  ctx.beginPath();
  ctx.arc(sx, sy, 5.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = colors.bg;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

/**
 * THE DIAL — a twenty-four hour face.
 *
 * Midnight at the top, noon at the bottom, so the face reads like a
 * clock. The lit arc is the length of the day, which means the dial
 * shows the season as well as the hour: in June the arc is long, in
 * December it is short, and the difference is visible without reading
 * a number.
 */
export function drawDial(canvas, current, events, colors = theme()) {
  const fit = fitCanvas(canvas);
  if (!fit) return;
  const { ctx, w, h } = fit;
  const cx = w / 2, cy = h / 2;
  // The face leaves room for the hour labels outside the rim — a clock
  // whose numbers fall off the edge of it is a decoration.
  const R = Math.min(w, h) / 2 * 0.82;
  if (R <= 10) return;

  ctx.save();
  ctx.translate(cx, cy);

  const at = (minutes) => {
    const t = (minutes / 1440) * TAU - Math.PI / 2;
    return [Math.cos(t) * R, Math.sin(t) * R];
  };

  // The whole day, dim; the lit part, in the sun's own colour.
  const arc = (from, to, colour, width) => {
    if (from === null || to === null) return;
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(0, 0, R, (from / 1440) * TAU - Math.PI / 2, (to / 1440) * TAU - Math.PI / 2);
    ctx.stroke();
  };
  arc(0, 1440, colors.dim, Math.max(6, R * 0.075));
  if (events.sunrise !== null && events.sunset !== null) {
    // When the visitor's clock is far from the sun's, the daylight runs
    // across midnight and the arc is drawn in two pieces. Drawing it as
    // one would put the "sunset" before the "sunrise" and paint a band
    // of daylight across the middle of the night.
    if (events.sunset >= events.sunrise) {
      arc(events.sunrise, events.sunset, colors.amber, Math.max(6, R * 0.075));
    } else {
      arc(events.sunrise, 1440, colors.amber, Math.max(6, R * 0.075));
      arc(0, events.sunset, colors.amber, Math.max(6, R * 0.075));
    }
  }

  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.stroke();

  // The hour ticks, and four hours named.
  ctx.strokeStyle = colors.dim;
  ctx.lineWidth = 1;
  for (let hour = 0; hour < 24; hour++) {
    const [x, y] = at(hour * 60);
    ctx.beginPath();
    ctx.moveTo(x * 0.93, y * 0.93);
    ctx.lineTo(x * 0.985, y * 0.985);
    ctx.stroke();
  }
  ctx.fillStyle = colors.dim;
  ctx.font = mono(Math.max(9, Math.min(w, h) * 0.05));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const hour of [0, 6, 12, 18]) {
    const [x, y] = at(hour * 60);
    ctx.fillText(String(hour).padStart(2, '0'), x * 1.14, y * 1.14);
  }

  // The hand.
  const [hx, hy] = at(current.minutes);
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(hx * 0.8, hy * 0.8);
  ctx.stroke();
  ctx.fillStyle = colors.amber;
  ctx.beginPath();
  ctx.arc(hx * 0.8, hy * 0.8, Math.max(5, R * 0.055), 0, TAU);
  ctx.fill();

  // The reading, in the middle of the face.
  ctx.fillStyle = colors.fg;
  ctx.font = mono(Math.max(14, Math.min(w, h) * 0.13), 700);
  ctx.fillText(clock(current.minutes), 0, -R * 0.12);
  ctx.fillStyle = colors.dim;
  ctx.font = mono(Math.max(8, Math.min(w, h) * 0.042));
  ctx.fillText('LOCAL TIME', 0, R * 0.14);

  ctx.restore();
}

/**
 * The instrument itself.
 *
 * `onTime(instant)` is called whenever the chosen moment changes, so
 * the estate can follow: the light, the palette, the stars and the
 * shadows all read the same clock. The study does not own the sun; it
 * moves it, and the rest of the system follows.
 */
export function setupSunStudy({ site, onTime }) {
  const panel = document.getElementById('sun-panel');
  if (!panel) return null;

  const chartCanvas = panel.querySelector('#sun-chart');
  const dialCanvas = panel.querySelector('#sun-dial');
  const dateInput = panel.querySelector('#sun-date-input');
  const timeInput = panel.querySelector('#sun-time-input');
  const timeOut = panel.querySelector('#sun-time');
  const dateOut = panel.querySelector('#sun-date');
  const altOut = panel.querySelector('#sun-altitude');
  const azOut = panel.querySelector('#sun-azimuth');
  const riseOut = panel.querySelector('#sun-rise');
  const setOut = panel.querySelector('#sun-set');
  const lenOut = panel.querySelector('#sun-length');
  const placeOut = panel.querySelector('#sun-place');
  const playButton = panel.querySelector('#sun-play');

  const state = {
    day: today(),
    minutes: nowMinutes(),
    live: true,          // the clock is the visitor's own until they move it
    playing: false,
  };

  let raf = null;
  let last = 0;

  const instant = () =>
    instantAt(state.day, state.minutes);

  // ── Reading the dial ────────────────────────────────────────────────────
  let dragging = false;
  const setFromPointer = (e) => {
    const r = dialCanvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    const minutes = ((Math.atan2(y, x) + Math.PI / 2 + TAU) % TAU) / TAU * 1440;
    state.minutes = minutes;
    state.live = false;
    commit();
  };
  dialCanvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    dialCanvas.setPointerCapture(e.pointerId);
    setFromPointer(e);
  });
  dialCanvas.addEventListener('pointermove', (e) => { if (dragging) setFromPointer(e); });
  dialCanvas.addEventListener('pointerup', (e) => {
    dragging = false;
    dialCanvas.releasePointerCapture(e.pointerId);
  });
  dialCanvas.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 60 : 10;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') state.minutes += step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') state.minutes -= step;
    else if (e.key === 'Home') state.minutes = 0;
    else if (e.key === 'End') state.minutes = 1439;
    else return;
    e.preventDefault();
    state.minutes = ((state.minutes % 1440) + 1440) % 1440;
    state.live = false;
    commit();
  });

  // ── Moving the sun ──────────────────────────────────────────────────────
  function commit() {
    onTime?.(instant(), { live: state.live });
    refresh();
  }

  // ── Playing the day ─────────────────────────────────────────────────────
  function setPlaying(on) {
    state.playing = on;
    playButton.setAttribute('aria-pressed', String(on));
    playButton.textContent = on ? 'PAUSE' : 'PLAY THE DAY';
    if (on) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }
  function tick(now) {
    if (!state.playing) return;
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    // A whole day in thirty seconds: fast enough to watch the shadows
    // travel across the estate, slow enough to read the clock.
    state.minutes = (state.minutes + (dt / 30) * 1440) % 1440;
    state.live = false;
    commit();
    raf = requestAnimationFrame(tick);
  }
  playButton.addEventListener('click', () => setPlaying(!state.playing));

  // ── The controls ────────────────────────────────────────────────────────
  panel.querySelector('#sun-now').addEventListener('click', () => {
    const now = new Date();
    state.day = today(now);
    state.minutes = nowMinutes(now);
    state.live = true;
    commit();
  });

  dateInput.addEventListener('change', () => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput.value);
    if (!m) return;
    state.day = { year: +m[1], month: +m[2] - 1, day: +m[3] };
    commit();
  });

  timeInput.addEventListener('change', () => {
    const m = /^(\d{2}):(\d{2})$/.exec(timeInput.value);
    if (!m) return;
    state.minutes = +m[1] * 60 + +m[2];
    state.live = false;
    commit();
  });

  for (const button of panel.querySelectorAll('[data-sun-date]')) {
    button.addEventListener('click', () => {
      const now = new Date();
      const thisDay = today(now);
      if (button.dataset.sunDate === 'today') {
        state.day = thisDay;
      } else {
        const [m, d] = button.dataset.sunDate.split('-').map(Number);
        state.day = { year: thisDay.year, month: m - 1, day: d };
      }
      commit();
    });
  }

  panel.querySelector('#sun-close').addEventListener('click', () => close());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('in')) close();
  });

  // ── Reading everything ──────────────────────────────────────────────────
  function refresh() {
    const colors = theme();
    const path = sunPath(state.day, site);
    const events = dayEvents(state.day, site);
    const at = sunHorizontal(instant(), site.lat, site.lon);

    drawChart(chartCanvas, path, at, events, colors);
    drawDial(dialCanvas, { minutes: state.minutes }, events, colors);

    timeOut.textContent = clock(state.minutes);
    dateOut.textContent = dateLabel(state.day);
    altOut.textContent = `${at.alt.toFixed(1)}°`;
    azOut.textContent = `${Math.round(at.az)}° ${cardinal(at.az)}`;
    riseOut.textContent = clock(events.sunrise);
    setOut.textContent = clock(events.sunset);
    lenOut.textContent = events.dayLength
      ? `${Math.floor(events.dayLength / 60)}h ${String(Math.round(events.dayLength % 60)).padStart(2, '0')}`
      : '—';

    if (placeOut) {
      placeOut.textContent =
        `${site.lat.toFixed(4)}° N · ${site.lon.toFixed(4)}° E · UTC+7`;
    }
    const iso = `${state.day.year}-${String(state.day.month + 1).padStart(2, '0')}-${String(state.day.day).padStart(2, '0')}`;
    if (dateInput.value !== iso) dateInput.value = iso;
    if (timeInput.value !== clock(state.minutes)) timeInput.value = clock(state.minutes);
    dialCanvas.setAttribute('aria-valuenow', String(Math.round(state.minutes)));
    dialCanvas.setAttribute('aria-valuetext', `${clock(state.minutes)} local time`);
  }

  const observer = new ResizeObserver(() => { if (panel.classList.contains('in')) refresh(); });
  observer.observe(chartCanvas);
  observer.observe(dialCanvas);

  // While the panel is open and the clock has not been moved, the
  // reading follows the visitor's own seconds. Once the dial is
  // touched, the visitor's clock is theirs to keep.
  setInterval(() => {
    if (!state.live || !panel.classList.contains('in')) return;
    state.minutes = nowMinutes();
    refresh();
  }, 30_000);

  function open() {
    panel.classList.add('in');
    panel.setAttribute('aria-hidden', 'false');
    refresh();
  }
  function close() {
    if (state.playing) setPlaying(false);
    panel.classList.remove('in');
    panel.setAttribute('aria-hidden', 'true');
  }

  return {
    open, close, refresh,
    get playing() { return state.playing; },
    /** The estate asks the study where the clock is, when it wakes up. */
    syncToNow() {
      const now = new Date();
      state.day = today(now);
      state.minutes = nowMinutes(now);
      state.live = true;
      refresh();
    },
  };
}
