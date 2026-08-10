/**
 * FALLINGWATER — Frank Lloyd Wright, Bear Run, Pennsylvania, 1935–39.
 *
 * Visual reference (massing only — never the mesh):
 *   Sketchfab: fallingwater-house-frank-lloyd-wright-6f2f6823…
 *
 * The moves that make it that building, at phone cost:
 *
 *   - It sits ON A HILL. Rock ledges rise under and behind the house;
 *     the approach climbs. Not a flat pad with a house glued on.
 *   - CANTILEVERED TERRACES. Pale horizontal trays shoot forward over
 *     the stream — living level, then a bedroom tray above. The
 *     signature is the trays, not the windows.
 *   - STONE VERTICAL CORE. A rough chimney mass anchors the trays.
 *     One amber hearth opening — the site accent, once.
 *   - WATER AT THE FRONT. A cascade drops from under the living
 *     cantilever down toward the walker. Sheet bands scroll down
 *     (phone-light — no particles, no glTF).
 *
 * Walk: approach path up the hill, living terrace walkable, stone core
 * blocks. Upper terrace is visible; living is the one you stand on.
 * Same return shape as buildPavilion.
 */

export const PLAN = {
  name: 'FALLINGWATER',
  // SE of the Pavilion — denser estate, hill clear of Farnsworth south.
  origin: { x: 48, z: -28 },

  livingY: 3.2,
  upperY: 6.0,
  roofY: 8.4,
  slabT: 0.32,

  // Living cantilever — extends +Z (front, over water).
  living: { w: 11.5, d: 8.8, x: 0.4, z: 2.2 },
  // Bedroom tray — smaller, offset −X, less forward.
  upper:  { w: 7.8, d: 5.6, x: -1.8, z: 0.2 },
  // Rear service mass tying into the hill.
  rear:   { w: 6.5, d: 4.2, x: -0.5, z: -4.8 },

  // Stone chimney / vertical core.
  core: { x: -2.2, z: -2.8, w: 3.4, d: 3.8, h: 9.2 },

  // Glass band height on living level (ribbon, not full height).
  glassH: 2.15,
  glassT: 0.08,
  door: { x: 3.2, half: 0.85 },

  // Hill — crest behind (−Z), falls toward the stream (+Z).
  // Tall enough that the mass reads from the SE approach, not a pad.
  hill: {
    x0: -18, x1: 18,
    z0: -20, z1: 14,
    crestZ: -9,
    crestY: 5.6,
  },

  // Cascade under the living tip, flowing +Z down the front.
  stream: {
    halfW: 3.2,
    zTop: 7.0,
    zBot: 15.5,
    yTop: 2.6,
    yBot: 0.04,
    tiers: 6,
    bands: 5,
  },

  // Approach from the SE, looking at the cascade and the trays.
  spawn: { x: 9.5, y: 1.65, z: 16, lookAt: { x: 0, y: 3.8, z: 2 } },
};

/** Hill height at local (x,z). Null outside the hill footprint. */
export function hillHeight(x, z, plan = PLAN) {
  const H = plan.hill;
  if (x < H.x0 || x > H.x1 || z < H.z0 || z > H.z1) return null;
  // Peak at crestZ (behind the house); fall toward the stream (+Z).
  let t;
  if (z <= H.crestZ) {
    t = 0.7 + 0.3 * Math.max(0, (z - H.z0) / (H.crestZ - H.z0));
  } else {
    t = Math.max(0, 1 - (z - H.crestZ) / (H.z1 - H.crestZ));
  }
  const edge = 1 - Math.min(1, Math.abs(x) / ((H.x1 - H.x0) / 2));
  const y = H.crestY * t * t * (0.5 + 0.5 * edge);
  // Carve a stream notch under the cascade so the water reads.
  const S = plan.stream;
  if (z > S.zTop - 1 && z < S.zBot && Math.abs(x) < S.halfW + 0.4) {
    return Math.min(y, 0.15);
  }
  return y;
}

