// Self-check for the Farnsworth plan and the walk collision.
// `node test-farnsworth.mjs`
import assert from 'node:assert';
import { PLAN, colliderBoxes, floorPatches, stepRises } from './farnsworth.js';
import { PLAN as GLASS } from './glasshouse.js';
import { PLAN as SAVOYE } from './savoye.js';
import { PLAN as PAVILION } from './pavilion.js';
import { Walk } from './walk.js';

const RADIUS = 0.34;

// ── Glass runs + core + 8 upper columns + 4 lower columns ─
{
  assert.equal(colliderBoxes(PLAN).length, 19,
    'glass runs + core + 8 upper H-cols + 4 lower H-cols');
}

// ── Real-ish dimensions ───────────────────────────────────
assert(PLAN.floor.d > 20 && PLAN.floor.d < 26, 'length should be ~77 feet');
assert(PLAN.floor.w > 7 && PLAN.floor.w < 10, 'width should be ~28 feet');
assert(PLAN.clear > 2.5 && PLAN.clear < 3.5, 'living clear height');
assert(PLAN.lift >= 1.4, 'must read as lifted off the ground');
assert(PLAN.porch > 5 && PLAN.porch < PLAN.floor.d * 0.35,
  'porch is the open third of the tray');
assert(PLAN.lower.y > 0.4 && PLAN.lower.y < PLAN.lift,
  'lower terrace sits between grass and the upper tray');
{
  const { lo, hi } = stepRises(PLAN);
  assert(lo * PLAN.stepsLo === PLAN.lower.y, 'lo steps sum to lower.y');
  assert(Math.abs(PLAN.lower.y + hi * PLAN.stepsHi - PLAN.lift) < 1e-9,
    'hi steps bridge lower → lift');
  assert(lo < 0.55 && hi < 0.55, 'each step under FLOOR_STEP');
}

// ── Core inside the glass, not the porch ──────────────────
{
  const hw = PLAN.floor.w / 2, hd = PLAN.floor.d / 2;
  const glassZ1 = hd - PLAN.porch;
  const c = PLAN.core;
  assert(Math.abs(c.x) + c.w / 2 < hw - 0.1, 'core pokes through the long glass');
  assert(c.z - c.d / 2 > -hd + 0.2, 'core past the east wall');
  assert(c.z + c.d / 2 < glassZ1 - 0.2, 'core eats into the porch');
  assert(c.h < PLAN.clear, 'core must leave the roof tray continuous');
  assert(c.x > 0.4, 'primavera offset to the kitchen wall (+X)');
}

// ── Door wide enough ──────────────────────────────────────
{
  const clear = PLAN.door.half * 2 - RADIUS * 2;
  assert(clear > 0.9, `doorway leaves only ${clear.toFixed(2)}m clear`);
}

// ── Eight upper columns on the tray edge; H-section named ─
{
  assert.equal(PLAN.cols.xs.length, 2);
  assert.equal(PLAN.cols.zs.length, 4);
  assert(PLAN.cols.flange > PLAN.cols.web, 'H-section: flange wider than web');
  const hw = PLAN.floor.w / 2;
  for (const x of PLAN.cols.xs) {
    assert(Math.abs(Math.abs(x) - hw) < 0.05, 'columns sit on the long edges');
  }
}

// ── Dense estate: walkable, not a trek ────────────────────
{
  const m = Math.hypot(PLAN.origin.x, PLAN.origin.z);
  assert(m > 35 && m < 75,
    `FARNSWORTH→PAVILION is ${m.toFixed(0)}m — dense estate, not a trek`);
  const toGlass = Math.hypot(PLAN.origin.x - GLASS.origin.x, PLAN.origin.z - GLASS.origin.z);
  const toSavoye = Math.hypot(PLAN.origin.x - SAVOYE.origin.x, PLAN.origin.z - SAVOYE.origin.z);
  assert(toGlass < 160 && toSavoye < 160, 'Farnsworth drifted off the estate');
  assert(PAVILION.podium, 'Pavilion plan still present');
}

