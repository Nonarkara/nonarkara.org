// Self-check for the Villa Savoye plan and the walk collision.
// `node test-savoye.mjs`
//
// Mirrors test-pavilion.mjs. What these catch: a ground floor that has
// crept out to the edge of the box (which kills the pilotis), a ramp
// that has stopped running through the middle (which kills the
// promenade), a front door you cannot get through, and glass you can.
import assert from 'node:assert';
import { PLAN, groundWall, colliderBoxes } from './savoye.js';
import { PLAN as GLASS } from './glasshouse.js';
import { PLAN as PAVILION } from './pavilion.js';
import { Walk } from './walk.js';

const RADIUS = 0.34;   // must match walk.js

// ── Real dimensions ───────────────────────────────────────
assert.equal(PLAN.box.w, 21.5, 'the box is 21.5m');
assert.equal(PLAN.box.w, PLAN.box.d, 'the box is square');
assert.equal(PLAN.bay, 4.75, 'the structural bay is 4.75m');
assert.equal(PLAN.levels.first, 3.5, 'ground floor clear height must stay at 3.5m');
assert.equal(PLAN.levels.firstTop - PLAN.levels.first, 3.0,
  'the living floor is 3.0m clear');

// ── Free façade: the box cantilevers past the columns ─────
{
  const outer = Math.max(...PLAN.cols);
  const over = PLAN.box.w / 2 - outer;
  assert(over > 0.8 && over < 2.0,
    `cantilever is ${over.toFixed(2)}m — the façade must hang off the frame, not stand on it`);
  // Regular grid, no invented spacings.
  for (let i = 1; i < PLAN.cols.length; i++) {
    assert.equal(+(PLAN.cols[i] - PLAN.cols[i - 1]).toFixed(3), PLAN.bay,
      'the column grid must stay regular');
  }
}

// ── The promenade owns the axis ───────────────────────────
// No column stands in the middle line, and the ramp runs the depth of
// the house through it. Lose either and it stops being Savoye.
{
  for (const b of colliderBoxes(PLAN)) {
    const isRamp = b.maxZ === PLAN.ramp.z1 && b.minZ === PLAN.ramp.z0;
    if (isRamp) continue;
    assert(!(b.minX < 0 && b.maxX > 0 && b.minZ > PLAN.ground.back && b.maxZ < PLAN.ground.chordZ),
      `something solid sits on the centre line at z=${b.minZ}`);
  }
  assert.equal(PLAN.ramp.x, 0, 'the ramp must be on the axis');
  const span = PLAN.ramp.z1 - PLAN.ramp.z0;
  assert(span > PLAN.box.d / 2, `the ramp runs only ${span.toFixed(1)}m — it must cross the house`);
  // 1:5 or gentler per flight, or it is a staircase pretending.
  const rise = PLAN.levels.roof / PLAN.ramp.flights;
  assert(span / rise > 5, `ramp slope is 1:${(span / rise).toFixed(1)} — too steep to be a ramp`);
}

// ── You arrive at the complete elevation ──────────────────
// The terrace is a quadrant cut out of the box. Put it on the side the
// visitor walks up to and the house loses its face.
{
  const arriveSide = PLAN.spawn.z > 0 ? 'south' : 'north';
  assert.notEqual(PLAN.terrace, arriveSide,
    'the open terrace is on the elevation you arrive at — the front wall is missing');
}

// ── The set-back: the ground floor is inside the columns ──
// This is what makes the house float. If any ground-floor wall reaches
// the outer column line, the pilotis are decoration.
{
  const outer = Math.max(...PLAN.cols);
  for (const [x0, z0, x1, z1] of groundWall(PLAN)) {
    for (const [x, z] of [[x0, z0], [x1, z1]]) {
      assert(Math.abs(x) < outer && Math.abs(z) < outer,
        `the ground floor reaches ${x.toFixed(2)},${z.toFixed(2)} — past the columns`);
    }
  }
}

