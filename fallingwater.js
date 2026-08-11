/**
 * FALLINGWATER — Frank Lloyd Wright, Bear Run, Pennsylvania, 1935–39.
 *
 * Rebuilt 2026-08-11 after the owner's verdict on v1: "looks nothing
 * like the Falling Water." He was right. V1 buried two parallel trays
 * behind a khaki ziggurat of rock, and ran the water down a staircase
 * of boxes IN FRONT of the house. Every one of those choices misses
 * what the building is. The four moves that ARE Fallingwater, from the
 * canonical downstream view:
 *
 *   1. CROSSED TRAYS. The living tray runs broad, PARALLEL to the
 *      falls; the master tray above runs PERPENDICULAR, cantilevered
 *      past the living tray's front edge. The cross is the icon —
 *      two parallel trays are just shelves.
 *   2. THE WATER COMES OUT FROM UNDER THE HOUSE. Wright put the house
 *      ON the falls, not facing them. The stream slides beneath the
 *      living tray and drops twice — a short fall, a ledge, then the
 *      big fall into the plunge pool. You never see where it starts;
 *      that shadow under the cantilever is the whole drama.
 *   3. THE CHIMNEY CLUSTER OUT-CLIMBS EVERYTHING. Rough vertical stone
 *      rising past the top tray — the one vertical in a composition of
 *      horizontals. One amber hearth opening at living level.
 *   4. ROCK SUPPORTS, NEVER DOMINATES. Dark ledges grip the trays from
 *      below and behind; the pale bands own the silhouette. When the
 *      rock is the composition you have built a quarry.
 *
 * Walk: approach climbs from the SE to the +X door; the living terrace
 * is the floor you stand on. Same return shape as buildPavilion.
 */

export const PLAN = {
  name: 'FALLINGWATER',
  // SE of the Pavilion — denser estate, hill clear of Farnsworth south.
  origin: { x: 48, z: -28 },

  livingY: 3.2,
  upperY: 5.9,
  roofY: 8.6,
  slabT: 0.8,               // trays are THICK pale bands, not wafers

  // Living tray — broad in X, parallel to the falls edge.
  living: { w: 15.0, d: 7.0, x: 0.2, z: 1.6 },
  // Master tray — CROSSED: narrow in X, deep in Z, shooting past the
  // living tray's front edge and over the first fall.
  upper:  { w: 6.2, d: 9.0, x: -1.6, z: 1.8 },
  // Study tray — the third, smallest, top west.
  study:  { w: 4.6, d: 4.0, x: -3.6, z: -1.6, y: 8.3 },
  // Rear service mass tying into the hill.
  rear:   { w: 6.0, d: 3.8, x: 0.6, z: -5.2 },

  // Stone chimney cluster — h must clear every tray (test contract).
  core: { x: -2.0, z: -3.6, w: 2.6, d: 3.2, h: 11.0 },
  core2: { x: 0.9, z: -4.3, w: 1.8, d: 2.4, h: 8.8 },

  // Glass band height on living level (ribbon, not full height).
  glassH: 1.7,
  glassT: 0.08,
  door: { x: 2.2, half: 0.85 },

  // Hill — crest behind (−Z), falls toward the stream (+Z). The WALKED
  // hill keeps its height (the approach must climb); the DRAWN rock is
  // now narrow and dark so the trays own the silhouette.
  hill: {
    x0: -18, x1: 18,
    z0: -20, z1: 14,
    crestZ: -10,
    crestY: 5.4,
  },

  // The falls. zTop is the FIRST drop — under the living tray's front
  // edge, in its shadow. zBot is the base of the SECOND, big drop.
  // tiers = upper ledge, fall 1, mid ledge, fall 2.
  stream: {
    halfW: 2.8,
    zTop: 4.9,
    zBot: 6.9,
    yTop: 1.9,
    yBot: 0.05,
    tiers: 4,
    bands: 6,
  },

  // The hatch stair — Wright's suspended steps from the living level
  // down toward the stream. The second exit; a terrace with one door
  // is a dead end, and the real house solved it the same way.
  stair: { x: -3.6, halfW: 0.65, z0: 5.05, z1: 8.65, yTop: 3.2, yBot: 0.15 },

  // Approach from the SE, looking into the shadow under the trays.
  spawn: { x: 9.5, y: 1.65, z: 16, lookAt: { x: 0, y: 3.4, z: 3 } },
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
  // Carve the stream channel: under the house, over both falls, and
  // through the plunge pool, the ground is streambed, not hillside.
  const S = plan.stream;
  if (z > -2 && z < S.zBot + 6 && Math.abs(x) < S.halfW + 0.6) {
    return Math.min(y, 0.15);
  }
  return y;
}

