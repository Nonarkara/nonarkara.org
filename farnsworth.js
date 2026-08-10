/**
 * FARNSWORTH HOUSE — Ludwig Mies van der Rohe, Plano, Illinois, 1951.
 *
 * Visual reference (massing only — never the mesh):
 *   Sketchfab BIM: cgt-116-final-project-bim-farnsworth-house-80aba77c…
 *
 * What that model gets right, and what the previous plan got wrong:
 *
 *   - TWO FLOATING TRAYS. Upper living tray + a freestanding lower
 *     terrace in front, both clear of the grass on white steel. The
 *     old plan had one tray and three steps from the lawn — it read
 *     as a lifted slab with a staircase, not the double platform.
 *   - H-SECTION COLUMNS. Wide-flange I-beams on the long faces, flanges
 *     reading on the elevation. Square box posts are not this building.
 *   - FULL-HEIGHT GLASS with vertical mullions between floor and roof.
 *     A blank greenhouse pane is not Farnsworth.
 *   - PORCH as the open third of the upper tray (glass stops; floor
 *     continues). Primavera core inside the glass, offset to one long
 *     wall — kitchen / bath — amber edges only.
 *
 * Phone law: plan boxes + colliders + floor patches. No Sketchfab mesh.
 * Same return shape as buildGlassHouse / buildPavilion.
 */

export const PLAN = {
  name: 'FARNSWORTH',
  // South of the Pavilion on the denser estate (~50m centres).
  origin: { x: 0, z: -52 },

  // Upper trays. Real-ish: ~77' × 28'.
  floor: { w: 8.56, d: 23.48, t: 0.28 },
  roof:  { w: 8.56, d: 23.48, t: 0.22 },

  // ~5'3" above grade — Fox River flood lift.
  lift: 1.55,
  clear: 2.90,

  // Eight wide-flange columns: two rows of four on the long sides.
  // flange = visible width on the elevation; web = stem; depth = how
  // far the H sticks out from the glass line.
  cols: {
    xs: [-4.28, 4.28],
    zs: [-10.5, -3.5, 3.5, 10.5],
    flange: 0.30,
    web: 0.055,
    depth: 0.22,
  },

  // Open porch at the +Z end of the upper tray (~22' of 77').
  porch: 6.7,

  // Freestanding lower terrace — the BIM's second white platform.
  // Same width as the house, south of the upper porch, carried on
  // its own four columns.
  lower: {
    w: 8.56,
    d: 6.4,
    t: 0.26,
    y: 0.70,
    // Gap of one step-run between upper porch lip and lower north edge.
    gap: 0.55,
  },

  // Climb: grass → lower (two rises) → upper (two rises). Each rise
  // stays under walk.js FLOOR_STEP so the sticky patches climb.
  stepsLo: 2,
  stepsHi: 2,
  stepRun: 0.55,
  glassT: 0.06,
  mullionT: 0.05,
  // Door on the −X long face, near the living zone.
  door: { z: 1.6, half: 0.95 },
  // Sliding run on the porch threshold.
  porchDoor: { x: 0, half: 1.1 },

  // Primavera core — offset to +X (kitchen wall), mid-enclosed zone.
  core: { x: 1.15, z: -1.2, w: 2.7, d: 7.0, h: 2.55 },

  // On the grass south of the lower terrace, looking at both trays.
  spawn: { x: 0, y: 1.65, z: 24, lookAt: { x: 0, y: 2.0, z: 0 } },
};

/** Step rise heights derived from the two tray levels. */
export function stepRises(plan = PLAN) {
  const lo = plan.lower.y / plan.stepsLo;
  const hi = (plan.lift - plan.lower.y) / plan.stepsHi;
  return { lo, hi };
}

