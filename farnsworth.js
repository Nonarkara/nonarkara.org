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
 *     1.5m off the flood plain. The Glass House sits on a brick terrace;
 *     this one refuses the ground. That is the whole argument with
 *     Johnson, standing 120m away on this site.
 *   - The glass is ONE ROOM, inset just inside the column line. On the
 *     west end the glass stops and the floor keeps going — a PORCH —
 *     so the tray reads as structure before it reads as enclosure.
 *   - A PRIMAVERA CORE, floor to almost-ceiling, holds kitchen and bath.
 *     It is the only opaque volume. Like Johnson's brick cylinder, it is
 *     the one warm thing — and so it takes the amber.
 *   - WHITE STEEL. Not the near-black of the Glass House frame. Mies
 *     painted it white so the structure dissolves against Illinois sky;
 *     at night it is a lit cage the same way Johnson's is, just inverted.
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

  // Clear under the floor (flood), clear inside (living).
  lift: 1.52,
  clear: 2.90,

  // Eight wide-flange columns: two rows of four along the long sides.
  // Column centres sit on the edge of the tray.
  cols: {
    xs: [-4.28, 4.28],
    zs: [-10.5, -3.5, 3.5, 10.5],
    section: 0.22,   // drawn as a slim box; the real H is finer
  },

  // Glass enclosure stops short of the west end — that end is the porch.
  // `porch` is how much of the length is open; glass runs the rest.
  porch: 6.4,
  glassT: 0.08,
  // Door: one opening on the long south face, near the core.
  door: { z: 2.2, half: 0.95 },

  // Primavera core — kitchen / bath / utilities. Stops short of the
  // ceiling so the roof tray still reads as continuous.
  core: { x: 0.4, z: 1.8, w: 3.6, d: 5.8, h: 2.55 },

  // Steps up from the plain to the porch — the only way in without a leap.
  stair: { w: 1.4, steps: 5 },

  // Travel drops you on the grass, looking at the floating tray end-on
  // so the lift is the first thing you read.
  spawn: { x: 0, y: 1.65, z: 16.5, lookAt: { x: 0, y: 2.4, z: 0 } },
};

/**
 * Collision boxes in LOCAL coordinates. The walkable floor is at y=lift;
 * walk.js is 2D in XZ, so height is implied — you collide with the core
 * and the glass runs, not with the columns (too thin to snag).
 */
export function colliderBoxes(plan = PLAN) {
  const hw = plan.floor.w / 2;
  const hd = plan.floor.d / 2;
  const glassZ0 = -hd;                         // east end (enclosed)
  const glassZ1 = hd - plan.porch;             // where glass stops for the porch
  const T = plan.glassT;
  const out = [];

  // Long glass runs (north / south), with the door cut out of the south.
  const d = plan.door;
  // North — unbroken
  out.push({ minX: hw - T, maxX: hw + T, minZ: glassZ0, maxZ: glassZ1 });
  // South — two runs around the door
  out.push({ minX: -hw - T, maxX: -hw + T, minZ: glassZ0, maxZ: d.z - d.half });
  out.push({ minX: -hw - T, maxX: -hw + T, minZ: d.z + d.half, maxZ: glassZ1 });
  // East end wall (short)
  out.push({ minX: -hw, maxX: hw, minZ: glassZ0 - T, maxZ: glassZ0 + T });
  // West glass (where porch begins) — short end of the enclosure
  out.push({ minX: -hw, maxX: hw, minZ: glassZ1 - T, maxZ: glassZ1 + T });

  const c = plan.core;
  out.push({
    minX: c.x - c.w / 2, maxX: c.x + c.w / 2,
    minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2,
  });

  return out;
}

/** Palette response. White steel by day; the core stays warm. */
export function paint(M, p) {
  M.steel.color.setHex(mix(0xe8e6df, p.line, 0.15));
  M.glass.color.setHex(p.water);
  M.floor.color.setHex(mix(p.travertine, p.bg, 0.2));
  M.roof.color.setHex(mix(p.roof, p.bg, 0.1));
  // Core never changes — it is the one amber (wood as fire).
}

