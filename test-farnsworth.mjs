// Self-check for the Farnsworth plan and the walk collision.
// `node test-farnsworth.mjs`
import assert from 'node:assert';
import { PLAN, colliderBoxes, floorPatches } from './farnsworth.js';
import { PLAN as GLASS } from './glasshouse.js';
import { PLAN as SAVOYE } from './savoye.js';
import { PLAN as PAVILION } from './pavilion.js';
import { Walk } from './walk.js';

const RADIUS = 0.34;

// ── One room + one core + eight columns ──────────────────
{
  // 6 glass runs (N, S×2, E, porch×2) + 1 core + 8 columns
  assert.equal(colliderBoxes(PLAN).length, 15,
    'glass runs + core + 8 columns');
}

// ── Real-ish dimensions ───────────────────────────────────
assert(PLAN.floor.d > 20 && PLAN.floor.d < 26, 'length should be ~77 feet');
assert(PLAN.floor.w > 7 && PLAN.floor.w < 10, 'width should be ~28 feet');
assert(PLAN.clear > 2.5 && PLAN.clear < 3.5, 'living clear height');
assert(PLAN.lift >= 1.2, 'must read as lifted off the ground');
assert(PLAN.porch > 4 && PLAN.porch < PLAN.floor.d * 0.4,
  'porch is a real end of the tray, not a lip');
assert(PLAN.stepRise * 3 === PLAN.lift,
  'three steps of stepRise should sum to the lift, so the walker climbs in one stride each');
assert(PLAN.stepRise < 0.55, 'each step must be under FLOOR_STEP so walk.js climbs naturally');

// ── Core inside the glass, not the porch ──────────────────
{
  const hw = PLAN.floor.w / 2, hd = PLAN.floor.d / 2;
  const glassZ1 = hd - PLAN.porch;
  const c = PLAN.core;
  assert(Math.abs(c.x) + c.w / 2 < hw - 0.1, 'core pokes through the long glass');
  assert(c.z - c.d / 2 > -hd + 0.2, 'core past the east wall');
  assert(c.z + c.d / 2 < glassZ1 - 0.2, 'core eats into the porch');
  assert(c.h < PLAN.clear, 'core must leave the roof tray continuous');
}

// ── Door wide enough ──────────────────────────────────────
{
  const clear = PLAN.door.half * 2 - RADIUS * 2;
  assert(clear > 0.9, `doorway leaves only ${clear.toFixed(2)}m clear`);
}

// ── Eight columns, on the tray edge ───────────────────────
{
  assert.equal(PLAN.cols.xs.length, 2);
  assert.equal(PLAN.cols.zs.length, 4);
  const hw = PLAN.floor.w / 2;
  for (const x of PLAN.cols.xs) {
    assert(Math.abs(Math.abs(x) - hw) < 0.05, 'columns sit on the long edges');
  }
}

// ── Distance to the Pavilion: a real walk. Diagonals to Glass /
//    Savoye are longer on a four-point cross; the compass handles those.
{
  const m = Math.hypot(PLAN.origin.x, PLAN.origin.z);
  assert(m > 90 && m < 140,
    `FARNSWORTH→PAVILION is ${m.toFixed(0)}m — need a walk, not a step or a trek`);
  // Still on the same plain as the other two, not off in another county.
  const toGlass = Math.hypot(PLAN.origin.x - GLASS.origin.x, PLAN.origin.z - GLASS.origin.z);
  const toSavoye = Math.hypot(PLAN.origin.x - SAVOYE.origin.x, PLAN.origin.z - SAVOYE.origin.z);
  assert(toGlass < 280 && toSavoye < 280, 'Farnsworth drifted off the estate');
  assert(PAVILION.podium, 'Pavilion plan still present');
}

// ── The lift is visible, not buried in a well ────────────
// Every glass collider and the core collider must have minY >= lift
// so the walker on the grass passes under unobstructed. The columns
// do not (they fence the field at every height).
{
  const lift = PLAN.lift;
  const boxes = colliderBoxes(PLAN);
  const colZs = new Set(PLAN.cols.zs);
  for (const b of boxes) {
    // Identify column boxes by their tiny size — they sit at column
    // grid coords. Everything else must be height-scoped.
    const onCol = Math.abs(b.maxX - b.minX) < 0.3 && Math.abs(b.maxZ - b.minZ) < 0.3;
    if (onCol) continue;
    assert(b.minY != null && b.minY >= lift - 0.1,
      `non-column collider has minY=${b.minY}, expected ≥ ${lift} so the walker can pass under`);
  }
}

