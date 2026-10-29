// Self-check for the sun study — the chart, the dial, and the clock
// they share with the room.
//
// The panel and the estate must never disagree. If the chart says the
// sun sets at 18:04 and the room shows noon, the panel is decoration.
//
// Everything here is timezone-independent on purpose: CI runs in UTC
// and Dr Non runs in Bangkok, and an instrument that only means one
// thing in one timezone is not an instrument. What is checked instead
// is the truth of the geometry — the sun's peak, its lowest point, the
// length of the day, the arc of daylight being one unbroken run — and
// none of those move when the clock does.
import assert from 'node:assert';
import { clock, dateLabel, dayEvents, instantAt, nowMinutes, sunPath, today } from './sun-study.js';

const SITE = { lat: 13.7563, lon: 100.5018, label: 'BANGKOK' };
const DAY = { year: 2026, month: 9, day: 29 };   // 29 October 2026

// ── The clock the panel speaks ───────────────────────────────────
{
  const d = today(new Date(2026, 9, 29, 12, 30, 0));
  assert.deepEqual(d, { year: 2026, month: 9, day: 29 });

  assert.equal(Math.round(nowMinutes(new Date(2026, 9, 29, 12, 30, 0))), 12 * 60 + 30);
  assert.equal(Math.round(nowMinutes(new Date(2026, 9, 29, 0, 0, 0))), 0);

  // And the round trip: a clock time comes back to the same instant.
  const instant = instantAt(DAY, 12 * 60 + 30);
  assert.equal(instant.getHours(), 12);
  assert.equal(instant.getMinutes(), 30);
  assert.equal(instant.getDate(), 29);
  assert.equal(Math.round(nowMinutes(instant)), 12 * 60 + 30);
}

// ── The chart: the sun's path on a real day ─────────────────────
{
  const path = sunPath(DAY, SITE);
  assert.equal(path.length, 144, 'a day is 144 ten-minute samples');
  assert.equal(path[0].minutes, 0);
  assert.equal(path[143].minutes, 1430);

  const peak = path.reduce((a, b) => (b.alt > a.alt ? b : a));
  assert(peak.alt > 55, `Bangkok's noon sun should be high, got ${peak.alt.toFixed(1)}°`);
  const trough = path.reduce((a, b) => (b.alt < a.alt ? b : a));
  assert(trough.alt < -40, `the sun should be far down at night, got ${trough.alt.toFixed(1)}°`);

  // The path must be continuous — a jump would draw a line across the
  // chart that no sun ever took.
  for (let i = 1; i < path.length; i++) {
    assert(Math.abs(path[i].alt - path[i - 1].alt) < 6,
      `the sun cannot jump ${Math.abs(path[i].alt - path[i - 1].alt).toFixed(1)}° in ten minutes`);
  }

  // The sun rises once and sets once. Counted as crossings of the
  // horizon rather than as a run of daylight: a visitor whose clock is
  // twelve hours off sees the day start in darkness and end in
  // darkness, and the daylight is then two pieces of one day.
  let crossings = 0;
  for (let i = 1; i < path.length; i++) {
    if ((path[i].alt > 0) !== (path[i - 1].alt > 0)) crossings++;
  }
  assert(crossings <= 2, `the sun crosses the horizon at most twice a day, saw ${crossings}`);
  assert(path.some((p) => p.lit), 'the sun must be up sometime that day');
  assert(path.some((p) => !p.lit), 'the sun must be down sometime that day');
}

// ── The dial: sunrise, sunset, and the length of the day ────────
{
  const events = dayEvents(DAY, SITE);
  assert(events.sunrise !== null, 'the sun rises in Bangkok in October');
  assert(events.sunset !== null, 'the sun sets in Bangkok in October');
  assert(events.dayLength > 10 * 60 && events.dayLength < 13 * 60,
    `Bangkok in late October is about 11h40m of day, got ${events.dayLength} minutes`);
  // Solar noon is the moment the sun crosses the meridian. Its LABEL
  // depends on the visitor's clock, so it is checked as an instant
  // against the site's own longitude: noon at 100.5°E is 05:18 UTC,
  // give or take the equation of time.
  assert(events.solarNoonInstant, 'solar noon must be known');
  const noonUTC = events.solarNoonInstant.getUTCHours() * 60 + events.solarNoonInstant.getUTCMinutes();
  assert(Math.abs(noonUTC - (720 - SITE.lon * 4)) < 25,
    `solar noon must fall near 12:00 at the site's longitude, got ${noonUTC / 60}h UTC`);
}

// ── The seasons are visible in the dial's lit arc ───────────────
{
  const june = dayEvents({ year: 2026, month: 5, day: 21 }, SITE);
  const december = dayEvents({ year: 2026, month: 11, day: 21 }, SITE);
  assert(june.dayLength > december.dayLength + 45,
    `June's day must be visibly longer than December's: ${june.dayLength} vs ${december.dayLength}`);
  assert(june.dayLength > 12 * 60, `June in Bangkok is over twelve hours, got ${june.dayLength}`);
  assert(december.dayLength < 12 * 60, `December in Bangkok is under twelve hours, got ${december.dayLength}`);
}

// ── A place with no sun at all ───────────────────────────────────
{
  // Tromsø in midwinter: the sun does not rise, and the instrument has
  // to say so rather than draw a sunrise that never happened.
  const polar = dayEvents({ year: 2026, month: 11, day: 21 }, { lat: 69.65, lon: 18.96 });
  assert(polar.polarNight || polar.sunrise === null,
    'Tromsø at midwinter must report no sunrise');
  assert(polar.dayLength === 0, 'a polar night has no length of day to report');
}

// ── Clock and date labels speak in the site's own voice ──────────
assert.equal(clock(0), '00:00');
assert.equal(clock(6 * 60 + 42), '06:42');
assert.equal(clock(23 * 60 + 59), '23:59');
assert.equal(clock(1440), '00:00', 'midnight must not read as 24:00');
assert.equal(clock(null), '—');
assert.equal(dateLabel({ year: 2026, month: 9, day: 29 }), '29 OCT 2026');

console.log('sun study: chart · dial · site clock · seasons · polar — all checks passed');
