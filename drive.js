/**
 * THE TRUCK — a Cybertruck under Villa Savoye, and you can take it.
 *
 * Corbusier drew the ground floor of Savoye around the turning circle
 * of a car; the estate keeps the argument and updates the car. The
 * Cybertruck is the one production vehicle already drawn in this
 * site's language — flat stainless planes, zero radii, a single
 * roofline crease — so it needs no styling, only its own geometry.
 *
 * You get in and you are IN IT. The camera takes the driver's seat on the
 * left, at eye height, behind the wheel, with the dashboard in the bottom
 * of the frame and the A-pillars at the edges — the same way you read a
 * photograph of a car interior. There used to be a chase camera hovering
 * behind and above, which is the view of a car you are watching, not the
 * view of a car you are driving. C is still there if you want it.
 *
 * And the truck can drive itself. Press A and the wheel turns by itself,
 * the camera leans into the corner, and a reason appears on the screen:
 * wall_ahead, dog_in_lane, short_sight, clear. Autonomy you cannot
 * interrogate is a rumour. Autonomy that tells you why it slowed down is
 * a machine you can argue with.
 *
 * The detection overlay (V) draws what the truck's cameras think they are
 * looking at — boxes, names, percentages — because the whole point of the
 * vehicle is the computer behind your eyes. See vision.js for why the
 * vocabulary is closed, and what happens to the things it cannot name.
 */

import { STYLES, decide, steerToward, advanceGoal } from './autopilot.js';
import { perceive, unnamedInView, conditionFor } from './vision.js';

const LEN = 5.2, WID = 2.0, WHEELBASE = 3.4;
const VMAX = 16, VMIN = -6;         // m/s — brisk across a 100m plain
const ACCEL = 9, BRAKE = 14, DRAG = 1.6;
const STEER_MAX = 0.55, STEER_EASE = 6;
const BOUND_R = 190;   // inside the innermost mountain ring (world.js, r=205)

// The driver's seat, in the truck's own coordinates. Local −Z is forward,
// local +X is the truck's right, so the driver sits at negative X.
const EYE = { x: -0.45, y: 1.28, z: -0.32 };

/** How often the cameras look. Every tenth of a second, like the source. */
const PERCEIVE_EVERY = 0.1;

/**
 * The autonomous tour. Waypoints the truck drives to on its own, in the
 * order they make a sensible lap of the estate. Each one is a place you
 * can see something worth seeing — and, deliberately, each one is a place
 * where the detector will have nothing to say about the building.
 */
export const TOUR = [
  { x: -40, z: 48, name: 'VILLA SAVOYE' },
  { x: -14, z: 22, name: 'THE PAVILION' },
  { x: 14, z: -14, name: 'THE PAVILION' },
  { x: 12, z: -50, name: 'FARNSWORTH' },
  { x: 48, z: -26, name: 'FALLINGWATER' },
  { x: 40, z: 48, name: 'GLASS HOUSE' },
];

/** The wedge, as a side profile extruded to width. Local −Z is forward. */
export const PROFILE = [
  [-2.6, 0.45],   // front bumper, low
  [-2.6, 0.92],   // front face top / light bar
  [-0.25, 1.82],  // THE crease — apex over the windshield
  [2.6, 1.18],    // tail top
  [2.6, 0.45],    // tail bottom
];

/**
 * The cabin. Built separately from the body because it is seen from the
 * INSIDE, and a solid prism seen from within is a solid prism: you would
 * be looking at the back of the front face and calling it a dashboard.
 *
 * So the body is hidden in seat view and this is what you actually see:
 * the dash under your hands, the wheel in front of them, the pillars
 * holding the glass, and the header across the top.
 */