export function colliderBoxes(plan = PLAN) {
  const out = [];
  const c = plan.core;
  // Core is FIRST — test contract.
  out.push({
    minX: c.x - c.w / 2, maxX: c.x + c.w / 2,
    minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2,
  });
  const c2 = plan.core2;
  out.push({
    minX: c2.x - c2.w / 2, maxX: c2.x + c2.w / 2,
    minZ: c2.z - c2.d / 2, maxZ: c2.z + c2.d / 2,
  });

  // Living perimeter — parapet edges + glass runs with door gap.
  // Height-scoped so the streambed under the cantilever stays walkable.
  const L = plan.living;
  const ly0 = plan.livingY - 0.1;
  const ly1 = plan.livingY + plan.glassH + 0.2;
  const hw = L.w / 2, hd = L.d / 2;
  const lx = L.x, lz = L.z;
  const T = plan.glassT;
  const d = plan.door;

  // +Z front parapet — you feel the edge over the falls. Split around
  // the hatch-stair gap so the stair is enterable.
  const st = plan.stair;
  out.push({
    minX: lx - hw, maxX: st.x - st.halfW,
    minZ: lz + hd - 0.14, maxZ: lz + hd + 0.06,
    minY: ly0, maxY: plan.livingY + 0.6,
  });
  out.push({
    minX: st.x + st.halfW, maxX: lx + hw,
    minZ: lz + hd - 0.14, maxZ: lz + hd + 0.06,
    minY: ly0, maxY: plan.livingY + 0.6,
  });
  // −Z rear glass wall of living (against core/hill)
  out.push({
    minX: lx - hw, maxX: lx + hw,
    minZ: lz - hd - T, maxZ: lz - hd + T,
    minY: ly0, maxY: ly1,
  });
  // −X parapet
  out.push({
    minX: lx - hw - T, maxX: lx - hw + T,
    minZ: lz - hd, maxZ: lz + hd,
    minY: ly0, maxY: ly1,
  });
  // +X side — door gap at door.x along z
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

  // The rock lip the water pours over — solid up to the upper ledge,
  // so nobody walks through the waterfall into stone.
  const S = plan.stream;
  out.push({
    minX: -S.halfW - 1.6, maxX: S.halfW + 1.6,
    minZ: -1.5, maxZ: S.zTop,
    minY: 0, maxY: S.yTop,
  });

  return out;
}