/**
 * Collision boxes in LOCAL coordinates. Glass / core / mullion runs are
 * minY-scoped to the upper lift so the walker passes under on the grass.
 * Column H-sections (approximated as their flange AABB) block at every
 * height — narrow enough to walk between.
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
  const minY = lift - 0.05;
  const maxY = lift + clear + roof.t + 0.05;
  const out = [];
  const d = plan.door;

  out.push({ minX: hw - T, maxX: hw + T, minZ: glassZ0, maxZ: glassZ1, minY, maxY });
  out.push({ minX: -hw - T, maxX: -hw + T, minZ: glassZ0, maxZ: d.z - d.half, minY, maxY });
  out.push({ minX: -hw - T, maxX: -hw + T, minZ: d.z + d.half, maxZ: glassZ1, minY, maxY });
  out.push({ minX: -hw, maxX: hw, minZ: glassZ0 - T, maxZ: glassZ0 + T, minY, maxY });
  const pd = plan.porchDoor;
  out.push({ minX: -hw, maxX: pd.x - pd.half, minZ: glassZ1 - T, maxZ: glassZ1 + T, minY, maxY });
  out.push({ minX: pd.x + pd.half, maxX: hw, minZ: glassZ1 - T, maxZ: glassZ1 + T, minY, maxY });

  const c = plan.core;
  out.push({
    minX: c.x - c.w / 2, maxX: c.x + c.w / 2,
    minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2,
    minY, maxY: lift + c.h + 0.05,
  });

  // Column AABB = flange × depth (the H silhouette).
  const fx = plan.cols.depth / 2;
  const fz = plan.cols.flange / 2;
  for (const x of plan.cols.xs) {
    for (const z of plan.cols.zs) {
      out.push({ minX: x - fx, maxX: x + fx, minZ: z - fz, maxZ: z + fz });
    }
  }

  // Lower terrace columns — four corners, also unconditional.
  const L = plan.lower;
  const lowerZ0 = hd + plan.lower.gap;
  const lcx = L.w / 2 - 0.2;
  const lcz0 = lowerZ0 + 0.35;
  const lcz1 = lowerZ0 + L.d - 0.35;
  for (const x of [-lcx, lcx]) {
    for (const z of [lcz0, lcz1]) {
      out.push({ minX: x - fx, maxX: x + fx, minZ: z - fz, maxZ: z + fz });
    }
  }

  return out;
}

/**
 * Walkable floor patches in LOCAL coordinates.
 * Grass → steps to lower → lower terrace → steps to upper → tray.
 */