const mix = (a, b, t) => {
  const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

// Primavera: warm wood, dark enough to read as mass at night, never a
// solid block of #f59e0b (that would be a second accent).
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
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d, m = line) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); G.add(o); return o; };

  const F = PLAN.floor, R = PLAN.roof;
  const lift = PLAN.lift;
  const top = lift + F.t + PLAN.clear;   // underside of roof tray
  const hw = F.w / 2, hd = F.d / 2;
  const glassZ1 = hd - PLAN.porch;

  // ── Columns ─────────────────────────────────────────────
  // Full height: ground to roof top. The trays pass through them.
  const colH = top + R.t;
  const S = PLAN.cols.section;
  for (const x of PLAN.cols.xs) {
    for (const z of PLAN.cols.zs) {
      at(box(S, colH, S, MATS.steel), x, colH / 2, z);
      at(edges(S, colH, S), x, colH / 2, z);
    }
  }

  // ── Floor tray ──────────────────────────────────────────
  at(box(F.w, F.t, F.d, MATS.floor), 0, lift + F.t / 2, 0);
  at(edges(F.w, F.t, F.d), 0, lift + F.t / 2, 0);
  // Walking surface
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(F.w - 0.08, F.d - 0.08), MATS.floor);
  fl.rotation.x = -Math.PI / 2;
  at(fl, 0, lift + F.t + 0.01, 0);

  // Deck grid — travertine joints, quiet.
  const deckGrid = new THREE.GridHelper(F.w, 8, 0x8b98a6, 0x8b98a6);
  deckGrid.material = new THREE.LineBasicMaterial({
    color: dark ? 0x6f7d8a : 0x9aa3ab, transparent: true, opacity: 0.12,
  });
  deckGrid.scale.z = F.d / F.w;
  at(deckGrid, 0, lift + F.t + 0.014, 0);

  // ── Roof tray ───────────────────────────────────────────
  at(box(R.w, R.t, R.d, MATS.roof), 0, top + R.t / 2, 0);
  at(edges(R.w, R.t, R.d), 0, top + R.t / 2, 0);

  // ── Glass enclosure ─────────────────────────────────────
  const gh = PLAN.clear;
  const gy = lift + F.t + gh / 2;
  const T = PLAN.glassT;
  const d = PLAN.door;

  // North long
  at(box(T, gh, glassZ1 - (-hd), MATS.glass), hw, gy, (glassZ1 + (-hd)) / 2);
  // South long — two panes around the door
  const sZ0 = -hd, sZ1 = d.z - d.half, sZ2 = d.z + d.half, sZ3 = glassZ1;
  if (sZ1 > sZ0) at(box(T, gh, sZ1 - sZ0, MATS.glass), -hw, gy, (sZ0 + sZ1) / 2);
  if (sZ3 > sZ2) at(box(T, gh, sZ3 - sZ2, MATS.glass), -hw, gy, (sZ2 + sZ3) / 2);
  // East short
  at(box(F.w, gh, T, MATS.glass), 0, gy, -hd);
  // West short (porch threshold)
  at(box(F.w, gh, T, MATS.glass), 0, gy, glassZ1);

  // Hairline frame on the glass corners — white steel reading as drawing.
  for (const x of [-hw, hw]) {
    at(edges(0.06, gh, 0.06), x, gy, -hd);
    at(edges(0.06, gh, 0.06), x, gy, glassZ1);
  }

  // ── Primavera core ──────────────────────────────────────
  const c = PLAN.core;
  const cy = lift + F.t + c.h / 2;
  at(box(c.w, c.h, c.d, MATS.wood), c.x, cy, c.z);
  at(edges(c.w, c.h, c.d, amber), c.x, cy, c.z);
  // Amber floor wash — same device as the Glass House fire.
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(c.w + 2.4, c.d + 1.6),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b, transparent: true, opacity: 0.05, depthWrite: false,
    })
  );
  wash.rotation.x = -Math.PI / 2;
  at(wash, c.x, lift + F.t + 0.02, c.z);

  // ── Stair to the porch ──────────────────────────────────
  // West end of the tray. Five risers from the plain to the floor.
  const st = PLAN.stair;
  const riser = lift / st.steps;
  const tread = 0.32;
  for (let i = 0; i < st.steps; i++) {
    const y = (i + 0.5) * riser;
    const z = hd - PLAN.porch * 0.35 + (st.steps - i) * tread;
    at(box(st.w, riser, tread, MATS.floor), 0, y, z);
  }

  // ── Colliders in world space ────────────────────────────
  const o = PLAN.origin;
  const colliders = colliderBoxes(PLAN).map(b => ({
    minX: b.minX + o.x, maxX: b.maxX + o.x,
    minZ: b.minZ + o.z, maxZ: b.maxZ + o.z,
  }));

  const surfaces = {
    core: { center: { x: o.x + c.x, y: cy, z: o.z + c.z }, kind: 'primavera' },
    porch: { center: { x: o.x, y: lift + F.t, z: o.z + hd - PLAN.porch / 2 }, kind: 'porch' },
  };

  return { group: G, colliders, surfaces, materials: MATS, plan: PLAN };
}
