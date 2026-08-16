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
  const pitch = clamp(dPitch * GYRO_GAIN, -GYRO_MAX_DEG, GYRO_MAX_DEG) * Math.PI / 180;
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

// The gyro can NEVER dominate. Whatever the phone does, the offset stays
// inside ±40° — so the finger always has somewhere to go.
for (let b = -180; b <= 180; b += 5) {
  for (const g of [-90, -45, 0, 45, 90]) {
    const p = deg(gyroOffsets(b, g).pitch);
    assert(p <= GYRO_MAX_DEG + 0.001 && p >= -GYRO_MAX_DEG - 0.001,
      `gyro pitch ${p.toFixed(0)}° escaped the clamp at beta ${b}`);
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

console.log('gyro: all checks passed · natural hold = level · clamped to ±40° · recentre works · sky agrees');