export function floorPatches(plan = PLAN) {
  const hw = plan.floor.w / 2;
  const hd = plan.floor.d / 2;
  const glassZ1 = hd - plan.porch;
  const lift = plan.lift;
  const L = plan.lower;
  const lowerZ0 = hd + L.gap;
  const lowerZ1 = lowerZ0 + L.d;
  const { lo, hi } = stepRises(plan);
  const run = plan.stepRun;
  const out = [];

  // Steps from grass up onto the lower terrace (south edge).
  const loStepsZ1 = lowerZ1 + plan.stepsLo * run;
  out.push({
    kind: 'grass',
    heightAt(x, z) {
      if (Math.abs(x) > hw + 4) return null;
      if (z < -hd - 4) return null;
      if (z > loStepsZ1) return 0;
      return null;
    },
  });

  for (let i = 0; i < plan.stepsLo; i++) {
    const z0 = lowerZ1 + (plan.stepsLo - i - 1) * run;
    const z1 = z0 + run;
    const y = (i + 1) * lo;
    out.push({
      kind: 'step',
      flight: 'lo',
      n: i + 1,
      heightAt(x, z) {
        if (Math.abs(x) > hw + 0.05) return null;
        if (z < z0 || z > z1) return null;
        return y;
      },
    });
  }

  out.push({
    kind: 'lower',
    heightAt(x, z) {
      if (Math.abs(x) > L.w / 2 + 0.05) return null;
      if (z < lowerZ0 || z > lowerZ1) return null;
      return L.y;
    },
  });

  // Steps bridging lower terrace → upper porch (gap between trays).
  // i=0 is the first riser off the lower deck (high z); i=last meets the tray.
  for (let i = 0; i < plan.stepsHi; i++) {
    const zBase = hd;
    const slice = L.gap / plan.stepsHi;
    const zz0 = zBase + (plan.stepsHi - i - 1) * slice;
    const zz1 = zBase + (plan.stepsHi - i) * slice;
    const y = L.y + (i + 1) * hi;
    out.push({
      kind: 'step',
      flight: 'hi',
      n: i + 1,
      heightAt(x, z) {
        if (Math.abs(x) > hw + 0.05) return null;
        if (z < zz0 || z > zz1) return null;
        return y;
      },
    });
  }

  // Upper tray (porch + interior). Hole the gap so hi-steps own it.
  out.push({
    kind: 'tray',
    heightAt(x, z) {
      if (Math.abs(x) > hw + 0.05) return null;
      if (z < -hd || z > hd) return null;
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
  M.lower.color.setHex(mix(p.travertine, p.bg, 0.15));
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
    lower: mat(dark ? 0x2e2f2c : 0xddd6c8),
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d, m = line) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); G.add(o); return o; };

  const F = PLAN.floor, R = PLAN.roof;
  const lift = PLAN.lift;
  const floorBot = lift - F.t / 2;
  const floorTop = lift + F.t / 2;
  const roofBot = floorTop + PLAN.clear;
  const roofTop = roofBot + R.t;
  const hw = F.w / 2, hd = F.d / 2;
  const glassZ1 = hd - PLAN.porch;
  const colH = roofTop;
  const colMid = colH / 2;
  const { flange: fW, web: fWeb, depth: fD } = PLAN.cols;

  // H-column: web (thin in Z) + two flanges (full flange width in Z at ±X of web… wait)
  // Elevation on the long face (+X/−X): you see the H as two vertical
  // strokes (flanges) joined by a web. Flanges span in Z; web is thin in Z.
  const placeH = (x, z, h, yMid) => {
    at(box(fD, h, fWeb, MATS.steel), x, yMid, z);
    const inset = (fW - fWeb) / 2;
    at(box(fD, h, inset, MATS.steel), x, yMid, z - fW / 2 + inset / 2);
    at(box(fD, h, inset, MATS.steel), x, yMid, z + fW / 2 - inset / 2);
    at(edges(fD, h, fW), x, yMid, z);
  };

  for (const x of PLAN.cols.xs) {
    for (const z of PLAN.cols.zs) placeH(x, z, colH, colMid);
  }

  // ── Lower terrace ───────────────────────────────────────
  const L = PLAN.lower;
  const lowerZ0 = hd + L.gap;
  const lowerZc = lowerZ0 + L.d / 2;
  const lowerY = L.y;
  at(box(L.w, L.t, L.d, MATS.lower), 0, lowerY, lowerZc);
  at(edges(L.w, L.t, L.d), 0, lowerY, lowerZc);
  const lTop = new THREE.Mesh(new THREE.PlaneGeometry(L.w - 0.08, L.d - 0.08), MATS.lower);
  lTop.rotation.x = -Math.PI / 2;
  at(lTop, 0, lowerY + L.t / 2 + 0.004, lowerZc);
  const lBot = new THREE.Mesh(
    new THREE.PlaneGeometry(L.w - 0.08, L.d - 0.08),
    new THREE.MeshBasicMaterial({ color: dark ? 0x15171a : 0xa9a59a, side: THREE.DoubleSide }),
  );
  lBot.rotation.x = Math.PI / 2;
  at(lBot, 0, lowerY - L.t / 2 - 0.004, lowerZc);

  const lcx = L.w / 2 - 0.2;
  const lcz0 = lowerZ0 + 0.35;
  const lcz1 = lowerZ0 + L.d - 0.35;
  const loH = lowerY + L.t / 2;
  for (const x of [-lcx, lcx]) {
    for (const z of [lcz0, lcz1]) placeH(x, z, loH, loH / 2);
  }

  // Step frames — hairline, south of lower and in the gap.
  const { lo, hi } = stepRises(PLAN);
  for (let i = 0; i < PLAN.stepsLo; i++) {
    const y = (i + 1) * lo;
    const z = lowerZ0 + L.d + (PLAN.stepsLo - i - 1) * PLAN.stepRun + PLAN.stepRun / 2;
    at(edges(F.w + 0.3, y, PLAN.stepRun), 0, y / 2, z);
  }
  for (let i = 0; i < PLAN.stepsHi; i++) {
    const y = L.y + (i + 1) * hi;
    const slice = L.gap / PLAN.stepsHi;
    const zz0 = hd + (PLAN.stepsHi - i - 1) * slice;
    const zz1 = hd + (PLAN.stepsHi - i) * slice;
    at(edges(F.w + 0.3, 0.08, zz1 - zz0), 0, y, (zz0 + zz1) / 2);
  }

  // ── Upper floor tray ────────────────────────────────────
  at(box(F.w, F.t, F.d, MATS.floor), 0, lift, 0);
  at(edges(F.w, F.t, F.d), 0, lift, 0);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(F.w - 0.08, F.d - 0.08), MATS.floor);
  fl.rotation.x = -Math.PI / 2;
  at(fl, 0, floorTop + 0.004, 0);
  const flU = new THREE.Mesh(
    new THREE.PlaneGeometry(F.w - 0.08, F.d - 0.08),
    new THREE.MeshBasicMaterial({ color: dark ? 0x15171a : 0xa9a59a, side: THREE.DoubleSide }),
  );
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

  // ── Glass + mullions ────────────────────────────────────
  const gh = PLAN.clear;
  const gy = floorTop + gh / 2;
  const T = PLAN.glassT;
  const d = PLAN.door;
  const enclosedD = glassZ1 - (-hd);

  at(box(T, gh, enclosedD, MATS.glass), hw, gy, (glassZ1 + (-hd)) / 2);
  const sZ0 = -hd, sZ1 = d.z - d.half, sZ2 = d.z + d.half, sZ3 = glassZ1;
  if (sZ1 > sZ0) at(box(T, gh, sZ1 - sZ0, MATS.glass), -hw, gy, (sZ0 + sZ1) / 2);
  if (sZ3 > sZ2) at(box(T, gh, sZ3 - sZ2, MATS.glass), -hw, gy, (sZ2 + sZ3) / 2);
  at(box(F.w, gh, T, MATS.glass), 0, gy, -hd);
  const pd = PLAN.porchDoor;
  const pL0 = -hw, pL1 = pd.x - pd.half, pR0 = pd.x + pd.half, pR1 = hw;
  if (pL1 > pL0) at(box(pL1 - pL0, gh, T, MATS.glass), (pL0 + pL1) / 2, gy, glassZ1);
  if (pR1 > pR0) at(box(pR1 - pR0, gh, T, MATS.glass), (pR0 + pR1) / 2, gy, glassZ1);

  // Vertical mullions — white steel lines, the BIM's glass cadence.
  const MT = PLAN.mullionT;
  const mullionZs = [];
  const nBay = 5;
  for (let i = 1; i < nBay; i++) {
    mullionZs.push(-hd + (enclosedD * i) / nBay);
  }
  for (const z of mullionZs) {
    if (z > sZ1 && z < sZ2) continue; // skip the door bay on −X
    at(box(MT, gh, MT, MATS.steel), hw, gy, z);
    at(box(MT, gh, MT, MATS.steel), -hw, gy, z);
  }
  // Short-end mullions
  for (const x of [-hw / 3, hw / 3]) {
    at(box(MT, gh, MT, MATS.steel), x, gy, -hd);
    if (Math.abs(x) > pd.half) at(box(MT, gh, MT, MATS.steel), x, gy, glassZ1);
  }
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
    }),
  );
  wash.rotation.x = -Math.PI / 2;
  at(wash, c.x, floorTop + 0.02, c.z);

  const o = PLAN.origin;
  const colliders = colliderBoxes(PLAN).map(b => ({
    minX: b.minX + o.x, maxX: b.maxX + o.x,
    minZ: b.minZ + o.z, maxZ: b.maxZ + o.z,
    minY: b.minY, maxY: b.maxY,
  }));

  const surfaces = {
    core:  { center: { x: o.x + c.x, y: cy, z: o.z + c.z }, kind: 'primavera' },
    porch: { center: { x: o.x, y: floorTop, z: o.z + hd - PLAN.porch / 2 }, kind: 'porch' },
    lower: { center: { x: o.x, y: lowerY, z: o.z + lowerZc }, kind: 'terrace' },
  };

  const floors = floorPatches(PLAN).map(f => ({
    ...f,
    heightAt: (x, z) => f.heightAt(x - o.x, z - o.z),
  }));

  return { group: G, colliders, floors, surfaces, materials: MATS, plan: PLAN };
}
