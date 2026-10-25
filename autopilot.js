/**
 * AUTOPILOT — how the Cybertruck decides, when you let it.
 *
 * Ported from the driving stack at vision.nonarkara.org, where a simulated
 * car learned to drive itself on a loop of streets. Same engine, same
 * reasoning, one new road: the estate.
 *
 * The method is the Intelligent Driver Model (Treiber, Hennecke & Helbing,
 * 2000). Every tenth of a second the truck lists everything that could make
 * it slow down — the wall ahead, each object it believes in — and asks each
 * one the same question:
 *
 *     "If this were the only thing on the road, how hard should I speed up
 *      or brake?"
 *
 * Then it obeys the most cautious answer, and it tells you which answer that
 * was. That last part is the lesson: autonomy is not a black box, it is a
 * list of reasons, and you can watch them change as you drive.
 *
 * Two things changed for the estate. There is no loop route, so "the lane"
 * is simply the ground ahead of the truck — a forward ray with a width. And
 * there are buildings, so solid ground joins the list of constraints: a
 * wall is a constraint like any other.
 *
 * Everything here is pure over plain data, so the tests can drive it.
 */

import { sightRange, wrap } from './vision.js';

export const CAR_LEN = 4.6;      // the truck is 5.2 m; this is the safe gap arithmetic
export const MAX_BRAKE = 9;      // m/s² — an emergency stop on dry ground
const SIGHT_BRAKE = 4;           // m/s² — the firm stop a sensible driver plans for
const HORIZON = [0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2];
export const LANE = 3.2;         // half-width of the road the truck believes it is on

/**
 * Driving styles, carried across unchanged. The truck drives `normal`;
 * the other two exist so the same engine can be shown behaving differently.
 */
export const STYLES = {
  careful: { v0: 12.5, T: 1.8, s0: 3.5, a: 1.4, b: 2.0, range: 55, quality: 0.97, yieldWaiting: true, wary: true, sightLimit: true },
  normal:  { v0: 13.9, T: 1.2, s0: 2.5, a: 1.8, b: 2.5, range: 48, quality: 0.92, yieldWaiting: true, wary: false, sightLimit: true },
  hasty:   { v0: 16.7, T: 0.6, s0: 2.0, a: 2.6, b: 3.5, range: 28, quality: 0.84, yieldWaiting: false, wary: false, sightLimit: false },
};

/**
 * Intelligent Driver Model: the acceleration for speed v, with a gap of
 * `gap` to whatever is ahead and a closing speed of `dv`.
 *
 *   free  — how much acceleration the road alone allows
 *   want  — the gap it would LIKE to keep, which grows with speed and
 *           shrinks when you are closing on the thing in front
 */
export function idm(v, v0, gap, dv, st) {
  const free = 1 - (v / Math.max(v0, 0.1)) ** 4;
  if (gap === Infinity) return st.a * free;
  const want = st.s0 + Math.max(0, v * st.T + (v * dv) / (2 * Math.sqrt(st.a * st.b)));
  return st.a * (free - (want / Math.max(gap, 0.1)) ** 2);
}

/**
 * Where an object sits in the truck's own frame: how far ahead, and how far
 * to the side. The truck's forward is (-sin h, -cos h); its right is (cos h, -sin h).
 */
export function alongMyLane(ego, x, z, slack) {
  const dx = x - ego.x, dz = z - ego.z;
  const s = Math.sin(ego.heading), c = Math.cos(ego.heading);
  const along = -dx * s - dz * c;
  if (along <= 0) return null;
  const lateral = dx * c - dz * s;
  if (Math.abs(lateral) > slack) return null;
  return { along, lateral };
}

/** Where an object will be after t seconds, assuming it keeps doing what it does. */
export function future(obj, t) {
  if (obj.vx == null) return { x: obj.x, z: obj.z };
  return { x: obj.x + obj.vx * t, z: obj.z + obj.vz * t };
}

/** A vehicle's real length; the truck is longer than the legacy 4.6 m car. */
const len = (v) => v?.dims?.L ?? CAR_LEN;
/** Gap between two vehicles' centres, from both real lengths. */
const both = (me, lead) => Math.max(CAR_LEN, (len(me) + len(lead)) / 2);

/**
 * Every constraint on the truck right now, each as { gap, dv, reason, track }.
 * A gap of Infinity means "this does not slow me down, it only makes me careful".
 */
