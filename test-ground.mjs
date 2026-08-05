// Self-check for the ground projection. `node test-ground.mjs`
// The failure this catches: a north/south sign flip, which produces a
// map that looks perfectly plausible and is mirrored.
import assert from 'node:assert';
const { tileXY, metresPerPixel, ZOOM } = await import('./ground.js');

const near = (a, b, tol, what) =>
  assert(Math.abs(a - b) <= tol, `${what}: got ${a}, want ${b} ±${tol}`);

// ── Known tile coordinates ────────────────────────────────────
// At zoom 0 the whole world is one tile, so null island is at its centre.
{
  const t = tileXY(0, 0, 0);
  near(t.x, 0.5, 1e-9, 'origin x at zoom 0');
  near(t.y, 0.5, 1e-9, 'origin y at zoom 0');
}

// Greenwich at zoom 1 sits on the vertical seam.
near(tileXY(51.4778, 0, 1).x, 1.0, 1e-9, 'Greenwich is on the prime meridian');

// ── Direction sense — the whole point of the test ─────────────
// East increases x. North DECREASES y, because tile rows count downward
// from the top of the world. Get this backwards and the map is mirrored.
{
  const bkk = tileXY(13.7563, 100.5018, ZOOM);
  const east = tileXY(13.7563, 100.5118, ZOOM);
  const north = tileXY(13.7663, 100.5018, ZOOM);
  assert(east.x > bkk.x, 'east must increase tile x');
  assert(north.y < bkk.y, 'north must DECREASE tile y');
}

// ── Cross-check against an independent implementation ─────────
// ground.js uses ln(tan φ + sec φ); this uses asinh(tan φ). They are the
// same function by identity but share no code path, so agreement means
// the transcription is right rather than merely self-consistent.
{
  const ref = (lat, lon, z) => {
    const n = 2 ** z;
    return {
      x: (lon + 180) / 360 * n,
      y: (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n,
    };
  };
  for (const [lat, lon] of [[13.7563, 100.5018], [51.4778, -0.0015], [-33.87, 151.21], [42.36, -71.09]]) {
    const a = tileXY(lat, lon, 16), b = ref(lat, lon, 16);
    near(a.x, b.x, 1e-6, `tile x at ${lat},${lon}`);
    near(a.y, b.y, 1e-6, `tile y at ${lat},${lon}`);
  }
}

// ── Scale ─────────────────────────────────────────────────────
// Zoom 16 at Bangkok's latitude is about 2.3 m per pixel; the equator is
// coarser than the poles by exactly cos(latitude).
{
  near(metresPerPixel(13.7563, 16), 2.32, 0.05, 'metres per pixel at Bangkok, z16');
  near(metresPerPixel(0, 16) * Math.cos(60 * Math.PI / 180), metresPerPixel(60, 16),
       1e-9, 'resolution scales with cos(latitude)');
  near(metresPerPixel(0, 17), metresPerPixel(0, 16) / 2, 1e-9, 'each zoom level halves the scale');
}

// ── Latitude limits ───────────────────────────────────────────
// Web Mercator cannot represent the poles; y must stay finite inside the
// usual ±85.05° cutoff.
{
  const t = tileXY(85.05, 0, 16);
  assert(Number.isFinite(t.y) && t.y >= 0, 'y stays finite at the Mercator limit');
}

console.log('ground: all checks passed');