// ── The curve is a car, not a shape ───────────────────────
{
  const r = PLAN.ground.fillet;
  assert(r > 4.5 && r < 7,
    `a ${r}m radius is not a car's turning circle — the curve loses its reason`);
}

// ── The wall closes: every segment meets the next ─────────
// The ground floor is an enclosure, unlike the Pavilion's free planes.
// A gap here is a hole you fall out of.
{
  const segs = groundWall(PLAN);
  const ends = segs.flatMap(([x0, z0, x1, z1]) => [[x0, z0], [x1, z1]]);
  for (const [x, z] of ends) {
    const touching = ends.filter(([a, b]) => Math.hypot(a - x, b - z) < 1e-6).length;
    const atDoor = Math.abs(z - PLAN.ground.chordZ) < 1e-6 && Math.abs(Math.abs(x) - PLAN.ground.door) < 1e-6;
    assert(touching >= 2 || atDoor,
      `the ground-floor wall has a loose end at ${x.toFixed(2)},${z.toFixed(2)}`);
  }
}

// ── The triangle: generous walking distance, all three ─────
{
  const O = { PAVILION: { x: 0, z: 0 }, GLASS: GLASS.origin, SAVOYE: PLAN.origin };
  const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  for (const [a, b] of [['PAVILION', 'GLASS'], ['PAVILION', 'SAVOYE'], ['GLASS', 'SAVOYE']]) {
    const m = d(O[a], O[b]);
    assert(m > 90 && m < 140, `${a}→${b} is ${m.toFixed(0)}m — the walk must be a real walk`);
  }
  // And no two footprints overlap on the shared ground plane.
  const reach = { PAVILION: PAVILION.podium.w / 2, GLASS: GLASS.podium.d / 2, SAVOYE: PLAN.box.d / 2 };
  for (const [a, b] of [['PAVILION', 'GLASS'], ['PAVILION', 'SAVOYE'], ['GLASS', 'SAVOYE']]) {
    assert(d(O[a], O[b]) > reach[a] + reach[b], `${a} and ${b} overlap on the ground plane`);
  }
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

// The spawn must be on the grass, not inside a column or the glass.
{
  const w = mkWalk(BOXES, PLAN.spawn);
  assert(!w._blocked(PLAN.spawn.x, PLAN.spawn.z), 'you arrive standing inside the house');
}

// You walk in under the box, through the front door, and stop at the
// ramp — which is exactly what the building does to you.
{
  const w = mkWalk(BOXES, PLAN.spawn);
  w.keys.add('w');                                  // yaw 0 → forward is -z
  step(w, 0, 420);
  assert(w.pos.z < PLAN.ground.chordZ,
    `stopped at z=${w.pos.z.toFixed(2)} — could not get through the front door`);
  assert(w.pos.z > PLAN.ramp.z1,
    `ended at z=${w.pos.z.toFixed(2)} — walked straight through the ramp`);
}

// The doorway is wide enough for a person and nothing else is.
{
  const clear = PLAN.ground.door * 2 - RADIUS * 2;
  assert(clear > 0.9, `a ${(PLAN.ground.door * 2).toFixed(2)}m door leaves only ${clear.toFixed(2)}m clear`);
  const w = mkWalk(BOXES, { x: 4.0, z: 10.0 });     // off the axis, at the glass
  w.keys.add('w');
  step(w, 0, 300);
  assert(w.pos.z > PLAN.ground.back,
    `walked through the ground floor — ended at z=${w.pos.z.toFixed(2)}`);
}

// A column stops you. If it does not, the pilotis are drawings.
{
  const w = mkWalk(BOXES, { x: 9.5, z: 13.0 });
  w.keys.add('w');
  step(w, 0, 240);
  assert(w.pos.z > 9.5, `walked through a piloti — ended at z=${w.pos.z.toFixed(2)}`);
}

console.log(
  `savoye: all checks passed · ${PLAN.box.w}×${PLAN.box.d}m on ${PLAN.bay}m bays · ` +
  `${PLAN.ramp.flights}-flight ramp · ${BOXES.length} colliders · at ${PLAN.origin.x},${PLAN.origin.z}`
);
