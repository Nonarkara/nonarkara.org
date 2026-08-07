// Self-check for the Farnsworth plan and the walk collision.
// `node test-farnsworth.mjs`
import assert from 'node:assert';
import { PLAN, colliderBoxes } from './farnsworth.js';
import { PLAN as GLASS } from './glasshouse.js';
import { PLAN as SAVOYE } from './savoye.js';
import { PLAN as PAVILION } from './pavilion.js';
import { Walk } from './walk.js';

const RADIUS = 0.34;

// ── One room + one core ───────────────────────────────────
{
  // 6 glass runs (N, S×2, E, porch×2) + 1 core
  assert.equal(colliderBoxes(PLAN).length, 7, 'glass runs + core only');
}

// ── Real-ish dimensions ───────────────────────────────────
assert(PLAN.floor.d > 20 && PLAN.floor.d < 26, 'length should be ~77 feet');
assert(PLAN.floor.w > 7 && PLAN.floor.w < 10, 'width should be ~28 feet');
assert(PLAN.clear > 2.5 && PLAN.clear < 3.5, 'living clear height');
assert(PLAN.lift >= 1.2, 'must read as lifted off the ground');
assert(PLAN.porch > 4 && PLAN.porch < PLAN.floor.d * 0.4,
  'porch is a real end of the tray, not a lip');

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

// ── Walking ───────────────────────────────────────────────
const camera = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
const mkWalk = (colliders, spawn) => {
  const w = new Walk(camera, colliders, spawn);
  w.enabled = true;
  return w;
};
const step = (w, yaw, n = 60, dt = 1 / 60) => { for (let i = 0; i < n; i++) w.update(dt, yaw); };
const BOXES = colliderBoxes(PLAN);
const world = BOXES.map(b => ({
  minX: b.minX + PLAN.origin.x, maxX: b.maxX + PLAN.origin.x,
  minZ: b.minZ + PLAN.origin.z, maxZ: b.maxZ + PLAN.origin.z,
}));

{
  const s = PLAN.spawn;
  for (const b of BOXES) {
    assert(!(s.x > b.minX - RADIUS && s.x < b.maxX + RADIUS &&
             s.z > b.minZ - RADIUS && s.z < b.maxZ + RADIUS),
      'spawn is inside a collider');
  }
}

// Walk in from the porch end through the sliding door. The primavera
// core sits just inside on the centreline, so "past the glass" is the
// proof — not clearing the whole room on one axis.
{
  const glassZ1 = PLAN.floor.d / 2 - PLAN.porch;
  const w = mkWalk(world, {
    x: PLAN.origin.x + PLAN.spawn.x,
    z: PLAN.origin.z + PLAN.spawn.z,
  });
  w.keys.add('w');                 // yaw 0 → forward is −Z
  step(w, 0, 240);
  assert(w.pos.z < PLAN.origin.z + glassZ1 - PLAN.glassT,
    `never made it past the porch threshold (z=${(w.pos.z - PLAN.origin.z).toFixed(2)})`);
}

// Side door in, then −Z along the aisle past the core.
{
  const hw = PLAN.floor.w / 2;
  const w = mkWalk(world, {
    x: PLAN.origin.x - hw - 2.0,
    z: PLAN.origin.z + PLAN.door.z,
  });
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
  });
  w.keys.add('w');
  step(w, -Math.PI / 2, 120);   // walk +X into the core
  assert(w.pos.x < PLAN.origin.x + c.x - c.w / 2 + 0.1,
    `walked through the primavera core (x=${(w.pos.x - PLAN.origin.x).toFixed(2)})`);
}

console.log('test-farnsworth: ok');
