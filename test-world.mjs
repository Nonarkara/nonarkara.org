import assert from 'node:assert';
import {
  moonPhase, solarEvents, sunHorizontal,
} from './astronomy.js';
import { visibilityFor } from './sky.js';
import { ridgeHeight } from './world.js';

const BANGKOK = { lat: 13.7563, lon: 100.5018 };

// Bangkok has an easterly sunrise and westerly sunset on an ordinary day.
{
  const d = new Date(2026, 7, 11, 12);
  const e = solarEvents(d, BANGKOK.lat, BANGKOK.lon);
  assert(e.sunrise && e.sunset, 'Bangkok must have sunrise and sunset');
  assert(e.sunrise.date < e.sunset.date, 'sunrise precedes sunset');
  assert(e.sunrise.az > 50 && e.sunrise.az < 115, `rise azimuth ${e.sunrise.az}`);
  assert(e.sunset.az > 245 && e.sunset.az < 310, `set azimuth ${e.sunset.az}`);
  for (const event of [e.sunrise, e.sunset]) {
    const alt = sunHorizontal(event.date, BANGKOK.lat, BANGKOK.lon).alt;
    assert(Math.abs(alt + 0.833) < 0.01, `solar crossing must be -0.833°, got ${alt}`);
  }
}

// The known January 2000 lunation anchors new and full moon rendering.
{
  const fresh = moonPhase(new Date('2000-01-06T18:14:00Z'));
  assert(fresh.illumination < 0.001 && fresh.label === 'NEW MOON');
  const full = moonPhase(new Date('2000-01-21T12:36:00Z'));
  assert(full.illumination > 0.999 && full.label === 'FULL MOON');
}

// Daylight and starlight are mutually honest; the daytime Moon may remain.
assert.equal(visibilityFor(35, 25, 0.7).stars, 0, 'no stars in blue daylight');
assert.equal(visibilityFor(-18, 20, 0.7).stars, 1, 'full stars after astronomical dusk');
assert(visibilityFor(35, 25, 0.7).moon > 0, 'a real daytime Moon remains visible');
assert.equal(visibilityFor(-18, -5, 1).moon, 0, 'the Moon below the horizon is hidden');

// Procedural horizon is deterministic, bounded, varied, and phone-light.
{
  const ridge = Array.from({ length: 144 }, (_, i) => ridgeHeight(i, 144, 1));
  assert.deepEqual(ridge, Array.from({ length: 144 }, (_, i) => ridgeHeight(i, 144, 1)));
  assert(Math.min(...ridge) >= 0.14 && Math.max(...ridge) <= 0.92);
  assert(Math.max(...ridge) - Math.min(...ridge) > 0.25, 'mountains need a readable silhouette');
}

console.log('world: all checks passed · real rise/set · phased moon · night stars · mountain horizon');
