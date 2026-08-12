// Self-check for the Cybertruck: wedge profile, bicycle physics,
// collisions, and the exit spot. `node test-drive.mjs`
import assert from 'node:assert';
import { Drive, PROFILE, TRUCK } from './drive.js';

// ── The wedge is a wedge ──────────────────────────────────
{
  const ys = PROFILE.map(p => p[1]);
  const apex = Math.max(...ys);
  const apexIdx = ys.indexOf(apex);
  assert(apexIdx > 0 && apexIdx < PROFILE.length - 1, 'apex is mid-profile — the crease');
  assert(apex > 1.6 && apex < 2.0, 'roofline at truck height');
  assert(PROFILE[0][0] < 0 && PROFILE[PROFILE.length - 1][0] > 0, 'nose to tail');
  // Zero-radius: every segment is a straight line by construction.
}

const cam = {
  position: { x: 0, y: 0, z: 0 },
};

const mk = (colliders = [], spawn = { x: 0, z: 0, yaw: 0 }) => {
  const d = new Drive(cam, colliders, spawn);
  d.active = true;
  d.keys = new Set();
  return d;
};
const run = (d, n = 60, dt = 1 / 60) => { for (let i = 0; i < n; i++) d.update(dt); };

// ── W accelerates along −Z at yaw 0 ───────────────────────
{
  const d = mk();
  d.keys.add('w');
  run(d, 120);
  assert(d.pos.z < -4, `should have driven forward (z=${d.pos.z.toFixed(1)})`);
  assert(Math.abs(d.pos.x) < 0.01, 'no drift without steering');
  assert(d.v > 4, 'gathers real speed');
}

// ── Speed is capped ───────────────────────────────────────
{
  const d = mk();
  d.keys.add('w');
  run(d, 600);
  assert(d.v <= TRUCK.VMAX + 0.01, `v ${d.v.toFixed(1)} exceeds VMAX`);
}

// ── Steering only turns a moving truck ────────────────────
{
  const d = mk();
  d.keys.add('a');
  run(d, 60);
  assert(Math.abs(d.yaw) < 0.02, 'a parked truck does not spin');
  d.keys.add('w');
  run(d, 120);
  assert(Math.abs(d.yaw) > 0.15, 'a moving truck turns');
}

// ── Drive proposes a chase view; it never writes camera rotation ──
{
  const d = mk();
  d.keys.add('w');
  const view = d.update(1 / 60);
  assert(Number.isFinite(view.yaw) && Number.isFinite(view.pitch), 'chase view is finite');
  assert(view.pitch < 0, 'the elevated chase camera looks down toward the truck');
}

// ── Steering response is elapsed-time based ────────────────
{
  const a = mk(), b = mk();
  a.keys.add('w'); a.keys.add('a');
  b.keys.add('w'); b.keys.add('a');
  run(a, 60, 1 / 60);
  run(b, 120, 1 / 120);
  assert(Math.abs(a.steer - b.steer) < 0.002,
    `one second of steering must agree at 60/120Hz (${a.steer} vs ${b.steer})`);
  assert(Math.abs(a.yaw - b.yaw) < 0.03,
    `turning must stay close at 60/120Hz (${a.yaw} vs ${b.yaw})`);
}

// ── A wall stops it (soft bounce, never through) ──────────
{
  const wall = { minX: -10, maxX: 10, minZ: -12, maxZ: -11 };
  const d = mk([wall]);
  d.keys.add('w');
  run(d, 400);
  assert(d.pos.z > -11 + 1.0, `drove into the wall (z=${d.pos.z.toFixed(1)})`);
}

// ── High colliders don't block (driving under a slab) ─────
{
  const slab = { minX: -10, maxX: 10, minZ: -12, maxZ: -11, minY: 3.5, maxY: 6.5 };
  const d = mk([slab]);
  d.keys.add('w');
  run(d, 300);
  assert(d.pos.z < -12, 'a slab 3.5m up must not stop a 1.8m truck');
}

// ── Estate boundary holds ─────────────────────────────────
{
  const d = mk([], { x: 0, z: -215, yaw: 0 });
  d.keys.add('w');
  run(d, 600);
  assert(Math.hypot(d.pos.x, d.pos.z) <= 221, 'left the estate');
}

// ── Exit spot is beside the truck, not inside it ──────────
{
  const d = mk();
  const s = d.exitSpot();
  const dist = Math.hypot(s.x - d.pos.x, s.z - d.pos.z);
  assert(dist > TRUCK.WID / 2 && dist < 4, `exit spot at ${dist.toFixed(2)}m`);
}

console.log('drive: all checks passed · wedge profile · bicycle model · walls hold · exit clear');
