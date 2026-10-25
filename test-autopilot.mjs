// Self-check for the decision engine: how the truck decides, and what it
// says when it does. `node test-autopilot.mjs`
import assert from 'node:assert';
import {
  STYLES, CAR_LEN, LANE, MAX_BRAKE,
  idm, alongMyLane, future, constraints, decide, steerToward, advanceGoal,
} from './autopilot.js';
import { TOUR } from './drive.js';

const ego = (over = {}) => ({
  x: 0, z: 0, v: 0, heading: 0,
  style: STYLES.normal,
  tracks: new Map(),
  time: 0,
  sensorRange: STYLES.normal.range,
  sensorQuality: STYLES.normal.quality,
  blind: false,
  ...over,
});

/** A track the detector believes in. */
const track = (o) => {
  const t = {
    id: o.id, kind: o.kind, x: o.x, z: o.z, y: o.y ?? 0,
    vx: o.vx ?? 0, vz: o.vz ?? 0, r: o.r ?? 0.5,
    label: o.kind, conf: 0.9, d: Math.hypot(o.x, o.z),
    named: true, seen: 0, age: 0,
    obj: o,
  };
  return t;
};

// ── The IDM behaves like a car ─────────────────────────────
{
  const st = STYLES.normal;
  const free = idm(0, st.v0, Infinity, 0, st);
  assert(free > 0, 'with nothing ahead, accelerate');
  assert(idm(st.v0, st.v0, Infinity, 0, st) < 0.01, 'at the limit, stop accelerating');

  // Closing on something reduces the acceleration, and hard.
  const closing = idm(10, st.v0, 5, 3, st);
  assert(closing < 0, 'a small gap at speed means brake');
  const far = idm(10, st.v0, 60, 0, st);
  assert(far > closing, 'a big gap is less pressing');

  // A gap that grows as you speed up is the whole model.
  const tight = idm(10, st.v0, 12, 0, st);
  const loose = idm(2, st.v0, 12, 0, st);
  assert(tight < loose, 'the same gap matters more when you are going faster');
}

// ── The lane is the ground ahead ──────────────────────────
{
  const e = ego();
  const ahead = alongMyLane(e, 0, -10, 3.2);
  assert(ahead, 'a thing straight ahead is in the lane');
  assert(Math.abs(ahead.along - 10) < 1e-6, 'and ten metres away');
  assert(Math.abs(ahead.lateral) < 1e-6, 'and dead centre');

  const behind = alongMyLane(e, 0, 10, 3.2);
  assert(behind === null, 'a thing behind is not ahead');

  const side = alongMyLane(e, 6, -10, 3.2);
  assert(side === null, 'a thing six metres to the side is not in the lane');

  const just = alongMyLane(e, 3, -10, 3.2);
  assert(just && Math.abs(just.lateral - 3) < 1e-6, 'three metres to the side is still in it');
  assert(alongMyLane(e, 3.3, -10, 3.2) === null, 'and just over is not');
}

// ── The truck's frame turns with the truck ────────────────
{
  // Turning the truck by +90° swings its forward axis from −Z to −X.
  const e = ego({ heading: Math.PI / 2 });
  const ahead = alongMyLane(e, -10, 0, 3.2);
  assert(ahead, 'a thing on the new forward axis is ahead');
  assert(Math.abs(ahead.along - 10) < 1e-6, 'ten metres ahead');
  assert(Math.abs(ahead.lateral) < 1e-6, 'and centred');
  assert(alongMyLane(e, 10, 0, 3.2) === null, 'and the old forward axis is now behind');
}

// ── A wall is a constraint ────────────────────────────────
{
  const e = ego();
  const list = constraints(e, { condition: 'day', probeAhead: () => 12 });
  const wall = list.find(c => c.reason === 'wall_ahead');
  assert(wall, 'a wall ahead is a constraint');
  assert(wall.gap < 12, 'and the gap is the distance to it');
}

// ── Nothing in the way means nothing to slow for ──────────
{
  const e = ego();
  const d = decide(e, { condition: 'day', probeAhead: () => Infinity });
  assert(d.reason === 'clear', `the road is clear (${d.reason})`);
  assert(d.acc > 0, 'and it accelerates');
  assert(d.action === 'speeding_up', 'and says so');
}

