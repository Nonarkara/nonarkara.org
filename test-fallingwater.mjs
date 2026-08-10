// Self-check for Fallingwater plan, hill, cascade, and walk.
// `node test-fallingwater.mjs`
import assert from 'node:assert';
import { PLAN, colliderBoxes, floorPatches, hillHeight } from './fallingwater.js';
import { PLAN as FARN } from './farnsworth.js';
import { PLAN as PAVILION } from './pavilion.js';
import { Walk } from './walk.js';

const RADIUS = 0.34;

// ── Massing invariants ────────────────────────────────────
assert(PLAN.livingY > 2.5 && PLAN.livingY < 4.5, 'living terrace is the middle height');
assert(PLAN.upperY > PLAN.livingY, 'bedroom tray above living');
assert(PLAN.core.h > PLAN.upperY, 'stone core punches past the trays');
assert(PLAN.living.d > 6, 'living cantilever is a real tray');
assert(PLAN.stream.tiers >= 4, 'cascade needs enough tiers to read as falling water');
assert(PLAN.stream.zTop < PLAN.stream.zBot, 'water flows +Z down the front');
assert(PLAN.stream.yTop > PLAN.stream.yBot, 'water drops in height');

// ── Hill rises behind, notched at the stream ──────────────
{
  const crest = hillHeight(0, PLAN.hill.crestZ);
  assert(crest != null && crest > 2, 'hill has a crest behind the house');
  const front = hillHeight(0, PLAN.stream.zTop + 1);
  assert(front != null && front < 0.3, 'stream notch keeps the cascade open');
  assert.equal(hillHeight(40, 0), null, 'hill is finite');
}

// ── Colliders: core + living envelope + rear ──────────────
{
  const boxes = colliderBoxes(PLAN);
  assert(boxes.length >= 6, `too few colliders (${boxes.length})`);
  const core = boxes[0];
  assert(core.minX < PLAN.core.x && core.maxX > PLAN.core.x, 'core is first solid');
}

// ── Floor patches ─────────────────────────────────────────
{
  const patches = floorPatches(PLAN);
  assert(patches.some(p => p.kind === 'hill'), 'hill patch');
  assert(patches.some(p => p.kind === 'living'), 'living patch');
  assert(patches.some(p => p.kind === 'approach'), 'approach patch');
  const living = patches.find(p => p.kind === 'living');
  assert.equal(living.heightAt(PLAN.living.x, PLAN.living.z), PLAN.livingY);
}

// ── Dense estate spacing ──────────────────────────────────
{
  const toPav = Math.hypot(PLAN.origin.x, PLAN.origin.z);
  assert(toPav > 35 && toPav < 80,
    `FALLINGWATER→PAVILION is ${toPav.toFixed(0)}m — dense estate`);
  const toFarn = Math.hypot(PLAN.origin.x - FARN.origin.x, PLAN.origin.z - FARN.origin.z);
  assert(toFarn > 25, `Fallingwater overlaps Farnsworth (${toFarn.toFixed(0)}m)`);
  // Footprints must not collide with the Pavilion podium.
  const reach = PAVILION.podium.w / 2 + Math.max(PLAN.living.w, PLAN.hill.x1 - PLAN.hill.x0) / 2;
  assert(toPav > 30, `too close to Pavilion podium (reach≈${reach.toFixed(0)})`);
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

// From the approach, reach the living terrace.
{
  const w = mkWalk(world, {
    x: PLAN.origin.x + PLAN.spawn.x,
    z: PLAN.origin.z + PLAN.spawn.z,
  }, patchesWorld);
  // Aim roughly at the +X door: west-northwest.
  w.keys.add('w');
  step(w, Math.atan2(
    -(PLAN.living.x + PLAN.living.w / 2 - PLAN.spawn.x),
    -(PLAN.living.z + PLAN.door.x - PLAN.spawn.z),
  ), 700);
  assert(Math.abs(w.floorY - PLAN.livingY) < 0.15,
    `should stand on the living terrace (y=${w.floorY.toFixed(2)}, want ${PLAN.livingY})`);
  assert(Math.abs(w.pos.x - (PLAN.origin.x + PLAN.living.x)) < PLAN.living.w / 2 + 1,
    'never reached the living footprint');
}

// Stone core blocks.
{
  const c = PLAN.core;
  const w = mkWalk(world, {
    x: PLAN.origin.x + c.x - c.w / 2 - 1.4,
    z: PLAN.origin.z + c.z,
    floorY: PLAN.livingY,
  }, patchesWorld);
  w.keys.add('w');
  step(w, -Math.PI / 2, 120);
  assert(w.pos.x < PLAN.origin.x + c.x - c.w / 2 + 0.15,
    `walked through the stone core (x=${(w.pos.x - PLAN.origin.x).toFixed(2)})`);
}

console.log('test-fallingwater: ok');
