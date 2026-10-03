/**
 * VILLA SAVOYE — Le Corbusier & Pierre Jeanneret, Poissy, 1931.
 *
 * A 21.5m square box lifted off the grass on thin columns, with the
 * ground floor pulled back behind the sweep of a car, and a ramp
 * straight through the middle of it from the grass to the sky.
 *
 * The Five Points are not a style list; each one is doing work:
 *
 *   - PILOTIS. A 4.75m column grid carries everything, so the ground
 *     goes back to being ground and the walls stop holding the house up.
 *   - The FREE PLAN, which is what the pilotis buy: nothing inside has
 *     to line up with anything.
 *   - The FREE FAÇADE. The box cantilevers 1.25m past the outermost
 *     columns, so the skin hangs off the frame instead of standing on
 *     the earth.
 *   - The RIBBON WINDOW, running the whole way round without stopping
 *     at a corner — only possible because of the point above.
 *   - The ROOF GARDEN, with a free-form solarium wall: the ground the
 *     house displaced, given back on top of it.
 *
 * And the one that is not on the list and matters most: the RAMP. The
 * promenade architecturale. You do not arrive at Villa Savoye, you are
 * walked through it — car, hall, living floor, sky — on one continuous
 * incline. It is the argument of the building, and it is why the middle
 * column line is not there: the axis belongs to the walk, and the load
 * goes to the lines either side of it.
 *
 * The curve on the ground floor is not a shape. It is the turning
 * radius of the car that had to come in under the house, put someone
 * down at the door, and get back out. The plan is drawn around a
 * car — here a Traction Avant silhouette parked under the pilotis,
 * the composition every photograph of the house already knows.
 *
 * On colour. One amber per site, given to whatever each building is an
 * argument for — the onyx in the Pavilion, the brick cylinder in the
 * Glass House, the RAMP here. Everything else is white render, pale
 * columns, and a ground floor kept in its own shadow, which is the job
 * the dark-painted service floor does in life.
 *
 * Walk: the ramp is a floor, not a wall. walk.js samples floor patches
 * (including stacked flights) and lifts the eye. Living-floor walls
 * carry minY so they do not block the grass under the box.
 *
 * Same return shape as buildPavilion.
 */

export const PLAN = {
  name: 'VILLA SAVOYE',
  origin: { x: -40, z: 48 },

  // The box. Square, and cantilevered past the columns on every side.
  box: { w: 21.5, d: 21.5 },

  // Structure: 4.75m on both axes, five lines each way — except the
  // middle line in x, which the ramp takes.
  bay: 4.75,
  cols: [-9.5, -4.75, 0, 4.75, 9.5],
  piloti: { r: 0.14 },

  levels: {
    first: 3.5,      // top of the first-floor slab — the living level
    firstTop: 6.5,   // 3.0m clear on the living floor
    roof: 6.78,      // top of the roof slab — the garden
    slab: 0.28,
    parapet: 1.12,
    sill: 0.9,       // ribbon window, above the living floor
    head: 2.15,
  },

  /**
   * The ground floor: a U set well back from the edge of the box, with
   * the entrance wall in the middle of the open side and the car's
   * turning radius filleting both shoulders.
   */
  ground: {
    back: -8.0,        // rear wall
    side: 8.0,         // flanks
    chordZ: 5.6,       // entrance wall
    chordHalf: 2.6,    // how far it runs each side of the door
    door: 1.1,         // half the opening
    fillet: 5.4,       // the turning radius — this is the whole curve
    t: 0.2,
    segments: 12,      // per shoulder
  },

  // The ramp, on axis, through the centre. Four flights doubling back:
  // that is what keeps the incline at a real 1:6 instead of the stair
  // you get if you try to make 3.5m in one run of a 13m hall.
  // `land` is the flat pad past each end — long enough to catch a jog
  // overshoot at the switchback, so you turn on a deck instead of
  // dropping onto the floor below. `wellMargin` is the reveal the slab
  // keeps clear of the ramp on each side; the slabs, the floor patches
  // and the rails all read the well from here, so the hole you see is
  // the hole you fall in and no other.
  ramp: { w: 2.6, x: 0, z0: -7.6, z1: 3.6, t: 0.16, flights: 4, land: 2.4, wellMargin: 0.35 },

  // The roof slab covers the enclosed part of the house only; over the
  // north terrace it is sky. One source of truth for its extent: the
  // drawn slab, the walkable roof patch and the parapets all derive
  // from these two fractions — the slab you see IS the slab you stand
  // on, which is the whole reason this is in the PLAN and not inlined
  // where the geometry is drawn.
  roofSlab: { dFrac: 0.72, zFrac: 0.14 },

  /**
   * THE SPIRAL STAIR — the other half of the promenade.
   *
   * Corbusier built BOTH: a straight ramp on the axis, slow and
   * ceremonial, and a tight helical stair beside it, fast and utilitarian
   * — "its grand, expansive gesture juxtaposed with the fast zig-zag of
   * a staircase." The pairing IS the argument: two ways up the same
   * house, one for the promenade and one for when you are carrying the
   * shopping. A Savoye with only one of them is only half the building.
   *
   * It sits west of the axis in the entrance hall, clear of the ramp's
   * 2.6m width and inside the −4.75 column line. 2.5 turns of a 1.35m
   * helix carries 6.78m at a real stair's pitch.
   */
  stair: {
    cx: -3.1, cz: 3.6,
    rIn: 0.22, rOut: 1.42,
    t0: -Math.PI / 2,      // first tread faces the hall
    revs: 2.5,
    treads: 34,
    // The balustrade is SOLID except where you get on and off. A helical
    // tread 1.2m wide with nothing at its edge is a stair you walk off —
    // proved by driving the walker up it — and a real one would never be
    // built without a rail. Two openings: boarding at t0 (bottom), exit
    // half a turn round at the top, which is where 2.5 turns lands.
    // 1.15 rad (~66°) each end. Sized by probing the walker's own
    // collision, not by eye: at 0.95 rad the opening measured 1/48
    // passable — the angular gap looked generous while a 0.34m-wide
    // walker still could not fit between the neighbouring posts.
    railGap: 1.15,
    railSeg: 24,
    // The stairwell: the square opening cut around the helix in the
    // first-floor and roof slabs. A helix through solid concrete is a
    // drawing error, not a stair. Both slabs, both wash planes and the
    // living/roof floor patches all take the same rectangle from here.
    wellPad: 0.2,
  },

  // Which side loses its upper storey to the open-air terrace. It must
  // not be the side you arrive on: the elevation you walk up to has to
  // be the complete one, or the house reads as a shed with its front
  // wall missing. The test holds this against the spawn.
  terrace: 'north',

  // The solarium windbreak on the roof — the one free curve up there.
  // Sits over the roofed half, which is the southern one. `seg` is the
  // arc resolution, shared by the drawn wall and its colliders so the
  // wall that stops you is exactly the wall you see.
  solarium: { x: 3.2, z: 3.4, r: 6.2, a0: 2.2, a1: 4.8, h: 2.4, seg: 28 },

  // Citroën Traction Avant under the pilotis — off the door axis so the
  // promenade stays clear, in the driveway the ground-floor curve drew.
  car: {
    // On the drive apron, just clear of the ground-floor curve — where
    // the photographs put the car, and where a 5.2m truck can actually
    // pull away without kissing the entrance wall.
    x: 7.6, z: 11.6, yaw: -2.35,
    body: { l: 4.6, w: 1.72, h: 0.72 },
    cabin: { l: 2.2, w: 1.55, h: 0.55, z: -0.15 },
    wheel: { r: 0.32, t: 0.18, axle: 1.45, track: 0.72 },
  },

  // Travel drops you on the grass in front, far enough back to see the
  // box floating, which is the only view that explains the building.
  spawn: { x: 0, y: 1.65, z: 16.0, lookAt: { x: 0, y: 2.4, z: 0 } },
};

