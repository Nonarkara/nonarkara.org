/**
 * THE GLASS HOUSE — Philip Johnson, New Canaan, 1949.
 *
 * 32 × 56 feet, which is 9.75 × 17.0 metres, and 10'6" — 3.2m — clear.
 * One room. No interior walls at all except a brick cylinder.
 *
 * The moves that make it that building:
 *
 *   - It is ONE ROOM with glass on four sides. There is no plan to
 *     speak of, which is the plan. Johnson: "I have very expensive
 *     wallpaper."
 *   - A BRICK CYLINDER, floor to above the roof, holding the bathroom
 *     and the fireplace back to back. It is the only opaque thing in
 *     the house and the only thing that touches both floor and sky. It
 *     is why the house stands up as architecture instead of dissolving.
 *   - The STEEL FRAME is painted near-black and the glass is held in
 *     it. At night the house is a lit cage; by day the frame is a thin
 *     dark drawing over the trees.
 *   - A LOW WALNUT CABINET, 1.85m, is the only other divider. It makes
 *     a bedroom by being tall enough to stand behind and short enough
 *     to see over. Nothing is enclosed; things are merely implied.
 *   - ONE DOOR CENTRED ON EACH SIDE. Four doors, no front. You do not
 *     enter a Glass House; you are already inside it.
 *
 * On colour. The site rule is one amber, and it goes to whatever each
 * building is an argument for. In the Pavilion that is the onyx. Here
 * it is the BRICK CYLINDER: the single solid, the fire, the one warm
 * thing in a house made of weather. Steel and glass stay grey.
 *
 * Same return shape as buildPavilion, so the walk controller collides
 * against the numbers the geometry was built from and nothing else.
 */

export const PLAN = {
  name: 'GLASS HOUSE',
  // Where it sits on the shared ground plane. Local coordinates below
  // are relative to the centre of the house floor.
  origin: { x: 40, z: 48 },

  // Brick terrace. The house sits on it; you step up onto brick before
  // you step into glass.
  podium: { w: 13.5, d: 21.5, thickness: 0.9 },

  // The one room. Real dimensions, real clear height.
  house: { w: 9.75, d: 17.0, h: 3.2 },
  roofT: 0.26,

  // Steel. Corner posts and intermediate mullions; the glass spans
  // between them. Bay counts chosen so the mullion spacing is close to
  // the real 2.8m on the long sides.
  frameT: 0.16,
  baysLong: 6,
  baysShort: 3,

  // The brick cylinder: bathroom one side, fireplace the other. It
  // pushes through the roof, which is the only vertical move in the
  // whole house.
  cylinder: { x: 1.85, z: 3.2, r: 1.55, h: 3.78 },

  // The walnut cabinet that makes a bedroom without making a room.
  cabinet: { x: -2.6, z: -1.4, w: 0.62, d: 5.4, h: 1.85 },

  // Half-width of the opening centred on each of the four sides.
  door: 1.0,

  // Where travel drops you: on the brick, outside the south door,
  // looking straight through the house and out the other side.
  spawn: { x: 0, y: 1.65, z: 10.0, lookAt: { x: 0, y: 1.5, z: 0 } },
};

/**
 * Collision boxes in LOCAL coordinates — the single source of truth for
 * what is solid. buildGlassHouse offsets these by PLAN.origin; the test
 * checks the spawn against these same numbers. Deriving them twice is
 * how you get a wall you can walk through.
 */
export function colliderBoxes(plan = PLAN) {
  const h = plan.house, hw = h.w / 2, hd = h.d / 2, d = plan.door, T = plan.frameT;
  const out = [];

  // Each glass side is two runs with the door left out of the middle.
  const runX = (z) => {
    out.push({ minX: -hw, maxX: -d, minZ: z - T, maxZ: z + T });
    out.push({ minX: d, maxX: hw, minZ: z - T, maxZ: z + T });
  };
  const runZ = (x) => {
    out.push({ minX: x - T, maxX: x + T, minZ: -hd, maxZ: -d });
    out.push({ minX: x - T, maxX: x + T, minZ: d, maxZ: hd });
  };
  runX(-hd); runX(hd); runZ(-hw); runZ(hw);

  // The cylinder as a square. ponytail: walk.js does AABBs only, so a
  // circle becomes the square that fits inside it — you can brush the
  // brick at the diagonals. Upgrade to a circle test in walk.js if that
  // ever reads as wrong; at 1.55m radius it does not.
  const c = plan.cylinder, s = c.r * 0.86;
  out.push({ minX: c.x - s, maxX: c.x + s, minZ: c.z - s, maxZ: c.z + s });

  const k = plan.cabinet;
  out.push({
    minX: k.x - k.w / 2, maxX: k.x + k.w / 2,
    minZ: k.z - k.d / 2, maxZ: k.z + k.d / 2,
  });

  return out;
}

