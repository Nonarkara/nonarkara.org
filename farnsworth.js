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
 *   - It FLOATS. Eight white columns lift the floor tray and the roof
 *     tray clear of the ground by 1.5m. The Glass House sits on a
 *     brick terrace; this one refuses the ground. That is the whole
 *     argument with Johnson, standing across the plain on this site.
 *     You can walk under the house and look up at the underside of
 *     the floor tray; the columns are what you see first.
 *   - A GIANT TRAVERTINE TERRACE, 8m × 8.5m, extends the floor tray
 *     past the glass at the south end — the famous Mies deck. Three
 *     hairline steps at the south edge of the terrace bring the
 *     walker from the grass up to deck level.
 *   - The glass is ONE ROOM, inset just inside the column line. On
 *     the +Z end the glass stops and the floor keeps going — the
 *     terrace — so the tray reads as structure before it reads as
 *     enclosure.
 *   - A PRIMAVERA CORE, floor to almost-ceiling, holds kitchen and
 *     bath. It is the only opaque volume. Like Johnson's brick
 *     cylinder, it is the one warm thing — and so it takes the amber.
 *   - WHITE STEEL. Not the near-black of the Glass House frame. Mies
 *     painted it white so the structure dissolves against Illinois sky.
 *
 * Walk note: walk.js has floor patches now, so the walker can climb
 * the three steps and end up on the deck at y=plan.lift, then cross
 * the porch threshold into the house. From the grass (y=0) the house
 * is fully passable under — the glass walls and the core are
 * minY-scoped to plan.lift so the walker is not blocked by anything
 * above the deck. The columns are unconditional colliders.
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

  // The lift. The real Farnsworth sits 1.5m up so the Fox River cannot
  // take it; this is why you can drive a car under the pilotis. The
  // house is genuinely on stilts now — the columns run from y=0 to the
  // roof tray, visible all the way, no well underneath to hide them.
  lift: 1.50,
  clear: 2.90,

  // Eight wide-flange columns: two rows of four along the long sides.
  cols: {
    xs: [-4.28, 4.28],
    zs: [-10.5, -3.5, 3.5, 10.5],
    section: 0.22,
  },

  // The travertine terrace (porch) and the three steps that climb to
  // it. The terrace is a 8m × 8.56m slab at floor level — bigger than
  // the 6.4m the old well-hack had, so the patio reads as the giant
  // travertine deck the house is famous for. Three hairline steps at
  // the south end bring the walker up from the grass without using a
  // ramp; 0.5m rise is under FLOOR_STEP so walk.js climbs them
  // naturally.
  porch: 8.0,
  stepRise: 0.5,
  stepRun: 0.6,
  glassT: 0.08,
  // Door on the −X long face, near the core.
  door: { z: 2.2, half: 0.95 },
  // Sliding run on the porch threshold — how you walk in from the tray.
  porchDoor: { x: 0, half: 1.1 },

  // Primavera core — kitchen / bath / utilities. Centred on the long
  // axis so it does not eat into the giant travertine deck. The real
  // core sits roughly in the middle of the plan; the small bias the
  // old build carried has gone to make room for the 8m patio.
  core: { x: 0.4, z: 0, w: 3.6, d: 5.8, h: 2.55 },

  // Travel drops you on the grass 10m south of the steps, looking at
  // the porch end-on. From here the columns, the giant travertine
  // deck, and the house on top all read as one lifted composition.
  spawn: { x: 0, y: 1.65, z: 20, lookAt: { x: 0, y: 2.0, z: 0 } },
};

/**
 * Collision boxes in LOCAL coordinates. The glass walls, the core, and
 * the steps only block from y=plan.lift up — the house is on stilts, so
 * the walker can walk on the grass under it and reach the column field.
 * The columns themselves ARE colliders (no minY) so the walker is
 * stopped by them, but they leave plenty of room to pass between.
 * walk.js skips any box whose [minY, maxY] does not include the
 * walker's current floorY.
 */