function buildCabin(THREE, dark) {
  const G = new THREE.Group();
  // The cabin is read against the sky through the glass, so it cannot be
  // black: black trim on a pale sky is two shapeless blobs in the corners
  // of the windscreen, not a cockpit. Dark grey, with the structure that
  // frames the view a step lighter still.
  const trim = new THREE.MeshBasicMaterial({
    color: dark ? 0x1b2128 : 0x232a31, side: THREE.DoubleSide,
  });
  const trim2 = new THREE.MeshBasicMaterial({
    color: dark ? 0x333c46 : 0x3d4650, side: THREE.DoubleSide,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: dark ? 0x7fd4ff : 0x9ce0ff, side: THREE.DoubleSide,
  });
  // The wheel is the one thing the driver looks at. It needs an edge
  // against the dash behind it or it is a dark ellipse.
  const rimMat = new THREE.MeshBasicMaterial({
    color: dark ? 0x59636f : 0x6b7682, side: THREE.DoubleSide,
  });

  // Dashboard: a slab across the cabin, below the sightline.
  const dash = new THREE.Mesh(new THREE.BoxGeometry(WID - 0.16, 0.26, 0.62), trim);
  dash.position.set(0, 1.00, -1.16);
  G.add(dash);

  // The brow above it — the lip that shades the instrument cluster.
  const brow = new THREE.Mesh(new THREE.BoxGeometry(WID - 0.20, 0.07, 0.34), trim2);
  brow.position.set(0, 1.14, -1.30);
  G.add(brow);

  // Centre console, between the seats, running back under the screen.
  const console_ = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.30, 0.9), trim);
  console_.position.set(0.12, 0.86, -0.55);
  G.add(console_);

  // The screen. Not a picture of a screen — a lit panel, the way a real
  // one is lit in a dark cabin. It sits on the dash in the driver's
  // sightline, not out at the far edge of the frame.
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.17), glow);
  screen.position.set(0.02, 1.16, -1.26);
  screen.rotation.x = -0.18;
  G.add(screen);

  // Steering wheel: a ring, tilted back like a real one, and it turns.
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.026, 8, 22), rimMat);
  wheel.add(rim);
  for (const a of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.02), rimMat);
    spoke.position.set(Math.sin(a) * 0.085, Math.cos(a) * 0.085, 0);
    spoke.rotation.z = -a;
    wheel.add(spoke);
  }
  wheel.position.set(EYE.x, 1.08, -0.82);
  wheel.rotation.x = 1.18;      // raked back toward the driver
  G.add(wheel);

  // A-pillars: the raked members either side of the glass, following the
  // windshield line from the beltline up to the header.
  const rake = Math.atan2(0.9, 2.35);
  const pillarLen = 2.56;
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.10, pillarLen, 0.10), trim2);
    p.position.set(s * (WID / 2 - 0.17), 1.36, -1.40);
    p.rotation.x = Math.PI / 2 - rake;
    G.add(p);
  }

  // Header across the top of the glass, and the beltline across the bottom.
  const header = new THREE.Mesh(new THREE.BoxGeometry(WID - 0.24, 0.14, 0.12), trim2);
  header.position.set(0, 1.74, -0.42);
  G.add(header);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(WID - 0.20, 0.10, 0.12), trim2);
  belt.position.set(0, 0.94, -2.34);
  G.add(belt);

  // Door cards either side, so the cabin has walls and you are IN it.
  // They sit below the eye line: a card that reaches up past the
  // driver's sightline is a black slab in the corner of the windscreen,
  // not a door.
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 2.0), trim);
    d.position.set(s * (WID / 2 - 0.08), 0.92, -0.70);
    G.add(d);
  }

  return { group: G, wheel, screen, materials: { trim, trim2, glow } };
}

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
  // Everything that belongs to the OUTSIDE of the truck lives in one
  // group. From the driver's seat you must not see any of it: the crease
  // hairlines drawn across the sky and the front wheels standing in the
  // bottom corners of the windscreen are the inside of a solid object,
  // not a cockpit.
  const shell = new THREE.Group();
  G.add(shell);
  shell.add(body);

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
  shell.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), line));

  // Window band: darker planes on the two upper slopes, inset.
  const winF = new THREE.Mesh(new THREE.PlaneGeometry(WID - 0.24, 2.1), glassMat);
  // Front slope from (-2.6,0.92) to (-0.25,1.82): angle & midpoint.
  {
    const dzF = -0.25 - (-2.6), dyF = 1.82 - 0.92;
    winF.position.set(0, (0.92 + 1.82) / 2 + 0.012, (-2.6 + -0.25) / 2);
    winF.rotation.x = Math.PI / 2 - Math.atan2(dyF, dzF);
    winF.scale.y = Math.hypot(dzF, dyF) / 2.1;
    shell.add(winF);
  }
  // Light bar: one thin pale strip across the nose.
  const lightBar = new THREE.Mesh(
    new THREE.PlaneGeometry(WID - 0.1, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xdfe8ee }));
  lightBar.position.set(0, 0.9, -2.601);
  shell.add(lightBar);

  // Wheels: true circles are the one rounding allowed.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 18);
  const wheels = [];
  for (const [x, z] of [[-half + 0.12, -WHEELBASE / 2], [half - 0.12, -WHEELBASE / 2],
                        [-half + 0.12, WHEELBASE / 2], [half - 0.12, WHEELBASE / 2]]) {
    const w = new THREE.Mesh(wheelGeo, dark2);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    shell.add(w);
    wheels.push(w);
  }

  // The cabin is a child of the truck, so it moves with it for free.
  const cabin = buildCabin(THREE, dark);
  cabin.group.visible = false;      // shown only when you are inside
  G.add(cabin.group);
  // And it is reachable FROM the group, because that is how the visibility
  // switch finds it. Without this line `group.cabin` was undefined and
  // the switch threw before it could ever show the cockpit.
  G.cabin = cabin;
  G.shell = shell;

  return { group: G, materials: { steel, glass: glassMat, line }, body: shell, shell, winF, wheels, cabin };
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

    // Seat view by default: you get in the truck, you are in the truck.
    this.mode = 'seat';
    this.autopilot = false;
    this.cv = false;

    // The perception state the detector and the decision engine share.
    this.ego = {
      x: spawn.x, z: spawn.z, v: 0, heading: spawn.yaw || 0,
      style: STYLES.normal,
      tracks: new Map(),
      time: 0,
      sensorRange: STYLES.normal.range,
      sensorQuality: STYLES.normal.quality,
      blind: false,
    };
    this.objects = [];       // what the cameras can see
    this.condition = 'day';
    this.decision = null;    // what the autopilot is doing and why
    this.tourIndex = 0;
    this.look = { yaw: 0, pitch: 0 };   // free look from the driver's seat
    this._sinceLook = 0;
    this._rng = null;        // seeded, set by the caller
  }

  /** The seat view and the chase view. */
  toggleSeat() {
    this.mode = this.mode === 'seat' ? 'chase' : 'seat';
    this._applyVisibility();
    return this.mode;
  }

  toggleAutopilot() {
    this.autopilot = !this.autopilot;
    if (this.autopilot) {
      // Start the tour from whichever waypoint is nearest, so the truck
      // does not set off across the estate to reach a point it is standing on.
      let best = 0, bestD = Infinity;
      TOUR.forEach((g, i) => {
        const d = Math.hypot(g.x - this.pos.x, g.z - this.pos.z);
        if (d < bestD) { bestD = d; best = i; }
      });
      this.tourIndex = best;
    } else {
      // Taking the wheel back ends the reasoning immediately — a stale
      // "AUTO · wall_ahead" left on the screen after you have taken over
      // would be the machine talking about a decision it is no longer making.
      this.decision = null;
    }
    return this.autopilot;
  }

  toggleCV() {
    this.cv = !this.cv;
    return this.cv;
  }

  /** What the cameras can see. Replaced wholesale when the world changes. */
  setObjects(list) { this.objects = list || []; }

  /** Free look from the driver's seat, in camera radians. */
  addLook(dyaw, dpitch) {
    if (this.mode !== 'seat') return;
    this.look.yaw = Math.max(-2.4, Math.min(2.4, this.look.yaw + dyaw));
    this.look.pitch = Math.max(-0.9, Math.min(0.7, this.look.pitch + dpitch));
  }

  /** Hide the shell, show the cabin, when you are sitting in it. */
  _applyVisibility() {
    const b = this.group;
    if (!b) return;
    // Only while you are IN it. Parked on the apron, the truck is a truck
    // you can walk up to and look at.
    const inside = this.active && this.mode === 'seat';
    // The shell is everything on the OUTSIDE of the truck — body, crease
    // hairlines, glass, wheels, light bar. The cabin is the inside. From
    // the driver's seat you see the cabin and the world; the shell is
    // behind you and around you, and drawing it would put the truck's
    // own wireframe across the sky.
    if (b.shell) b.shell.visible = !inside;
    if (b.winF) b.winF.visible = !inside;
    if (b.cabin?.group) b.cabin.group.visible = inside;
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

  /**
   * How far the solid ground is, straight ahead. This is the wall the
   * autopilot sees, and it is the same wall the truck hits.
   */
  _probeAhead(maxDist) {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    for (let d = 1.2; d <= maxDist; d += 1.2) {
      if (this._blocked(this.pos.x - s * d, this.pos.z - c * d)) return d;
    }
    return Infinity;
  }

  /** One look through the cameras. */
  _perceive() {
    const ego = this.ego;
    ego.time += PERCEIVE_EVERY;
    const rng = this._rng;
    if (!rng) return;
    perceive(ego, this.objects, this.condition, rng);
  }

  update(dt) {
    if (!this.active) return;
    dt = Math.min(dt, 0.05);
    const k = this.keys || new Set();

    // The ego state tracks the truck every frame, before anything reads it.
    // Perception only runs ten times a second, but the decision engine
    // needs the truck's TRUE position to steer from — a tenth of a second
    // of lag in the steering is a tenth of a second of driving into things.
    this.ego.x = this.pos.x;
    this.ego.z = this.pos.z;
    this.ego.heading = this.yaw;
    this.ego.v = this.v;

    let thr = 0, st = 0;
    if (k.has('w') || k.has('arrowup')) thr += 1;
    if (k.has('s') || k.has('arrowdown')) thr -= 1;
    if (k.has('a') || k.has('arrowleft')) st -= 1;
    if (k.has('d') || k.has('arrowright')) st += 1;
    if (this.stick) { thr += -this.stick.dy; st += this.stick.dx; }
    thr = Math.max(-1, Math.min(1, thr));
    st = Math.max(-1, Math.min(1, st));

    if (this.autopilot) {
      // The truck drives itself. Its hands leave the wheel: the steering
      // comes from the tour, the throttle from the decision engine, and
      // the reason is on the screen.
      const goal = TOUR[this.tourIndex % TOUR.length];
      st = steerToward(this.ego, goal, STEER_MAX) / STEER_MAX;

      const decision = decide(this.ego, {
        condition: this.condition,
        probeAhead: (max) => this._probeAhead(max),
      });
      this.decision = decision;
      // The IDM's acceleration is a real acceleration, in m/s².
      this.v = Math.max(VMIN, Math.min(VMAX, this.v + decision.acc * dt));

      this.tourIndex = advanceGoal(TOUR, { x: this.pos.x, z: this.pos.z }, this.tourIndex, 8);
    } else {
      this.decision = null;
      // Throttle / brake / drag.
      if (thr > 0) this.v += ACCEL * thr * dt;
      else if (thr < 0) this.v += (this.v > 0 ? -BRAKE : ACCEL * thr) * dt;
      else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), DRAG * dt * 4);
      this.v = Math.max(VMIN, Math.min(VMAX, this.v));
    }

    // Steering eases toward the input; yaw follows the bicycle model.
    this.steer += (st * STEER_MAX - this.steer) * (1 - Math.exp(-STEER_EASE * dt));
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
      if (this.autopilot) this.decision = { ...(this.decision || {}), action: 'braking_hard', reason: 'wall_ahead' };
    }

    // Pose the truck; the wheel turns with the steering.
    if (this.group) {
      this.group.position.set(this.pos.x, 0, this.pos.z);
      this.group.rotation.y = this.yaw;
      const w = this.group.cabin?.wheel;
      if (w) w.rotation.z = -this.steer * 3.4;
    }

    // The cameras look, every tenth of a second.
    this._sinceLook += dt;
    if (this._sinceLook >= PERCEIVE_EVERY) {
      this._sinceLook = 0;
      this._perceive();
    }

    const cam = this.camera;
    if (this.mode === 'seat') {
      // The driver's seat. Rigidly attached: the camera IS the truck, so
      // it moves with it exactly and without easing — a lag here would
      // feel like the whole car was made of rubber.
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      cam.position.x = this.pos.x + EYE.x * c + EYE.z * s;
      cam.position.y = EYE.y;
      cam.position.z = this.pos.z - EYE.x * s + EYE.z * c;
      // Free look eases back to centre when you let go.
      this.look.yaw *= Math.exp(-2.2 * dt);
      this.look.pitch *= Math.exp(-2.2 * dt);
      return {
        yaw: this.yaw + this.look.yaw,
        pitch: this.look.pitch,
      };
    }

    // Chase view: back and above, easing into place.
    const back = 7.6, up = 3.3;
    const cx = this.pos.x + Math.sin(this.yaw) * back;
    const cz = this.pos.z + Math.cos(this.yaw) * back;
    const ease = 1 - Math.exp(-6 * dt);
    cam.position.x += (cx - cam.position.x) * ease;
    cam.position.y += (up - cam.position.y) * ease;
    cam.position.z += (cz - cam.position.z) * ease;

    // Return the chase view; the app's single camera writer applies it.
    // Drive owns the desired pose while active, never camera.rotation.
    const dx = this.pos.x - cam.position.x;
    const dy = 1.25 - cam.position.y;
    const dz = this.pos.z - cam.position.z;
    return {
      yaw: Math.atan2(-dx, -dz),
      pitch: Math.atan2(dy, Math.hypot(dx, dz)),
    };
  }

  /** The things the cameras can see that have no category for them. */
  unnamed() {
    return unnamedInView(this.ego, this.objects, this.condition);
  }

  /** Where a walker should stand after stepping out — beside the door. */
  exitSpot() {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    return { x: this.pos.x + c * (WID / 2 + 1.1), z: this.pos.z - s * (WID / 2 + 1.1) };
  }
}

export const TRUCK = { LEN, WID, WHEELBASE, VMAX, EYE };