export function colliderBoxes(plan = PLAN) {
  const out = [];
  const c = plan.core;
  out.push({
    minX: c.x - c.w / 2, maxX: c.x + c.w / 2,
    minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2,
  });

  // Living perimeter — solid parapet edges + glass runs with door gap.
  // Height-scoped so the approach under the cantilever tip stays clear.
  const L = plan.living;
  const ly0 = plan.livingY - 0.1;
  const ly1 = plan.livingY + plan.glassH + 0.2;
  const hw = L.w / 2, hd = L.d / 2;
  const lx = L.x, lz = L.z;
  const T = plan.glassT;
  const d = plan.door;

  // +Z front parapet (solid low wall on the terrace edge) — thin, high enough
  // that you feel the edge; walkable behind it.
  out.push({
    minX: lx - hw, maxX: lx + hw,
    minZ: lz + hd - 0.12, maxZ: lz + hd + 0.08,
    minY: ly0, maxY: plan.livingY + 0.55,
  });
  // −Z rear wall of living (against core/hill)
  out.push({
    minX: lx - hw, maxX: lx + hw,
    minZ: lz - hd - T, maxZ: lz - hd + T,
    minY: ly0, maxY: ly1,
  });
  // ±X glass — door on +X
  out.push({
    minX: lx - hw - T, maxX: lx - hw + T,
    minZ: lz - hd, maxZ: lz + hd,
    minY: ly0, maxY: ly1,
  });
  out.push({
    minX: lx + hw - T, maxX: lx + hw + T,
    minZ: lz - hd, maxZ: lz + d.x - d.half,
    minY: ly0, maxY: ly1,
  });
  out.push({
    minX: lx + hw - T, maxX: lx + hw + T,
    minZ: lz + d.x + d.half, maxZ: lz + hd,
    minY: ly0, maxY: ly1,
  });

  // Rear mass
  const R = plan.rear;
  out.push({
    minX: R.x - R.w / 2, maxX: R.x + R.w / 2,
    minZ: R.z - R.d / 2, maxZ: R.z + R.d / 2,
    minY: plan.livingY - 0.2, maxY: plan.roofY,
  });

  return out;
}

/**
 * Floor patches: hill approach, living terrace, a thin bridge from
 * hill crest onto the living rear.
 */
export function floorPatches(plan = PLAN) {
  const L = plan.living;
  const hw = L.w / 2, hd = L.d / 2;
  const out = [];

  out.push({
    kind: 'hill',
    heightAt(x, z) {
      // Don't own the living footprint — the terrace patch does.
      if (Math.abs(x - L.x) <= hw + 0.05 && Math.abs(z - L.z) <= hd + 0.05) {
        return null;
      }
      return hillHeight(x, z, plan);
    },
  });

  out.push({
    kind: 'living',
    heightAt(x, z) {
      if (Math.abs(x - L.x) > hw + 0.05) return null;
      if (Math.abs(z - L.z) > hd + 0.05) return null;
      return plan.livingY;
    },
  });

  // Approach ramp: SE spawn → +X living door. Continuous rise so each
  // frame stays under FLOOR_STEP (0.55). Path is a 3.2m-wide corridor.
  out.push({
    kind: 'approach',
    heightAt(x, z) {
      const doorX = L.x + hw;
      const doorZ = L.z + plan.door.x;
      const spawnX = plan.spawn.x;
      const spawnZ = plan.spawn.z;
      // Parametrize by how far we are from spawn toward the door (0..1).
      const alongZ = (spawnZ - z) / (spawnZ - doorZ);
      if (alongZ < -0.05 || alongZ > 1.05) return null;
      const along = Math.max(0, Math.min(1, alongZ));
      const xCenter = spawnX + (doorX - spawnX) * along;
      if (Math.abs(x - xCenter) > 1.6) return null;
      return along * plan.livingY;
    },
  });

  return out;
}

export function paint(M, p) {
  M.stone.color.setHex(mix(0x4a453c, p.bg, 0.25));
  M.terrace.color.setHex(mix(0xc8c2b4, p.travertine, 0.35));
  M.glass.color.setHex(p.water);
  M.water.color.setHex(mix(p.water, 0x3a6a7a, 0.4));
  M.hill.color.setHex(mix(0x3a3d34, p.podium, 0.4));
}