/** Ramp flight stop heights: grass → half → living → half → roof. */
export function rampStops(plan = PLAN) {
  const L = plan.levels;
  return [0, L.first / 2, L.first, (L.first + L.roof) / 2, L.roof];
}

/**
 * The holes in the horizontal planes, derived once from the PLAN.
 * Three functions and the geometry all have to agree on where the ramp
 * well, the stairwell and the roof slab's edge are — a visitor once
 * walked six metres past the drawn roof onto a patch that answered for
 * the whole box, then fell 6.78m off the far end of it. Deriving these
 * in one place is how that stays fixed.
 */
export function openings(plan = PLAN) {
  const rp = plan.ramp, st = plan.stair, B = plan.box;
  const rd = B.d * plan.roofSlab.dFrac;
  const rz = B.d * plan.roofSlab.zFrac;
  return {
    // Half-width of the ramp well cut in the slabs (ramp + reveal).
    wellHalf: (rp.w + rp.wellMargin) / 2,
    // Ramp well z-range including both landings.
    wellZ0: rp.z0 - rp.land,
    wellZ1: rp.z1 + rp.land,
    // Roof slab extent.
    rd, rz, rz0: rz - rd / 2, rz1: rz + rd / 2,
    // Stairwell rectangle around the helix.
    stairRect: {
      x0: st.cx - st.rOut - st.wellPad, x1: st.cx + st.rOut + st.wellPad,
      z0: st.cz - st.rOut - st.wellPad, z1: st.cz + st.rOut + st.wellPad,
    },
  };
}

/**
 * The ground-floor enclosure as a list of [x0,z0,x1,z1] segments —
 * straights and the two filleted shoulders. One source of truth: the
 * geometry draws these and the collider boxes are built from them.
 */
export function groundWall(plan = PLAN) {
  const g = plan.ground, out = [];
  const push = (x0, z0, x1, z1) => out.push([x0, z0, x1, z1]);

  // Entrance wall, with the door left out of the middle.
  push(-g.chordHalf, g.chordZ, -g.door, g.chordZ);
  push(g.door, g.chordZ, g.chordHalf, g.chordZ);

  // The shoulders. A quarter circle of the turning radius each side,
  // landing tangent on the flank wall.
  for (const s of [-1, 1]) {
    const cx = s * g.chordHalf, cz = g.chordZ - g.fillet;
    let px = cx, pz = cz + g.fillet;
    for (let i = 1; i <= g.segments; i++) {
      const a = (Math.PI / 2) * (i / g.segments);
      const x = cx + s * Math.sin(a) * g.fillet;
      const z = cz + Math.cos(a) * g.fillet;
      push(px, pz, x, z);
      px = x; pz = z;
    }
  }

  // Flanks and the rear wall.
  for (const s of [-1, 1]) push(s * g.side, g.chordZ - g.fillet, s * g.side, g.back);
  push(-g.side, g.back, g.side, g.back);

  return out;
}

/**
 * Walkable floor patches in LOCAL coordinates. Each exposes heightAt(x,z).
 * Stacked ramp flights share one footprint; walk.js sticks to one flight
 * and switches at the landings. Flat pads past each end catch the jog
 * overshoot so you turn on a deck instead of falling onto the living floor.
 */
