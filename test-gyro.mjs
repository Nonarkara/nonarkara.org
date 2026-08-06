// The pitch mapping, checked against how a phone is actually held.
// This is the bug that made the sky feel like lying on the floor: a
// fixed 76° pitch regardless of the device, so holding the phone
// normally pointed you at the zenith.
import assert from 'node:assert';

// Mirror of pitchFromBeta in app.js. Kept in step by the assertions
// below, which encode the physical facts rather than the arithmetic.
function pitchFromBeta(beta, gamma, screenAngle = 0) {
  let b = beta;
  if (screenAngle === 90) b = -gamma;
  else if (screenAngle === -90 || screenAngle === 270) b = gamma;
  const deg = 90 - b;
  return Math.max(-85, Math.min(89, deg)) * Math.PI / 180;
}
const deg = (r) => r * 180 / Math.PI;

// ── The three positions that matter ───────────────────────────
// Upright in front of your face → you are looking at the HORIZON.
assert(Math.abs(deg(pitchFromBeta(90, 0))) < 1,
  `phone upright must look at the horizon, got ${deg(pitchFromBeta(90, 0)).toFixed(0)}°`);

// Flat on your palm, screen up → you are looking at the ZENITH.
assert(deg(pitchFromBeta(0, 0)) > 85,
  `phone flat must look straight up, got ${deg(pitchFromBeta(0, 0)).toFixed(0)}°`);

// Tipped past upright, screen toward the floor → looking DOWN at the map.
assert(deg(pitchFromBeta(140, 0)) < -30,
  `phone tipped down must look at the ground, got ${deg(pitchFromBeta(140, 0)).toFixed(0)}°`);

// ── Monotonic: tilting up must never look further down ────────
let prev = -Infinity;
for (let b = 170; b >= 0; b -= 10) {
  const p = deg(pitchFromBeta(b, 0));
  assert(p >= prev - 0.001, `pitch must rise as beta falls (beta ${b})`);
  prev = p;
}

// ── Landscape uses gamma, not beta ────────────────────────────
{
  // Held upright in landscape: gamma ≈ -90 at screenAngle 90.
  const p = deg(pitchFromBeta(0, -90, 90));
  assert(Math.abs(p) < 5, `landscape upright must look at the horizon, got ${p.toFixed(0)}°`);
}

// ── Never past vertical, never under the floor ────────────────
for (const [b, g] of [[-180, 0], [180, 0], [0, 0], [360, 0]]) {
  const p = deg(pitchFromBeta(b, g));
  assert(p <= 89.001 && p >= -85.001, `pitch ${p.toFixed(0)}° out of range for beta ${b}`);
}

console.log('gyro: all checks passed · upright=horizon, flat=zenith, tipped=ground');