export function colliderBoxes(plan = PLAN) {
  const hw = plan.floor.w / 2;
  const hd = plan.floor.d / 2;
  const glassZ0 = -hd;
  const glassZ1 = hd - plan.porch;
  const T = plan.glassT;
  const lift = plan.lift;
  const clear = plan.clear;
  const roof = plan.roof;
  // Glass spans the full living height (floor to roof) plus a little.
  // The walker on the patio (y=lift) and the walker on the inside
  // floor (y=lift) are both blocked. The walker on the grass (y=0)
  // walks under unobstructed.
  const minY = lift - 0.05;
  const maxY = lift + clear + roof.t + 0.05;
  const out = [];
  const d = plan.door;

  // +X long — unbroken
  out.push({ minX: hw - T, maxX: hw + T, minZ: glassZ0, maxZ: glassZ1, minY, maxY });
  // −X long — two runs around the door
  out.push({ minX: -hw - T, maxX: -hw + T, minZ: glassZ0, maxZ: d.z - d.half, minY, maxY });
  out.push({ minX: -hw - T, maxX: -hw + T, minZ: d.z + d.half, maxZ: glassZ1, minY, maxY });
  // −Z short (enclosed end)
  out.push({ minX: -hw, maxX: hw, minZ: glassZ0 - T, maxZ: glassZ0 + T, minY, maxY });
  // +Z porch threshold — two runs around the sliding door
  const pd = plan.porchDoor;
  out.push({ minX: -hw, maxX: pd.x - pd.half, minZ: glassZ1 - T, maxZ: glassZ1 + T, minY, maxY });
  out.push({ minX: pd.x + pd.half, maxX: hw, minZ: glassZ1 - T, maxZ: glassZ1 + T, minY, maxY });

  const c = plan.core;
  out.push({
    minX: c.x - c.w / 2, maxX: c.x + c.w / 2,
    minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2,
    minY, maxY: lift + c.h + 0.05,
  });

  // The columns. They span from the ground to the roof, so no minY /
  // maxY — the walker at any height is stopped by them. Their narrow
  // section (0.22m) leaves a 7m clear gap inside the row, so this is
  // not a fence.
  const S = plan.cols.section / 2;
  for (const x of plan.cols.xs) {
    for (const z of plan.cols.zs) {
      out.push({ minX: x - S, maxX: x + S, minZ: z - S, maxZ: z + S });
    }
  }

  return out;
}

/**
 * Walkable floor patches in LOCAL coordinates. Each exposes
 * heightAt(x, z) so walk.js can sample stacked surfaces. The grass
 * around the house is y=0; the three steps rise at 0.5m each; the
 * travertine deck and the inside of the house share y=plan.lift.
 */
export function floorPatches(plan = PLAN) {
  const hw = plan.floor.w / 2;
  const hd = plan.floor.d / 2;
  const glassZ1 = hd - plan.porch;
  const lift = plan.lift;
  const rise = plan.stepRise;
  const run = plan.stepRun;
  const out = [];

  // Grass — the area around the house the walker needs to reach the
  // bottom step. Stops at the south edge of the bottom step (the
  // steps take over from there); without that cut, the walker's
  // sticky patch stays "grass" right through the steps and never
  // climbs.
  out.push({
    kind: 'grass',
    heightAt(x, z) {
      if (Math.abs(x) > hw + 4) return null;
      if (z < -hd - 4) return null;
      if (z > glassZ1 + 3 * run) return 0;
      return null;
    },
  });

  // Three steps, deepest first. The walker samples these in z order;
  // crossing the step boundary raises the eye by `rise`.
  for (let i = 0; i < 3; i++) {
    const z0 = glassZ1 + (3 - i - 1) * run;
    const z1 = z0 + run;
    const y = (i + 1) * rise;
    out.push({
      kind: 'step',
      n: i + 1,
      heightAt(x, z) {
        if (Math.abs(x) > hw + 0.05) return null;
        if (z < z0 || z > z1) return null;
        return y;
      },
    });
  }

  // The travertine deck (porch) and the inside of the house — one
  // continuous patch at floor level. The glass walls split them in
  // colliders; the floor itself is one tray.
  out.push({
    kind: 'tray',
    heightAt(x, z) {
      if (Math.abs(x) > hw + 0.05) return null;
      if (z < -hd || z > hd) return null;
      // Hole for the steps' footprint so they are not also the patio.
      if (z > glassZ1 && z <= glassZ1 + 3 * run) return null;
      return lift;
    },
  });

  return out;
}

