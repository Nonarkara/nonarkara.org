// Pokémon GO AR window. Hold it upright to see the room; tilt up for
// the sky. One mapping, shared by the room and the sky, imported from
// look.js so the tests cannot drift from production.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import {
  deviceLook, pitchFromBeta, headingDelta, overheadBlend, underfootBlend, Look,
} from './look.js';

const deg = (r) => r * 180 / Math.PI;

// ── Upright = horizon, tilt up = sky, tilt down = ground ─────
assert(Math.abs(deg(deviceLook(0, 90, 0).pitch)) < 1,
  `phone upright must look at the horizon, got ${deg(deviceLook(0, 90, 0).pitch).toFixed(0)}°`);
assert(deg(deviceLook(0, 0, 0).pitch) > 85,
  `phone flat must look straight up, got ${deg(deviceLook(0, 0, 0).pitch).toFixed(0)}°`);
assert(deg(deviceLook(0, 140, 0).pitch) < -30,
  `phone tipped down must look at the ground, got ${deg(deviceLook(0, 140, 0).pitch).toFixed(0)}°`);

// The browsing hold (beta ~72°) is slightly UP, not "level". Level is
// upright. That is the whole Pokémon GO contract in one assertion.
{
  const browsing = deg(deviceLook(0, 72, 0).pitch);
  assert(browsing > 15 && browsing < 22,
    `a 72° browsing hold must look ~18° up, got ${browsing.toFixed(1)}°`);
}

// pitchFromBeta is the same function the sky uses.
assert.equal(pitchFromBeta(90, 0), deviceLook(0, 90, 0).pitch);
assert.equal(pitchFromBeta(0, 0), deviceLook(0, 0, 0).pitch);

// Monotonic: tilting up must never look further down.
{
  let prev = -Infinity;
  for (let b = 170; b >= 0; b -= 10) {
    const p = deg(deviceLook(0, b, 0).pitch);
    assert(p >= prev - 0.001, `pitch must rise as beta falls (beta ${b})`);
    prev = p;
  }
}
{
  const p = deg(deviceLook(0, 0, -90, 90).pitch);
  assert(Math.abs(p) < 5, `landscape upright must look at the horizon, got ${p.toFixed(0)}°`);
}
for (const [b, g] of [[-180, 0], [180, 0], [0, 0], [360, 0]]) {
  const p = deg(deviceLook(0, b, g).pitch);
  assert(p <= 89.001 && p >= -89.001, `pitch ${p.toFixed(0)}° out of range for beta ${b}`);
}

// Tilting up reaches the stars. The old ±40° clamp could not.
{
  const flat = deviceLook(0, 0, 0).pitch;
  assert(overheadBlend(flat) === 1, 'phone flat must be full sky');
  const tilt = deviceLook(0, 20, 0).pitch;          // 70° up
  assert(overheadBlend(tilt) === 1, 'a real tilt up must be full sky');
  const upright = deviceLook(0, 90, 0).pitch;
  assert(overheadBlend(upright) === 0, 'upright must be the room, not the sky');
  assert(underfootBlend(deviceLook(0, 175, 0).pitch) === 1, 'phone tipped over is the map');
}

// Gyro still adds on top of the finger — it never writes Look.pitch.
{
  const l = new Look();
  l.gyroPitch = deviceLook(0, 0, 0).pitch;
  const eff = l.tick(1 / 60);
  assert(overheadBlend(eff.pitch) === 1, 'AR gyro offset must be able to reach the sky');
  assert.equal(l.pitch, 0, 'without writing the owned pitch');
}

// Yaw: turning the phone right (alpha decreases) looks right (yaw down),
// same sign as a mouse-right drag.
{
  const a = deviceLook(0, 90, 0, 0, 0).yaw;
  const b = deviceLook(-10, 90, 0, 0, 0).yaw;
  assert(b < a, `turning right must decrease yaw (${deg(a).toFixed(1)} → ${deg(b).toFixed(1)})`);
}
{
  const p = deviceLook(40, 90, 0, 0, 40);
  assert(Math.abs(deg(p.yaw)) < 0.001, 'headingZero makes the current heading forward');
  assert(Math.abs(deg(p.pitch)) < 1, 'and does not touch pitch');
}

// Heading steps wrap, and drop the iOS compass kick-in.
assert(Math.abs(deg(headingDelta(10, 20)) - 10) < 0.001, 'step of +10°');
assert(Math.abs(deg(headingDelta(350, 10)) - 20) < 0.001, 'wraps across 0');
assert.equal(headingDelta(0, 180), 0, 'compass kick-in (~180°) is ignored');
assert.equal(headingDelta(null, 40), 0, 'first sample is not a step');

// The production input path still subscribes after the permission gesture,
// and it uses the shared AR mapping rather than a mirrored offset.
{
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert(app.includes("window.addEventListener('deviceorientation', onDeviceOrientation, true)"),
    'enableGyro must subscribe to device orientation');
  assert(app.includes('DeviceOrientationEvent.requestPermission()'),
    'iOS gyro permission stays inside the user gesture path');
  assert(app.includes('deviceLook('), 'room gyro must use the Pokémon GO mapping');
  assert(!app.includes('GYRO_MAX_DEG'), 'the ±40° clamp is gone — tilt must reach the sky');
  assert(!app.includes('GYRO_HOLD_DEG'), 'horizon is upright, not a calibrated hold');
  assert(app.includes('LOOK.gyroPitch = gyroEnabled ?  gyroSmoothY : 0') ||
         app.includes('LOOK.gyroPitch = gyroEnabled ? gyroSmoothY : 0'),
    'AR pitch must not fade while a finger is on the glass');
}

console.log('gyro: all checks passed · upright = horizon · tilt up = sky · 1:1, unclamped');
