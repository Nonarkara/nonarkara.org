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

  // The ramp. A SINGLE CONTINUOUS SPIRAL — that is what Le Corbusier
  // actually built. The 4-flight switchback system v1 used was not a
  // ramp, it was a staircase with a guard rail, and the walker had to
  // turn 180° three times to reach the roof. The real Savoye ramp is
  // one continuous incline that wraps the central void; you start at
  // the front door, walk forward, and the spiral carries you to the
  // roof garden. Almost one full revolution (0.99) keeps the spiral
  // open: with a full turn or more, the entry and a later lap would
  // share the same XZ and the heightAt would have to guess which lap
  // the walker is on. 0.99 lands the exit just shy of due-north, so
  // the walker emerges from the spiral onto the roof garden, the way
  // the real building's ramp emerges onto the solarium side.
  //
  //   cx, cz  spiral center
  //   r       spiral radius (5.6m so the entry lands at the front door)
  //   t0      start angle, measured CCW from +x. π/2 = south.
  //   revs    0.99 — just under one full turn. Path length 34.83m,
  //          slope 1:5.14 (above the 1:5 staircase ceiling).
  //   flights always 1 — a single continuous incline, no switchbacks.
  ramp: {
    w: 3.0, x: 0,
    cx: 0, cz: 0,
    r: 5.6,
    t0: Math.PI / 2,
    revs: 0.99,
    t: 0.16,
    flights: 1,
  },

  // Which side loses its upper storey to the open-air terrace. It must
  // not be the side you arrive on: the elevation you walk up to has to
  // be the complete one, or the house reads as a shed with its front
  // wall missing. The test holds this against the spawn.
  terrace: 'north',

  // The solarium windbreak on the roof — the one free curve up there.
  // Sits over the roofed half, which is the southern one. 2.4m is tall
  // enough to read as a wall from the south approach, where most
  // visitors arrive and the silhouette is what the house is.
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

/** Ramp stops. One continuous spiral: grass → roof. */
export function rampStops(plan = PLAN) {
  return [0, plan.levels.roof];
}

/** Spiral entry position — the (x, z) of the front-door end. */
export function rampEntryPos(plan = PLAN) {
  const rp = plan.ramp;
  return { x: rp.cx + rp.r * Math.cos(rp.t0), z: rp.cz + rp.r * Math.sin(rp.t0) };
}

/** Spiral exit position — the (x, z) of the roof-garden end. */
export function rampExitPos(plan = PLAN) {
  const rp = plan.ramp;
  const th = rp.t0 - 2 * Math.PI * rp.revs;
  return { x: rp.cx + rp.r * Math.cos(th), z: rp.cz + rp.r * Math.sin(th) };
}

/**
 * Project (x, z) onto the spiral. Returns t ∈ [0, 1] if the point is
 * within the ramp's width; null otherwise. With revs < 1 the spiral
 * is single-pass and every point has at most one valid t, so the
 * walker is always on the right height.
 */