export function paint(M, p) {
  M.steel.color.setHex(mix(0xe8e6df, p.line, 0.12));
  M.glass.color.setHex(p.water);
  M.floor.color.setHex(mix(p.travertine, p.bg, 0.2));
  M.roof.color.setHex(mix(p.roof, p.bg, 0.1));
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
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d, m = line) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); G.add(o); return o; };

  const F = PLAN.floor, R = PLAN.roof;
  const lift = PLAN.lift;
  // The whole structure is lifted `lift` off the grass. The floor tray
  // sits at y=lift; the roof tray sits at y=floorTop+clear (the
  // walkable floor to the inside ceiling); the columns run from the
  // grass to the roof top, passing through the trays so the lift
  // reads at every level. No well, no lip — the columns are what the
  // building is doing.
  const floorBot = lift - F.t / 2;
  const floorTop = lift + F.t / 2;
  const roofBot = floorTop + PLAN.clear;
  const roofTop = roofBot + R.t;
  const hw = F.w / 2, hd = F.d / 2;
  const glassZ1 = hd - PLAN.porch;

  // ── Columns: grass → roof top, fully visible ────────────
  const colH = roofTop;
  const colMid = colH / 2;
  const S = PLAN.cols.section;
  for (const x of PLAN.cols.xs) {
    for (const z of PLAN.cols.zs) {
      at(box(S, colH, S, MATS.steel), x, colMid, z);
      at(edges(S, colH, S), x, colMid, z);
    }
  }

  // ── Steps at the south end of the patio ─────────────────
  // Each step is a hairline frame, not a solid block, so the steps
  // read as a stair and not as part of the deck. Three of them at
  // stepRise (0.5m) take the walker from the grass to the deck in
  // 1.5m of horizontal travel.
  for (let i = 0; i < 3; i++) {
    const y = (i + 1) * PLAN.stepRise;
    const z = glassZ1 + (3 - i - 1) * PLAN.stepRun + PLAN.stepRun / 2;
    at(edges(F.w + 0.4, y, PLAN.stepRun), 0, y / 2, z);
  }

  // ── Floor tray ──────────────────────────────────────────
  at(box(F.w, F.t, F.d, MATS.floor), 0, lift, 0);
  at(edges(F.w, F.t, F.d), 0, lift, 0);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(F.w - 0.08, F.d - 0.08), MATS.floor);
  fl.rotation.x = -Math.PI / 2;
  at(fl, 0, floorTop + 0.004, 0);

  // The underside of the lifted floor. The walker under the house sees
  // this; drawing it makes the lift legible from every angle.
  const flU = new THREE.Mesh(new THREE.PlaneGeometry(F.w - 0.08, F.d - 0.08),
    new THREE.MeshBasicMaterial({ color: dark ? 0x15171a : 0xa9a59a, side: THREE.DoubleSide }));
  flU.rotation.x = Math.PI / 2;
  at(flU, 0, floorBot - 0.004, 0);

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
    // Preserve the height scope so walk.js can pass under the lifted
    // house. Columns deliberately do not get minY/maxY here.
    minY: b.minY, maxY: b.maxY,
  }));

  const surfaces = {
    core:  { center: { x: o.x + c.x, y: cy, z: o.z + c.z }, kind: 'primavera' },
    porch: { center: { x: o.x, y: floorTop, z: o.z + hd - PLAN.porch / 2 }, kind: 'porch' },
  };

  // Floor patches in world space. Same shape as Savoye: walk.js samples
  // each patch and uses the right one for the walker's current XZ.
  const floors = floorPatches(PLAN).map(f => ({
    ...f,
    heightAt: (x, z) => f.heightAt(x - o.x, z - o.z),
  }));

  return { group: G, colliders, floors, surfaces, materials: MATS, plan: PLAN };
}