export function constraints(ego, ctx) {
  const out = [];
  const R = sightRange(ego, ctx.condition);
  const st = ego.style;

  // Solid ground. The estate has buildings, and a wall is a constraint like
  // any other: something ahead that you cannot go through.
  if (ctx.probeAhead) {
    const solid = ctx.probeAhead(R);
    if (solid < Infinity) {
      out.push({ gap: Math.max(0.5, solid - CAR_LEN / 2 - 0.4), dv: ego.v, reason: 'wall_ahead' });
    }
  }

  for (const tr of ego.tracks.values()) {
    const o = tr.obj;
    if (!o) continue;
    const slack = o.kind === 'car' ? 1.1 : (o.r ?? 0.5);

    // A stray at the roadside may run; the wary slow down before it does.
    // A dog on the footway is not a stray — it is somebody walking past.
    if (o.kind === 'dog' && !o.pet && st.wary && o.state !== 'run') {
      const near = alongMyLane(ego, o.x, o.z, 3.5);
      if (near && Math.abs(near.lateral) > LANE * 0.62) {
        out.push({ gap: Infinity, dv: 0, reason: 'dog_roadside', track: tr, v0: 7 });
      }
    }

    // Already in the lane: the thing in front of me, right now.
    const now = alongMyLane(ego, o.x, o.z, slack);
    if (now) {
      const along = now.along;
      if (o.kind === 'car') {
        const lead = Math.max(0, (o.v ?? 0) * Math.cos((o.h ?? 0) - ego.heading));
        const crossing = Math.cos((o.h ?? 0) - ego.heading) < 0.5;
        out.push({
          gap: Math.max(0.2, along - both(ego, o)),
          dv: ego.v - lead,
          reason: lead < 1 && crossing ? 'car_crossing' : 'car_ahead',
          track: tr,
        });
      } else {
        out.push({
          gap: Math.max(0.2, along - CAR_LEN / 2 - (o.r ?? 0.5) - 0.5),
          dv: ego.v,
          reason: `${o.kind}_in_lane`,
          track: tr,
        });
      }
      continue;
    }

    // Not in the lane yet — but might be. Move each object forward up to
    // 3.2 s along its own path and ask again. The predict-then-check idea
    // behind sampling planners such as TUM's Frenetix.
    for (const t of HORIZON) {
      const f = future(o, t);
      const hit = alongMyLane(ego, f.x, f.z, slack);
      if (!hit) continue;
      const mine = hit.along / Math.max(ego.v, 1);
      if (mine + 1 < t) break;                 // I will be through before it arrives
      if (o.kind === 'car') {
        out.push({ gap: Math.max(0.5, hit.along - 3.5), dv: ego.v, reason: 'yield_car', track: tr });
      } else {
        out.push({ gap: Math.max(0.5, hit.along - CAR_LEN / 2 - 2), dv: ego.v, reason: `${o.kind}_will_cross`, track: tr });
      }
      break;
    }
  }
  return out;
}

/**
 * Decide: the acceleration to apply, and the reason in words a person would use.
 *
 * The reason is the point. An autonomous car that cannot say why it braked
 * is a rumour; one that can say "dog_in_lane, 8 metres" is a machine you
 * can argue with.
 */
export function decide(ego, ctx) {
  const st = ego.style;
  let v0 = st.v0, reason = 'clear', binding = null;

  // Never faster than it can stop within what it can see. The hasty skip
  // this rule, which is exactly why the hasty are the ones who crash.
  const sight = Math.sqrt(
    2 * SIGHT_BRAKE * Math.max(0, sightRange(ego, ctx.condition) - st.s0 - Math.max(CAR_LEN, len(ego))));
  if (st.sightLimit && sight < v0) { v0 = sight; reason = 'short_sight'; }

  const list = constraints(ego, ctx);
  for (const c of list) if (c.v0 != null && c.v0 < v0) { v0 = c.v0; reason = c.reason; binding = c; }

  let acc = idm(ego.v, v0, Infinity, 0, st);
  for (const c of list) {
    if (c.gap === Infinity) continue;
    const a = idm(ego.v, v0, c.gap, c.dv, st);
    if (a < acc) { acc = a; reason = c.reason; binding = c; }
  }
  acc = Math.max(-MAX_BRAKE, Math.min(st.a, acc));

  const action = ego.v < 0.3 && acc <= 0.05 ? 'waiting'
    : acc <= -3 ? 'braking_hard'
    : acc < -0.3 ? 'slowing'
    : acc > 0.3 ? 'speeding_up' : 'cruising';

  return {
    acc,
    targetId: binding?.track?.obj?.id ?? null,
    targetSpeed: v0,
    desiredGap: st.s0 + Math.max(0,
      ego.v * st.T + ego.v * (binding?.dv ?? 0) / (2 * Math.sqrt(st.a * st.b))),
    action,
    reason,
    label: binding?.track?.label ?? null,
    conf: binding?.track?.conf ?? null,
    dist: binding && binding.gap !== Infinity ? Math.max(0, binding.gap) : null,
  };
}

/**
 * Steering toward a goal, in the truck's own terms.
 *
 * Positive steer turns right, because the truck's yaw decreases as it
 * steers right and its forward vector is (-sin h, -cos h). This is the one
 * place where a sign error would be invisible in the code and obvious on
 * screen, so it is tested from both sides.
 */
export function steerToward(ego, goal, maxSteer) {
  const dx = goal.x - ego.x, dz = goal.z - ego.z;
  const bearing = wrap(Math.atan2(dx, -dz) - ego.heading);
  return Math.max(-maxSteer, Math.min(maxSteer, bearing * 1.6));
}

/**
 * Advance a goal along a route. When the truck is close enough to the
 * current waypoint, hand it the next one — so the tour keeps going without
 * anyone deciding what comes after.
 */
export function advanceGoal(route, ego, index, reach = 7) {
  let i = index;
  let guard = 0;
  while (guard++ < route.length) {
    const g = route[i % route.length];
    if (Math.hypot(g.x - ego.x, g.z - ego.z) < reach) i++;
    else break;
  }
  return i % route.length;
}
