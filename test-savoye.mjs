// Self-check for the Villa Savoye plan and the walk collision.
// `node test-savoye.mjs`
//
// Mirrors test-pavilion.mjs. What these catch: a ground floor that has
// crept out to the edge of the box (which kills the pilotis), a ramp
// that has stopped running through the middle (which kills the
// promenade), a front door you cannot get through, a car missing from
// under the house, and a ramp that no longer lifts you to the terrace.
import assert from 'node:assert';
import { PLAN, groundWall, colliderBoxes, floorPatches, rampStops } from './savoye.js';
import { PLAN as GLASS } from './glasshouse.js';
import { PLAN as PAVILION } from './pavilion.js';
import { Walk } from './walk.js';

const RADIUS = 0.34;   // must match walk.js
const EYE = 1.65;

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
// No column stands in the middle line. Ramp rails may sit on the
// centre strip; the solid slab-blocker that used to fill the whole
// ramp footprint must not return — that killed the walk up.
{
  for (const b of colliderBoxes(PLAN)) {
    const isRampRail = b.minZ === PLAN.ramp.z0 && b.maxZ === PLAN.ramp.z1
      && (b.maxX - b.minX) < PLAN.ramp.w * 0.5;
    if (isRampRail) continue;
    if (b.maxY != null && b.maxY <= 1.7) continue; // car / ground walls
    assert(!(b.minX < -0.5 && b.maxX > 0.5
        && b.minZ > PLAN.ground.back && b.maxZ < PLAN.ground.chordZ
        && b.minY == null),
      `something solid fills the centre line at z=${b.minZ}`);
  }
  assert.equal(PLAN.ramp.x, 0, 'the ramp must be on the axis');
  const span = PLAN.ramp.z1 - PLAN.ramp.z0;
  assert(span > PLAN.box.d / 2, `the ramp runs only ${span.toFixed(1)}m — it must cross the house`);
  // 1:5 or gentler per flight, or it is a staircase pretending.
  const rise = PLAN.levels.roof / PLAN.ramp.flights;
  assert(span / rise > 5, `ramp slope is 1:${(span / rise).toFixed(1)} — too steep to be a ramp`);
}

// ── You arrive at the complete elevation ──────────────────
{
  const arriveSide = PLAN.spawn.z > 0 ? 'south' : 'north';
  assert.notEqual(PLAN.terrace, arriveSide,
    'the open terrace is on the elevation you arrive at — the front wall is missing');
}

// ── The set-back: the ground floor is inside the columns ──
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

// ── The Traction Avant sits under the box ─────────────────
{
  const c = PLAN.car;
  const outer = PLAN.box.w / 2;
  assert(Math.abs(c.x) + c.body.l / 2 < outer,
    'the car sticks out past the cantilever');
  assert(c.z > PLAN.ramp.z1, 'the car blocks the ramp entrance');
  assert(c.z < PLAN.spawn.z, 'the car is not under the house — it is on the lawn');
  assert(Math.abs(c.x) > PLAN.ground.door + 0.8,
    'the car is parked in the doorway');
  // Collider present near the car.
  const hit = colliderBoxes(PLAN).some(b =>
    b.minX <= c.x && b.maxX >= c.x && b.minZ <= c.z && b.maxZ >= c.z && (b.maxY ?? 99) <= 2);
  assert(hit, 'no collider under the car — you can walk through it');
}

// ── The wall closes: every segment meets the next ─────────
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

// ── Floor patches: ramp climbs, living and roof exist ─────
{
  const patches = floorPatches(PLAN);
  assert(patches.some(p => p.kind === 'ramp'), 'no ramp floor patches');
  assert(patches.some(p => p.kind === 'living'), 'no living floor patch');
  assert(patches.some(p => p.kind === 'roof'), 'no roof floor patch');
  const stops = rampStops(PLAN);
  assert.equal(stops.length, PLAN.ramp.flights + 1);
  // South end of ramp: ground and living landings.
  const ramps = patches.filter(p => p.kind === 'ramp');
  const atEntry = ramps.map(p => p.heightAt(0, PLAN.ramp.z1)).filter(y => y != null);
  assert(atEntry.some(y => Math.abs(y) < 0.05), 'ramp does not meet the grass at +z');
  assert(atEntry.some(y => Math.abs(y - PLAN.levels.first) < 0.05),
    'ramp does not meet the living floor at +z');
  // Living floor beside the ramp, not inside the well.
  const living = patches.find(p => p.kind === 'living');
  assert.equal(living.heightAt(3, 0), PLAN.levels.first, 'living floor missing beside the ramp');
  assert.equal(living.heightAt(0, 0), null, 'living floor fills the ramp well');
  // North terrace — open to the sky (beside the ramp well, not in it).
  assert.equal(living.heightAt(3.5, -PLAN.box.d / 2 + 1.2), PLAN.levels.first,
    'north terrace is not walkable');
}

// ── The triangle: generous walking distance, all three ─────
{
  const O = { PAVILION: { x: 0, z: 0 }, GLASS: GLASS.origin, SAVOYE: PLAN.origin };
  const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  for (const [a, b] of [['PAVILION', 'GLASS'], ['PAVILION', 'SAVOYE'], ['GLASS', 'SAVOYE']]) {
    const m = d(O[a], O[b]);
    assert(m > 90 && m < 140, `${a}→${b} is ${m.toFixed(0)}m — the walk must be a real walk`);
  }
  const reach = { PAVILION: PAVILION.podium.w / 2, GLASS: GLASS.podium.d / 2, SAVOYE: PLAN.box.d / 2 };
  for (const [a, b] of [['PAVILION', 'GLASS'], ['PAVILION', 'SAVOYE'], ['GLASS', 'SAVOYE']]) {
    assert(d(O[a], O[b]) > reach[a] + reach[b], `${a} and ${b} overlap on the ground plane`);
  }
}

