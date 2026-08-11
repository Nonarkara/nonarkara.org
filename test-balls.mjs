// Self-check for the ball games: the arc arrives, the fence holds, the
// ball comes to rest, goals and hoops are judged on the SEGMENT (not the
// sample), and the round keeps honest score. `node test-balls.mjs`
import assert from 'node:assert';
import {
  Ball, Shootout, launchVelocity, flightTime, crossedGoal, throughHoop, ROUND_MS,
} from './balls.js';

const FENCE = { x0: -14, x1: 14, z0: -8, z1: 8 };
const HOME = { x: 0, z: 0 };
const run = (b, secs, dt = 1 / 120) => {
  const n = Math.round(secs / dt);
  let prev = null;
  for (let i = 0; i < n; i++) prev = b.step(dt);
  return prev;
};

// ── The arc actually arrives — measured on the real ball ──
// Checked by INTEGRATING the same step() the game runs, not by a
// drag-free closed form. The closed form is what hid a systematic
// undershoot at range: the solve ignored the drag its own physics
// applied.
{
  const BIG = { x0: -60, x1: 60, z0: -60, z1: 60 };
  for (const [dx, dz, ty] of [[4, 0, 1.4], [10, 3, 1.6], [18, -6, 2.2], [24, 8, 3.05]]) {
    const from = { x: 0, y: 1.3, z: 0 };
    const to = { x: dx, y: ty, z: dz };
    const b = new Ball('soccer', BIG, { x: 0, z: 0 });
    b.shoot(from, to);
    assert(b.vel.y > 0, 'the ball must leave the hands rising');
    let best = Infinity;
    for (let i = 0; i < 900; i++) {
      b.step(1 / 240);
      best = Math.min(best, Math.hypot(b.pos.x - to.x, b.pos.y - to.y, b.pos.z - to.z));
      if (b.rest) break;
    }
    assert(best < 0.22,
      `a ${Math.hypot(dx, dz).toFixed(0)}m shot missed its aim point by ${best.toFixed(2)}m`);
  }
}

// Flight time is bounded: no instant bullets, no floating balloons.
for (const d of [0, 1, 5, 12, 25, 60, 1000]) {
  const T = flightTime(d);
  assert(T >= 0.42 && T <= 1.55, `flight time ${T} out of range at ${d}m`);
}

// ── THE FENCE: the ask, and the test that proves it ───────
{
  const b = new Ball('soccer', FENCE, HOME);
  // Blast it at the corner as hard as anything in the game can.
  b.shoot({ x: 0, y: 1.3, z: 0 }, { x: 400, y: 1.0, z: 220 });
  run(b, 30);
  assert(b.pos.x >= FENCE.x0 - 0.01 && b.pos.x <= FENCE.x1 + 0.01,
    `ball escaped in x: ${b.pos.x.toFixed(1)}`);
  assert(b.pos.z >= FENCE.z0 - 0.01 && b.pos.z <= FENCE.z1 + 0.01,
    `ball escaped in z: ${b.pos.z.toFixed(1)}`);
}
// Every direction, not just the lucky one.
{
  for (const [tx, tz] of [[500, 0], [-500, 0], [0, 500], [0, -500], [-400, -400], [400, -400]]) {
    const b = new Ball('basket', FENCE, HOME);
    b.shoot({ x: 0, y: 1.3, z: 0 }, { x: tx, y: 1, z: tz });
    run(b, 25);
    assert(b.pos.x >= FENCE.x0 - 0.01 && b.pos.x <= FENCE.x1 + 0.01 &&
           b.pos.z >= FENCE.z0 - 0.01 && b.pos.z <= FENCE.z1 + 0.01,
      `ball escaped toward ${tx},${tz}`);
  }
}