// ── Lift scoped: walk under on the grass ──────────────────
{
  const lift = PLAN.lift;
  const boxes = colliderBoxes(PLAN);
  for (const b of boxes) {
    const onCol = Math.abs(b.maxX - b.minX) < 0.4 && Math.abs(b.maxZ - b.minZ) < 0.4;
    if (onCol) continue;
    assert(b.minY != null && b.minY >= lift - 0.1,
      `non-column collider has minY=${b.minY}, expected ≥ ${lift}`);
  }
}

// ── Floor patches cover the two-terrace climb ─────────────
{
  const patches = floorPatches(PLAN);
  // grass + 2 lo steps + lower + 2 hi steps + tray
  assert.equal(patches.length, 7, 'grass, lo×2, lower, hi×2, tray');
  const lo = patches.filter(p => p.kind === 'step' && p.flight === 'lo');
  const hi = patches.filter(p => p.kind === 'step' && p.flight === 'hi');
  assert.equal(lo.length, 2);
  assert.equal(hi.length, 2);
  const lower = patches.find(p => p.kind === 'lower');
  const hd = PLAN.floor.d / 2;
  const lowerZc = hd + PLAN.lower.gap + PLAN.lower.d / 2;
  assert.equal(lower.heightAt(0, lowerZc), PLAN.lower.y, 'lower terrace height');
  const tray = patches.find(p => p.kind === 'tray');
  assert.equal(tray.heightAt(0, 0), PLAN.lift, 'inside at lift');
  const grass = patches.find(p => p.kind === 'grass');
  const zGrass = hd + PLAN.lower.gap + PLAN.lower.d + PLAN.stepsLo * PLAN.stepRun + 1.0;
  assert.equal(grass.heightAt(0, zGrass), 0, 'south of the climb is grass');
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
    assert(!(s.x > b.minX - RADIUS && s.x < b.maxX + RADIUS &&
             s.z > b.minZ - RADIUS && s.z < b.maxZ + RADIUS),
      'spawn is inside a collider');
  }
}

// Walk in from the south: grass → lower → upper porch → through door.
{
  const glassZ1 = PLAN.floor.d / 2 - PLAN.porch;
  const w = mkWalk(world, {
    x: PLAN.origin.x + PLAN.spawn.x,
    z: PLAN.origin.z + PLAN.spawn.z,
  }, patchesWorld);
  w.keys.add('w');
  step(w, 0, 900);
  assert(w.pos.z < PLAN.origin.z + glassZ1 - PLAN.glassT,
    `never made it past the porch threshold (z=${(w.pos.z - PLAN.origin.z).toFixed(2)})`);
  assert(Math.abs(w.floorY - PLAN.lift) < 0.02,
    `walker should be on the deck at y=${PLAN.lift}, got y=${w.floorY.toFixed(3)}`);
}

// Side door, then past the core.
{
  const hw = PLAN.floor.w / 2;
  const w = mkWalk(world, {
    x: PLAN.origin.x - hw - 2.0,
    z: PLAN.origin.z + PLAN.door.z,
    floorY: PLAN.lift,
  }, patchesWorld);
  w.keys.add('w');
  step(w, -Math.PI / 2, 180);
  assert(w.pos.x > PLAN.origin.x - hw + 0.5, 'never entered through the side door');
  step(w, 0, 240);
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
  step(w, -Math.PI / 2, 120);
  assert(w.pos.x < PLAN.origin.x + c.x - c.w / 2 + 0.1,
    `walked through the primavera core (x=${(w.pos.x - PLAN.origin.x).toFixed(2)})`);
}

// Under the house on the grass.
{
  const w = mkWalk(world, {
    x: PLAN.origin.x,
    z: PLAN.origin.z,
    floorY: 0,
  }, patchesWorld);
  w.keys.add('w');
  step(w, 0, 120);
  assert(w.pos.z < PLAN.origin.z + 5,
    `walker on the grass was blocked from walking under (z=${(w.pos.z - PLAN.origin.z).toFixed(2)})`);
}

console.log('test-farnsworth: ok');