// ── Walking ───────────────────────────────────────────────
const camera = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
const BOXES = colliderBoxes(PLAN);
const FLOORS = floorPatches(PLAN);
const mkWalk = (colliders, spawn, floors = FLOORS) => {
  const w = new Walk(camera, colliders, spawn, floors);
  w.enabled = true;
  return w;
};
const step = (w, yaw, n = 60, dt = 1 / 60) => { for (let i = 0; i < n; i++) w.update(dt, yaw); };

// The spawn must be on the grass, not inside a column or the glass.
{
  const w = mkWalk(BOXES, PLAN.spawn);
  assert(!w._blocked(PLAN.spawn.x, PLAN.spawn.z), 'you arrive standing inside the house');
}

// You walk in under the box, through the front door, onto the ramp.
{
  const w = mkWalk(BOXES, PLAN.spawn);
  w.keys.add('w');                                  // yaw 0 → forward is -z
  step(w, 0, 480);
  assert(w.pos.z < PLAN.ground.chordZ,
    `stopped at z=${w.pos.z.toFixed(2)} — could not get through the front door`);
  assert(w.pos.z <= PLAN.ramp.z1 + 0.2,
    `ended at z=${w.pos.z.toFixed(2)} — never reached the ramp`);
}

// Climb the ramp to the living floor, then to the north terrace.
{
  const w = mkWalk(BOXES, { x: 0, z: PLAN.ramp.z1 + 0.15, floorY: 0 });
  const go = (yaw, n = 700) => {
    w.vel.x = 0; w.vel.z = 0;
    w.keys.clear();
    w.keys.add('w');
    step(w, yaw, n);
  };
  go(0);                      // flight 0 toward −z
  assert(w.floorY > 1.2,
    `after first flight floorY=${w.floorY.toFixed(2)} — ramp is not lifting the eye`);
  go(Math.PI);                // flight 1 toward +z → living
  assert(w.floorY >= PLAN.levels.first - 0.15,
    `living landing floorY=${w.floorY.toFixed(2)} — did not reach the second floor`);
  assert(camera.position.y >= PLAN.levels.first + EYE - 0.3,
    `camera y=${camera.position.y.toFixed(2)} — eye did not rise with the floor`);

  // Step off the ramp onto the living floor, walk to the north terrace.
  w.teleport(3.0, 0, PLAN.levels.first);
  go(0, 500);                 // face −z → north balcony
  assert(w.pos.z < -PLAN.box.d / 2 + 3.5,
    `terrace z=${w.pos.z.toFixed(2)} — could not reach the north balcony`);
  assert(Math.abs(w.floorY - PLAN.levels.first) < 0.2,
    `on terrace floorY=${w.floorY.toFixed(2)} — fell through the living floor`);
  // From here, looking up (pitch) is sky — the terrace has no head band.
  assert.equal(PLAN.terrace, 'north', 'terrace must stay on the north for sky view');
}

// Continue to the roof garden via the upper flights.
{
  const w = mkWalk(BOXES, { x: 0, z: PLAN.ramp.z1 - 0.15, floorY: PLAN.levels.first });
  w.floorY = w.floorAt(w.pos.x, w.pos.z);
  const go = (yaw, n = 700) => {
    w.vel.x = 0; w.vel.z = 0;
    w.keys.clear();
    w.keys.add('w');
    step(w, yaw, n);
  };
  go(0);                      // flight 2 toward −z
  assert(w.floorY > PLAN.levels.first + 0.8,
    `after third flight floorY=${w.floorY.toFixed(2)} — upper ramp stuck`);
  go(Math.PI);                // flight 3 toward +z → roof
  assert(w.floorY >= PLAN.levels.roof - 0.25,
    `roof floorY=${w.floorY.toFixed(2)} — promenade does not reach the garden`);
}

// The doorway is wide enough for a person and nothing else is.
{
  const clear = PLAN.ground.door * 2 - RADIUS * 2;
  assert(clear > 0.9, `a ${(PLAN.ground.door * 2).toFixed(2)}m door leaves only ${clear.toFixed(2)}m clear`);
  const w = mkWalk(BOXES, { x: 4.0, z: 10.0 });
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

// Living-floor walls must not block the grass under the cantilever.
{
  const w = mkWalk(BOXES, { x: 0, z: 12.0, floorY: 0 });
  assert(!w._blocked(0, PLAN.box.d / 2),
    'south living wall blocks the grass under the box');
  w.floorY = PLAN.levels.first;
  assert(w._blocked(0, PLAN.box.d / 2),
    'south living wall is missing once you are upstairs');
}

console.log(
  `savoye: all checks passed · ${PLAN.box.w}×${PLAN.box.d}m on ${PLAN.bay}m bays · ` +
  `${PLAN.ramp.flights}-flight ramp · car@${PLAN.car.x},${PLAN.car.z} · ` +
  `${BOXES.length} colliders · ${FLOORS.length} floors · at ${PLAN.origin.x},${PLAN.origin.z}`
);
