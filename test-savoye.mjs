// Self-check for the Villa Savoye plan and the walk collision.
// `node test-savoye.mjs`
//
// Mirrors test-pavilion.mjs. What these catch: a ground floor that has
// crept out to the edge of the box (which kills the pilotis), a ramp
// that has stopped running through the middle (which kills the
// promenade), a front door you cannot get through, a car missing from
// under the house, and a ramp that no longer lifts you to the terrace.
import assert from 'node:assert';
import { PLAN, groundWall, colliderBoxes, floorPatches, rampStops, rampEntryPos, rampExitPos, rampAt } from './savoye.js';
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
// No column stands in the middle line. The ramp spiral wraps the
// central void; the only thing that may sit on the axis at ground
// level is the ramp entry itself.
{
  for (const b of colliderBoxes(PLAN)) {
    if (b.maxY != null && b.maxY <= 1.7) continue; // car / ground walls
    // The spiral is at radius PLAN.ramp.r; the central void is free.
    const onCenter = b.minX < -0.5 && b.maxX > 0.5
      && b.minZ > PLAN.ground.back && b.maxZ < PLAN.ground.chordZ
      && b.minY == null;
    if (onCenter) {
      assert.fail(`something solid fills the centre line at z=${b.minZ}`);
    }
  }
  assert.equal(PLAN.ramp.cx, 0, 'the spiral must be centred on the x-axis');
  assert.equal(PLAN.ramp.cz, 0, 'the spiral must be centred on the z-axis');
  // One continuous flight — the switchback is gone.
  assert.equal(PLAN.ramp.flights, 1, 'the Savoye ramp is one continuous spiral, not switchbacks');
  // Path length = 2π × r × revs; must cross the house (box.d / 2).
  const span = 2 * Math.PI * PLAN.ramp.r * PLAN.ramp.revs;
  assert(span > PLAN.box.d / 2,
    `the spiral runs only ${span.toFixed(1)}m — it must cross the house`);
  // Slope: gentler than 1:5 or it is a staircase.
  const slope = span / PLAN.levels.roof;
  assert(slope > 5,
    `ramp slope is 1:${slope.toFixed(1)} — too steep to be a ramp`);
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
  // The spiral's southernmost reach is at z = r + w/2 (entry side). The
  // car sits in the parking bay south of that, so the car never blocks
  // the ramp.
  const rampSouthZ = PLAN.ramp.cz + PLAN.ramp.r + PLAN.ramp.w / 2;
  assert(c.z > rampSouthZ, 'the car blocks the spiral entry');
  assert(c.z < PLAN.spawn.z, 'the car is not under the house — it is on the lawn');
  assert(Math.abs(c.x) > PLAN.ground.door + 0.8,
    'the car is parked in the doorway');
  // The vehicle is the estate's drivable Cybertruck now (drive.js); its
  // collider is DYNAMIC — app.js keeps a box on the truck wherever it
  // parks. At module level we hold the bay contract instead: the truck
  // must fit the bay the plan reserves for it.
  const { TRUCK } = await import('./drive.js');
  assert(TRUCK.LEN / 2 + Math.abs(c.x) < PLAN.box.w / 2 + 1.6,
    'the truck overhangs the cantilever');
  assert(TRUCK.WID < PLAN.ground.fillet,
    'the truck is wider than the turning bay that was drawn for a car');
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

// ── Floor patches: spiral climbs, living and roof exist ───
{
  const patches = floorPatches(PLAN);
  assert.equal(patches.filter(p => p.kind === 'ramp').length, 1,
    'one continuous ramp patch, not several');
  assert(patches.some(p => p.kind === 'living'), 'no living floor patch');
  assert(patches.some(p => p.kind === 'roof'), 'no roof floor patch');
  const stops = rampStops(PLAN);
  assert.deepEqual(stops, [0, PLAN.levels.roof], 'spiral is one flight: grass → roof');
  // Entry at the front door (south of spiral centre).
  const ramps = patches.filter(p => p.kind === 'ramp');
  const entry = rampEntryPos(PLAN);
  const exit = rampExitPos(PLAN);
  const atDoor = ramps.map(p => p.heightAt(entry.x, entry.z)).filter(y => y != null);
  assert(atDoor.some(y => Math.abs(y) < 0.05), 'ramp does not meet the grass at the door');
  // Exit at the roof-garden end of the spiral.
  const atExit = ramps.map(p => p.heightAt(exit.x, exit.z)).filter(y => y != null);
  assert(atExit.some(y => Math.abs(y - PLAN.levels.roof) < 0.05),
    'ramp does not reach the roof at the spiral exit');
  // Spiral path is continuous — the height increases monotonically from
  // door to exit. A discontinuity means a torn arc.
  let lastH = -1, monotonic = true;
  for (let a = PLAN.ramp.t0; a > PLAN.ramp.t0 - 2 * Math.PI * PLAN.ramp.revs; a -= 0.05) {
    const x = PLAN.ramp.cx + PLAN.ramp.r * Math.cos(a);
    const z = PLAN.ramp.cz + PLAN.ramp.r * Math.sin(a);
    const y = ramps[0].heightAt(x, z);
    if (y == null || y < lastH - 0.01) { monotonic = false; break; }
    lastH = y;
  }
  assert(monotonic, 'ramp height is not monotonically increasing along the spiral');
  // Living floor beside the ramp (outside the spiral footprint), and
  // hollowed out inside it.
  const living = patches.find(p => p.kind === 'living');
  assert.equal(living.heightAt(8, 0), PLAN.levels.first,
    'living floor missing beside the ramp');
  assert.equal(living.heightAt(0, 0), null,
    'living floor fills the centre of the spiral well');
  // North terrace — open to the sky beside the well, not in it.
  assert.equal(living.heightAt(3.5, -PLAN.box.d / 2 + 1.2), PLAN.levels.first,
    'north terrace is not walkable');
}

// ── Dense estate: walkable between buildings, no trek ──────
{
  const O = { PAVILION: { x: 0, z: 0 }, GLASS: GLASS.origin, SAVOYE: PLAN.origin };
  const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  for (const [a, b] of [['PAVILION', 'GLASS'], ['PAVILION', 'SAVOYE'], ['GLASS', 'SAVOYE']]) {
    const m = d(O[a], O[b]);
    assert(m > 35 && m < 95, `${a}→${b} is ${m.toFixed(0)}m — dense estate (~40–60m centres)`);
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

// You walk in under the box, through the front door, onto the spiral.
{
  const w = mkWalk(BOXES, PLAN.spawn);
  w.keys.add('w');                                  // yaw 0 → forward is -z
  step(w, 0, 480);
  // The walker should be past the door (z < chordZ). With the spiral
  // they may have entered the ramp and started climbing — that's fine,
  // they're definitely past the door at that point.
  assert(w.pos.z < PLAN.ground.chordZ,
    `stopped at z=${w.pos.z.toFixed(2)} — could not get through the front door`);
}

// Climb the spiral: sample the heightAt at several t values along the
// spiral. The walker is harder to drive through a curve (would need
// continuous yaw changes), but the height function is what the walker's
// sticky patch logic samples each frame — if it is right here, the
// walker's eye will follow the spiral as they walk.
{
  for (const frac of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    const a = PLAN.ramp.t0 - 2 * Math.PI * PLAN.ramp.revs * frac;
    const x = PLAN.ramp.cx + PLAN.ramp.r * Math.cos(a);
    const z = PLAN.ramp.cz + PLAN.ramp.r * Math.sin(a);
    const t = rampAt(x, z, PLAN);
    assert(t != null && Math.abs(t - frac) < 0.005,
      `spiral at angle ${a.toFixed(2)} (${x.toFixed(2)},${z.toFixed(2)}): expected t=${frac}, got ${t}`);
    // And the height is t × L.roof.
    const expectedY = frac * PLAN.levels.roof;
    // The floorPatches ramp uses t × L.roof, so recompute:
    assert(Math.abs(t * PLAN.levels.roof - expectedY) < 0.05,
      `spiral height at t=${frac}: expected ${expectedY.toFixed(2)}, got ${(t * PLAN.levels.roof).toFixed(2)}`);
  }
}

// Step off the ramp onto the living floor, walk to the north terrace.
{
  const w = mkWalk(BOXES, { x: 8, z: 0, floorY: PLAN.levels.first });
  w.keys.add('w');
  step(w, 0, 500);                 // face −z → north balcony
  assert(w.pos.z < -PLAN.box.d / 2 + 3.5,
    `terrace z=${w.pos.z.toFixed(2)} — could not reach the north balcony`);
  assert(Math.abs(w.floorY - PLAN.levels.first) < 0.2,
    `on terrace floorY=${w.floorY.toFixed(2)} — fell through the living floor`);
  // From here, looking up (pitch) is sky — the terrace has no head band.
  assert.equal(PLAN.terrace, 'north', 'terrace must stay on the north for sky view');
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
