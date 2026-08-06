// Self-check for the Pavilion plan and the walk collision.
// `node test-pavilion.mjs`
//
// The failures these catch are the ones you cannot see in a screenshot:
// a wall you can walk through, a wall that traps you, a plan whose walls
// touch each other (which quietly turns Mies back into a box).
import assert from 'node:assert';
import { PLAN } from './pavilion.js';
import { Walk } from './walk.js';

// ── The defining property: no wall touches another ────────────
// If two walls meet, the space stops being continuous and the whole
// argument of the building is gone. Endpoints must stay apart.
{
  const segs = PLAN.walls.filter(w => !w.id.startsWith('court'));  // the court IS a U, on purpose
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i], b = segs[j];
      for (const p of [[a.x0, a.z0], [a.x1, a.z1]]) {
        for (const q of [[b.x0, b.z0], [b.x1, b.z1]]) {
          const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
          assert(d > 0.5, `walls ${a.id} and ${b.id} meet at ${p} — the plan has become a box`);
        }
      }
    }
  }
}

// ── Clear height is the reason it feels domestic ──────────────
assert.equal(PLAN.roof.y, 3.1, 'clear height must stay at the real 3.1m');

// ── Eight columns, two rows of four ───────────────────────────
assert.equal(PLAN.columnRows.length * PLAN.columnXs.length, 8, 'the Pavilion has eight columns');

// ── Columns sit under the roof, not outside it ────────────────
for (const x of PLAN.columnXs) {
  assert(x > PLAN.roof.x0 && x < PLAN.roof.x1, `column x=${x} is outside the roof`);
}
for (const z of PLAN.columnRows) {
  assert(z > PLAN.roof.z0 && z < PLAN.roof.z1, `column z=${z} is outside the roof`);
}

// ── Everything is on the podium ───────────────────────────────
{
  const hw = PLAN.podium.w / 2, hd = PLAN.podium.d / 2;
  for (const w of PLAN.walls) {
    for (const [x, z] of [[w.x0, w.z0], [w.x1, w.z1]]) {
      assert(Math.abs(x) <= hw && Math.abs(z) <= hd, `wall ${w.id} runs off the podium at ${x},${z}`);
    }
  }
  for (const p of PLAN.pools) {
    assert(p.x0 >= -hw && p.x1 <= hw && p.z0 >= -hd && p.z1 <= hd, `pool ${p.id} runs off the podium`);
  }
}

// ── Walking ───────────────────────────────────────────────────
const camera = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
const mkWalk = (colliders, spawn) => {
  const w = new Walk(camera, colliders, spawn);
  w.enabled = true;
  return w;
};
const step = (w, yaw, n = 60, dt = 1 / 60) => { for (let i = 0; i < n; i++) w.update(dt, yaw); };

// A wall you can walk through is the classic bug. Walls in these tests
// are made long so that sliding cannot simply run off the end and let
// the blocked axis free again — that is a real behaviour, but it is not
// what is under test here.
{
  const wall = [{ minX: -50, maxX: 50, minZ: -0.2, maxZ: 0.2 }];
  const w = mkWalk(wall, { x: 0, z: 3 });
  w.keys.add('w');                        // yaw 0 → forward is -z, into the wall
  step(w, 0, 240);
  assert(w.pos.z > 0.2, `walked through the wall — ended at z=${w.pos.z.toFixed(2)}`);
}

// Sliding along a wall, not sticking to it.
{
  const wall = [{ minX: -50, maxX: 50, minZ: -0.2, maxZ: 0.2 }];
  const w = mkWalk(wall, { x: 0, z: 1.0 });
  w.keys.add('w'); w.keys.add('d');       // into the wall AND along it
  const x0 = w.pos.x;
  step(w, 0, 180);
  assert(w.pos.z > 0.2, 'must not pass through');
  assert(Math.abs(w.pos.x - x0) > 1.0, `must slide along the wall, moved only ${(w.pos.x - x0).toFixed(2)}m`);
}