/**
 * Floor patches: hill approach, living terrace, SE approach ramp.
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

  // The hatch stair — a steep continuous descent (Wright's real stair
  // is nearly this steep). Continuous slope keeps every frame's floor
  // change under FLOOR_STEP in both directions.
  out.push({
    kind: 'stair',
    heightAt(x, z) {
      const st = plan.stair;
      if (Math.abs(x - st.x) > st.halfW + 0.05) return null;
      if (z < st.z0 - 0.05 || z > st.z1 + 0.05) return null;
      const t = Math.max(0, Math.min(1, (z - st.z0) / (st.z1 - st.z0)));
      return st.yTop + (st.yBot - st.yTop) * t;
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
  // The trays STAY pale — they are the building. 70% ochre concrete,
  // 30% whatever the daylight says travertine is right now.
  M.terrace.color.setHex(mix(0xcfc6b0, p.travertine, 0.3));
  M.stone.color.setHex(mix(0x453f36, p.bg, 0.2));
  M.glass.color.setHex(p.water);
  M.water.color.setHex(mix(p.water, 0x3a6a7a, 0.4));
  // The rock recedes: dark slate-moss, barely touched by the palette.
  M.hill.color.setHex(mix(0x272e26, p.podium, 0.12));
  M.foam.color.setHex(mix(0xc8d4da, p.travertine, 0.25));
  // The cascade is part of the estate's light. The static water body
  // (upstream channel, ledges, plunge pool) and the moving bands both
  // follow the palette; only the run animates, not the colour.
  for (const c of M.cascadeSheets) c.color.setHex(mix(p.water, 0x3a6a7a, 0.4));
  for (const c of M.cascadeBands)  c.color.setHex(mix(0xc8d4da, p.travertine, 0.25));
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
  const amberLine = new THREE.LineBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.5,
  });

  const MATS = {
    stone:   mat(dark ? 0x3d3830 : 0x6a6558),
    terrace: mat(dark ? 0x565248 : 0xcfc6b0),
    glass:   mat(dark ? 0x080d12 : 0xa8bcc8, 0.18),
    water:   mat(dark ? 0x1a3040 : 0x5a8a9a, 0.5),
    hill:    mat(dark ? 0x1c211b : 0x39413a),
    foam:    mat(dark ? 0x9fb4be : 0xd8e4e8, 0.7),
    // Cascade materials live here so paint() can recolour them when the
    // sun moves. Each sheet/band has its own material (the run animates
    // opacity per-entity), but the colour is set together by the palette.
    cascadeSheets: [],
    cascadeBands:  [],
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d, m = line) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), m);
  const at = (o, x, y, z) => { o.position.set(x, y, z); G.add(o); return o; };

  // ── Rock — behind and BELOW, never in front ──────────────
  // Dark strata gripping the house. Half v1's footprint, a third of
  // its visual weight; the hill you WALK is hillHeight(), unchanged.
  const ledges = [
    // Crest behind the house.
    { w: 20, d: 9,  h: 2.2, x: 0,    y: 1.1, z: -13 },
    { w: 15, d: 7,  h: 2.0, x: -1,   y: 2.6, z: -10 },
    { w: 11, d: 5,  h: 1.8, x: -1.5, y: 3.9, z: -7.6 },
    // Side flanks, low and dark.
    { w: 4,  d: 10, h: 1.8, x: -12,  y: 1.0, z: -5 },
    { w: 3.5,d: 8,  h: 1.4, x: 11.5, y: 0.8, z: -4 },
  ];
  for (const l of ledges) {
    at(box(l.w, l.h, l.d, MATS.hill), l.x, l.y, l.z);
    at(edges(l.w, l.h, l.d), l.x, l.y, l.z);
  }

  // The ledge the falls pour over — two strata directly under the
  // living tray. This is the rock the house actually grips.
  const strata = [
    { w: 9.5, d: 6.0, h: 1.9, x: 0,   y: 0.95, z: 1.6 },
    { w: 7.5, d: 3.2, h: 0.9, x: 0.5, y: 0.45, z: 4.4 },
  ];
  for (const s of strata) {
    at(box(s.w, s.h, s.d, MATS.hill), s.x, s.y, s.z);
    at(edges(s.w, s.h, s.d), s.x, s.y, s.z);
  }

  // Approach shelves — the climb reads as climbing.
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

  // ── Chimney cluster — the one vertical ───────────────────
  const c = PLAN.core;
  at(box(c.w, c.h, c.d, MATS.stone), c.x, c.h / 2, c.z);
  at(edges(c.w, c.h, c.d), c.x, c.h / 2, c.z);
  const c2 = PLAN.core2;
  at(box(c2.w, c2.h, c2.d, MATS.stone), c2.x, c2.h / 2, c2.z);
  at(edges(c2.w, c2.h, c2.d), c2.x, c2.h / 2, c2.z);
  // Amber hearth — the one accent.
  const hearth = box(1.4, 1.1, 0.12, mat(0xf59e0b, 0.35));
  at(hearth, c.x + c.w / 2 - 0.05, PLAN.livingY + 0.7, c.z + 0.4);
  at(edges(1.4, 1.1, 0.12, amberLine), c.x + c.w / 2 - 0.05, PLAN.livingY + 0.7, c.z + 0.4);

  // ── The trays — thick pale bands, crossed ─────────────────
  const trayBand = (w, d, x, topY, z) => {
    const t = PLAN.slabT;
    at(box(w, t, d, MATS.terrace), x, topY - t / 2, z);
    at(edges(w, t, d), x, topY - t / 2, z);
  };
  const parapet = (w, d, x, y, z) => {
    at(box(w, 0.45, d, MATS.terrace), x, y + 0.225, z);
    at(edges(w, 0.45, d), x, y + 0.225, z);
  };

  // Living tray: walk level = PLAN.livingY = top of the band.
  const L = PLAN.living;
  const hw = L.w / 2, hd = L.d / 2;
  trayBand(L.w, L.d, L.x, PLAN.livingY, L.z);
  const lTop = new THREE.Mesh(new THREE.PlaneGeometry(L.w - 0.1, L.d - 0.1), MATS.terrace);
  lTop.rotation.x = -Math.PI / 2;
  at(lTop, L.x, PLAN.livingY + 0.004, L.z);
  // Parapets: front and both sides (rear is glass to the hill). The
  // front band is split at the hatch-stair gap.
  const st = PLAN.stair;
  {
    const x0 = L.x - hw, gapA = st.x - st.halfW, gapB = st.x + st.halfW, x1 = L.x + hw;
    parapet(gapA - x0, 0.16, (x0 + gapA) / 2, PLAN.livingY, L.z + hd - 0.08);
    parapet(x1 - gapB, 0.16, (gapB + x1) / 2, PLAN.livingY, L.z + hd - 0.08);
  }
  parapet(0.16, L.d, L.x - hw + 0.08, PLAN.livingY, L.z);
  parapet(0.16, L.d - PLAN.door.half * 2, L.x + hw - 0.08, PLAN.livingY,
    L.z - PLAN.door.half);

  // Master tray: CROSSED — deep in Z, its nose past the living edge,
  // hanging over the first fall.
  const U = PLAN.upper;
  trayBand(U.w, U.d, U.x, PLAN.upperY, U.z);
  parapet(U.w, 0.14, U.x, PLAN.upperY, U.z + U.d / 2 - 0.07);
  parapet(0.14, U.d, U.x - U.w / 2 + 0.07, PLAN.upperY, U.z);
  parapet(0.14, U.d, U.x + U.w / 2 - 0.07, PLAN.upperY, U.z);

  // Study tray: smallest, top, west.
  const Y = PLAN.study;
  trayBand(Y.w, Y.d, Y.x, Y.y, Y.z);
  parapet(Y.w, 0.13, Y.x, Y.y, Y.z + Y.d / 2 - 0.065);

  // ── Glass ribbons with mullion rhythm ─────────────────────
  // Wright's window walls read as thin vertical lines. Hairlines only;
  // amber stays with the hearth.
  const T = PLAN.glassT;
  const mullions = (w, h, x, y, z, alongX) => {
    const pts = [];
    const n = Math.max(2, Math.round(w / 0.9));
    for (let i = 0; i <= n; i++) {
      const o = -w / 2 + (w / n) * i;
      if (alongX) pts.push(new THREE.Vector3(x + o, y - h / 2, z), new THREE.Vector3(x + o, y + h / 2, z));
      else pts.push(new THREE.Vector3(x, y - h / 2, z + o), new THREE.Vector3(x, y + h / 2, z + o));
    }
    const seg = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts), line);
    G.add(seg);
  };

  // Living level: rear glass to the hill, and the +X door side runs.
  const gy = PLAN.livingY + PLAN.glassH / 2;
  at(box(L.w - 0.4, PLAN.glassH, T, MATS.glass), L.x, gy, L.z - hd);
  mullions(L.w - 0.4, PLAN.glassH, L.x, gy, L.z - hd, true);
  const d = PLAN.door;
  const zx0 = L.z - hd, zx1 = L.z + d.x - d.half, zx2 = L.z + d.x + d.half, zx3 = L.z + hd;
  if (zx1 > zx0) {
    at(box(T, PLAN.glassH, zx1 - zx0, MATS.glass), L.x + hw, gy, (zx0 + zx1) / 2);
    mullions(zx1 - zx0, PLAN.glassH, L.x + hw, gy, (zx0 + zx1) / 2, false);
  }
  if (zx3 > zx2) at(box(T, PLAN.glassH, zx3 - zx2, MATS.glass), L.x + hw, gy, (zx2 + zx3) / 2);

  // Master level: glass band under the study/roof on the rear half.
  const ugy = PLAN.upperY + 0.65;
  at(box(U.w - 0.3, 1.3, T, MATS.glass), U.x, ugy, U.z - U.d / 2 + 0.4);
  mullions(U.w - 0.3, 1.3, U.x, ugy, U.z - U.d / 2 + 0.4, true);

  // The hatch stair — treads suspended from the tray edge, dropping
  // beside the falls to the streambank. THE interior move of the house.
  {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const y = st.yTop + (st.yBot - st.yTop) * t;
      const z = st.z0 + (st.z1 - st.z0) * t;
      at(box(st.halfW * 2, 0.07, 0.46, MATS.terrace), st.x, y, z);
      at(edges(st.halfW * 2, 0.07, 0.46), st.x, y, z);
    }
    // Hanger rods from the tray edge, hairlines.
    const rods = [];
    for (const sx of [st.x - st.halfW + 0.06, st.x + st.halfW - 0.06]) {
      rods.push(
        new THREE.Vector3(sx, PLAN.livingY, st.z0 + 0.2),
        new THREE.Vector3(sx, st.yTop - (st.yTop - st.yBot) * 0.35, st.z0 + 1.4),
      );
    }
    G.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(rods), line));
  }

  // Trellis beams over the living rear — Wright's horizontal shadow
  // lines, four cheap boxes.
  for (let i = 0; i < 4; i++) {
    const bx = L.x - 3.6 + i * 2.0;
    at(box(0.16, 0.2, 4.6, MATS.terrace), bx, PLAN.upperY - 0.42, L.z - hd - 1.2);
    at(edges(0.16, 0.2, 4.6), bx, PLAN.upperY - 0.42, L.z - hd - 1.2);
  }

  // ── The falls — from UNDER the house, twice, into the pool ──
  const S = PLAN.stream;
  const W2 = S.halfW * 2;

  // Upstream channel sliding beneath the tray (mostly in shadow).
  at(box(W2, 0.06, 6.0, MATS.water), 0, S.yTop + 0.03, S.zTop - 3.1);
  // Upper ledge sheet — emerges from the tray's shadow.
  const upperLedge = at(box(W2, 0.07, 1.4, MATS.water), 0, S.yTop, S.zTop - 0.7);
  // FALL 1 — short drop, under the cantilever nose.
  const fall1H = S.yTop - 0.88;
  const fall1 = at(box(W2 - 0.3, fall1H, 0.14, MATS.water), 0, 0.88 + fall1H / 2, S.zTop);
  // Mid ledge.
  const midLedge = at(box(W2 + 0.3, 0.07, S.zBot - S.zTop - 0.2, MATS.water),
    0, 0.88, (S.zTop + S.zBot) / 2);
  // FALL 2 — the big one.
  const fall2H = 0.88 - S.yBot;
  const fall2 = at(box(W2 + 0.5, fall2H, 0.16, MATS.water), 0, S.yBot + fall2H / 2, S.zBot);
  // Plunge pool.
  at(box(W2 + 4.2, 0.07, 5.6, MATS.water), 0, S.yBot, S.zBot + 3.2);
  // Foam lines at each fall base.
  at(box(W2 + 0.2, 0.06, 0.28, MATS.foam), 0, 0.9, S.zTop + 0.12);
  at(box(W2 + 0.7, 0.07, 0.34, MATS.foam), 0, S.yBot + 0.03, S.zBot + 0.16);

  const cascadeSheets = [
    { mesh: upperLedge, base: 0.5, phase: 0.0 },
    { mesh: fall1,      base: 0.55, phase: 0.3 },
    { mesh: midLedge,   base: 0.5, phase: 0.55 },
    { mesh: fall2,      base: 0.6, phase: 0.8 },
  ];
  // Each sheet gets its own material so the shimmer is per-sheet. The
  // colour starts at the dark/light default and is overwritten by
  // paint() the moment the daylight palette refreshes.
  for (const s of cascadeSheets) {
    s.mesh.material = mat(dark ? 0x1a3040 : 0x5a8a9a, s.base);
    MATS.cascadeSheets.push(s.mesh.material);
  }

  // Moving bands — thin pale streaks falling DOWN each fall face.
  // Water falls; it does not march toward you (v1's mistake).
  const cascadeBands = [];
  const faces = [
    { z: S.zTop + 0.09, yTop: S.yTop, yBot: 0.9, w: W2 - 0.5 },
    { z: S.zBot + 0.11, yTop: 0.88, yBot: S.yBot + 0.05, w: W2 + 0.1 },
  ];
  for (let i = 0; i < S.bands; i++) {
    const f = faces[i % faces.length];
    const bMat = mat(dark ? 0x88a8b8 : 0xcfe2ea, 0.4);
    const band = box(f.w, 0.1, 0.05, bMat);
    const t0 = (i / S.bands) % 1;
    at(band, 0, f.yTop - (f.yTop - f.yBot) * t0, f.z);
    cascadeBands.push({ mesh: band, t0, face: f });
    MATS.cascadeBands.push(bMat);
  }

  let waterT = 0;
  function tick(dt) {
    // Reduced motion: keep the water's body, freeze the run.
    if (typeof matchMedia === 'function' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    waterT += dt;
    for (const s of cascadeSheets) {
      const w = 0.5 + 0.5 * Math.sin(waterT * 3.1 + s.phase * Math.PI * 2);
      s.mesh.material.opacity = s.base * (0.75 + 0.35 * w);
    }
    for (const b of cascadeBands) {
      const f = b.face;
      const t = (b.t0 + waterT * 0.9) % 1;
      b.mesh.position.y = f.yTop - (f.yTop - f.yBot) * t;
      // Fade at the wrap so the loop is invisible.
      const edge = Math.min(t, 1 - t);
      b.mesh.material.opacity = 0.12 + 0.4 * Math.min(1, edge * 7);
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
    living:  { center: { x: o.x + L.x, y: PLAN.livingY, z: o.z + L.z }, kind: 'terrace' },
    cascade: { center: { x: o.x, y: 1.0, z: o.z + (S.zTop + S.zBot) / 2 }, kind: 'water' },
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
