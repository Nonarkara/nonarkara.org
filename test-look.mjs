// The look integrator — the Doom contract, held by assertions.
// One owner, 1:1 response, the hand always wins, blends from pitch.
import assert from 'node:assert';
import { Look, damp, overheadBlend, underfootBlend } from './look.js';

const deg = r => r * 180 / Math.PI;

// ── 1:1, same frame. No easing on the hand — ever. ───────────
{
  const l = new Look();
  l.addDelta(0.5, -0.3);
  assert.equal(l.yaw, 0.5, 'yaw applies fully, immediately');
  assert.equal(l.pitch, -0.3, 'pitch applies fully, immediately');
  const eff = l.tick(1 / 60);
  assert.equal(eff.yaw, 0.5, 'tick must not smooth the hand away');
}

// ── Visual easing is elapsed-time based, not refresh-rate based ─────
{
  let at60 = 0, at120 = 0;
  for (let i = 0; i < 60; i++) at60 = damp(at60, 1, 3.4, 1 / 60);
  for (let i = 0; i < 120; i++) at120 = damp(at120, 1, 3.4, 1 / 120);
  assert(Math.abs(at60 - at120) < 1e-10,
    `one second must ease equally at 60Hz (${at60}) and 120Hz (${at120})`);
}

// ── Pitch clamps at ±89°, yaw never does ─────────────────────
{
  const l = new Look();
  l.addDelta(0, 99); assert(deg(l.pitch) < 89.5, 'never past vertical');
  l.addDelta(0, -99); assert(deg(l.pitch) > -89.5, 'never under the floor');
  for (let i = 0; i < 100; i++) l.addDelta(0.5, 0);
  assert(l.yaw > 40, 'you can spin forever');
}

// ── The hand cancels a programmatic aim ───────────────────────
{
  const l = new Look();
  l.aimAt(3, 1.2, 0.1);
  l.tick(1 / 60);
  assert(l.aim, 'aim in flight');
  l.addDelta(0.01, 0);
  assert(!l.aim, 'the hand always wins — rule 1');
}

// ── Aims arrive, and framerate does not change the journey ────
{
  const a = new Look(); a.aimAt(1.0, 0.8, 0.1);
  for (let i = 0; i < 240; i++) a.tick(1 / 60);
  assert(Math.abs(a.yaw - 1.0) < 0.01 && Math.abs(a.pitch - 0.8) < 0.01, 'aim completes');
  assert(!a.aim, 'and releases ownership');

  const b60 = new Look(); b60.aimAt(1.0, 0, 0.1);
  const b120 = new Look(); b120.aimAt(1.0, 0, 0.1);
  for (let i = 0; i < 30; i++) b60.tick(1 / 60);
  for (let i = 0; i < 60; i++) b120.tick(1 / 120);
  assert(Math.abs(b60.yaw - b120.yaw) < 0.02,
    `same half-second, same place: 60Hz ${b60.yaw.toFixed(3)} vs 120Hz ${b120.yaw.toFixed(3)}`);
}

// ── Turn rate is per-second, not per-frame ────────────────────
{
  const a = new Look(); a.setTurnRate(1.9);
  for (let i = 0; i < 60; i++) a.tick(1 / 60);
  assert(Math.abs(a.yaw - 1.9) < 0.01, 'one second at 1.9 rad/s is 1.9 rad');
  const b = new Look(); b.setTurnRate(1.9);
  for (let i = 0; i < 120; i++) b.tick(1 / 120);
  assert(Math.abs(a.yaw - b.yaw) < 0.01, '120Hz must not turn twice as fast');
}

// ── Gyro is an offset, never a writer ─────────────────────────
{
  const l = new Look();
  l.addDelta(0.4, 0.2);
  l.gyroPitch = 0.3;
  const eff = l.tick(1 / 60);
  assert(Math.abs(eff.pitch - 0.5) < 1e-9, 'gyro adds on top');
  assert(Math.abs(l.pitch - 0.2) < 1e-9, 'but never touches the state itself');
}

// ── Sky and ground come from pitch alone ──────────────────────
{
  assert.equal(overheadBlend(0), 0, 'level: no sky');
  // Threshold raised to ~31°: a phone held naturally while walking sits
  // 20–28° up, and the sky must not wash in mid-stride.
  assert.equal(overheadBlend(0.50), 0, 'a naturally-held phone: no sky');
  assert.equal(overheadBlend(1.06), 1, 'past 60°: full sky');
  const mid = overheadBlend(0.8);
  assert(mid > 0.3 && mid < 0.7, 'the transition is a glance, not a switch');
  assert.equal(underfootBlend(-1.06), 1, 'looking down: full map');
  assert.equal(underfootBlend(1.06), 0, 'the two can never be on together');
  // Monotonic — a wobble at the boundary cannot flap.
  let prev = -1;
  for (let p = 0; p <= 1.55; p += 0.05) {
    const v = overheadBlend(p);
    assert(v >= prev - 1e-9, 'blend must be monotonic in pitch');
    prev = v;
  }
}

console.log('look: all checks passed · one owner, 1:1, the hand always wins');
