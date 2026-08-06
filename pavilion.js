/**
 * THE BARCELONA PAVILION — the plan, at real scale.
 *
 * Mies van der Rohe / Lilly Reich, German Pavilion, Barcelona 1929.
 * Demolished 1930, rebuilt 1986. This is that plan, in metres, walkable.
 *
 * The moves that make it that building and not a nice modern room:
 *
 *   - A travertine PODIUM you step up onto. The building is a plinth
 *     first; the walls are objects placed on it.
 *   - Eight chrome CRUCIFORM COLUMNS on a regular grid carry the roof.
 *     Because the roof is on the columns, the walls carry nothing — which
 *     is the whole argument. They stop wherever they like.
 *   - Free-standing PLANES that never meet. Space runs between them and
 *     out. There is no room, only walls you walk past.
 *   - The ONYX DORADO wall, book-matched, dead centre. Mies bought the
 *     block because of how it looked; the building is arranged around it.
 *   - A LARGE POOL open to the sky at one end, and a small enclosed
 *     WATER COURT at the other with Kolbe's bronze figure. You arrive at
 *     water and you leave at water.
 *
 * On colour. The house law is one amber and nothing else (design.md
 * Law 1), and the Pavilion is a building made of coloured stone. The
 * resolution is not a compromise: onyx dorado is literally golden, so
 * the onyx wall IS the amber — one warm plane in an otherwise greyscale
 * building, and the only lit thing in the room. Green Tinian marble
 * reads as near-black; travertine as warm grey; chrome as pale grey.
 *
 * Clear height is 3.1m. That is the real number, and it is why the
 * building feels domestic rather than civic despite being 54m long.
 *
 * Exports the plan so the walk controller can collide against the same
 * numbers the geometry was built from — one source of truth, or you get
 * walls you can walk through and invisible ones you cannot.
 */

export const PLAN = {
  // Podium — you stand on this. Origin is its centre.
  podium: { w: 54, d: 24, thickness: 0.9 },

  // The roofed volume.
  roof: { x0: -13, x1: 11, z0: -7, z1: 7, y: 3.1, thickness: 0.22 },

  // Eight cruciform columns, two rows of four.
  columnRows: [-3.5, 3.5],
  columnXs: [-10.5, -3.5, 3.5, 10.5],

  /**
   * Walls. Every one free-standing: no wall touches another, which is
   * how the space stays continuous. [x0,z0,x1,z1] are endpoints on the
   * podium; h is height; `kind` picks the material.
   */
  walls: [
    // Long travertine back wall — the work wall hangs here.
    { id: 'north',   x0: -13,  z0: -6.9, x1: 2,    z1: -6.9, h: 3.1, kind: 'travertine' },
    // Onyx dorado, book-matched, free in the middle. The amber.
    { id: 'onyx',    x0: -4,   z0: -1.2, x1: 2,    z1: -1.2, h: 3.1, kind: 'onyx' },
    // Green Tinian marble at the east opening, turned across the axis.
    { id: 'green',   x0: 8,    z0: -6,   x1: 8,    z1: -0.5, h: 3.1, kind: 'green' },
    // Etched glass — light comes through, you do not.
    { id: 'glassW',  x0: -12.8,z0: -3,   x1: -12.8,z1: 6,    h: 3.1, kind: 'glass' },
    { id: 'glassS',  x0: -7,   z0: 6.9,  x1: 3,    z1: 6.9,  h: 3.1, kind: 'glass' },
    // The small water court at the west end: travertine on three sides.
    { id: 'courtN',  x0: -25,  z0: -6,   x1: -14,  z1: -6,   h: 3.1, kind: 'travertine' },
    { id: 'courtW',  x0: -25,  z0: -6,   x1: -25,  z1: 6,    h: 3.1, kind: 'travertine' },
    { id: 'courtS',  x0: -25,  z0: 6,    x1: -14,  z1: 6,    h: 3.1, kind: 'travertine' },
  ],

  // Water. Open to the sky at the east end; enclosed at the west.
  pools: [
    { id: 'large', x0: 13,  z0: -8, x1: 25,  z1: 8, },
    { id: 'court', x0: -24, z0: -5, x1: -15, z1: 5, },
  ],

  // Where you start, and where the building wants you to look.
  // You arrive at the south-east corner of the podium and walk in along
  // the large pool, which is the approach the building was designed for.
  // (An earlier spawn at x:20,z:0 put you standing in the water — the
  // plan test caught it.)
  spawn: { x: 20.5, y: 1.65, z: -10.2, lookAt: { x: -3, y: 1.5, z: -1 } },
};