export function floorPatches(plan = PLAN) {
  const L = plan.levels;
  const rp = plan.ramp;
  const hw = plan.box.w / 2, hd = plan.box.d / 2;
  const span = rp.z1 - rp.z0;
  const halfW = rp.w / 2;
  const stops = rampStops(plan);
  const LAND = rp.land;
  const O = openings(plan);
  const out = [];

  const onRamp = (x, z) =>
    x >= rp.x - halfW && x <= rp.x + halfW && z >= rp.z0 && z <= rp.z1;

  // Ramp well including landings — living/roof must not fill this void.
  // The hole is the DRAWN hole: the slab trays stop at wellHalf (ramp
  // plus reveal), so the patch stops there too. The 17cm reveal strip
  // between ramp and tray is fenced by the rail colliders, not floored.
  const inWell = (x, z) =>
    x >= rp.x - O.wellHalf && x <= rp.x + O.wellHalf
    && z >= O.wellZ0 && z <= O.wellZ1;

  // The stairwell cut around the helix — the living and roof slabs are
  // open here, so their patches must be too, or the drawn hole carries
  // an invisible floor across the top of the spiral stair.
  const sw = O.stairRect;
  const inStairWell = (x, z) =>
    x >= sw.x0 && x <= sw.x1 && z >= sw.z0 && z <= sw.z1;

  for (let i = 0; i < rp.flights; i++) {
    const y0 = stops[i], y1 = stops[i + 1];
    const dir = i % 2 === 0 ? 1 : -1;
    out.push({
      kind: 'ramp',
      flight: i,
      heightAt(x, z) {
        if (!onRamp(x, z)) return null;
        const t = (z - rp.z0) / span;
        // dir=+1: low at +z (t=1), high at −z (t=0)
        return dir === 1
          ? y0 + (y1 - y0) * (1 - t)
          : y0 + (y1 - y0) * t;
      },
    });
  }

  // Flat landings past each end only (not overlapping the ramp strip),
  // so stepping back onto the ramp releases the sticky landing and
  // picks the next flight.
  const pad = (z0, z1, y) => ({
    kind: 'landing',
    y,
    heightAt(x, z) {
      if (Math.abs(x - rp.x) > halfW) return null;
      if (z < z0 || z > z1) return null;
      return y;
    },
  });
  for (const y of [stops[1], stops[3]]) out.push(pad(rp.z0 - LAND, rp.z0, y));
  for (const y of [stops[0], stops[2], stops[4]]) out.push(pad(rp.z1, rp.z1 + LAND, y));

  // Living floor / north terrace — whole box, holes cut for the ramp
  // well and the stairwell.
  out.push({
    kind: 'living',
    heightAt(x, z) {
      if (Math.abs(x) > hw - 0.05 || Math.abs(z) > hd - 0.05) return null;
      if (inWell(x, z)) return null;
      if (inStairWell(x, z)) return null;
      return L.first;
    },
  });

  // Roof garden — the walkable roof is the DRAWN slab, no more. North
  // of the slab's edge is the open terrace's sky, and answering there
  // used to float visitors six metres past the concrete before dropping
  // them off the end. Ramp well and stairwell stay open here too.
  out.push({
    kind: 'roof',
    heightAt(x, z) {
      if (Math.abs(x) > hw - 0.05 || Math.abs(z) > hd - 0.05) return null;
      if (z < O.rz0 + 0.05) return null;
      if (inWell(x, z)) return null;
      if (inStairWell(x, z)) return null;
      return L.roof;
    },
  });

  // ── The spiral stair, as one multi-lap patch ─────────────
  // A helix occupies the same XZ at several heights, so heightAt takes
  // the walker's current height and answers for the lap they are on.
  // That third argument is the whole reason a helical stair can exist
  // in this walker: without it the patch must guess a lap, and guessing
  // is exactly what sends a visitor to the wrong floor.
  {
    const st = plan.stair;
    const total = L.roof;
    const perTurn = total / st.revs;
    // The slabs now hold a real stairwell open around the helix (they
    // used to be solid through it), which leaves a wellPad-wide rim
    // between the outer tread edge and the stairwell lip. That rim is
    // the stair's own floor at its two doorways — the boarding
    // threshold on the grass, the arrival lip at the roof — and open
    // well everywhere else. Without it, stepping off the top of the
    // helix crossed 20cm where nothing answered and the walker dropped
    // two storeys at the exact moment of arrival.
    const rimOut = st.rOut + st.wellPad + 0.05;
    out.push({
      kind: 'stair',
      heightAt(x, z, curY = 0) {
        const dx = x - st.cx, dz = z - st.cz;
        const rad = Math.hypot(dx, dz);
        if (rad < st.rIn - 0.02 || rad > rimOut) return null;
        let rel = Math.atan2(dz, dx) - st.t0;
        rel = ((rel % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        let best = null;
        for (let lap = -1; lap <= Math.ceil(st.revs); lap++) {
          let y = ((rel / (Math.PI * 2)) + lap) * perTurn;
          // The thresholds: just past either end of the helix the
          // answer is the floor it arrives at — the grass below, the
          // roof lip above — not a wrap onto the wrong lap.
          if (y < -0.01 && y > -0.2) y = 0;
          if (y > total + 0.01 && y < total + 0.2) y = total;
          if (y < -0.01 || y > total + 0.01) continue;
          if (best == null || Math.abs(y - curY) < Math.abs(best - curY)) best = y;
        }
        // Past the treads the rim carries you only at the doorways.
        if (best != null && rad > st.rOut + 0.05
            && best > 0.6 && best < total - 0.6) return null;
        return best;
      },
    });
  }

  return out;
}

/**
 * Collision boxes in LOCAL coordinates — one source of truth shared by
 * the geometry and the test. Optional minY/maxY: living walls must not
 * fence off the grass under the pilotis.
 */
export function colliderBoxes(plan = PLAN) {
  const out = [];
  const T = plan.ground.t;
  const L = plan.levels;
  const B = plan.box;
  const hw = B.w / 2, hd = B.d / 2;

  // ponytail: walk.js takes AABBs, so each wall segment becomes the
  // bounding box of its chord. On the two curved shoulders that leaves
  // under 15cm of invisible margin at the diagonals; raise `segments`
  // if it ever reads as sticky.
  for (const [x0, z0, x1, z1] of groundWall(plan)) {
    out.push({
      minX: Math.min(x0, x1) - T, maxX: Math.max(x0, x1) + T,
      minZ: Math.min(z0, z1) - T, maxZ: Math.max(z0, z1) + T,
      maxY: L.first - 0.1,
    });
  }

  // Every column except the middle line, which the promenade takes.
  const r = plan.piloti.r + 0.06;
  for (const x of plan.cols) {
    if (x === 0) continue;
    for (const z of plan.cols) {
      out.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });
    }
  }

  // Ramp side rails — enter only from the open ends, never the flanks.
  // They run the full well, landings included: the living and roof
  // patches stop at the well's drawn edge, so the rail is what keeps a
  // walker on those floors from stepping into the void beside the ramp.
  const rp = plan.ramp;
  const rail = rp.t + 0.04;
  const halfW = rp.w / 2;
  const LAND = rp.land;
  const O = openings(plan);
  for (const s of [-1, 1]) {
    const x0 = rp.x + s * (rp.w / 2);
    out.push({
      minX: Math.min(x0, x0 + s * rail) - 0.02,
      maxX: Math.max(x0, x0 + s * rail) + 0.02,
      minZ: O.wellZ0, maxZ: O.wellZ1,
    });
  }
  // North end-stop on the landing — the switchback turns here; without
  // it a jog runs off the pad onto the living floor 2m below.
  out.push({
    minX: rp.x - halfW, maxX: rp.x + halfW,
    minZ: rp.z0 - LAND - 0.12, maxZ: rp.z0 - LAND + 0.08,
    minY: 0.5,
  });

  // Living-floor perimeter. North keeps a low parapet only (terrace).
  // minY keeps these from blocking the walk under the cantilever.
  const wt = 0.22;
  const liveLo = L.first - 0.15;
  const liveHi = L.firstTop + 0.2;
  // South, east, west — full storey
  out.push({ minX: -hw, maxX: hw, minZ: hd - wt, maxZ: hd + wt, minY: liveLo, maxY: liveHi });
  out.push({ minX: -hw - wt, maxX: -hw + wt, minZ: -hd, maxZ: hd, minY: liveLo, maxY: liveHi });
  out.push({ minX: hw - wt, maxX: hw + wt, minZ: -hd, maxZ: hd, minY: liveLo, maxY: liveHi });
  // North terrace parapet — low rail, open to the sky above
  out.push({
    minX: -hw, maxX: hw, minZ: -hd - wt, maxZ: -hd + wt,
    minY: liveLo, maxY: L.first + L.sill + 0.15,
  });

  // Roof parapets. South runs the full façade; west and east stop where
  // the slab stops — a parapet past that line would float over the open
  // terrace. The slab's own north edge gets a rail in two pieces either
  // side of the ramp well, because a garden whose floor simply ends at
  // a 3.3m drop is a defect, not a terrace — and the well strip stays
  // open so the top flight can rise through it.
  const pLo = L.roof - 0.15, pHi = L.roof + L.parapet + 0.1;
  out.push({ minX: -hw, maxX: hw, minZ: hd - wt, maxZ: hd + wt, minY: pLo, maxY: pHi });
  out.push({ minX: -hw - wt, maxX: -hw + wt, minZ: O.rz0, maxZ: hd, minY: pLo, maxY: pHi });
  out.push({ minX: hw - wt, maxX: hw + wt, minZ: O.rz0, maxZ: hd, minY: pLo, maxY: pHi });
  for (const s of [-1, 1]) {
    out.push({
      minX: s === -1 ? -hw : O.wellHalf, maxX: s === -1 ? -O.wellHalf : hw,
      minZ: O.rz0 - wt, maxZ: O.rz0 + wt, minY: pLo, maxY: pHi,
    });
  }

  // ── The solarium windbreak ───────────────────────────────
  // The one free curve on the roof, and for a long time the one wall in
  // the house you could walk straight through. Same arc, same segment
  // count as the drawn wall. Segments that overhang the ramp well or
  // the stairwell get no collider: there is no floor to stand on beside
  // them, and a solid box there would clip the walkers rising through
  // the wells on the ramp and the stair. minY keeps all of it clear of
  // the living floor below.
  {
    const s = plan.solarium;
    const sw = O.stairRect;
    const onSlab = (x, z) =>
      z > O.rz0
      && !(Math.abs(x) < O.wellHalf && z < O.wellZ1)
      && !(x > sw.x0 && x < sw.x1 && z > sw.z0 && z < sw.z1);
    let px = s.x + Math.sin(s.a0) * s.r, pz = s.z + Math.cos(s.a0) * s.r;
    for (let i = 1; i <= s.seg; i++) {
      const a = s.a0 + ((s.a1 - s.a0) * i) / s.seg;
      const x = s.x + Math.sin(a) * s.r, z = s.z + Math.cos(a) * s.r;
      if (onSlab((px + x) / 2, (pz + z) / 2)) {
        out.push({
          minX: Math.min(px, x) - 0.12, maxX: Math.max(px, x) + 0.12,
          minZ: Math.min(pz, z) - 0.12, maxZ: Math.max(pz, z) + 0.12,
          minY: L.roof - 0.15, maxY: L.roof + s.h,
        });
      }
      px = x; pz = z;
    }
  }

  // ── The spiral stair's balustrade ────────────────────────
  // A ring of thin boxes at the outer radius, full height, with the two
  // openings left out. Full height is right: over 2.5 turns the rail
  // passes every angle at several heights, and the space between those
  // passes is not floor — so nothing should be able to cross the ring
  // anywhere except the two doors.
  {
    const st = plan.stair;
    const rr = st.rOut + 0.07;
    const gaps = [st.t0, st.t0 + Math.PI];       // board, exit
    const inGap = (a) => gaps.some((g) => {
      let d = a - g;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      return Math.abs(d) < st.railGap / 2;
    });
    for (let i = 0; i < st.railSeg; i++) {
      const a = (i / st.railSeg) * Math.PI * 2;
      if (inGap(a)) continue;
      const cx = st.cx + Math.cos(a) * rr;
      const cz = st.cz + Math.sin(a) * rr;
      const half = (Math.PI * 2 * rr) / st.railSeg / 2 + 0.05;
      out.push({
        minX: cx - half, maxX: cx + half,
        minZ: cz - half, maxZ: cz + half,
      });
    }
  }

  // The car's collider is DYNAMIC now — the parking bay hosts the
  // drivable Cybertruck (drive.js), a world-level object whose solid
  // box follows wherever it is parked. app.js owns that box.

  return out;
}

