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
 * Voisin, which is the least romantic and most Corbusian fact about it.
 *
 * On colour. One amber per site, given to whatever each building is an
 * argument for — the onyx in the Pavilion, the brick cylinder in the
 * Glass House, the RAMP here. Everything else is white render, pale
 * columns, and a ground floor kept in its own shadow, which is the job
 * the dark-painted service floor does in life.
 *
 * Same return shape as buildPavilion.
 */

export const PLAN = {
  name: 'VILLA SAVOYE',
  origin: { x: -60, z: 104 },

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

  // Which side loses its upper storey to the open-air terrace. It must
  // not be the side you arrive on: the elevation you walk up to has to
  // be the complete one, or the house reads as a shed with its front
  // wall missing. The test holds this against the spawn.
  terrace: 'north',

  // The solarium windbreak on the roof — the one free curve up there.
  // Sits over the roofed half, which is the southern one.
  solarium: { x: 3.2, z: 3.4, r: 6.2, a0: 2.2, a1: 4.8, h: 1.9 },

  // Travel drops you on the grass in front, far enough back to see the
  // box floating, which is the only view that explains the building.
  spawn: { x: 0, y: 1.65, z: 16.0, lookAt: { x: 0, y: 2.4, z: 0 } },
};

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
 * Collision boxes in LOCAL coordinates — one source of truth shared by
 * the geometry and the test.
 */
export function colliderBoxes(plan = PLAN) {
  const out = [];
  const T = plan.ground.t;

  // ponytail: walk.js takes AABBs, so each wall segment becomes the
  // bounding box of its chord. On the two curved shoulders that leaves
  // under 15cm of invisible margin at the diagonals; raise `segments`
  // if it ever reads as sticky.
  for (const [x0, z0, x1, z1] of groundWall(plan)) {
    out.push({
      minX: Math.min(x0, x1) - T, maxX: Math.max(x0, x1) + T,
      minZ: Math.min(z0, z1) - T, maxZ: Math.max(z0, z1) + T,
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

  // The ramp. Its lowest flight never rises past 1.75m, so the whole
  // footprint is solid to a walker — you go round it, not under it.
  const rp = plan.ramp;
  out.push({
    minX: rp.x - rp.w / 2 - rp.t, maxX: rp.x + rp.w / 2 + rp.t,
    minZ: rp.z0, maxZ: rp.z1,
  });

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
  // The ramp never changes. It is the one amber.
}

// Same reasoning as the Glass House brick: the ramp is a dark deck
// with an amber edge, not a lit strip.
const RAMP = 0x2a1c08;

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
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d, m = line) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); G.add(o); return o; };

  const B = PLAN.box, L = PLAN.levels;
  const hw = B.w / 2, hd = B.d / 2;
  const ph = L.first - L.slab;             // clear height under the box

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
  }

  // ── First-floor slab, cantilevered past the columns ─────
  at(box(B.w, L.slab, B.d, MATS.slab), 0, L.first - L.slab / 2, 0);
  at(edges(B.w, L.slab, B.d), 0, L.first - L.slab / 2, 0);

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
    }
  }

  // ── Roof slab, parapet, solarium ────────────────────────
  // The roof covers the enclosed part only; over the terrace it is sky.
  {
    const rd = B.d * 0.72, rz = B.d * 0.14;
    at(box(B.w, L.slab, rd, MATS.slab), 0, L.roof - L.slab / 2, rz);
    at(edges(B.w, L.slab, rd), 0, L.roof - L.slab / 2, rz);

    const p = L.parapet, t = 0.2, y = L.roof + p / 2;
    at(box(B.w, p, t, MATS.render), 0, y, hd);
    at(box(t, p, B.d, MATS.render), -hw, y, 0);
    at(box(t, p, B.d, MATS.render), hw, y, 0);
    at(edges(B.w, p, t), 0, y, hd);

    const s = PLAN.solarium, n = 22, v = [];
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
    const stops = [0, L.first / 2, L.first, (L.first + L.roof) / 2, L.roof];
    for (let i = 0; i < PLAN.ramp.flights; i++) {
      flight(stops[i], stops[i + 1], i % 2 === 0 ? 1 : -1);
    }
  }

  // ── Colliders, moved onto the ground plane ──────────────
  const o = PLAN.origin;
  const colliders = colliderBoxes(PLAN).map(b => ({
    minX: b.minX + o.x, maxX: b.maxX + o.x,
    minZ: b.minZ + o.z, maxZ: b.maxZ + o.z,
  }));

  const surfaces = {
    ramp:  { center: { x: o.x, y: L.first / 2, z: o.z }, kind: 'ramp' },
    entry: { center: { x: o.x, y: 1.5, z: o.z + PLAN.ground.chordZ }, kind: 'glass' },
  };

  return { group: G, colliders, surfaces, materials: MATS, plan: PLAN };
}