export function rampAt(x, z, plan = PLAN) {
  const rp = plan.ramp;
  const dx = x - rp.cx, dz = z - rp.cz;
  const r = Math.hypot(dx, dz);
  if (Math.abs(r - rp.r) > rp.w / 2 + 0.05) return null;
  let theta = Math.atan2(dz, dx);
  // atan2 returns (−π, π]. The walker goes clockwise from θ = t0
  // (south) sweeping 2π × revs radians back. If θ > t0 we have wrapped
  // past the start; subtract 2π to make it continuous.
  if (theta > rp.t0) theta -= 2 * Math.PI;
  const sweep = 2 * Math.PI * rp.revs;
  const t = (rp.t0 - theta) / sweep;
  if (t < 0 || t > 1) return null;
  return t;
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
 * The ramp is now a single continuous spiral; no more switchbacks. The
 * spiral footprint is the well; living and roof floors hole out around it.
 */
export function floorPatches(plan = PLAN) {
  const L = plan.levels;
  const rp = plan.ramp;
  const hw = plan.box.w / 2, hd = plan.box.d / 2;
  const out = [];

  // Spiral ramp — one continuous patch, heightAt returns t × L.roof.
  out.push({
    kind: 'ramp',
    flight: 0,
    heightAt(x, z) {
      const t = rampAt(x, z, plan);
      if (t == null) return null;
      return t * L.roof;
    },
  });

  // The spiral well — anything INSIDE the spiral's swept radius is the
  // well. The ramp itself sits at radius r ± w/2, and the central void
  // (r < r - w/2) is the open void. Living and roof floors are outside
  // (r > r + w/2). Sharing one check means the well is a single donut.
  const inWell = (x, z) => {
    const dx = x - rp.cx, dz = z - rp.cz;
    const r = Math.hypot(dx, dz);
    return r < rp.r + rp.w / 2 + 0.1;
  };

  // Living floor / north terrace — whole box, hole cut for the spiral well.
  out.push({
    kind: 'living',
    heightAt(x, z) {
      if (Math.abs(x) > hw - 0.05 || Math.abs(z) > hd - 0.05) return null;
      if (inWell(x, z)) return null;
      return L.first;
    },
  });

  // Roof garden — slab and open north strip, spiral well left to the ramp.
  out.push({
    kind: 'roof',
    heightAt(x, z) {
      if (Math.abs(x) > hw - 0.05 || Math.abs(z) > hd - 0.05) return null;
      if (inWell(x, z)) return null;
      return L.roof;
    },
  });

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

  // Ramp railings — a single thin ring sitting ON TOP of the ramp
  // surface, at the outer edge of the spiral. The walker must be able
  // to walk UNDER the railings at the entry (y = 0), so the rail's
  // minY starts 0.1m above the ramp surface, not at the surface.
  // The inner edge is open to the central void (the real building has
  // no inner rail, only the rope-edge of the ramp).
  const rp = plan.ramp;
  {
    const N = 36;
    const ringR = rp.r + rp.w / 2 + 0.04;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const th0 = rp.t0 - 2 * Math.PI * rp.revs * t0;
      const th1 = rp.t0 - 2 * Math.PI * rp.revs * t1;
      const x0 = rp.cx + ringR * Math.cos(th0);
      const z0 = rp.cz + ringR * Math.sin(th0);
      const x1 = rp.cx + ringR * Math.cos(th1);
      const z1 = rp.cz + ringR * Math.sin(th1);
      const y0 = t0 * L.roof, y1 = t1 * L.roof;
      out.push({
        minX: Math.min(x0, x1) - 0.04, maxX: Math.max(x0, x1) + 0.04,
        minZ: Math.min(z0, z1) - 0.04, maxZ: Math.max(z0, z1) + 0.04,
        minY: Math.min(y0, y1) + 0.1, maxY: Math.max(y0, y1) + 1.05,
      });
    }
  }

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
    // The famous solarium colour panels — red, blue, orange — the
    // three painted walls Le Corbusier used to tune the roof garden.
    // They are the only saturated colour in the building apart from
    // the ramp, and the only thing on the roof the eye catches from
    // far away. Hung inside the curve at the +z side, facing inward.
    {
      const panels = [
        { hex: 0xb53a2a, angle: s.a0 + 0.15 },         // red
        { hex: 0xd68a35, angle: (s.a0 + s.a1) / 2 },   // orange
        { hex: 0x3558a8, angle: s.a1 - 0.15 },         // blue
      ];
      for (const p of panels) {
        const cx = s.x + Math.sin(p.angle) * (s.r - 0.5);
        const cz = s.z + Math.cos(p.angle) * (s.r - 0.5);
        const wall = new THREE.Mesh(
          new THREE.PlaneGeometry(1.4, s.h * 0.85),
          new THREE.MeshBasicMaterial({ color: p.hex, side: THREE.DoubleSide }));
        wall.position.set(cx, L.roof + s.h * 0.45, cz);
        wall.rotation.y = -p.angle;
        G.add(wall);
      }
    }
  }

  // ── The ramp ────────────────────────────────────────────
  // A single continuous spiral, the only amber in the building because
  // it is the building. Drawn as a sweep of N small slabs along the
  // spiral path; each slab is oriented along the local tangent so the
  // spiral reads as one sweep rather than a staircase of flat pieces.
  // The guard rail is a thin ring on the OUTER edge of the spiral.
  {
    const r = PLAN.ramp;
    const N = 80;  // segments per revolution, times revs
    const ringR = r.r + r.w / 2 + 0.04;
    for (let i = 0; i < N * r.revs; i++) {
      const t0 = i / (N * r.revs);
      const t1 = (i + 1) / (N * r.revs);
      const th0 = r.t0 - 2 * Math.PI * r.revs * t0;
      const th1 = r.t0 - 2 * Math.PI * r.revs * t1;
      const x0 = r.cx + r.r * Math.cos(th0);
      const z0 = r.cz + r.r * Math.sin(th0);
      const x1 = r.cx + r.r * Math.cos(th1);
      const z1 = r.cz + r.r * Math.sin(th1);
      const y0 = t0 * L.roof, y1 = t1 * L.roof;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, my = (y0 + y1) / 2;
      const segLen = Math.hypot(x1 - x0, z1 - z0);
      const tilt = Math.atan2(y1 - y0, segLen);
      const yaw = Math.atan2(z1 - z0, x1 - x0);

      // The deck slab — flat in its own local frame, tilted to follow
      // the spiral's local pitch and yaw.
      const deck = box(r.w, r.t, segLen, MATS.ramp);
      deck.position.set(mx, my, mz);
      deck.rotation.set(0, -yaw, 0);
      deck.rotateX(tilt);
      G.add(deck);

      // The amber edge line — hairline along the centre of the slab.
      const e = edges(r.w, r.t, segLen, amber);
      e.position.copy(deck.position);
      e.rotation.copy(deck.rotation);
      G.add(e);

      // The outer guard rail — a thin wall just past the outer edge.
      const ringX0 = r.cx + ringR * Math.cos(th0);
      const ringZ0 = r.cz + ringR * Math.sin(th0);
      const ringX1 = r.cx + ringR * Math.cos(th1);
      const ringZ1 = r.cz + ringR * Math.sin(th1);
      const rmx = (ringX0 + ringX1) / 2, rmz = (ringZ0 + ringZ1) / 2;
      const rmy = (y0 + y1) / 2;
      const rSegLen = Math.hypot(ringX1 - ringX0, ringZ1 - ringZ0);
      const rYaw = Math.atan2(ringZ1 - ringZ0, ringX1 - ringX0);
      const rail = box(0.06, 0.95, rSegLen, MATS.render);
      rail.position.set(rmx, rmy + 0.55, rmz);
      rail.rotation.set(0, -rYaw, 0);
      rail.rotateX(tilt);
      G.add(rail);
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
    heightAt: (x, z) => f.heightAt(x - o.x, z - o.z),
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
