/**
 * THE TRUCK — a Cybertruck under Villa Savoye, and you can take it.
 *
 * Corbusier drew the ground floor of Savoye around the turning circle
 * of a car; the estate keeps the argument and updates the car. The
 * Cybertruck is the one production vehicle already drawn in this
 * site's language — flat stainless planes, zero radii, a single
 * roofline crease — so it needs no styling, only its own geometry.
 *
 * Walk up, press E (or tap it): the camera steps back into a chase
 * view and the plain is yours. W/S accelerate and brake, A/D steer,
 * E steps out wherever you stopped. On a phone the walk thumbstick
 * drives. A bicycle model, one soft bounce off anything solid, and a
 * hard edge at the estate boundary — arcade honesty, not simulation.
 */

const LEN = 5.2, WID = 2.0, WHEELBASE = 3.4;
const VMAX = 16, VMIN = -6;         // m/s — brisk across a 100m plain
const ACCEL = 9, BRAKE = 14, DRAG = 1.6;
const STEER_MAX = 0.55, STEER_EASE = 6;
const BOUND_R = 220;

/** The wedge, as a side profile extruded to width. Local −Z is forward. */
export const PROFILE = [
  [-2.6, 0.45],   // front bumper, low
  [-2.6, 0.92],   // front face top / light bar
  [-0.25, 1.82],  // THE crease — apex over the windshield
  [2.6, 1.18],    // tail top
  [2.6, 0.45],    // tail bottom
];

export function buildCybertruck(THREE, opts = {}) {
  const dark = opts.dark !== false;
  const G = new THREE.Group();

  const steel = new THREE.MeshBasicMaterial({
    color: dark ? 0x9aa6b0 : 0xb9c2ca, side: THREE.DoubleSide,
  });
  const glassMat = new THREE.MeshBasicMaterial({
    color: dark ? 0x10161c : 0x232c34, side: THREE.DoubleSide,
  });
  const dark2 = new THREE.MeshBasicMaterial({
    color: dark ? 0x14171a : 0x2a2e33, side: THREE.DoubleSide,
  });
  const line = new THREE.LineBasicMaterial({
    color: dark ? 0x39424c : 0x5a636c, transparent: true, opacity: 0.9,
  });

  // Body: the profile as a prism WITH TUMBLEHOME — the sides lean in
  // as they rise, which is what makes the truck read as a cut gem from
  // every angle instead of a slab from behind.
  const half = WID / 2;
  const inset = (y) => ((y - 0.45) / (1.82 - 0.45)) * 0.42;
  const verts = [];
  const idx = [];
  // Side vertices: left then right, profile order, narrowing with height.
  for (const s of [-1, 1]) {
    for (const [z, y] of PROFILE) verts.push(s * (half - inset(y)), y, z);
  }
  const n = PROFILE.length;
  // Side faces (fans) — left reversed so both face outward.
  for (let i = 1; i < n - 1; i++) {
    idx.push(0, i + 1, i);              // left
    idx.push(n, n + i, n + i + 1);      // right
  }
  // The skin between the two sides, one quad per profile edge + floor.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(i, j, n + j, i, n + j, n + i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  const body = new THREE.Mesh(geo, steel);
  G.add(body);

  // Crease hairlines: the profile drawn on both sides + across the apex.
  const lp = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < n - 1; i++) {
      const [z0, y0] = PROFILE[i], [z1, y1] = PROFILE[i + 1];
      lp.push(new THREE.Vector3(s * (half - inset(y0)), y0, z0),
              new THREE.Vector3(s * (half - inset(y1)), y1, z1));
    }
  }
  for (const [z, y] of PROFILE) {
    const hx = half - inset(y);
    lp.push(new THREE.Vector3(-hx, y, z), new THREE.Vector3(hx, y, z));
  }
  G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), line));

  // Window band: darker planes on the two upper slopes, inset.
  const winF = new THREE.Mesh(new THREE.PlaneGeometry(WID - 0.24, 2.1), glassMat);
  // Front slope from (-2.6,0.92) to (-0.25,1.82): angle & midpoint.
  {
    const dzF = -0.25 - (-2.6), dyF = 1.82 - 0.92;
    winF.position.set(0, (0.92 + 1.82) / 2 + 0.012, (-2.6 + -0.25) / 2);
    winF.rotation.x = Math.PI / 2 - Math.atan2(dyF, dzF);
    winF.scale.y = Math.hypot(dzF, dyF) / 2.1;
    G.add(winF);
  }
  // Light bar: one thin pale strip across the nose.
  const lightBar = new THREE.Mesh(
    new THREE.PlaneGeometry(WID - 0.1, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xdfe8ee }));
  lightBar.position.set(0, 0.9, -2.601);
  G.add(lightBar);

  // Wheels: true circles are the one rounding allowed.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 18);
  for (const [x, z] of [[-half + 0.12, -WHEELBASE / 2], [half - 0.12, -WHEELBASE / 2],
                        [-half + 0.12, WHEELBASE / 2], [half - 0.12, WHEELBASE / 2]]) {
    const w = new THREE.Mesh(wheelGeo, dark2);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    G.add(w);
  }

  return { group: G, materials: { steel, glass: glassMat, line } };
}

