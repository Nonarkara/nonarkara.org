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
  ramp: { w: 2.6, x: 0, z0: -7.6, z1: 3.6, t: 0.16, flights: 4 },

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
  },

  // Which side loses its upper storey to the open-air terrace. It must
  // not be the side you arrive on: the elevation you walk up to has to
  // be the complete one, or the house reads as a shed with its front
  // wall missing. The test holds this against the spawn.
  terrace: 'north',

  // The solarium windbreak on the roof — the one free curve up there.
  // Sits over the roofed half, which is the southern one.
  solarium: { x: 3.2, z: 3.4, r: 6.2, a0: 2.2, a1: 4.8, h: 2.4 },

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
  // Long enough to catch a jog overshoot at the switchback (~2m), so the
  // walker turns on a deck instead of dropping onto the living floor.
  const LAND = 2.4;
  const out = [];

  const onRamp = (x, z) =>
    x >= rp.x - halfW && x <= rp.x + halfW && z >= rp.z0 && z <= rp.z1;

  // Ramp well including landings — living/roof must not fill this void.
  const inWell = (x, z) =>
    x >= rp.x - halfW && x <= rp.x + halfW
    && z >= rp.z0 - LAND && z <= rp.z1 + LAND;

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

  // Living floor / north terrace — whole box, hole cut for the ramp well.
  out.push({
    kind: 'living',
    heightAt(x, z) {
      if (Math.abs(x) > hw - 0.05 || Math.abs(z) > hd - 0.05) return null;
      if (inWell(x, z)) return null;
      return L.first;
    },
  });

  // Roof garden — slab and open north strip, ramp well left to the flights.
  out.push({
    kind: 'roof',
    heightAt(x, z) {
      if (Math.abs(x) > hw - 0.05 || Math.abs(z) > hd - 0.05) return null;
      if (inWell(x, z)) return null;
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
    out.push({
      kind: 'stair',
      heightAt(x, z, curY = 0) {
        const dx = x - st.cx, dz = z - st.cz;
        const rad = Math.hypot(dx, dz);
        if (rad < st.rIn - 0.02 || rad > st.rOut + 0.05) return null;
        let rel = Math.atan2(dz, dx) - st.t0;
        rel = ((rel % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        let best = null;
        for (let lap = 0; lap <= Math.ceil(st.revs); lap++) {
          const y = ((rel / (Math.PI * 2)) + lap) * perTurn;
          if (y < -0.01 || y > total + 0.01) continue;
          if (best == null || Math.abs(y - curY) < Math.abs(best - curY)) best = y;
        }
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
  const rp = plan.ramp;
  const rail = rp.t + 0.04;
  const halfW = rp.w / 2;
  const LAND = 2.4; // keep in sync with floorPatches landings
  for (const s of [-1, 1]) {
    const x0 = rp.x + s * (rp.w / 2);
    out.push({
      minX: Math.min(x0, x0 + s * rail) - 0.02,
      maxX: Math.max(x0, x0 + s * rail) + 0.02,
      minZ: rp.z0 - LAND, maxZ: rp.z1 + 0.2,
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

  // Roof parapets (three sides; north is the open terrace edge below)
  const pLo = L.roof - 0.15, pHi = L.roof + L.parapet + 0.1;
  out.push({ minX: -hw, maxX: hw, minZ: hd - wt, maxZ: hd + wt, minY: pLo, maxY: pHi });
  out.push({ minX: -hw - wt, maxX: -hw + wt, minZ: -hd, maxZ: hd, minY: pLo, maxY: pHi });
  out.push({ minX: hw - wt, maxX: hw + wt, minZ: -hd, maxZ: hd, minY: pLo, maxY: pHi });

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
        new THREE.CylinderGeometry(PLAN.piloti.r, PLAN.piloti.r, ph, 12), MATS.piloti);
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

  // ── First-floor slab, cantilevered, with a ramp well ────
  {
    const well = rp.w + 0.35;
    const leftW = hw - well / 2;
    // Two side trays + a north and south cap so the well reads as a
    // cut, not a missing floor.
    at(box(leftW, L.slab, B.d, MATS.slab), -(well / 2 + leftW / 2), L.first - L.slab / 2, 0);
    at(box(leftW, L.slab, B.d, MATS.slab), +(well / 2 + leftW / 2), L.first - L.slab / 2, 0);
    const capD = (B.d - (rp.z1 - rp.z0)) / 2;
    if (capD > 0.4) {
      at(box(well, L.slab, capD, MATS.slab), 0, L.first - L.slab / 2, hd - capD / 2);
      at(box(well, L.slab, capD, MATS.slab), 0, L.first - L.slab / 2, -hd + capD / 2);
    }
    at(edges(B.w, L.slab, B.d), 0, L.first - L.slab / 2, 0);

    // Living floor wash — so the storey reads as a place, not a void
    // between two slabs once you are up the ramp.
    const live = new THREE.Mesh(
      new THREE.PlaneGeometry(B.w - 0.4, B.d - 0.4), MATS.slab);
    live.rotation.x = -Math.PI / 2;
    at(live, 0, L.first + 0.01, 0);
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
  {
    const rd = B.d * 0.72, rz = B.d * 0.14;
    at(box(B.w, L.slab, rd, MATS.slab), 0, L.roof - L.slab / 2, rz);
    at(edges(B.w, L.slab, rd), 0, L.roof - L.slab / 2, rz);

    // Roof deck you can stand on
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(B.w - 0.5, rd - 0.3), MATS.slab);
    deck.rotation.x = -Math.PI / 2;
    at(deck, 0, L.roof + 0.01, rz);

    const p = L.parapet, t = 0.2, y = L.roof + p / 2;
    at(box(B.w, p, t, MATS.render), 0, y, hd);
    at(box(t, p, B.d, MATS.render), -hw, y, 0);
    at(box(t, p, B.d, MATS.render), hw, y, 0);
    at(edges(B.w, p, t), 0, y, hd);

    const s = PLAN.solarium, n = 28, v = [];
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
      const deck = box(r.w, 0.16, len, MATS.ramp);
      deck.position.set(r.x, y, mz); deck.rotation.x = ang;
      G.add(deck);
      const e = edges(r.w, 0.16, len, amber);
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