// ── It comes to rest, and stays put ───────────────────────
{
  const b = new Ball('soccer', FENCE, HOME);
  b.shoot({ x: -6, y: 1.3, z: 0 }, { x: 4, y: 0.3, z: 1 });
  run(b, 20);
  assert(b.rest, 'the ball must settle');
  const where = { ...b.pos };
  run(b, 5);
  assert(Math.abs(b.pos.x - where.x) < 1e-9 && Math.abs(b.pos.z - where.z) < 1e-9,
    'a ball at rest must not drift');
  assert(Math.abs(b.pos.y - b.r) < 1e-9, 'a resting ball sits on the ground');
}

// ── Goals are judged on the segment, not the sample ───────
{
  const goal = { x: -14, z: 0, halfW: 2.2, height: 1.7, inward: -1 };
  // A shot travelling 14 m/s covers 23cm a frame; sampling points misses
  // the plane entirely. The segment test must not.
  assert(crossedGoal({ x: -13.8, y: 0.9, z: 0.1 }, { x: -14.2, y: 0.85, z: 0.1 }, goal),
    'a shot through the mouth must score even if no sample lands on the plane');
  assert(!crossedGoal({ x: -13.8, y: 0.9, z: 3.4 }, { x: -14.2, y: 0.85, z: 3.4 }, goal),
    'wide of the post is not a goal');
  assert(!crossedGoal({ x: -13.8, y: 2.4, z: 0 }, { x: -14.2, y: 2.5, z: 0 }, goal),
    'over the bar is not a goal');
  assert(!crossedGoal({ x: -14.2, y: 0.9, z: 0 }, { x: -13.8, y: 0.9, z: 0 }, goal),
    'coming back OUT of the goal is not another goal');
}

// ── Hoops only count on the way down ──────────────────────
{
  const hoop = { x: 7, y: 3.05, z: 0, r: 0.34 };
  assert(throughHoop({ x: 7, y: 3.1, z: 0 }, { x: 7.02, y: 3.0, z: 0.01 }, hoop),
    'dropping through the ring is a basket');
  assert(!throughHoop({ x: 7, y: 3.0, z: 0 }, { x: 7, y: 3.1, z: 0 }, hoop),
    'rising through the ring is not a basket');
  assert(!throughHoop({ x: 8.2, y: 3.1, z: 0 }, { x: 8.2, y: 3.0, z: 0 }, hoop),
    'falling outside the ring is not a basket');
}

// ── A basket must arrive FALLING, at every distance ───────
// The lay-up bug: at short range the solved arc peaks exactly on the
// ring, so the ball is neither above nor below it and no crossing is
// ever detected. Every distance must arrive descending.
{
  const { descendingTime } = await import('./balls.js');
  const rim = { x: 0, y: 3.05, z: 0, r: 0.44 };
  for (const dist of [2, 4, 5.5, 8, 12, 20]) {
    const from = { x: -dist, y: 1.35, z: 0 };
    const b = new Ball('basket', { x0: -40, x1: 40, z0: -40, z1: 40 }, { x: 0, z: 0 });
    b.shoot(from, { x: rim.x, y: rim.y, z: rim.z }, { descend: true });
    // Step until it crosses rim height, and check where.
    let scored = false;
    for (let i = 0; i < 600; i++) {
      const prev = b.step(1 / 240);
      if (throughHoop(prev, b.pos, rim)) { scored = true; break; }
      if (b.rest) break;
    }
    assert(scored, `a ${dist}m shot aimed at the ring must drop through it`);
  }
  // And the helper is honest about what "descending" needs.
  assert(descendingTime(1.7) > Math.sqrt(2 * 1.7 / 9.8),
    'descendingTime must clear the apex, not sit on it');
}

// ── A shot must LEAVE your hands ──────────────────────────
// The bug this catches: a ball launches from the player's own position,
// so the pickup test grabs it back on the very next frame and it hovers
// in front of you instead of flying. Found on a real shot, not in review.
{
  const b = new Ball('soccer', FENCE, HOME);
  const from = { x: 0, y: 1.3, z: 0 };
  b.shoot(from, { x: -12, y: 0.9, z: 0 });
  assert(!b.canPickUp(from.x, from.z),
    'a just-shot ball must not be pickable from where it was released');
  run(b, 0.25);
  assert(Math.abs(b.pos.x) > 1.5, 'the ball must actually travel after a shot');
  // ...but it becomes pickable again once it has left and settled.
  run(b, 6);
  assert(b.cool === 0, 'the release cooldown must expire');
  assert(b.canPickUp(b.pos.x, b.pos.z), 'you can fetch your own shot afterwards');
}