const WALL_T = 0.28;   // wall thickness — reads as stone, not paper

/**
 * Build it. Returns the collision boxes and the named surfaces the rest
 * of the app hangs its content on.
 */
export function buildPavilion(THREE, scene, opts = {}) {
  const dark = opts.dark !== false;
  const G = new THREE.Group();
  scene.add(G);

  // Near-monochrome, one warm exception. Values are chosen to read on a
  // near-black ground without any of them becoming a second accent.
  const C = dark
    ? { travertine: 0x2a2b28, green: 0x14201a, chrome: 0x8e9aa6,
        onyx: 0x3d2a10, water: 0x080d12, podium: 0x1c1e1c, roof: 0x121413 }
    : { travertine: 0xd8d2c4, green: 0x5d7a68, chrome: 0xaab4bd,
        onyx: 0xc9963f, water: 0xc4cdd4, podium: 0xe6e1d5, roof: 0xeae5db };

  const mat = (c, o = 1) => new THREE.MeshBasicMaterial({
    color: c, side: THREE.DoubleSide,
    transparent: o < 1, opacity: o, depthWrite: o > 0.6,
  });
  const line = new THREE.LineBasicMaterial({
    color: dark ? 0x8b98a6 : 0x3a4048, transparent: true, opacity: 0.55,
  });

  const MATS = {
    travertine: mat(C.travertine),
    green: mat(C.green),
    onyx: mat(C.onyx),
    glass: mat(dark ? 0x223040 : 0xbcc8d2, 0.16),
    chrome: mat(C.chrome),
    water: mat(C.water),
    podium: mat(C.podium),
    roof: mat(C.roof),
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const edges = (w, h, d) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), line);

  // ── Podium ──────────────────────────────────────────────
  const p = PLAN.podium;
  const podium = box(p.w, p.thickness, p.d, MATS.podium);
  podium.position.y = -p.thickness / 2;
  G.add(podium);
  const podiumEdge = edges(p.w, p.thickness, p.d);
  podiumEdge.position.y = -p.thickness / 2;
  G.add(podiumEdge);

  // Travertine paving — a grid, because the paving module is the grid
  // the whole plan is set out on. 1.09m in the original; 1.1 here.
  const pav = new THREE.GridHelper(p.w, Math.round(p.w / 1.1), 0x8b98a6, 0x8b98a6);
  pav.material = new THREE.LineBasicMaterial({
    color: dark ? 0x6f7d8a : 0x9aa3ab, transparent: true, opacity: 0.16,
  });
  pav.scale.z = p.d / p.w;
  pav.position.y = 0.004;
  G.add(pav);

  // ── Roof ────────────────────────────────────────────────
  const r = PLAN.roof;
  const rw = r.x1 - r.x0, rd = r.z1 - r.z0;
  const roof = box(rw, r.thickness, rd, MATS.roof);
  roof.position.set((r.x0 + r.x1) / 2, r.y + r.thickness / 2, (r.z0 + r.z1) / 2);
  G.add(roof);
  const roofEdge = edges(rw, r.thickness, rd);
  roofEdge.position.copy(roof.position);
  G.add(roofEdge);

  // ── Cruciform columns ───────────────────────────────────
  // Two crossed plates, not a cylinder. The cross-section is the point:
  // it has no front, so it does not tell you which way to face.
  for (const cz of PLAN.columnRows) {
    for (const cx of PLAN.columnXs) {
      const a = box(0.24, r.y, 0.06, MATS.chrome);
      const b = box(0.06, r.y, 0.24, MATS.chrome);
      a.position.set(cx, r.y / 2, cz);
      b.position.set(cx, r.y / 2, cz);
      G.add(a); G.add(b);
    }
  }

  // ── Walls ───────────────────────────────────────────────
  const colliders = [];
  const surfaces = {};
  for (const w of PLAN.walls) {
    const dx = w.x1 - w.x0, dz = w.z1 - w.z0;
    const len = Math.hypot(dx, dz);
    const along = Math.abs(dx) >= Math.abs(dz);   // runs along x or z
    const cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2;

    const m = box(along ? len : WALL_T, w.h, along ? WALL_T : len, MATS[w.kind]);
    m.position.set(cx, w.h / 2, cz);
    G.add(m);
    if (w.kind !== 'glass') {
      const e = edges(along ? len : WALL_T, w.h, along ? WALL_T : len);
      e.position.copy(m.position);
      G.add(e);
    }

    surfaces[w.id] = {
      mesh: m, center: { x: cx, y: w.h / 2, z: cz },
      len, height: w.h, along, kind: w.kind,
      // Which way the wall faces, for hanging things on it.
      normal: along ? { x: 0, z: -1 } : { x: -1, z: 0 },
    };

    colliders.push({
      minX: Math.min(w.x0, w.x1) - WALL_T, maxX: Math.max(w.x0, w.x1) + WALL_T,
      minZ: Math.min(w.z0, w.z1) - WALL_T, maxZ: Math.max(w.z0, w.z1) + WALL_T,
    });
  }

  // Book-matching: the slab is sawn and opened like a page, so the
  // figure is mirrored about the centre line. Drawn as veins rather
  // than painted on, because the mirror is the whole reason Mies chose
  // this block — and a flat amber rectangle is a lightbox, not stone.
  {
    const s0 = surfaces.onyx;
    const vein = new THREE.LineBasicMaterial({
      color: 0xf59e0b, transparent: true, opacity: 0.5,
    });
    const half = s0.len / 2, H = s0.height;
    const pts = [];
    for (let i = 1; i <= 7; i++) {
      const f = i / 8;
      // One curve, then its mirror — same figure, opened outward.
      for (const sign of [-1, 1]) {
        const seg = [];
        for (let k = 0; k <= 12; k++) {
          const ty = k / 12;
          const wobble = Math.sin(ty * Math.PI * 1.6 + i) * 0.16 * (1 - f);
          seg.push(new THREE.Vector3(sign * (f * half + wobble), ty * H, 0));
        }
        for (let k = 0; k < seg.length - 1; k++) { pts.push(seg[k], seg[k + 1]); }
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const veins = new THREE.LineSegments(g, vein);
    veins.position.set(s0.center.x, 0, s0.center.z + 0.15);
    G.add(veins);
    const veinsBack = veins.clone();
    veinsBack.position.z = s0.center.z - 0.15;
    G.add(veinsBack);
  }

  // A soft amber wash on the paving in front of it does the work a real
  // light fitting would, for free.
  {
    const s = surfaces.onyx;
    const wash = new THREE.Mesh(
      new THREE.PlaneGeometry(s.len + 1.5, 3.0),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b, transparent: true, opacity: 0.07, depthWrite: false,
      })
    );
    wash.rotation.x = -Math.PI / 2;
    wash.position.set(s.center.x, 0.008, s.center.z + 1.7);
    G.add(wash);
  }

  // ── Water ───────────────────────────────────────────────
  for (const pool of PLAN.pools) {
    const w = pool.x1 - pool.x0, d = pool.z1 - pool.z0;
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MATS.water);
    surf.rotation.x = -Math.PI / 2;
    surf.position.set((pool.x0 + pool.x1) / 2, 0.02, (pool.z0 + pool.z1) / 2);
    G.add(surf);
    const rim = edges(w, 0.06, d);
    rim.position.set((pool.x0 + pool.x1) / 2, 0.03, (pool.z0 + pool.z1) / 2);
    G.add(rim);
    // Water is not walkable.
    colliders.push({ minX: pool.x0, maxX: pool.x1, minZ: pool.z0, maxZ: pool.z1 });
  }

  // Step down off the podium is a fall, so fence the perimeter.
  const halfW = p.w / 2, halfD = p.d / 2, T = 1.0;
  colliders.push({ minX: -halfW - T, maxX: -halfW, minZ: -halfD, maxZ: halfD });
  colliders.push({ minX: halfW, maxX: halfW + T, minZ: -halfD, maxZ: halfD });
  colliders.push({ minX: -halfW, maxX: halfW, minZ: -halfD - T, maxZ: -halfD });
  colliders.push({ minX: -halfW, maxX: halfW, minZ: halfD, maxZ: halfD + T });

  return { group: G, colliders, surfaces, materials: MATS, plan: PLAN };
}
