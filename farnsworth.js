/**
 * FARNSWORTH HOUSE — Ludwig Mies van der Rohe, Plano, Illinois, 1951.
 *
 * Source of the numbers: the real house, not a SketchUp Warehouse file.
 * Architizer lists free Warehouse models of this building; we do not load
 * those. They are megabyte meshes that kill mid-range phones. What we
 * ship is the plan, at real scale, in the same language as the Glass
 * House and the Pavilion — so you can walk it.
 *
 * The moves that make it that building:
 *
 *   - It FLOATS. Eight white columns lift a floor tray and a roof tray
 *     clear of the ground. The Glass House sits on a brick terrace; this
 *     one refuses the ground. That is the whole argument with Johnson,
 *     standing across the plain on this site.
 *   - The glass is ONE ROOM, inset just inside the column line. On one
 *     end the glass stops and the floor keeps going — a PORCH — so the
 *     tray reads as structure before it reads as enclosure.
 *   - A PRIMAVERA CORE, floor to almost-ceiling, holds kitchen and bath.
 *     It is the only opaque volume. Like Johnson's brick cylinder, it is
 *     the one warm thing — and so it takes the amber.
 *   - WHITE STEEL. Not the near-black of the Glass House frame. Mies
 *     painted it white so the structure dissolves against Illinois sky.
 *
 * Walk note: the controller keeps the eye at 1.65m on a y≈0 datum (see
 * walk.js). A literal 1.5m pilotis would put you under the floor. So the
 * floor tray sits on the walking datum and the columns continue DOWN
 * into a recessed well — same silhouette from outside, walkable inside.
 * When walk.js gains floor height, raise the tray and delete the well.
 *
 * Same return shape as buildGlassHouse / buildPavilion.
 */

export const PLAN = {
  name: 'FARNSWORTH',
  // South of the Pavilion, completing the cross: Glass NE, Savoye NW,
  // Farnsworth S. Distances stay a real walk (~120m).
  origin: { x: 0, z: -120 },

  // The floating trays. Real-ish: ~77' × 28'.
  floor: { w: 8.56, d: 23.48, t: 0.32 },
  roof:  { w: 8.56, d: 23.48, t: 0.28 },

  // Visual lift: how far the columns drop into the well under the floor.
  // Clear inside: living height under the roof tray.
  lift: 1.50,
  clear: 2.90,

  // Eight wide-flange columns: two rows of four along the long sides.
  cols: {
    xs: [-4.28, 4.28],
    zs: [-10.5, -3.5, 3.5, 10.5],
    section: 0.22,
  },

  // Glass enclosure stops short of the +Z end — that end is the porch.
  porch: 6.4,
  glassT: 0.08,
  // Door on the −X long face, near the core.
  door: { z: 2.2, half: 0.95 },
  // Sliding run on the porch threshold — how you walk in from the tray.
  porchDoor: { x: 0, half: 1.1 },

  // Primavera core — kitchen / bath / utilities.
  core: { x: 0.4, z: 1.8, w: 3.6, d: 5.8, h: 2.55 },

  // Travel drops you on the grass, looking at the porch end-on so the
  // lift (the well) is the first thing you read.
  spawn: { x: 0, y: 1.65, z: 16.5, lookAt: { x: 0, y: 2.0, z: 0 } },
};

/**
 * Collision boxes in LOCAL coordinates. Floor is on the walking datum;
 * walk.js is 2D in XZ.
 */
