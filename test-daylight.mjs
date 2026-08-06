// Self-check for daylight, weather and the daily poem.
import assert from 'node:assert';
import { sunAltitude, phaseFor, paletteFor } from './daylight.js';
import { POEMS, poemForDate as pfd } from './poems.js';

// ── Sun: Bangkok noon is high, midnight is well below ─────────
{
  const noon = new Date('2026-08-06T05:00:00Z');   // 12:00 ICT
  const mid  = new Date('2026-08-06T17:00:00Z');   // 00:00 ICT next day
  const hi = sunAltitude(noon, 13.7563, 100.5018);
  const lo = sunAltitude(mid, 13.7563, 100.5018);
  assert(hi > 55, `Bangkok noon sun should be high, got ${hi.toFixed(1)}°`);
  assert(lo < -40, `Bangkok midnight sun should be well down, got ${lo.toFixed(1)}°`);
}

// ── Polar sanity: Tromsø in December never gets a high sun ────
{
  const dec = new Date('2026-12-21T11:00:00Z');
  const alt = sunAltitude(dec, 69.65, 18.96);
  assert(alt < 3, `Tromsø midwinter noon must stay near/below horizon, got ${alt.toFixed(1)}°`);
}

// ── Phases map the way the brief asked ────────────────────────
assert.equal(phaseFor(40, false).key, 'day');
assert.equal(phaseFor(-30, false).key, 'night');
assert.equal(phaseFor(0, true).key, 'dawn',  'sun near horizon and rising is dawn');
assert.equal(phaseFor(0, false).key, 'dusk', 'sun near horizon and setting is dusk');

// ── Twilight is actually cream, not just interpolated night ───
{
  const p = paletteFor(1, true);
  const r = (p.bg >> 16) & 255, b = p.bg & 255;
  assert(r > b, `dawn ground should be warm (r${r} > b${b})`);
  assert.equal(p.phase, 'dawn');
  const night = paletteFor(-30, false);
  assert(((night.bg >> 16) & 255) < 20, 'night must be genuinely dark');
  const day = paletteFor(50, false);
  assert(((day.travertine >> 16) & 255) > 180, 'day travertine must read as pale stone');
}

// ── Palettes always deliver every colour the room needs ───────
for (const alt of [-40, -6, -3, 0, 4, 8, 20, 70]) {
  const p = paletteFor(alt, true);
  for (const k of ['bg', 'travertine', 'green', 'chrome', 'water', 'podium', 'roof', 'line']) {
    assert(typeof p[k] === 'number' && p[k] >= 0 && p[k] <= 0xffffff, `alt ${alt}: bad ${k}`);
  }
}

// ── The poem is stable within a day and moves between days ────
{
  const a = pfd(new Date('2026-08-06T01:00:00Z'));
  const b = pfd(new Date('2026-08-06T15:00:00Z'));
  assert.equal(a.t, b.t, 'the poem must not change during the day');
  const c = pfd(new Date('2026-08-07T05:00:00Z'));
  assert.notEqual(a.t, c.t, 'tomorrow must be a different poem');
}

// ── Every poem is shaped like a poem, and obeys §12.4 ─────────
{
  const banned = /\b(leverage|synergy|unlock|impact|game.?chang|north star|10x|you'?ve got this|believe in yourself|journey|passionate|excited to)\b/i;
  const seen = new Set();
  for (const p of POEMS) {
    assert(p.t && p.t.length <= 28, `title too long: ${p.t}`);
    assert(!seen.has(p.t), `duplicate poem: ${p.t}`);
    seen.add(p.t);
    assert(Array.isArray(p.l) && p.l.length >= 5, `${p.t}: too short to be a poem`);
    const text = p.l.join(' ');
    assert(!banned.test(text), `${p.t}: contains banned register`);
    // Bukowski-plain: no line should be a paragraph.
    for (const line of p.l) assert(line.length <= 62, `${p.t}: line too long — "${line}"`);
    // It stops, it does not conclude.
    const last = p.l[p.l.length - 1];
    assert(!/^(so|therefore|in conclusion|remember|that'?s why)\b/i.test(last.trim()),
      `${p.t}: ends on a moral — "${last}"`);
  }
}

console.log(`daylight: all checks passed · ${POEMS.length} poems · ${POEMS.length} days of wall`);