// ── Floor patches cover the climb ────────────────────────
{
  const patches = floorPatches(PLAN);
  // 1 grass + 3 steps + 1 tray = 5
  assert.equal(patches.length, 5, 'grass, three steps, the tray');
  const stepPatches = patches.filter(p => p.kind === 'step');
  assert.equal(stepPatches.length, 3, 'three steps');
  // Each step rises by stepRise. Query the centre of each step's
  // z-range (step 1 is the bottom one at high z; step 3 is the top).
  const stepCentres = stepPatches.map(p => {
    // Re-derive the step's z range from its index. The build places
    // step i at z = glassZ1 + (2 - i) * stepRun … + stepRun.
    const hw = PLAN.floor.w / 2, hd = PLAN.floor.d / 2;
    const glassZ1 = hd - PLAN.porch;
    const zMid = glassZ1 + (2 - (p.n - 1)) * PLAN.stepRun + PLAN.stepRun / 2;
    return p.heightAt(0, zMid);
  });
  assert.equal(stepCentres[0], PLAN.stepRise, 'first step is one rise up');
  assert.equal(stepCentres[2], PLAN.lift, 'last step is the deck');
  // The tray is at the lift.
  const tray = patches.find(p => p.kind === 'tray');
  assert.equal(tray.heightAt(0, 0), PLAN.lift, 'inside the house is at lift');
  // The grass is at 0 south of the steps.
  const grass = patches.find(p => p.kind === 'grass');
  const hw = PLAN.floor.w / 2, hd = PLAN.floor.d / 2;
  const glassZ1 = hd - PLAN.porch;
  const zGrass = glassZ1 + 3 * PLAN.stepRun + 1.0;
  assert.equal(grass.heightAt(0, zGrass), 0, 'south of the steps is the grass');
  // The grass STOPS at the foot of the bottom step — otherwise the
  // walker's sticky patch keeps it on grass right through the climb.
  const zFoot = glassZ1 + 3 * PLAN.stepRun;
  assert.equal(grass.heightAt(0, zFoot), null,
    'grass does not extend through the step region');
}

// ── Walking ───────────────────────────────────────────────
const camera = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
const mkWalk = (colliders, spawn, floors = []) => {
  const w = new Walk(camera, colliders, spawn, floors);
  w.enabled = true;
  return w;
};
const step = (w, yaw, n = 60, dt = 1 / 60) => { for (let i = 0; i < n; i++) w.update(dt, yaw); };
const BOXES = colliderBoxes(PLAN);
const world = BOXES.map(b => ({
  minX: b.minX + PLAN.origin.x, maxX: b.maxX + PLAN.origin.x,
  minZ: b.minZ + PLAN.origin.z, maxZ: b.maxZ + PLAN.origin.z,
  minY: b.minY, maxY: b.maxY,
}));
const patchesWorld = floorPatches(PLAN).map(f => ({
  ...f, heightAt: (x, z) => f.heightAt(x - PLAN.origin.x, z - PLAN.origin.z),
}));

{
  const s = PLAN.spawn;
  for (const b of BOXES) {
    // The spawn is on the grass, well south of the steps. The
    // columns sit at z=-10.5…10.5, so the spawn z is past them.
    assert(!(s.x > b.minX - RADIUS && s.x < b.maxX + RADIUS &&
             s.z > b.minZ - RADIUS && s.z < b.maxZ + RADIUS),
      'spawn is inside a collider');
  }
}

// Walk in from the south, up the three steps, across the deck, through
// the sliding door. The walker should land inside the house (past the
// porch threshold glass) and stand at the lift height.
{
  const glassZ1 = PLAN.floor.d / 2 - PLAN.porch;
  const w = mkWalk(world, {
    x: PLAN.origin.x + PLAN.spawn.x,
    z: PLAN.origin.z + PLAN.spawn.z,
  }, patchesWorld);
  w.keys.add('w');                 // yaw 0 → forward is −Z
  // Plenty of frames: 10m of grass + 1.8m of steps + a few metres of
  // deck and through the door, at 3.1 m/s.
  step(w, 0, 600);
  assert(w.pos.z < PLAN.origin.z + glassZ1 - PLAN.glassT,
    `never made it past the porch threshold (z=${(w.pos.z - PLAN.origin.z).toFixed(2)})`);
  assert(Math.abs(w.floorY - PLAN.lift) < 0.01,
    `walker should be on the deck at y=${PLAN.lift}, got y=${w.floorY.toFixed(3)}`);
}

// Side door in, then −Z along the aisle past the core. The walker
// starts on the deck (floorY=lift) so the height-scoped glass collider
// is engaged, exactly the way it is in life.
{
  const hw = PLAN.floor.w / 2;
  const w = mkWalk(world, {
    x: PLAN.origin.x - hw - 2.0,
    z: PLAN.origin.z + PLAN.door.z,
    floorY: PLAN.lift,
  }, patchesWorld);
  w.keys.add('w');
  step(w, -Math.PI / 2, 180);      // +X through the side door
  assert(w.pos.x > PLAN.origin.x - hw + 0.5, 'never entered through the side door');
  step(w, 0, 240);                 // −Z along the aisle
  assert(w.pos.z < PLAN.origin.z + PLAN.core.z - PLAN.core.d / 2 - 0.5,
    `could not clear the core down the aisle (z=${(w.pos.z - PLAN.origin.z).toFixed(2)})`);
}

// Cannot walk through the core.
{
  const c = PLAN.core;
  const w = mkWalk(world, {
    x: PLAN.origin.x + c.x - c.w / 2 - 1.2,
    z: PLAN.origin.z + c.z,
    floorY: PLAN.lift,
  }, patchesWorld);
  w.keys.add('w');
  step(w, -Math.PI / 2, 120);   // walk +X into the core
  assert(w.pos.x < PLAN.origin.x + c.x - c.w / 2 + 0.1,
    `walked through the primavera core (x=${(w.pos.x - PLAN.origin.x).toFixed(2)})`);
}

// Walking UNDER the house on the grass: the glass walls and the core
// must not fence the column field at y=0.
{
  const w = mkWalk(world, {
    x: PLAN.origin.x,
    z: PLAN.origin.z,
    floorY: 0,
  }, patchesWorld);
  w.keys.add('w');
  step(w, 0, 120);                  // walk −Z through the house
  assert(w.pos.z < PLAN.origin.z + 5,
    `walker on the grass was blocked from walking under (z=${(w.pos.z - PLAN.origin.z).toFixed(2)})`);
}

console.log('test-farnsworth: ok');