export function colliderBoxes(plan = PLAN) {
  const hw = plan.floor.w / 2;
  const hd = plan.floor.d / 2;
  const glassZ0 = -hd;
  const glassZ1 = hd - plan.porch;
  const T = plan.glassT;
  const out = [];
  const d = plan.door;

  // +X long — unbroken
  out.push({ minX: hw - T, maxX: hw + T, minZ: glassZ0, maxZ: glassZ1 });
  // −X long — two runs around the door
  out.push({ minX: -hw - T, maxX: -hw + T, minZ: glassZ0, maxZ: d.z - d.half });
  out.push({ minX: -hw - T, maxX: -hw + T, minZ: d.z + d.half, maxZ: glassZ1 });
  // −Z short (enclosed end)
  out.push({ minX: -hw, maxX: hw, minZ: glassZ0 - T, maxZ: glassZ0 + T });
  // +Z porch threshold — two runs around the sliding door
  const pd = plan.porchDoor;
  out.push({ minX: -hw, maxX: pd.x - pd.half, minZ: glassZ1 - T, maxZ: glassZ1 + T });
  out.push({ minX: pd.x + pd.half, maxX: hw, minZ: glassZ1 - T, maxZ: glassZ1 + T });

  const c = plan.core;
  out.push({
    minX: c.x - c.w / 2, maxX: c.x + c.w / 2,
    minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2,
  });

  return out;
}

export function paint(M, p) {
  M.steel.color.setHex(mix(0xe8e6df, p.line, 0.12));
  M.glass.color.setHex(p.water);
  M.floor.color.setHex(mix(p.travertine, p.bg, 0.2));
  M.roof.color.setHex(mix(p.roof, p.bg, 0.1));
  M.well.color.setHex(mix(0x05070b, p.bg, 0.4));
}