const mix = (a, b, t) => {
  const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

export function buildFallingwater(THREE, scene, opts = {}) {
  const dark = opts.dark !== false;
  const G = new THREE.Group();
  G.position.set(PLAN.origin.x, 0, PLAN.origin.z);
  scene.add(G);

  const mat = (c, o = 1) => new THREE.MeshBasicMaterial({
    color: c, side: THREE.DoubleSide,
    transparent: o < 1, opacity: o, depthWrite: o > 0.55,
  });
  const line = new THREE.LineBasicMaterial({
    color: dark ? 0x8b98a6 : 0x4a5058, transparent: true, opacity: 0.45,
  });
  const amber = new THREE.LineBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.5,
  });

  const MATS = {
    stone:   mat(dark ? 0x3a3630 : 0x6a6558),
    terrace: mat(dark ? 0x2a2b28 : 0xc8c2b4),
    glass:   mat(dark ? 0x080d12 : 0xa8bcc8, 0.18),
    water:   mat(dark ? 0x1a3040 : 0x6a9aaa, 0.45),
    hill:    mat(dark ? 0x1e221c : 0x5a5e52),
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d, m = line) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); G.add(o); return o; };

  // ── Hill mass — stepped bedrock the house sits IN, not ON ──
  // Tall rear crest + side flanks that read from the SE spawn. Cheap
  // boxes only; the walk height comes from hillHeight(), not these meshes.
  const ledges = [
    // Crest mass behind the house — the hill you cannot miss.
    { w: 28, d: 12, h: 2.4, x: 0,   y: 1.2,  z: -12 },
    { w: 22, d: 9,  h: 2.2, x: -1,  y: 2.6,  z: -9 },
    { w: 16, d: 7,  h: 2.0, x: -1.5,y: 3.8,  z: -6.2 },
    { w: 12, d: 5.5,h: 1.6, x: -0.5,y: 4.6,  z: -4.0 },
    // Under / around the trays — rock gripping the cantilever.
    { w: 10, d: 5,  h: 1.4, x: 1,   y: 2.4,  z: -1.5 },
    { w: 8,  d: 4,  h: 1.1, x: 2.5, y: 1.5,  z: 1.2 },
    { w: 7,  d: 3.5,h: 0.85,x: 3.5, y: 0.7,  z: 3.8 },
    // Side flanks — visible from the approach, not a flat pad.
    { w: 5,  d: 14, h: 2.8, x: -12, y: 1.6,  z: -4 },
    { w: 4.5,d: 12, h: 2.2, x: 12,  y: 1.3,  z: -3 },
    { w: 4,  d: 8,  h: 1.6, x: -10, y: 3.2,  z: -7 },
    { w: 3.5,d: 7,  h: 1.3, x: 11,  y: 2.6,  z: -6 },
  ];
  for (const L of ledges) {
    at(box(L.w, L.h, L.d, MATS.hill), L.x, L.y, L.z);
    at(edges(L.w, L.h, L.d), L.x, L.y, L.z);
  }

  // Climbing approach shelf — a visible ramp of rock beside the path
  // so the walk up reads as climbing a hill, not floating on air.
  const shelves = [
    { w: 4.2, d: 3.2, h: 0.45, x: 8.5, y: 0.35, z: 12 },
    { w: 4.0, d: 3.0, h: 0.55, x: 7.8, y: 0.85, z: 9.2 },
    { w: 3.8, d: 2.8, h: 0.65, x: 7.0, y: 1.45, z: 6.6 },
    { w: 3.6, d: 2.6, h: 0.7,  x: 6.4, y: 2.1,  z: 4.4 },
  ];
  for (const S of shelves) {
    at(box(S.w, S.h, S.d, MATS.hill), S.x, S.y, S.z);
    at(edges(S.w, S.h, S.d), S.x, S.y, S.z);
  }

  // ── Stone core ──────────────────────────────────────────
  const c = PLAN.core;
  at(box(c.w, c.h, c.d, MATS.stone), c.x, c.h / 2, c.z);
  at(edges(c.w, c.h, c.d), c.x, c.h / 2, c.z);
  // Amber hearth — the one accent.
  const hearth = box(1.4, 1.1, 0.12, mat(0xf59e0b, 0.35));
  at(hearth, c.x + c.w / 2 - 0.05, PLAN.livingY + 0.7, c.z + 0.4);
  at(edges(1.4, 1.1, 0.12, amber), c.x + c.w / 2 - 0.05, PLAN.livingY + 0.7, c.z + 0.4);

  // ── Living cantilever ───────────────────────────────────
  const L = PLAN.living;
  const ly = PLAN.livingY;
  at(box(L.w, PLAN.slabT, L.d, MATS.terrace), L.x, ly, L.z);
  at(edges(L.w, PLAN.slabT, L.d), L.x, ly, L.z);
  const lTop = new THREE.Mesh(
    new THREE.PlaneGeometry(L.w - 0.1, L.d - 0.1), MATS.terrace,
  );
  lTop.rotation.x = -Math.PI / 2;
  at(lTop, L.x, ly + PLAN.slabT / 2 + 0.004, L.z);
  // Underside — the cantilever reads from the stream.
  const lBot = new THREE.Mesh(
    new THREE.PlaneGeometry(L.w - 0.1, L.d - 0.1),
    new THREE.MeshBasicMaterial({ color: dark ? 0x1a1c18 : 0x9a9588, side: THREE.DoubleSide }),
  );
  lBot.rotation.x = Math.PI / 2;
  at(lBot, L.x, ly - PLAN.slabT / 2 - 0.004, L.z);

  // Parapet on the living front edge
  at(box(L.w, 0.45, 0.12, MATS.terrace), L.x, ly + 0.35, L.z + L.d / 2);

  // Glass ribbon
  const gh = PLAN.glassH;
  const gy = ly + PLAN.slabT / 2 + gh / 2;
  const T = PLAN.glassT;
  const hw = L.w / 2, hd = L.d / 2;
  at(box(T, gh, L.d, MATS.glass), L.x - hw, gy, L.z);
  const d = PLAN.door;
  const zx0 = L.z - hd, zx1 = L.z + d.x - d.half, zx2 = L.z + d.x + d.half, zx3 = L.z + hd;
  if (zx1 > zx0) at(box(T, gh, zx1 - zx0, MATS.glass), L.x + hw, gy, (zx0 + zx1) / 2);
  if (zx3 > zx2) at(box(T, gh, zx3 - zx2, MATS.glass), L.x + hw, gy, (zx2 + zx3) / 2);
  at(box(L.w, gh, T, MATS.glass), L.x, gy, L.z - hd);

  // ── Upper bedroom tray ──────────────────────────────────
  const U = PLAN.upper;
  const uy = PLAN.upperY;
  at(box(U.w, PLAN.slabT, U.d, MATS.terrace), U.x, uy, U.z);
  at(edges(U.w, PLAN.slabT, U.d), U.x, uy, U.z);
  at(box(U.w * 0.7, 0.4, 0.1, MATS.terrace), U.x, uy + 0.35, U.z + U.d / 2);
  // Thin glass band
  at(box(U.w, 1.6, T, MATS.glass), U.x, uy + 1.0, U.z - U.d / 2);
  at(box(T, 1.6, U.d, MATS.glass), U.x - U.w / 2, uy + 1.0, U.z);

  // ── Rear mass ───────────────────────────────────────────
  const R = PLAN.rear;
  const rh = PLAN.roofY - PLAN.livingY;
  at(box(R.w, rh, R.d, MATS.stone), R.x, PLAN.livingY + rh / 2, R.z);
  at(edges(R.w, rh, R.d), R.x, PLAN.livingY + rh / 2, R.z);

  // ── Cascade (front, under living tip) ───────────────────
  // Static tiers give the fall its body; thin scrolling bands make
  // the water RUN. Phone-light: shared materials, no particles.
  const S = PLAN.stream;
  const n = S.tiers;
  const cascadeSheets = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const y0 = S.yTop + (S.yBot - S.yTop) * t0;
    const y1 = S.yTop + (S.yBot - S.yTop) * t1;
    const z0 = S.zTop + (S.zBot - S.zTop) * t0;
    const z1 = S.zTop + (S.zBot - S.zTop) * t1;
    const h = Math.max(0.08, y0 - y1);
    const dZ = Math.max(0.4, z1 - z0);
    const opacity = 0.32 + 0.1 * (i % 2);
    const wMat = mat(dark ? 0x1a3040 : 0x6a9aaa, opacity);
    const sheet = at(
      box(S.halfW * 2 * (1 - i * 0.05), h, dZ, wMat),
      0, (y0 + y1) / 2, (z0 + z1) / 2,
    );
    cascadeSheets.push({ mesh: sheet, base: opacity, phase: i * 0.37 });
  }

  // Moving bands — thin sheets that loop down the fall.
  const cascadeBands = [];
  const bandN = S.bands;
  const fallH = S.yTop - S.yBot;
  const fallZ = S.zBot - S.zTop;
  for (let i = 0; i < bandN; i++) {
    const bMat = mat(dark ? 0x2a5068 : 0x8ab8c8, 0.55);
    const band = box(S.halfW * 1.85, 0.14, 0.55, bMat);
    const t = i / bandN;
    at(band, 0, S.yTop - fallH * t, S.zTop + fallZ * t);
    cascadeBands.push({ mesh: band, t0: t });
  }

  // Stream bed pool at the bottom — Wright's catch basin.
  at(box(S.halfW * 2.6, 0.08, 3.6, MATS.water), 0, 0.05, S.zBot + 0.6);
  // Secondary pool shelf just under the living tip.
  at(box(S.halfW * 2.1, 0.06, 1.4, MATS.water), 0, 0.55, S.zTop + 0.8);

  let waterT = 0;
  function tick(dt) {
    // Reduced motion: keep the cascade body, freeze the run.
    if (typeof matchMedia === 'function' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    waterT += dt;
    for (const s of cascadeSheets) {
      // Staggered shimmer — sheets pulse out of phase so the fall
      // reads as moving water, not a blinking solid.
      const w = 0.5 + 0.5 * Math.sin(waterT * 3.1 + s.phase * Math.PI * 2);
      s.mesh.material.opacity = s.base * (0.72 + 0.4 * w);
    }
    for (const b of cascadeBands) {
      // Loop down the cascade: t advances, wraps 0→1.
      const t = (b.t0 + waterT * 0.55) % 1;
      b.mesh.position.y = S.yTop - fallH * t;
      b.mesh.position.z = S.zTop + fallZ * t;
      // Fade near the ends so the wrap is invisible.
      const edge = Math.min(t, 1 - t);
      b.mesh.material.opacity = 0.25 + 0.45 * Math.min(1, edge * 6);
    }
  }

  const o = PLAN.origin;
  const colliders = colliderBoxes(PLAN).map(b => ({
    minX: b.minX + o.x, maxX: b.maxX + o.x,
    minZ: b.minZ + o.z, maxZ: b.maxZ + o.z,
    minY: b.minY, maxY: b.maxY,
  }));

  const surfaces = {
    core:    { center: { x: o.x + c.x, y: c.h / 2, z: o.z + c.z }, kind: 'stone' },
    living:  { center: { x: o.x + L.x, y: ly, z: o.z + L.z }, kind: 'terrace' },
    cascade: { center: { x: o.x, y: 1.2, z: o.z + (S.zTop + S.zBot) / 2 }, kind: 'water' },
    hill:    { center: { x: o.x, y: PLAN.hill.crestY * 0.5, z: o.z + PLAN.hill.crestZ }, kind: 'hill' },
  };

  const floors = floorPatches(PLAN).map(f => ({
    ...f,
    heightAt: (x, z) => f.heightAt(x - o.x, z - o.z),
  }));

  return {
    group: G, colliders, floors, surfaces, materials: MATS, plan: PLAN,
    tick,
    // Test / verify hooks — cascade is alive if bands exist.
    water: { sheets: cascadeSheets, bands: cascadeBands, tick },
  };
}