const mix = (a, b, t) => {
  const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

/** Palette response. White render, pale columns, a shadowed base. */
export function paint(M, p) {
  // Cooler than the Pavilion's travertine, because it is paint, not stone.
  M.render.color.setHex(mix(p.travertine, p.chrome, 0.35));
  M.piloti.color.setHex(p.chrome);
  M.glass.color.setHex(p.water);
  // The service floor keeps its own shadow in every light.
  M.base.color.setHex(mix(p.bg, p.travertine, 0.22));
  M.slab.color.setHex(p.roof);
  if (M.car) M.car.color.setHex(mix(p.bg, 0x1a1c1e, 0.55));
  // The ramp never changes. It is the one amber.
}

// Same reasoning as the Glass House brick: the ramp is a dark deck
// with an amber edge, not a lit strip.
const RAMP = 0x2a1c08;
const CAR = 0x141618;

export function buildSavoye(THREE, scene, opts = {}) {
  const dark = opts.dark !== false;
  const G = new THREE.Group();
  G.position.set(PLAN.origin.x, 0, PLAN.origin.z);
  scene.add(G);

  const mat = (c, o = 1) => new THREE.MeshBasicMaterial({
    color: c, side: THREE.DoubleSide,
    transparent: o < 1, opacity: o, depthWrite: o > 0.6,
  });
  const line = new THREE.LineBasicMaterial({
    color: dark ? 0x8b98a6 : 0x3a4048, transparent: true, opacity: 0.5,
  });
  const amber = new THREE.LineBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.5,
  });

  const MATS = {
    render: mat(dark ? 0x484f4f : 0xc9c9c3),
    piloti: mat(dark ? 0x8e9aa6 : 0xaab4bd),
    // 0.3, not 0.14: below that the ribbon window stops reading as a
    // dark slot cut in a white box and becomes a hole in a ring.
    glass:  mat(dark ? 0x080d12 : 0xa8bcc8, 0.3),
    base:   mat(dark ? 0x0d1013 : 0x8f9490),
    slab:   mat(dark ? 0x121413 : 0xc9c4b8),
    ramp:   mat(RAMP),
    car:    mat(dark ? CAR : 0x2a2e32),
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d, m = line) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); G.add(o); return o; };

  const B = PLAN.box, L = PLAN.levels;
  const hw = B.w / 2, hd = B.d / 2;
  const ph = L.first - L.slab;             // clear height under the box
  const rp = PLAN.ramp;

  // ── The grass it stands on ──────────────────────────────
  // A quiet apron, so the box floats above something rather than
  // hovering over the general plain.
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(B.w + 10, B.d + 10), MATS.base);
  apron.rotation.x = -Math.PI / 2;
  at(apron, 0, 0.008, 0);

  // ── Pilotis ─────────────────────────────────────────────
  for (const x of PLAN.cols) {
    if (x === 0) continue;               // the axis belongs to the ramp
    for (const z of PLAN.cols) {
      const c = new THREE.Mesh(
        // +4cm so the cap is buried in the slab rather than coplanar with its
        // underside — 20 columns were z-fighting under the box.
        new THREE.CylinderGeometry(PLAN.piloti.r, PLAN.piloti.r, ph + 0.04, 12), MATS.piloti);
      at(c, x, ph / 2, z);
    }
  }

  // ── The ground floor ────────────────────────────────────
  {
    const segs = groundWall();
    for (const [x0, z0, x1, z1] of segs) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const s = box(len, ph, PLAN.ground.t, MATS.glass);
      s.position.set((x0 + x1) / 2, ph / 2, (z0 + z1) / 2);
      s.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
      G.add(s);
    }
    // Drawn as a continuous line top and bottom, so the shoulders read
    // as one sweep and not as twelve facets.
    for (const y of [0.02, ph]) {
      const pts = [];
      for (const [x0, z0, x1, z1] of segs) {
        pts.push(new THREE.Vector3(x0, y, z0), new THREE.Vector3(x1, y, z1));
      }
      G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), line));
    }
    // Door reveals — two thin jambs so the opening reads as an entrance.
    const g = PLAN.ground;
    for (const s of [-1, 1]) {
      at(box(0.12, ph, 0.14, MATS.render), s * g.door, ph / 2, g.chordZ);
    }
  }

  // ── The parking bay under the pilotis ────────────────────
  // PLAN.car is the pose. The vehicle itself is the estate's drivable
  // Cybertruck — built at world level by drive.js so it can leave —
  // and it parks exactly where the Traction Avant used to sit, in the
  // driveway the ground-floor curve was drawn around. The curve keeps
  // its reason; the car keeps up with the estate.

  // ── Slab helpers ────────────────────────────────────────
  // Both slabs are built from the same openings the floor patches read,
  // so every square metre of drawn concrete answers to a patch and
  // every patch stands on drawn concrete. That equivalence is the fix
  // for a whole family of bugs: floors you fell through, air you stood
  // on, a stair that pierced two storeys of concrete.
  const O = openings(PLAN);
  const sw = O.stairRect;
  // A rectangle minus the stairwell, as up-to-four strips — the helix
  // needs a real opening in every horizontal plane it passes through.
  const minusStair = (x0, z0, x1, z1) => {
    if (sw.x1 <= x0 || sw.x0 >= x1 || sw.z1 <= z0 || sw.z0 >= z1) {
      return [[x0, z0, x1, z1]];
    }
    return [
      [x0, z0, x1, sw.z0],
      [x0, sw.z1, x1, z1],
      [x0, Math.max(z0, sw.z0), sw.x0, Math.min(z1, sw.z1)],
      [sw.x1, Math.max(z0, sw.z0), x1, Math.min(z1, sw.z1)],
    ].filter(([a, b, c, d]) => c - a > 0.05 && d - b > 0.05);
  };
  const slabPiece = (x0, z0, x1, z1, top) => {
    at(box(x1 - x0, L.slab, z1 - z0, MATS.slab),
      (x0 + x1) / 2, top - L.slab / 2, (z0 + z1) / 2);
  };
  const washPiece = (x0, z0, x1, z1, y) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), MATS.slab);
    p.rotation.x = -Math.PI / 2;
    at(p, (x0 + x1) / 2, y, (z0 + z1) / 2);
  };

  // ── First-floor slab, cantilevered, with a ramp well ────
  {
    const wellHalf = O.wellHalf;
    // Two side trays + a north and south cap so the well reads as a
    // cut, not a missing floor. The caps stop at the landings — the
    // north cap used to run 4.4m over the drop zone, drawn floor the
    // patches (rightly) refused to hold a walker on. The west tray is
    // cut again around the stairwell.
    for (const [x0, z0, x1, z1] of minusStair(-hw, -hd, -wellHalf, hd)) {
      slabPiece(x0, z0, x1, z1, L.first);
    }
    slabPiece(wellHalf, -hd, hw, hd, L.first);
    slabPiece(-wellHalf, -hd, wellHalf, O.wellZ0, L.first);
    slabPiece(-wellHalf, O.wellZ1, wellHalf, hd, L.first);
    at(edges(B.w, L.slab, B.d), 0, L.first - L.slab / 2, 0);

    // Living floor wash — so the storey reads as a place, not a void
    // between two slabs once you are up the ramp. Two sheets flanking
    // the well (the old full-box plane closed the well with a floor you
    // could see and fall through, and a ceiling over the ramp), the
    // west one cut around the stairwell.
    for (const [x0, z0, x1, z1] of minusStair(-hw + 0.2, -hd + 0.2, -wellHalf, hd - 0.2)) {
      washPiece(x0, z0, x1, z1, L.first + 0.01);
    }
    washPiece(wellHalf, -hd + 0.2, hw - 0.2, hd - 0.2, L.first + 0.01);
  }

  // ── The living floor: two render bands and a ribbon ─────
  // The window runs the whole way round and does not stop at a corner.
  // The NORTH quadrant loses everything above the parapet: that is the
  // open-air terrace cut out of the box, and it is on the far side on
  // purpose. You arrive from the south, and the elevation you arrive at
  // has to be the complete one — parapet, ribbon, head band — or the
  // house reads as a shed with its front wall missing.
  {
    const t = 0.24;
    const sillY = L.first + L.sill, headY = L.first + L.head;
    const TERRACE = PLAN.terrace;
    const SIDES = {
      north: [B.w, t, 0, -hd],          // the terrace side
      south: [B.w, t, 0, hd],           // the arrival elevation
      west:  [t, B.d, -hw, 0],
      east:  [t, B.d, hw, 0],
    };
    const band = (name, y0, y1) => {
      const [w, d, x, z] = SIDES[name];
      const h = y1 - y0;
      at(box(w, h, d, MATS.render), x, (y0 + y1) / 2, z);
      at(edges(w, h, d), x, (y0 + y1) / 2, z);
    };
    for (const name of Object.keys(SIDES)) {
      band(name, L.first, sillY);                          // parapet band
      if (name !== TERRACE) band(name, headY, L.firstTop);  // head band
    }
    // The ribbon does not stop at a corner. That is the whole point of
    // it, and the reason the façade had to come off the structure first.
    for (const name of ['south', 'west', 'east']) {
      const [w, d, x, z] = SIDES[name];
      const gw = name === 'south' ? B.w : 0.12;
      const gd = name === 'south' ? 0.12 : B.d;
      at(box(gw, headY - sillY, gd, MATS.glass), x, (sillY + headY) / 2, z);
      // Mullions — light vertical ticks so the ribbon reads as glazing
      // rather than a painted stripe. Every bay, not every metre.
      const along = name === 'south' ? B.w : B.d;
      const n = Math.round(along / PLAN.bay);
      for (let i = 1; i < n; i++) {
        const u = -along / 2 + (along * i) / n;
        if (name === 'south') at(box(0.06, headY - sillY, 0.1, MATS.render), u, (sillY + headY) / 2, z);
        else at(box(0.1, headY - sillY, 0.06, MATS.render), x, (sillY + headY) / 2, u);
      }
    }
  }

  // ── Roof slab, parapet, solarium ────────────────────────
  // The roof covers the enclosed part only; over the terrace it is sky.
  // Like the first floor it is trays around the ramp well — the top
  // flight rises through this slab, and it used to rise through solid
  // concrete — with a south cap past the arrival landing and the
  // stairwell cut where the helix comes up.
  {
    const { rd, rz, rz0, rz1, wellHalf } = O;
    for (const [x0, z0, x1, z1] of minusStair(-hw, rz0, -wellHalf, rz1)) {
      slabPiece(x0, z0, x1, z1, L.roof);
    }
    slabPiece(wellHalf, rz0, hw, rz1, L.roof);
    slabPiece(-wellHalf, O.wellZ1, wellHalf, rz1, L.roof);
    at(edges(B.w, L.slab, rd), 0, L.roof - L.slab / 2, rz);

    // Roof deck you can stand on — split the same way as the slab.
    for (const [x0, z0, x1, z1] of minusStair(-hw + 0.25, rz0 + 0.15, -wellHalf, rz1 - 0.15)) {
      washPiece(x0, z0, x1, z1, L.roof + 0.01);
    }
    washPiece(wellHalf, rz0 + 0.15, hw - 0.25, rz1 - 0.15, L.roof + 0.01);
    washPiece(-wellHalf, O.wellZ1, wellHalf, rz1 - 0.15, L.roof + 0.01);

    // Parapets: south runs the full façade; west and east only as far
    // as the slab — they used to run the whole box, six floating metres
    // of wall past the concrete and a 28cm slot cut in the façade band.
    // The slab's north edge gets its own low rail either side of the
    // well, the drawn twin of the collider that stops you there.
    const p = L.parapet, t = 0.2, y = L.roof + p / 2;
    at(box(B.w, p, t, MATS.render), 0, y, hd);
    at(box(t, p, rd, MATS.render), -hw, y, rz);
    at(box(t, p, rd, MATS.render), hw, y, rz);
    at(edges(B.w, p, t), 0, y, hd);
    for (const sgn of [-1, 1]) {
      const px0 = sgn === -1 ? -hw : wellHalf, px1 = sgn === -1 ? -wellHalf : hw;
      at(box(px1 - px0, p, t, MATS.render), (px0 + px1) / 2, y, rz0);
      at(edges(px1 - px0, p, t), (px0 + px1) / 2, y, rz0);
    }

    const s = PLAN.solarium, n = s.seg, v = [];
    for (let i = 0; i <= n; i++) {
      const a = s.a0 + ((s.a1 - s.a0) * i) / n;
      v.push([s.x + Math.sin(a) * s.r, s.z + Math.cos(a) * s.r]);
    }
    for (let i = 0; i < n; i++) {
      const [x0, z0] = v[i], [x1, z1] = v[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const seg = box(len, s.h, 0.18, MATS.render);
      seg.position.set((x0 + x1) / 2, L.roof + s.h / 2, (z0 + z1) / 2);
      seg.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
      G.add(seg);
    }
    for (const y2 of [L.roof + 0.02, L.roof + s.h]) {
      G.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(v.map(([x, z]) => new THREE.Vector3(x, y2, z))),
        line));
    }
  }

  // ── The spiral stair ────────────────────────────────────
  // The fast way up, and the second half of the promenade argument. A
  // central steel post, treads radiating off it, and a hairline helix
  // where the balustrade runs. No solid rail: you step on and off it
  // anywhere, which is what a stair in an open hall actually offers.
  {
    const st = PLAN.stair;
    const perTurn = L.roof / st.revs;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(st.rIn, st.rIn, L.roof, 12),
      MATS.piloti);
    at(post, st.cx, L.roof / 2, st.cz);
    const helix = [[], []];
    for (let i = 0; i <= st.treads; i++) {
      const f = i / st.treads;
      const a = st.t0 + f * st.revs * Math.PI * 2;
      const y = f * L.roof;
      if (i < st.treads) {
        // One tread: a thin slab from the post to the outer radius,
        // turned to its own angle. Treads, not a smooth ribbon — this is
        // a stair and it should read as steps.
        const len = st.rOut - st.rIn;
        const tread = box(len, 0.06, 0.62, MATS.slab);
        tread.position.set(
          st.cx + Math.cos(a) * (st.rIn + len / 2), y,
          st.cz + Math.sin(a) * (st.rIn + len / 2));
        tread.rotation.y = -a;
        G.add(tread);
        G.add((() => {
          const e = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(len, 0.06, 0.62)), line);
          e.position.copy(tread.position); e.rotation.y = -a; return e;
        })());
      }
      helix[0].push(new THREE.Vector3(
        st.cx + Math.cos(a) * st.rOut, y + 0.02, st.cz + Math.sin(a) * st.rOut));
      helix[1].push(new THREE.Vector3(
        st.cx + Math.cos(a) * st.rOut, y + 0.95, st.cz + Math.sin(a) * st.rOut));
    }
    for (const strand of helix) {
      G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(strand), line));
    }
    // The arrival threshold: the helix's last step is the roof's own
    // lip. One plate at roof height, run out across the stairwell rim
    // to the slab edge, so the step off the stair lands on something
    // you can see — the drawn twin of the patch's clamped top lap.
    {
      const aEnd = st.t0 + st.revs * Math.PI * 2;
      // Start the plate at the radius where its rectangular corners
      // stay inside the patch's 0.2m-of-rise threshold clamp — closer
      // to the post a corner would subtend more of the helix than the
      // clamp answers for, drawn floor with nothing walkable on it.
      const clampA = (0.2 / (L.roof / st.revs)) * Math.PI * 2;
      const in0 = 0.31 / Math.tan(clampA);
      const len = st.rOut + st.wellPad - in0;
      const plate = box(len, 0.06, 0.62, MATS.slab);
      plate.position.set(
        st.cx + Math.cos(aEnd) * (in0 + len / 2), L.roof,
        st.cz + Math.sin(aEnd) * (in0 + len / 2));
      plate.rotation.y = -aEnd;
      G.add(plate);
    }
    // The balustrade: short balusters standing ON the treads, between
    // the two helix strands. Full-height posts every 15° were the first
    // attempt and read as a cage of bars — a spiral stair's rail follows
    // its own treads, so at any height what stops you is the rail that is
    // actually beside you there.
    {
      const rr = st.rOut + 0.03;
      for (let i = 0; i <= st.treads; i += 2) {
        const f = i / st.treads;
        const a = st.t0 + f * st.revs * Math.PI * 2;
        const y = f * L.roof;
        const bal = box(0.045, 0.93, 0.045, MATS.piloti);
        at(bal, st.cx + Math.cos(a) * rr, y + 0.47, st.cz + Math.sin(a) * rr);
      }
    }
  }

  // ── The ramp ────────────────────────────────────────────
  // Four flights on the axis, doubling back: grass to living floor to
  // garden. The only amber in the building, because it is the building.
  {
    const r = PLAN.ramp, span = r.z1 - r.z0, mz = (r.z0 + r.z1) / 2;
    const flight = (y0, y1, dir) => {
      const len = Math.hypot(span, y1 - y0);
      const ang = Math.atan2(y1 - y0, span) * dir;
      const y = (y0 + y1) / 2;
      const deck = box(r.w, r.t, len, MATS.ramp);
      // Seated so the TOP face is the walked line, not the slab's
      // centre — centred, the deck's surface floated 8cm above your
      // feet and you waded up the ramp shin-deep in concrete.
      deck.position.set(r.x, y - (r.t / 2) / Math.cos(ang), mz);
      deck.rotation.x = ang;
      G.add(deck);
      const e = edges(r.w, r.t, len, amber);
      e.position.copy(deck.position); e.rotation.x = ang;
      G.add(e);
      for (const s of [-1, 1]) {
        const b = box(r.t, 1.0, len, MATS.render);
        b.position.set(r.x + s * (r.w / 2 + r.t / 2), y + 0.55, mz);
        b.rotation.x = ang;
        G.add(b);
      }
    };
    // Alternating: each flight starts where the last one stopped, at
    // the other end of the hall. dir=+1 puts the low end at +z.
    const stops = rampStops(PLAN);
    for (let i = 0; i < PLAN.ramp.flights; i++) {
      flight(stops[i], stops[i + 1], i % 2 === 0 ? 1 : -1);
    }
    // The switchback landings. The floor patches always held a flat pad
    // past each end of the ramp — but nothing was ever drawn there, so
    // you turned each corner standing on thin air. Four decks: the two
    // north turns, and the living and roof arrivals at the south. The
    // south ground pad is the grass itself and needs no deck.
    const deckAt = (z0, z1, y) => {
      const d = box(r.w, r.t, z1 - z0, MATS.ramp);
      d.position.set(r.x, y - r.t / 2, (z0 + z1) / 2);
      G.add(d);
      const e = edges(r.w, r.t, z1 - z0, amber);
      e.position.copy(d.position);
      G.add(e);
    };
    for (const y of [stops[1], stops[3]]) deckAt(r.z0 - r.land, r.z0, y);
    for (const y of [stops[2], stops[4]]) deckAt(r.z1, r.z1 + r.land, y);
  }

  // ── Colliders + floors, moved onto the ground plane ─────
  const o = PLAN.origin;
  const colliders = colliderBoxes(PLAN).map(b => ({
    minX: b.minX + o.x, maxX: b.maxX + o.x,
    minZ: b.minZ + o.z, maxZ: b.maxZ + o.z,
    minY: b.minY, maxY: b.maxY,
  }));

  const floors = floorPatches(PLAN).map(f => ({
    kind: f.kind,
    flight: f.flight,
    // curY must pass THROUGH: a patch that answers differently at
    // different heights (a helical stair) sees undefined otherwise and
    // always answers for the ground lap. The wrapper dropping an
    // argument is invisible in a module test and total in the scene.
    heightAt: (x, z, curY) => f.heightAt(x - o.x, z - o.z, curY),
  }));

  const surfaces = {
    ramp:  { center: { x: o.x, y: L.first / 2, z: o.z }, kind: 'ramp' },
    entry: { center: { x: o.x, y: 1.5, z: o.z + PLAN.ground.chordZ }, kind: 'glass' },
    car:   { center: { x: o.x + PLAN.car.x, y: 0.6, z: o.z + PLAN.car.z }, kind: 'car' },
    terrace: {
      center: { x: o.x, y: L.first + EYE_HINT, z: o.z - hd + 1.5 },
      kind: 'terrace',
    },
  };

  return { group: G, colliders, floors, surfaces, materials: MATS, plan: PLAN };
}

// Hint only for surface registry — walk.js owns the real eye height.
const EYE_HINT = 1.65;
