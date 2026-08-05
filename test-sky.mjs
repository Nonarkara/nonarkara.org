// Self-check for the sky arithmetic. `node test-sky.mjs`
// If these pass, the stars are in the right place. If they drift, every
// direction the planetarium claims is a lie, which is worse than not
// having one.
import assert from 'node:assert';

// sky.js imports 'three'; node_modules/three is a local test shim that
// provides only the Vector3 the maths uses (see that file).
const { altAz, gmst, sunPosition, moonPosition, STARS, FIGURES, altAzToVec, BANGKOK } =
  await import('./sky.js');

const near = (a, b, tol, what) =>
  assert(Math.abs(a - b) <= tol, `${what}: got ${a.toFixed(3)}, want ${b.toFixed(3)} ±${tol}`);

// ── GMST against a published value ────────────────────────────
// At 2000-01-01 12:00 UTC (the J2000 epoch) GMST is 18h 41m 50.5s.
near(gmst(new Date(Date.UTC(2000, 0, 1, 12))) / 15, 18.6974, 0.01, 'GMST at J2000');

// ── Polaris proves the whole transform chain ──────────────────
// It sits within a degree of the pole, so its altitude must equal the
// observer's latitude and its azimuth must be due north — at every
// longitude, at every instant. Nothing else tests lat, lon, time and
// both angles at once.
for (const lat of [13.7563, 51.5, -33.9, 0]) {
  for (const hour of [0, 6, 13, 21]) {
    const d = new Date(Date.UTC(2026, 7, 5, hour));
    const { alt, az } = altAz(2.5303, 89.264, lat, 100.5, d);
    near(alt, lat, 1.0, `Polaris altitude at lat ${lat}, ${hour}h`);
    if (lat > 5) {
      const offNorth = Math.min(az, 360 - az);
      assert(offNorth < 3, `Polaris azimuth at lat ${lat}, ${hour}h: ${az.toFixed(1)}° from north`);
    }
  }
}

// ── The sun over Bangkok ──────────────────────────────────────
// Solar noon is set by longitude, not by the timezone: Bangkok sits at
// 100.5°E, so the sun peaks around 05:18 UTC, not 05:00. In early August
// the sun's declination (~+17°) is north of Bangkok's latitude (13.76°),
// so at noon it stands slightly NORTH of overhead — the detail a wrong
// sign convention always gets backwards.
{
  const noon = new Date(Date.UTC(2026, 7, 5, 5, 18));
  const s = sunPosition(noon);
  near(s.decDeg, 16.8, 1.5, 'solar declination in early August');
  const { alt, az } = altAz(s.raHours, s.decDeg, BANGKOK.lat, BANGKOK.lon, noon);
  // Peak altitude is 90 − |declination − latitude| ≈ 87°.
  assert(alt > 85, `sun should be near overhead at Bangkok noon, got ${alt.toFixed(1)}°`);
  const offNorth = Math.min(az, 360 - az);
  assert(offNorth < 30, `sun should pass north of zenith in August, azimuth ${az.toFixed(1)}°`);

  // ...and below the horizon at local midnight.
  const midnight = new Date(Date.UTC(2026, 7, 5, 17, 0));
  const s2 = sunPosition(midnight);
  const a2 = altAz(s2.raHours, s2.decDeg, BANGKOK.lat, BANGKOK.lon, midnight).alt;
  assert(a2 < -50, `sun should be well below the horizon at midnight, got ${a2.toFixed(1)}°`);
}

// ── Circumpolar behaviour ─────────────────────────────────────
// From the north pole every star holds a constant altitude equal to its
// declination, all day. From Bangkok, Polaris never sets and the
// Southern Cross does.
{
  const alts = [0, 5, 11, 19].map(h =>
    altAz(6.7525, -16.716, 90, 0, new Date(Date.UTC(2026, 7, 5, h))).alt);
  alts.forEach(a => near(a, -16.716, 0.5, 'Sirius altitude from the north pole'));
}
{
  const polarisAlts = [0, 4, 8, 12, 16, 20].map(h =>
    altAz(2.5303, 89.264, BANGKOK.lat, BANGKOK.lon, new Date(Date.UTC(2026, 7, 5, h))).alt);
  assert(Math.min(...polarisAlts) > 12, 'Polaris is circumpolar from Bangkok');
}

// ── Scene convention: north is −Z, east is +X, up is +Y ───────
{
  const n = altAzToVec(0, 0, 1), e = altAzToVec(0, 90, 1), up = altAzToVec(90, 0, 1);
  near(n.z, -1, 1e-6, 'north points to −Z');
  near(e.x, 1, 1e-6, 'east points to +X');
  near(up.y, 1, 1e-6, 'zenith points to +Y');
}

// ── The moon moves, and much faster than the stars ────────────
{
  const a = moonPosition(new Date(Date.UTC(2026, 7, 5)));
  const b = moonPosition(new Date(Date.UTC(2026, 7, 6)));
  let drift = (b.raHours - a.raHours + 24) % 24;        // hours, wrapped
  if (drift > 12) drift -= 24;                          // shortest way round
  assert(drift > 0.5 && drift < 1.5,
    `moon should drift roughly 13°/day eastward in RA, got ${(drift * 15).toFixed(1)}°`);
}

// ── Catalogue integrity ───────────────────────────────────────
STARS.forEach(([ra, dec, mag, name]) => {
  assert(ra >= 0 && ra < 24, `${name}: RA ${ra} out of range`);
  assert(dec >= -90 && dec <= 90, `${name}: Dec ${dec} out of range`);
  assert(mag > -2 && mag < 5, `${name}: magnitude ${mag} out of range`);
});
assert(new Set(STARS.map(s => s[3])).size === STARS.length, 'no duplicate star names');
Object.entries(FIGURES).forEach(([name, idx]) => {
  assert(idx.length && idx.length % 2 === 0, `${name}: line list must be pairs`);
  idx.forEach(i => assert(STARS[i], `${name}: index ${i} is not a star`));
});

// Orion's belt must be three stars in a row: nearly equal spacing and
// nearly collinear. A typo in any of the three shows up here immediately.
{
  const belt = ['Alnitak', 'Alnilam', 'Mintaka'].map(n => STARS.find(s => s[3] === n));
  const d = new Date(Date.UTC(2026, 0, 15, 20));
  const v = belt.map(([ra, dec]) => altAzToVec(...Object.values(altAz(ra, dec, 13.75, 100.5, d)), 1));
  const ab = v[0].angleTo(v[1]) * 180 / Math.PI, bc = v[1].angleTo(v[2]) * 180 / Math.PI;
  const ac = v[0].angleTo(v[2]) * 180 / Math.PI;
  near(ab, bc, 0.6, "belt spacing is even");
  near(ab + bc, ac, 0.2, "belt stars are collinear");
}

console.log(`sky: all checks passed · ${STARS.length} stars · ${Object.keys(FIGURES).length} figures`);