/** Palette response. Its own material logic; still near-monochrome. */
export function paint(M, p) {
  M.steel.color.setHex(mix(p.line, p.bg, 0.15));   // dark by day, a lit cage at night
  M.glass.color.setHex(p.water);
  M.deck.color.setHex(p.podium);
  M.floor.color.setHex(p.travertine);
  M.roof.color.setHex(p.roof);
  // The brick never changes. It is fire and it is the one amber.
}

const mix = (a, b, t) => {
  const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

// Brick, in every light. Dark: this is a fireplace flue in a dark
// house, not a lamp. The amber is carried by the courses and the
// floor wash, the way the Pavilion's onyx is carried by its veins —
// a solid mass of accent colour is a second accent, not one.
const BRICK = 0x281a0a;

export function buildGlassHouse(THREE, scene, opts = {}) {
  const dark = opts.dark !== false;
  const G = new THREE.Group();
  G.position.set(PLAN.origin.x, 0, PLAN.origin.z);
  scene.add(G);

  const mat = (c, o = 1) => new THREE.MeshBasicMaterial({
    color: c, side: THREE.DoubleSide,
    transparent: o < 1, opacity: o, depthWrite: o > 0.6,
  });
  const line = new THREE.LineBasicMaterial({
    color: dark ? 0x8b98a6 : 0x3a4048, transparent: true, opacity: 0.55,
  });
  const amber = new THREE.LineBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.42,
  });

  const MATS = {
    steel: mat(dark ? 0x333c45 : 0x424951),
    glass: mat(dark ? 0x080d12 : 0xa8bcc8, 0.14),
    brick: mat(BRICK),
    deck:  mat(dark ? 0x1c1e1c : 0xe6e1d5),
    floor: mat(dark ? 0x2a2b28 : 0xd8d2c4),
    roof:  mat(dark ? 0x121413 : 0xc9c4b8),
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d, m = line) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); G.add(o); return o; };

  const h = PLAN.house, hw = h.w / 2, hd = h.d / 2, T = PLAN.frameT;

  // ── Brick terrace ───────────────────────────────────────
  const p = PLAN.podium;
  at(box(p.w, p.thickness, p.d, MATS.deck), 0, -p.thickness / 2, 0);
  at(edges(p.w, p.thickness, p.d), 0, -p.thickness / 2, 0);

  // Herringbone reads as a grid at this distance; a grid is honest and
  // costs one helper instead of ten thousand triangles.
  const brickGrid = new THREE.GridHelper(p.w, Math.round(p.w / 0.9), 0x8b98a6, 0x8b98a6);
  brickGrid.material = new THREE.LineBasicMaterial({
    color: dark ? 0x6f7d8a : 0x9aa3ab, transparent: true, opacity: 0.13,
  });
  brickGrid.scale.z = p.d / p.w;
  at(brickGrid, 0, 0.004, 0);

  // Interior floor plane, a shade apart from the terrace so the house
  // has an inside even though nothing encloses it.
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(h.w, h.d), MATS.floor);
  fl.rotation.x = -Math.PI / 2;
  at(fl, 0, 0.012, 0);

  // ── Glass ───────────────────────────────────────────────
  // Drawn as the four sides with the doorways left out, so the openings
  // are visible and not just walkable.
  const pane = (w, d, x, z) => {
    at(box(w, h.h, d, MATS.glass), x, h.h / 2, z);
  };
  const D = PLAN.door;
  for (const z of [-hd, hd]) {
    pane(hw - D, T, -(D + hw) / 2, z);
    pane(hw - D, T, (D + hw) / 2, z);
  }
  for (const x of [-hw, hw]) {
    pane(T, hd - D, x, -(D + hd) / 2);
    pane(T, hd - D, x, (D + hd) / 2);
  }

  // ── Steel ───────────────────────────────────────────────
  // Corner posts, then mullions on a regular bay. The frame is the only
  // drawing in the building, so it gets the hairlines.
  //
  // The four corner posts are wide-flange H-sections, not box columns.
  // The elevation shows the H as two parallel vertical strokes joined
  // by a web, the way Philip Johnson drew it. Square posts would make
  // the Glass House look like a greenhouse with a steel frame; the
  // H-sections make it look like Mies drew the building.
  const post = (x, z, w = 0.2, d = 0.2) => {
    at(box(w, h.h, d, MATS.steel), x, h.h / 2, z);
    at(edges(w, h.h, d), x, h.h / 2, z);
  };
  const H_post = (x, z, flangeW, flangeD) => {
    // web: thin in Z, runs Y; two flanges: thin in Y, full in Z.
    const webD = 0.05;
    const flangeT = 0.05;
    at(box(flangeD, h.h, webD, MATS.steel), x, h.h / 2, z);
    const flangeOff = (flangeW - flangeT) / 2;
    at(box(flangeD, flangeT, flangeW, MATS.steel), x, h.h - flangeT / 2, z + flangeOff);
    at(box(flangeD, flangeT, flangeW, MATS.steel), x, flangeT / 2, z + flangeOff);
    at(edges(flangeD, h.h, flangeW), x, h.h / 2, z);
  };
  // Four corner wide-flange H-columns.
  for (const x of [-hw, hw]) for (const z of [-hd, hd]) H_post(x, z, 0.32, 0.20);
  for (let i = 1; i < PLAN.baysLong; i++) {
    const z = -hd + (h.d * i) / PLAN.baysLong;
    post(-hw, z, 0.1, 0.14); post(hw, z, 0.1, 0.14);
  }
  for (let i = 1; i < PLAN.baysShort; i++) {
    const x = -hw + (h.w * i) / PLAN.baysShort;
    post(x, -hd, 0.14, 0.1); post(x, hd, 0.14, 0.1);
  }
  // Sill and head channels — the frame is continuous top and bottom.
  for (const y of [0.09, h.h - 0.09]) {
    at(box(h.w + 0.24, 0.18, 0.14, MATS.steel), 0, y, -hd);
    at(box(h.w + 0.24, 0.18, 0.14, MATS.steel), 0, y, hd);
    at(box(0.14, 0.18, h.d, MATS.steel), -hw, y, 0);
    at(box(0.14, 0.18, h.d, MATS.steel), hw, y, 0);
  }

  // No colour discs here. Three "painted discs Johnson hung to tune the
  // light, shifted between seasons" were added in v4.26; the Glass House
  // has no such objects — what it holds is the brick cylinder, the
  // Poussin on its easel, and the Nadelman pair. Three saturated colours
  // also break the one-accent law in the building whose entire argument
  // is that the brick cylinder is the only warm thing in it.

  // 4 secondary circles on the east wall — small round mirrors or
  // painted discs that Johnson hung in addition to the colour panels,
  // the way the 1949 photographs of the house still have them. They
  // catch daylight from the morning sun.
  {
    const yRow = 1.6, r = 0.12;
    for (let i = 0; i < 4; i++) {
      const x = -3.0 + i * 1.5;
      const mirror = new THREE.Mesh(
        new THREE.CircleGeometry(r, 20),
        new THREE.MeshBasicMaterial({
          color: dark ? 0xc0c4c8 : 0xe6e8ea, side: THREE.DoubleSide,
        }));
      mirror.position.set(x, yRow, hd - 0.05);
      mirror.rotation.y = Math.PI;   // face inward
      G.add(mirror);
      const rim = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CircleGeometry(r, 20)),
        new THREE.LineBasicMaterial({
          color: 0x9aa3ab, transparent: true, opacity: 0.6,
        }));
      rim.position.set(x, yRow, hd - 0.05);
      rim.rotation.y = Math.PI;
      G.add(rim);
    }
  }

  // ── Roof ────────────────────────────────────────────────
  const rt = PLAN.roofT;
  at(box(h.w + 0.3, rt, h.d + 0.3, MATS.roof), 0, h.h + rt / 2, 0);
  at(edges(h.w + 0.3, rt, h.d + 0.3), 0, h.h + rt / 2, 0);

  // ── The brick cylinder ──────────────────────────────────
  // The only solid, the only amber, the only thing that goes through
  // the roof rather than stopping under it.
  const c = PLAN.cylinder;
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(c.r, c.r, c.h, 28, 1, true), MATS.brick);
  at(cyl, c.x, c.h / 2, c.z);
  const hoop = (y, m) => {
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push(new THREE.Vector3(c.x + Math.cos(a) * c.r, y, c.z + Math.sin(a) * c.r));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    G.add(new THREE.Line(g, m));
  };
  // Brick courses, and an amber band at the fire.
  for (let i = 1; i < 9; i++) hoop((c.h * i) / 9, line);
  hoop(0.02, amber);
  hoop(c.h, line);

  // The fire itself: a low amber wash on the floor beside the cylinder,
  // doing the work a light fitting would, for free — same device as the
  // Pavilion's onyx wash, so the two buildings light the same way.
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 4.4),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b, transparent: true, opacity: 0.055, depthWrite: false,
    })
  );
  wash.rotation.x = -Math.PI / 2;
  at(wash, c.x - 1.6, 0.02, c.z - 1.0);

  // ── The walnut cabinet ──────────────────────────────────
  const k = PLAN.cabinet;
  at(box(k.w, k.h, k.d, MATS.floor), k.x, k.h / 2, k.z);
  at(edges(k.w, k.h, k.d), k.x, k.h / 2, k.z);

  // ── Colliders, moved onto the ground plane ──────────────
  const o = PLAN.origin;
  const colliders = colliderBoxes(PLAN).map(b => ({
    minX: b.minX + o.x, maxX: b.maxX + o.x,
    minZ: b.minZ + o.z, maxZ: b.maxZ + o.z,
  }));

  const surfaces = {
    cylinder: { center: { x: o.x + c.x, y: c.h / 2, z: o.z + c.z }, kind: 'brick' },
    cabinet:  { center: { x: o.x + k.x, y: k.h / 2, z: o.z + k.z }, kind: 'walnut' },
  };

  return { group: G, colliders, surfaces, materials: MATS, plan: PLAN };
}