// ── A dog in the lane stops you ───────────────────────────
{
  const e = ego({ v: 12 });
  e.tracks.set('dog', track({ id: 'dog', kind: 'dog', x: 0, z: -8, r: 0.45 }));
  const d = decide(e, { condition: 'day', probeAhead: () => Infinity });
  assert(d.reason === 'dog_in_lane', `a dog in the lane is named (${d.reason})`);
  assert(d.label === 'dog', 'and the label is the dog');
  assert(d.acc < 0, 'and it brakes');
  assert(d.dist !== null && d.dist < 8, `and says how far (${d.dist})`);
  assert(d.targetId === 'dog', 'and which one');
}

// ── A dog about to cross is a different reason ────────────
{
  const e = ego({ v: 12 });
  // Off to the side, but moving into the lane.
  e.tracks.set('dog', track({ id: 'dog', kind: 'dog', x: 3, z: -20, vx: -2, vz: 0, r: 0.45 }));
  const list = constraints(e, { condition: 'day', probeAhead: () => Infinity });
  const cross = list.find(c => c.reason === 'dog_will_cross');
  assert(cross, 'a dog about to cross is a constraint');
}

// ── The cautious answer wins ──────────────────────────────
{
  const e = ego({ v: 13 });
  e.tracks.set('dog', track({ id: 'dog', kind: 'dog', x: 0, z: -6, r: 0.45 }));
  const d = decide(e, { condition: 'day', probeAhead: () => 7 });
  assert(d.acc >= -MAX_BRAKE, 'the brake is never beyond the limit');
  assert(d.reason === 'wall_ahead' || d.reason === 'dog_in_lane',
    `the tightest constraint names itself (${d.reason})`);
}

// ── Short sight slows you down ───────────────────────────
{
  const e = ego({ v: 13 });
  const night = decide(e, { condition: 'night', probeAhead: () => Infinity });
  assert(night.targetSpeed < STYLES.normal.v0, 'at night you do not go as fast');
  assert(night.reason === 'short_sight', `and you know why (${night.reason})`);
}

// ── Steering toward a goal: right is right ───────────────
{
  const e = ego();
  const right = steerToward(e, { x: 10, z: 0 }, 0.55);
  assert(right > 0, 'a goal to the right steers right');
  const left = steerToward(e, { x: -10, z: 0 }, 0.55);
  assert(left < 0, 'a goal to the left steers left');
  const ahead = steerToward(e, { x: 0, z: -10 }, 0.55);
  assert(Math.abs(ahead) < 1e-9, 'a goal straight ahead needs no steering');
  const far = steerToward(e, { x: 100, z: 0 }, 0.55);
  assert(far <= 0.55, 'and the steering is clamped');
}

// ── The tour advances when the truck gets there ──────────
{
  const route = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 20, z: 0 }];
  let i = advanceGoal(route, { x: 0, z: 0 }, 0, 3);
  assert(i === 1, 'reaching the first waypoint moves to the second');
  i = advanceGoal(route, { x: 10, z: 0 }, i, 3);
  assert(i === 2, 'and then the third');
  i = advanceGoal(route, { x: 20, z: 0 }, i, 3);
  assert(i === 0, 'and it wraps around');
}

// ── The tour is a loop of places, and they are far apart ──
{
  assert(TOUR.length >= 4, 'the tour has somewhere to go');
  for (let i = 0; i < TOUR.length; i++) {
    for (let j = i + 1; j < TOUR.length; j++) {
      const d = Math.hypot(TOUR[i].x - TOUR[j].x, TOUR[i].z - TOUR[j].z);
      assert(d > 12, `two waypoints ${d.toFixed(1)}m apart are too close to be a tour`);
    }
  }
}

// ── A stray at the roadside makes the careful one cautious ──
{
  const e = ego({ v: 12, style: STYLES.careful });
  e.tracks.set('dog', track({ id: 'dog', kind: 'dog', x: 3.4, z: -14, r: 0.45, pet: false }));
  const list = constraints(e, { condition: 'day', probeAhead: () => Infinity });
  const roadside = list.find(c => c.reason === 'dog_roadside');
  assert(roadside, 'a dog on the roadside is a constraint for the wary');
  assert(roadside.v0 === 7, 'and it caps the speed');
  const d = decide(e, { condition: 'day', probeAhead: () => Infinity });
  assert(d.targetSpeed <= 7, 'so the careful one slows down');
}

console.log('autopilot: all checks passed · IDM · the most cautious answer wins · '
  + 'every reason is named · the wheel steers to the right');
