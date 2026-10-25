// Self-check for the ground projection. `node test-ground.mjs`
// The failures this catches: a north/south sign flip (a map that looks
// perfectly plausible and is mirrored), and the scale law breaking —
// which is the bug that made the floor a 14-pixel-per-texel smear.
import assert from 'node:assert';
const { tileXY, metresPerPixel, dampZoom, ZOOM, ZOOM_MIN, ZOOM_MAX, GRID,
        tileMetres, altitudeFor, visibleWidth, VFOV } = await import('./ground.js');
import { readFileSync } from 'node:fs';

const near = (a, b, tol, what) =>
  assert(Math.abs(a - b) <= tol, `${what}: got ${a}, want ${b} ±${tol}`);

// ── Known tile coordinates ────────────────────────────────────
// At zoom 0 the whole world is one tile, so null island is at its centre.
{
  const t = tileXY(0, 0, 0);
  near(t.x, 0.5, 1e-9, 'origin x at zoom 0');
  near(t.y, 0.5, 1e-9, 'origin y at zoom 0');
}

{
  const source = readFileSync(new URL('./ground.js', import.meta.url), 'utf8');
  assert(source.includes('tile.openstreetmap.de/'), 'ground needs a policy-compliant fallback tile edge');
  assert(source.includes('a.tile.openstreetmap.fr/hot/'), 'ground needs a policy-compliant resilient tile edge');
  assert(source.includes('tile.openstreetmap.org/'), 'standard OSM remains the fallback');
  assert(source.includes('© OPENSTREETMAP CONTRIBUTORS'), 'the map keeps visible data attribution');
  assert(source.includes('TILE_TIMEOUT_MS'), 'a stalled tile edge must yield to the fallback');
  assert(source.includes('setTileListener'), 'tile loading must expose diagnostics for browser regression tests');
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
  for (const [lat, lon] of [[13.7563, 100.5018], [51.4778, -0.0018], [-33.87, 151.21], [42.36, -71.09]]) {
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

// ── THE SCALE LAW: one unit is one metre ─────────────────────
// The estate is 54 m across and the walker's eye is 1.65 m up. The map
// underneath has to be the same size as the world it sits under, so a
// tile is as wide in scene units as it is in metres. This is the
// assertion the old code failed: SPAN was a constant 18 units while the
// tile behind it changed from 4.7 km to 297 m, so the map claimed a
// different scale under an unchanged footprint.
{
  near(tileMetres(13.7563, 16), metresPerPixel(13.7563, 16) * 256, 1e-6,
       'a tile is as many units wide as it is metres wide');
  // The plate is 5×5 of those tiles: 2.97 km of real ground at 1:1.
  near(GRID * tileMetres(13.7563, 16) / 1000, 2.97, 0.02, 'the plate is ~3 km of real ground');
  // And the plate must be wide enough to fill the frame at every zoom,
  // or the view ends in a black rectangle of void.
  for (const z of [ZOOM_MIN, ZOOM, ZOOM_MAX]) {
    const plate = GRID * tileMetres(13.7563, z);
    const frame = visibleWidth(13.7563, z, 1.6, -1.36);
    assert(plate > frame, `z${z}: plate ${plate.toFixed(0)}m must cover the ${frame.toFixed(0)}m frame`);
  }
}

// ── THE ALTITUDE LAW: depth is not a taste decision ──────────
// Texel density on screen depends on the eye-to-plate distance and on
// nothing else. This is why lowering the zoom level never fixed the
// smear: z11, z13 and z17 all gave 14 px per texel. The plate now falls
// to the one altitude at which the texels land on about two pixels.
{
  const h = altitudeFor(13.7563, 16);
  // At 1440×900 and a 58° vertical FOV, one screen pixel covers
  // 1.176e-3 × altitude metres radially. A texel is metresPerPixel wide.
  const radial = h * (2 * (58 * Math.PI / 180 / 2) / 900);
  const pxPerTexel = metresPerPixel(13.7563, 16) / radial;
  assert(pxPerTexel > 1.0 && pxPerTexel < 3.0,
         `z16 texel should land on 1–3 screen pixels, got ${pxPerTexel.toFixed(2)}`);
  // The altitude must double as the zoom halves, or a zoomed-out map
  // would be the smear again.
  near(altitudeFor(13.7563, 15) / altitudeFor(13.7563, 16), 2, 0.01,
       'altitude doubles per zoom level');
}

// ── The frame holds a neighbourhood, not a smear and not a continent
{
  const w = visibleWidth(13.7563, 16, 1.6, -1.36);
  assert(w > 1200 && w < 3200, `z16 frame should be 1.2–3.2 km wide, got ${w.toFixed(0)}m`);
  // Zooming in must actually zoom in.
  const closer = visibleWidth(13.7563, 18, 1.6, -1.36);
  assert(closer < w * 0.5, `z18 frame (${closer.toFixed(0)}m) should be far tighter than z16 (${w.toFixed(0)}m)`);
  // And zooming out must actually zoom out.
  const wider = visibleWidth(13.7563, 15, 1.6, -1.36);
  assert(wider > w * 1.5, `z15 frame (${wider.toFixed(0)}m) should be much wider than z16 (${w.toFixed(0)}m)`);
}

// ── Latitude limits ───────────────────────────────────────────
// Web Mercator cannot represent the poles; y must stay finite inside the
// usual ±85.05° cutoff.
{
  const t = tileXY(85.05, 0, 16);
  assert(Number.isFinite(t.y) && t.y >= 0, 'y stays finite at the Mercator limit');
}

// ── Zoom range ────────────────────────────────────────────────
// The map steps from the neighbourhood (z16) out to the district (z15)
// and in to your own street (z18). It must not reach lane level under
// the eye (that is what pixelated) nor the whole region (that is a
// grey sheet with no streets in it).
{
  assert(ZOOM_MIN >= 14 && ZOOM_MIN <= 16, 'district floor around z15');
  assert(ZOOM_MAX >= 17 && ZOOM_MAX <= 19, 'street ceiling around z18');
  assert(ZOOM_MAX > ZOOM_MIN + 1, 'the range must actually cover street → district');
  assert(ZOOM === 16, 'the default is the neighbourhood');
}

// Fractional auto-zoom must accumulate between integer tile loads. Rounding
// each frame back to the default made the tilt mechanic a permanent no-op.
{
  let z = ZOOM;
  for (let i = 0; i < 120; i += 1) z = dampZoom(z, 18, 1 / 60);
  assert(z > 17.8, `two seconds looking down should approach street zoom, got ${z}`);
}

console.log('ground: all checks passed');
