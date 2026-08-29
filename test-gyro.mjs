// The pitch mappings, checked against how a phone is actually held.
//
// Two systems read deviceorientation: the SKY's absolute pitch
// (pitchFromBeta) and the ROOM's additive look offset (gyroOffsets).
// They must agree about which way is up, and the room's must never be
// able to pin the camera at the zenith — that was the reported bug:
// "I have to put the phone parallel to the floor to navigate."
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

// ── Mirror of pitchFromBeta (the sky) ─────────────────────────
function pitchFromBeta(beta, gamma, screenAngle = 0) {
  let b = beta;
  if (screenAngle === 90) b = -gamma;
  else if (screenAngle === -90 || screenAngle === 270) b = gamma;
  const deg = 90 - b;
  return Math.max(-85, Math.min(89, deg)) * Math.PI / 180;
}

// ── Mirror of gyroOffsets (the room) ──────────────────────────
const GYRO_HOLD_DEG = 72, GYRO_GAIN = 0.85, GYRO_MAX_DEG = 40, GYRO_DEADZONE_DEG = 2.5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function gyroOffsets(beta, gamma, screenAngle = 0, zeroDeg = GYRO_HOLD_DEG) {
  let pitchAxis = beta, rollAxis = gamma;
  if (screenAngle === 90) { pitchAxis = -gamma; rollAxis = beta; }
  else if (screenAngle === -90 || screenAngle === 270) { pitchAxis = gamma; rollAxis = -beta; }
  let dPitch = zeroDeg - pitchAxis;
  dPitch = Math.abs(dPitch) < GYRO_DEADZONE_DEG ? 0
    : dPitch - Math.sign(dPitch) * GYRO_DEADZONE_DEG;
  const raw = dPitch * GYRO_GAIN;
  let pitchDeg = raw;
  if (Math.abs(raw) > GYRO_MAX_DEG) {
    pitchDeg = Math.sign(raw) * Math.min(GYRO_MAX_DEG + (Math.abs(raw) - GYRO_MAX_DEG) * 0.8, 85);
  }
  const pitch = pitchDeg * Math.PI / 180;
  const yaw = clamp(rollAxis / 35, -1, 1) * 0.42;
  return { pitch, yaw };
}
const deg = (r) => r * 180 / Math.PI;

// ── THE SKY: the three positions that matter ──────────────────
assert(Math.abs(deg(pitchFromBeta(90, 0))) < 1,
  `phone upright must look at the horizon, got ${deg(pitchFromBeta(90, 0)).toFixed(0)}°`);
assert(deg(pitchFromBeta(0, 0)) > 85,
  `phone flat must look straight up, got ${deg(pitchFromBeta(0, 0)).toFixed(0)}°`);
assert(deg(pitchFromBeta(140, 0)) < -30,
  `phone tipped down must look at the ground, got ${deg(pitchFromBeta(140, 0)).toFixed(0)}°`);

// Monotonic: tilting up must never look further down.
{
  let prev = -Infinity;
  for (let b = 170; b >= 0; b -= 10) {
    const p = deg(pitchFromBeta(b, 0));
    assert(p >= prev - 0.001, `pitch must rise as beta falls (beta ${b})`);
    prev = p;
  }
}
{
  const p = deg(pitchFromBeta(0, -90, 90));
  assert(Math.abs(p) < 5, `landscape upright must look at the horizon, got ${p.toFixed(0)}°`);
}
for (const [b, g] of [[-180, 0], [180, 0], [0, 0], [360, 0]]) {
  const p = deg(pitchFromBeta(b, g));
  assert(p <= 89.001 && p >= -85.001, `pitch ${p.toFixed(0)}° out of range for beta ${b}`);
}

// ── THE ROOM: the natural hold IS level ───────────────────────
// This is the whole bug in one assertion. A phone held the way people
// hold phones must leave the camera alone.
{
  const p = deg(gyroOffsets(GYRO_HOLD_DEG, 0).pitch);
  assert(Math.abs(p) < 0.001,
    `the natural hold must be level, got ${p.toFixed(1)}°`);
  for (const b of [66, 69, 72, 75, 78]) {
    const q = deg(gyroOffsets(b, 0).pitch);
    assert(Math.abs(q) < 6,
      `a normal hold (beta ${b}) must stay near level, got ${q.toFixed(1)}°`);
  }
}