// ── A ball left on the wrong field walks home ─────────────
// Carrying the football onto the basketball court and putting it down
// used to leave it there, at rest, forever — and because both balls then
// sat on the same square metre, they picked each other up in a loop.
{
  const b = new Ball('soccer', FENCE, HOME);
  b.pos = { x: 60, y: b.r, z: 60 };     // dropped far away, at rest
  b.rest = true;
  assert(b.outOfBounds(), 'that is off the field');
  run(b, 0.1);
  assert(Math.abs(b.pos.x - HOME.x) < 1e-9 && Math.abs(b.pos.z - HOME.z) < 1e-9,
    'a ball at rest off its field must come home');
}

// ── Carrying ──────────────────────────────────────────────
{
  const b = new Ball('basket', FENCE, HOME);
  assert(b.canPickUp(0.5, 0.5), 'a ball at your feet can be picked up');
  assert(!b.canPickUp(9, 0), 'a ball across the court cannot');
  b.held = true;
  b.carryTo(3, 4, 0, 1.65);
  assert(Math.abs(b.pos.z - (4 - 0.85)) < 1e-9, 'a carried ball sits in front of you');
  assert(b.pos.y < 1.65 && b.pos.y > 1.0, 'and at chest height');
  assert(!b.canPickUp(3, 4), 'you cannot pick up what you are holding');
}

// ── The round: starts on the first score, ends on time ────
{
  const g = new Shootout('soccer');
  g.best = 0;
  assert(!g.running, 'no clock until something goes in');
  g.onScore(1000);
  assert(g.running && g.score === 1, 'the first goal starts the round');
  assert(g.secondsLeft(1000) === 60, 'sixty seconds on the clock');
  g.onScore(2000); g.onScore(3000);
  assert(g.score === 3 && g.streak === 3, 'streak counts consecutive scores');
  g.onMiss();
  assert(g.streak === 0 && g.score === 3, 'a miss breaks the streak, not the score');
  assert(!g.tick(1000 + ROUND_MS - 1), 'the round is not over early');
  assert(g.tick(1000 + ROUND_MS), 'the round ends on time');
  assert(!g.running, 'and the clock stops');
  assert(g.best === 3 && g.lastResult === 'best', 'a first round is always a personal best');
  // A worse second round must not overwrite the best.
  g.onScore(9000);
  g.tick(9000 + ROUND_MS);
  assert(g.best === 3, 'a worse round must not overwrite the best');
}

// ── Respawns get harder, and stay on the field ────────────
{
  const g = new Shootout('soccer');
  const field = { cx: 0, cz: 0, w: 28, d: 16 };
  const goalX = -14;
  let last = 0;
  for (let i = 0; i < 10; i++) {
    g.score = i;
    const p = g.respawn(field, goalX, () => 0.5);
    const d = Math.abs(p.x - goalX);
    assert(d >= last - 1e-9, 'each respawn must be at least as far out');
    last = d;
    assert(p.x > field.cx - field.w / 2 && p.x < field.cx + field.w / 2, 'respawn stays on the field');
    assert(p.z > field.cz - field.d / 2 && p.z < field.cz + field.d / 2, 'respawn stays between touchlines');
  }
  // Extreme random draws must still land inside.
  for (const r of [0, 1, 0.001, 0.999]) {
    const p = g.respawn(field, goalX, () => r);
    assert(p.z > field.cz - field.d / 2 && p.z < field.cz + field.d / 2,
      `respawn escaped with rand=${r}`);
  }
}

console.log('balls: all checks passed · arcs arrive · the fence holds every direction · goals judged on the segment · the round is honest');