const mix = (a, b, t) => {
  const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

const WOOD = 0x3a2410;

export function buildFarnsworth(THREE, scene, opts = {}) {
  const dark = opts.dark !== false;
  const G = new THREE.Group();
  G.position.set(PLAN.origin.x, 0, PLAN.origin.z);
  scene.add(G);

  const mat = (c, o = 1) => new THREE.MeshBasicMaterial({
    color: c, side: THREE.DoubleSide,
    transparent: o < 1, opacity: o, depthWrite: o > 0.6,
  });
  const line = new THREE.LineBasicMaterial({
    color: dark ? 0x9aa3ab : 0x5a6068, transparent: true, opacity: 0.5,
  });
  const amber = new THREE.LineBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.4,
  });

  const MATS = {
    steel: mat(dark ? 0xd4d0c6 : 0xefeee8),
    glass: mat(dark ? 0x080d12 : 0xa8bcc8, 0.16),
    wood:  mat(WOOD),
    floor: mat(dark ? 0x2a2b28 : 0xd8d2c4),
    roof:  mat(dark ? 0x1a1c1b : 0xe4e0d6),
    well:  mat(dark ? 0x05070b : 0x2a2e32),
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d, m = line) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); G.add(o); return o; };

  const F = PLAN.floor, R = PLAN.roof;
  const lift = PLAN.lift;
  const floorTop = 0.02;                 // walking datum
  const floorBot = floorTop - F.t;
  const roofBot = floorTop + PLAN.clear;
  const hw = F.w / 2, hd = F.d / 2;
  const glassZ1 = hd - PLAN.porch;

  // ── Well — the ground drops away under the tray ─────────
  const well = new THREE.Mesh(
    new THREE.PlaneGeometry(F.w + 3.2, F.d + 3.2), MATS.well);
  well.rotation.x = -Math.PI / 2;
  at(well, 0, -lift, 0);
  // Lip so the drop reads as a court, not a hole in the shader.
  const lipT = 0.12;
  at(box(F.w + 3.2, lipT, F.d + 3.2, MATS.well), 0, -lipT / 2, 0);
  at(edges(F.w + 3.2, lipT, F.d + 3.2), 0, -lipT / 2, 0);

  // ── Columns: well floor → roof top ──────────────────────
  const colH = roofBot + R.t + lift;
  const colMid = (roofBot + R.t - lift) / 2;
  const S = PLAN.cols.section;
  for (const x of PLAN.cols.xs) {
    for (const z of PLAN.cols.zs) {
      at(box(S, colH, S, MATS.steel), x, colMid, z);
      at(edges(S, colH, S), x, colMid, z);
    }
  }

  // ── Floor tray ──────────────────────────────────────────
  at(box(F.w, F.t, F.d, MATS.floor), 0, (floorTop + floorBot) / 2, 0);
  at(edges(F.w, F.t, F.d), 0, (floorTop + floorBot) / 2, 0);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(F.w - 0.08, F.d - 0.08), MATS.floor);
  fl.rotation.x = -Math.PI / 2;
  at(fl, 0, floorTop + 0.004, 0);

  const deckGrid = new THREE.GridHelper(F.w, 8, 0x8b98a6, 0x8b98a6);
  deckGrid.material = new THREE.LineBasicMaterial({
    color: dark ? 0x6f7d8a : 0x9aa3ab, transparent: true, opacity: 0.12,
  });
  deckGrid.scale.z = F.d / F.w;
  at(deckGrid, 0, floorTop + 0.008, 0);

  // ── Roof tray ───────────────────────────────────────────
  at(box(R.w, R.t, R.d, MATS.roof), 0, roofBot + R.t / 2, 0);
  at(edges(R.w, R.t, R.d), 0, roofBot + R.t / 2, 0);

  // ── Glass enclosure ─────────────────────────────────────
  const gh = PLAN.clear;
  const gy = floorTop + gh / 2;
  const T = PLAN.glassT;
  const d = PLAN.door;

  at(box(T, gh, glassZ1 - (-hd), MATS.glass), hw, gy, (glassZ1 + (-hd)) / 2);
  const sZ0 = -hd, sZ1 = d.z - d.half, sZ2 = d.z + d.half, sZ3 = glassZ1;
  if (sZ1 > sZ0) at(box(T, gh, sZ1 - sZ0, MATS.glass), -hw, gy, (sZ0 + sZ1) / 2);
  if (sZ3 > sZ2) at(box(T, gh, sZ3 - sZ2, MATS.glass), -hw, gy, (sZ2 + sZ3) / 2);
  at(box(F.w, gh, T, MATS.glass), 0, gy, -hd);
  // Porch threshold glass — leave the sliding door out so the walk
  // and the drawing agree.
  const pd = PLAN.porchDoor;
  const pL0 = -hw, pL1 = pd.x - pd.half, pR0 = pd.x + pd.half, pR1 = hw;
  if (pL1 > pL0) at(box(pL1 - pL0, gh, T, MATS.glass), (pL0 + pL1) / 2, gy, glassZ1);
  if (pR1 > pR0) at(box(pR1 - pR0, gh, T, MATS.glass), (pR0 + pR1) / 2, gy, glassZ1);

  for (const x of [-hw, hw]) {
    at(edges(0.06, gh, 0.06), x, gy, -hd);
    at(edges(0.06, gh, 0.06), x, gy, glassZ1);
  }

  // ── Primavera core ──────────────────────────────────────
  const c = PLAN.core;
  const cy = floorTop + c.h / 2;
  at(box(c.w, c.h, c.d, MATS.wood), c.x, cy, c.z);
  at(edges(c.w, c.h, c.d, amber), c.x, cy, c.z);
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(c.w + 2.4, c.d + 1.6),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b, transparent: true, opacity: 0.05, depthWrite: false,
    })
  );
  wash.rotation.x = -Math.PI / 2;
  at(wash, c.x, floorTop + 0.02, c.z);

  // ── Colliders in world space ────────────────────────────
  const o = PLAN.origin;
  const colliders = colliderBoxes(PLAN).map(b => ({
    minX: b.minX + o.x, maxX: b.maxX + o.x,
    minZ: b.minZ + o.z, maxZ: b.maxZ + o.z,
  }));

  const surfaces = {
    core:  { center: { x: o.x + c.x, y: cy, z: o.z + c.z }, kind: 'primavera' },
    porch: { center: { x: o.x, y: floorTop, z: o.z + hd - PLAN.porch / 2 }, kind: 'porch' },
  };

  return { group: G, colliders, surfaces, materials: MATS, plan: PLAN };
}