// Sliding off the END of a wall should free you — the inverse check, so
// the collision cannot be "correct" by simply never letting you move.
{
  const wall = [{ minX: -3, maxX: 3, minZ: -0.2, maxZ: 0.2 }];
  const w = mkWalk(wall, { x: 0, z: 1.0 });
  w.keys.add('w'); w.keys.add('d');
  step(w, 0, 400);
  assert(w.pos.z < 0.2, 'past the end of a wall you should be able to continue');
}

// You stop when you let go, and within a sensible distance.
{
  const w = mkWalk([], { x: 0, z: 0 });
  w.keys.add('w');
  step(w, 0, 60);
  const moving = Math.hypot(w.vel.x, w.vel.z);
  assert(moving > 1, 'should be up to speed after a second');
  w.keys.clear();
  step(w, 0, 90);
  assert(Math.hypot(w.vel.x, w.vel.z) < 0.05, 'should have come to rest');
}

// Speed is a walk, not a sprint — and shift is slower, not faster.
{
  const w = mkWalk([], { x: 0, z: 0 });
  w.keys.add('w'); step(w, 0, 120);
  const fast = Math.hypot(w.vel.x, w.vel.z);
  const s = mkWalk([], { x: 0, z: 0 });
  s.keys.add('w'); s.keys.add('shift'); step(s, 0, 120);
  const slow = Math.hypot(s.vel.x, s.vel.z);
  assert(fast > slow, 'shift must slow you down, not speed you up');
  assert(fast <= 4.3, `top speed ${fast.toFixed(2)} m/s is a run, not a walk`);
}

// A long stall must not fling you across the building.
{
  const w = mkWalk([], { x: 0, z: 0 });
  w.keys.add('w');
  w.update(30, 0);              // tab was backgrounded for half a minute
  assert(Math.abs(w.pos.z) < 1, `a 30s frame moved you ${Math.abs(w.pos.z).toFixed(1)}m`);
}

// The spawn point must not be inside something solid.
{
  const boxes = [];
  for (const p of PLAN.pools) boxes.push({ minX: p.x0, maxX: p.x1, minZ: p.z0, maxZ: p.z1 });
  const w = mkWalk(boxes, PLAN.spawn);
  assert(!w._blocked(PLAN.spawn.x, PLAN.spawn.z), 'you spawn inside the pool');
}


// ── Keyboard semantics ────────────────────────────────────────
// Arrows that strafe leave a keyboard-only visitor unable to change
// direction at all: sliding sideways forever, facing the same wall.
{
  const w = mkWalk([], { x: 0, z: 0 });

  // Left/Right must TURN, not move.
  w.keys.add('arrowleft');
  assert.equal(w.turnInput(), 1, 'ArrowLeft must turn left');
  step(w, 0, 60);
  assert(Math.hypot(w.vel.x, w.vel.z) < 0.01, 'ArrowLeft must not translate you');
  w.keys.clear();

  w.keys.add('arrowright');
  assert.equal(w.turnInput(), -1, 'ArrowRight must turn right');
  w.keys.clear();

  // Both held cancels rather than compounding.
  w.keys.add('arrowleft'); w.keys.add('arrowright');
  assert.equal(w.turnInput(), 0, 'both arrows held should cancel');
  w.keys.clear();

  // Up/Down still walk.
  w.keys.add('arrowup'); step(w, 0, 60);
  assert(Math.hypot(w.vel.x, w.vel.z) > 1, 'ArrowUp must walk forward');
  w.keys.clear();

  // A/D and Q/E still strafe, and strafing is sideways to the gaze.
  const s2 = mkWalk([], { x: 0, z: 0 });
  s2.keys.add('d'); step(s2, 0, 60);
  assert(Math.abs(s2.vel.x) > 1 && Math.abs(s2.vel.z) < 0.2,
    `D at yaw 0 must strafe along X, got vx=${s2.vel.x.toFixed(2)} vz=${s2.vel.z.toFixed(2)}`);
  assert.equal(s2.turnInput(), 0, 'strafing must not also turn you');
}

console.log(`pavilion: all checks passed · ${PLAN.walls.length} walls · ${PLAN.columnRows.length * PLAN.columnXs.length} columns · ${PLAN.podium.w}×${PLAN.podium.d}m podium`);