export class Drive {
  /**
   * @param camera  the shared camera (owned while active)
   * @param colliders same AABB list the walker uses
   * @param spawn  {x,z,yaw} parked pose
   */
  constructor(camera, colliders, spawn) {
    this.camera = camera;
    this.colliders = colliders || [];
    this.pos = { x: spawn.x, z: spawn.z };
    this.yaw = spawn.yaw || 0;
    this.v = 0;
    this.steer = 0;
    this.active = false;
    this.group = null;      // set by the caller after buildCybertruck
    this.keys = null;       // shared key set (the walker's)
    this.stick = null;      // read each frame from the walker
  }

  /** Solid test for a point with the truck's radius. */
  _blocked(x, z) {
    const R = 0.95;
    for (const b of this.colliders) {
      if (b.skipForTruck) continue;
      // Height-scoped boxes below bumper or above roof don't block.
      if (b.minY != null && b.minY > 1.9) continue;
      if (b.maxY != null && b.maxY < 0.3) continue;
      if (x > b.minX - R && x < b.maxX + R && z > b.minZ - R && z < b.maxZ + R) return true;
    }
    return false;
  }

  /** Three probe points along the truck's length. */
  _hits(x, z, yaw) {
    const s = Math.sin(yaw), c = Math.cos(yaw);
    for (const off of [-LEN / 2 + 0.8, 0, LEN / 2 - 0.8]) {
      if (this._blocked(x - s * off, z - c * off)) return true;
    }
    return false;
  }

  update(dt) {
    if (!this.active) return;
    dt = Math.min(dt, 0.05);
    const k = this.keys || new Set();
    let thr = 0, st = 0;
    if (k.has('w') || k.has('arrowup')) thr += 1;
    if (k.has('s') || k.has('arrowdown')) thr -= 1;
    if (k.has('a') || k.has('arrowleft')) st -= 1;
    if (k.has('d') || k.has('arrowright')) st += 1;
    if (this.stick) { thr += -this.stick.dy; st += this.stick.dx; }
    thr = Math.max(-1, Math.min(1, thr));
    st = Math.max(-1, Math.min(1, st));

    // Throttle / brake / drag.
    if (thr > 0) this.v += ACCEL * thr * dt;
    else if (thr < 0) this.v += (this.v > 0 ? -BRAKE : ACCEL * thr) * dt;
    else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), DRAG * dt * 4);
    this.v = Math.max(VMIN, Math.min(VMAX, this.v));

    // Steering eases toward the input; yaw follows the bicycle model.
    this.steer += (st * STEER_MAX - this.steer) * Math.min(1, STEER_EASE * dt);
    if (Math.abs(this.v) > 0.15) {
      this.yaw -= (this.v / WHEELBASE) * Math.tan(this.steer) * dt;
    }

    // Advance; one soft bounce off anything solid.
    const nx = this.pos.x - Math.sin(this.yaw) * this.v * dt;
    const nz = this.pos.z - Math.cos(this.yaw) * this.v * dt;
    if (!this._hits(nx, nz, this.yaw) && Math.hypot(nx, nz) < BOUND_R) {
      this.pos.x = nx; this.pos.z = nz;
    } else {
      this.v *= -0.25;
    }

    // Pose the truck; chase the camera.
    if (this.group) {
      this.group.position.set(this.pos.x, 0, this.pos.z);
      this.group.rotation.y = this.yaw;
    }
    const back = 7.6, up = 3.3;
    const cx = this.pos.x + Math.sin(this.yaw) * back;
    const cz = this.pos.z + Math.cos(this.yaw) * back;
    const cam = this.camera;
    const ease = 1 - Math.exp(-6 * dt);
    cam.position.x += (cx - cam.position.x) * ease;
    cam.position.y += (up - cam.position.y) * ease;
    cam.position.z += (cz - cam.position.z) * ease;
    cam.lookAt(this.pos.x, 1.25, this.pos.z);
  }

  /** Where a walker should stand after stepping out — beside the door. */
  exitSpot() {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    return { x: this.pos.x + c * (WID / 2 + 1.1), z: this.pos.z - s * (WID / 2 + 1.1) };
  }
}

export const TRUCK = { LEN, WID, WHEELBASE, VMAX };