// Direction agrees with the sky: flat = up, tipped over = down.
assert(deg(gyroOffsets(20, 0).pitch) > 20, 'tilting the phone flat looks up');
assert(deg(gyroOffsets(110, 0).pitch) < -20, 'tipping the phone down looks down');

// The gyro still cannot RUN AWAY — the bound moved from ±40° to ±85° so a
// deliberate full tilt can reach the sky and the ground (the Pokémon-Go
// rule, below), but it can never flip past vertical, and inside a natural
// hold (±40°) nothing changed: the finger always has somewhere to go.
for (let b = -180; b <= 180; b += 5) {
  for (const g of [-90, -45, 0, 45, 90]) {
    const p = deg(gyroOffsets(b, g).pitch);
    assert(p <= 85.001 && p >= -85.001,
      `gyro pitch ${p.toFixed(0)}° escaped the hard bound at beta ${b}`);
    assert(Math.abs(gyroOffsets(b, g).yaw) <= 0.421, 'gyro yaw escaped its clamp');
  }
}

// A walking hand jitters a couple of degrees; that must read as nothing.
for (const b of [GYRO_HOLD_DEG - 2, GYRO_HOLD_DEG, GYRO_HOLD_DEG + 2]) {
  assert(gyroOffsets(b, 0).pitch === 0, `deadzone must swallow ${b - GYRO_HOLD_DEG}° of tremor`);
}

// Recentring: any plausible hold can become the new level, and then the
// same hold reads as level.
for (const held of [55, 62, 72, 84, 95]) {
  const p = deg(gyroOffsets(held, 0, 0, held).pitch);
  assert(Math.abs(p) < 0.001, `recentre at ${held}° must make it level`);
}

// Monotonic in the room too, over the usable band.
{
  let prev = -Infinity;
  for (let b = 130; b >= 10; b -= 5) {
    const p = deg(gyroOffsets(b, 0).pitch);
    assert(p >= prev - 0.001, `room pitch must rise as beta falls (beta ${b})`);
    prev = p;
  }
}

// Landscape: the pitch axis follows the screen, both systems the same way.
{
  const p = deg(gyroOffsets(0, -GYRO_HOLD_DEG, 90).pitch);
  assert(Math.abs(p) < 0.001, `landscape natural hold must be level, got ${p.toFixed(1)}°`);
}

// The calibrated mapping is only useful if the production input path
// actually subscribes after the user's permission gesture.
{
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert(app.includes("window.addEventListener('deviceorientation', onDeviceOrientation, true)"),
    'enableGyro must subscribe to device orientation');
  assert(app.includes('DeviceOrientationEvent.requestPermission()'),
    'iOS gyro permission stays inside the user gesture path');
}

console.log('gyro: all checks passed · natural hold = level · windowed at ±40°, full tilt reaches ±85° · recentre works · sky agrees');

// ── The Pokémon-Go rule: a decisive tilt actually reaches the sky ─────
// The room window still owns natural holds, but past the window the tilt
// keeps going, so the planetarium (which engages past ~45° of pitch) is
// reachable by raising the phone — and the ground by pointing at it.
{
  // small tilts: unchanged window behaviour, gain 0.85
  const small = deg(gyroOffsets(60, 0).pitch);           // 12° up minus deadzone
  assert(Math.abs(small - (12 - 2.5) * 0.85) < 0.01,
    `inside the window the gain must be untouched, got ${small.toFixed(2)}°`);
  // full tilt up (phone flat overhead, beta 0): must clear the 45° sky gate
  const up = deg(gyroOffsets(0, 0).pitch);
  assert(up > 45, `full tilt up must reach the sky (>45°), got ${up.toFixed(1)}°`);
  assert(up <= 85, `tilt authority must stay bounded (<=85°), got ${up.toFixed(1)}°`);
  // full tilt down (beta 150): must clear the ground gate the same way
  const down = deg(gyroOffsets(150, 0).pitch);
  assert(down < -45, `full tilt down must reach the ground (<-45°), got ${down.toFixed(1)}°`);
  // monotonic through the window boundary — no kink a hand can feel
  let prev = -Infinity;
  for (let b = 150; b >= 0; b -= 5) {
    const v = deg(gyroOffsets(b, 0).pitch);
    assert(v >= prev - 0.001, `pitch must rise smoothly as the phone tilts up (beta ${b})`);
    prev = v;
  }
}
console.log('gyro reach: tilt-to-sky and tilt-to-ground assertions pass');
