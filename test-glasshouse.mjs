// Self-check for the Glass House plan and the walk collision.
// `node test-glasshouse.mjs`
//
// Mirrors test-pavilion.mjs. The failures these catch are the ones a
// screenshot cannot show you: glass you can walk through, a doorway too
// narrow to fit through, a brick cylinder that has quietly eaten the
// only room in the house.
import assert from 'node:assert';
import { PLAN, colliderBoxes } from './glasshouse.js';
import { PLAN as SAVOYE } from './savoye.js';
import { PLAN as PAVILION } from './pavilion.js';
import { Walk } from './walk.js';

const RADIUS = 0.34;   // must match walk.js — if that changes, this fails loudly

// ── The defining property: it is ONE ROOM ─────────────────
// Two solids inside, and only two: the brick cylinder and the walnut
// cabinet. Anything else and Johnson has built a house with rooms in it.
{
  const solids = colliderBoxes(PLAN).length - 8;   // 8 is the four glazed sides, split by their doors
  assert.equal(solids, 2, `the Glass House has one room — found ${solids} interior solids`);
}

// ── Real dimensions ───────────────────────────────────────
assert.equal(PLAN.house.h, 3.2, 'clear height must stay at the real 3.2m (10\'6")');
assert.equal(PLAN.house.w, 9.75, 'the house is 32 feet wide');
assert.equal(PLAN.house.d, 17.0, 'the house is 56 feet long');

// ── The cylinder is the only thing that goes through the roof ──
assert(PLAN.cylinder.h > PLAN.house.h,
  'the brick cylinder must break the roof line — it is the only vertical move in the house');
assert(PLAN.cabinet.h < 1.9,
  'the cabinet must be low enough to see over, or it is a wall');

// ── Everything sits inside the house, and the house on the podium ──
{
  const hw = PLAN.house.w / 2, hd = PLAN.house.d / 2;
  const c = PLAN.cylinder;
  assert(Math.abs(c.x) + c.r < hw && Math.abs(c.z) + c.r < hd,
    'the cylinder pokes out through the glass');
  const k = PLAN.cabinet;
  assert(Math.abs(k.x) + k.w / 2 < hw && Math.abs(k.z) + k.d / 2 < hd,
    'the cabinet pokes out through the glass');
  // And the two must not occupy the same brick.
  const gap = Math.abs(c.x - k.x) - (c.r + k.w / 2);
  assert(gap > 0.5, `cylinder and cabinet are ${gap.toFixed(2)}m apart — they collide`);

  assert(PLAN.podium.w > PLAN.house.w && PLAN.podium.d > PLAN.house.d,
    'the house must stand on the brick terrace, not off it');
}

// ── Four doors, one per side, each wide enough for a person ──
{
  const clear = PLAN.door * 2 - RADIUS * 2;
  assert(clear > 0.9, `a ${(PLAN.door * 2).toFixed(2)}m doorway leaves only ${clear.toFixed(2)}m clear`);
}

// ── Dense estate: walkable between buildings, no trek ──────
{
  const O = { PAVILION: { x: 0, z: 0 }, GLASS: PLAN.origin, SAVOYE: SAVOYE.origin };
  const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  for (const [a, b] of [['PAVILION', 'GLASS'], ['PAVILION', 'SAVOYE'], ['GLASS', 'SAVOYE']]) {
    const m = d(O[a], O[b]);
    assert(m > 35 && m < 95, `${a}→${b} is ${m.toFixed(0)}m — dense estate (~40–60m centres)`);
  }
  assert(PAVILION.podium, 'the Pavilion plan must still be the one the walk collides against');
}

// ── Walking ───────────────────────────────────────────────
const camera = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
const mkWalk = (colliders, spawn) => {
  const w = new Walk(camera, colliders, spawn);
  w.enabled = true;
  return w;
};
const step = (w, yaw, n = 60, dt = 1 / 60) => { for (let i = 0; i < n; i++) w.update(dt, yaw); };
const BOXES = colliderBoxes(PLAN);

// The spawn point must not be inside anything solid.
{
  const w = mkWalk(BOXES, PLAN.spawn);
  assert(!w._blocked(PLAN.spawn.x, PLAN.spawn.z), 'you arrive standing inside the house');
}

// You can walk in the south door, through the one room, and out the
// north one. If this fails the house has become a vitrine.
{
  const w = mkWalk(BOXES, PLAN.spawn);
  w.keys.add('w');                                  // yaw 0 → forward is -z
  step(w, 0, 480);
  assert(w.pos.z < -PLAN.house.d / 2,
    `stopped at z=${w.pos.z.toFixed(2)} — could not walk through the house`);
}

// And you cannot walk through the glass beside the door.
{
  const w = mkWalk(BOXES, { x: 3.5, z: 10.0 });
  w.keys.add('w');
  step(w, 0, 300);
  assert(w.pos.z > PLAN.house.d / 2,
    `walked through the glass — ended at z=${w.pos.z.toFixed(2)}`);
}

// Nor through the brick cylinder, which is the whole point of it.
{
  const c = PLAN.cylinder;
  const w = mkWalk(BOXES, { x: c.x, z: c.z + 3.0 });
  w.keys.add('w');
  step(w, 0, 240);
  assert(w.pos.z > c.z, `walked through the brick — ended at z=${w.pos.z.toFixed(2)}`);
}

console.log(
  `glasshouse: all checks passed · ${PLAN.house.w}×${PLAN.house.d}m · ` +
  `${PLAN.house.h}m clear · ${BOXES.length} colliders · at ${PLAN.origin.x},${PLAN.origin.z}`
);
