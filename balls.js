/**
 * THE BALLS — pick one up, and the yard becomes a game.
 *
 * Two balls live on the estate: a football on the pitch, a basketball on
 * the court. Walk into one and you are carrying it. Look where you want
 * it to go and shoot: it leaves your hands on a real parabola, bounces,
 * rolls, and slows down. Put it through the goal or the hoop and the
 * clock starts — sixty seconds of SHOOTOUT, one point a score, the ball
 * respawning further out each time, your best kept on the device.
 *
 * Three rules the physics obeys, because breaking any one of them is
 * what makes ball games in browsers feel like cursors:
 *
 *   1. GRAVITY IS REAL (9.8 m/s²) and the launch solves for it. Aim at
 *      the goal mouth from 12m and the ball arrives at the goal mouth.
 *   2. THE BALL STAYS ON ITS FIELD. A geofence bounces it off the
 *      touchline — you never spend the game walking to the horizon
 *      fetching a ball. This was the explicit ask, and it is also just
 *      how a school pitch works: there is always a fence.
 *   3. IT COMES TO REST. Restitution and rolling friction, so a ball
 *      that stops has stopped — no eternal jitter, no ball that slides
 *      away from you the moment you reach for it.
 *
 * One amber per surface: the ball you are carrying glows amber, because
 * it is the thing you are about to act with. Loose balls are pale.
 */

const G = 9.8;
const R_SOCCER = 0.22, R_BASKET = 0.24;
const REST_GROUND = 0.55;      // bounce height ratio
const REST_WALL = 0.68;        // touchline bounce
const ROLL_FRICTION = 1.9;     // m/s² while rolling
const AIR_DRAG = 0.06;
const REST_SPEED = 0.35;       // below this on the ground, it has stopped
const PICKUP_R = 1.7;
const CARRY_FWD = 0.85, CARRY_DOWN = 0.42;
export const ROUND_MS = 60_000;

/**
 * The shortest flight that still ARRIVES ON THE WAY DOWN.
 *
 * A solved parabola reaches its target at the apex when T equals
 * sqrt(2·dy/g), and only descends into it when T is longer. A basket has
 * to drop through the ring, so a short shot with a "correct" arc arrives
 * dead flat and scores nothing — which is exactly how a 5m lay-up
 * failed while a 10m jumper went in.
 */
export const descendingTime = (dy) => 1.3 * Math.sqrt(2 * Math.max(0.05, dy) / G);

/**
 * Solve the launch velocity that carries a ball from → to in T seconds,
 * WITH the air drag the step actually applies.
 *
 * Horizontal velocity decays as e^(−k·t), so the distance covered is
 * v₀·(1−e^(−kT))/k, not v₀·T. Solving the naive way undershoots by ~7%
 * at a second of flight — invisible on a tap-in, and a long-range shot
 * that lands 1.4m short of a 44cm ring every single time. Rule 1 of this
 * module is that the arc arrives; that means the solve has to know about
 * the drag.
 */
export function launchVelocity(from, to, T) {
  const k = AIR_DRAG;
  const reach = (1 - Math.exp(-k * T)) / k;   // metres per unit of v₀
  return {
    x: (to.x - from.x) / reach,
    y: (to.y - from.y) / T + 0.5 * G * T,     // vertical is undragged
    z: (to.z - from.z) / reach,
  };
}

/**
 * Flight time for a shot: far shots hang longer, but never so long the
 * ball floats. Tuned by feel at 4m (a tap-in) and 24m (a screamer).
 */
export const flightTime = (dist) => Math.max(0.42, Math.min(1.55, 0.34 + dist * 0.045));

/** Did the ball pass through the goal mouth this step? Pure, for tests. */
export function crossedGoal(prev, next, goal) {
  // Goal plane is x = goal.x, mouth spans z ± goalW/2, up to goalH.
  const side = Math.sign(goal.inward);        // which way is "in"
  const before = (prev.x - goal.x) * side;
  const after = (next.x - goal.x) * side;
  if (!(before < 0 && after >= 0)) return false;
  const t = before === after ? 0 : (0 - before) / (after - before);
  const z = prev.z + (next.z - prev.z) * t;
  const y = prev.y + (next.y - prev.y) * t;
  return Math.abs(z - goal.z) < goal.halfW && y > 0 && y < goal.height;
}

/** Did the ball drop through the ring this step? Pure, for tests. */
export function throughHoop(prev, next, hoop) {
  if (!(prev.y > hoop.y && next.y <= hoop.y)) return false;   // descending only
  const t = (prev.y - hoop.y) / (prev.y - next.y || 1);
  const x = prev.x + (next.x - prev.x) * t;
  const z = prev.z + (next.z - prev.z) * t;
  return Math.hypot(x - hoop.x, z - hoop.z) < hoop.r;
}

export class Ball {
  /**
   * @param kind 'soccer' | 'basket'
   * @param fence {x0,x1,z0,z1} the field it may never leave
   * @param home {x,z} where it starts and respawns
   */
  constructor(kind, fence, home) {
    this.kind = kind;
    this.r = kind === 'soccer' ? R_SOCCER : R_BASKET;
    this.fence = fence;
    this.home = { ...home };
    this.pos = { x: home.x, y: this.r, z: home.z };
    this.vel = { x: 0, y: 0, z: 0 };
    this.held = false;
    this.rest = true;
    this.spin = 0;
    // Seconds during which this ball cannot be picked up again. A shot
    // leaves your hands AT your hands, so without this the very next
    // frame's pickup test grabs it back and the ball never goes anywhere
    // — it just hovers in front of you looking broken.
    this.cool = 0;
  }

  reset(at) {
    const h = at || this.home;
    this.pos = { x: h.x, y: this.r, z: h.z };
    this.vel = { x: 0, y: 0, z: 0 };
    this.held = false;
    this.rest = true;
    this.cool = 0;
  }

  /**
   * Launch toward a world point, solving the arc.
   * @param opts.descend force an arrival that is falling, not flat —
   *        what a hoop needs and a goal does not care about.
   */
  shoot(from, to, opts = {}) {
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    let T = flightTime(dist);
    if (opts.descend) T = Math.max(T, descendingTime(to.y - from.y));
    this.pos = { x: from.x, y: from.y, z: from.z };
    this.vel = launchVelocity(from, to, T);
    this.held = false;
    this.rest = false;
    this.cool = 0.7;
    return { T, dist };
  }

  /**
   * One step of flight. Returns the previous position so the caller can
   * test the segment against goal planes — a ball moving 12 m/s covers
   * 20cm a frame and WILL tunnel through a plane you only sample at
   * points.
   */
  step(dt) {
    const prev = { ...this.pos };
    if (this.cool > 0) this.cool = Math.max(0, this.cool - dt);
    // Home-if-lost runs BEFORE the rest/held guard. A ball put down
    // outside its own field — carried onto the other court and dropped —
    // is at rest, so a check that lives after the guard never sees it,
    // and the ball simply stays where it does not belong. (Which then
    // has the two balls picking each other up off the same square metre
    // forever, discovered by carrying one across the estate.)
    if (!this.held && this.outOfBounds()) { this.reset(); return prev; }
    if (this.held || this.rest) return prev;

    this.vel.y -= G * dt;
    const drag = 1 - AIR_DRAG * dt;
    this.vel.x *= drag; this.vel.z *= drag;

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    // Ground.
    if (this.pos.y <= this.r) {
      this.pos.y = this.r;
      if (Math.abs(this.vel.y) > 0.6) {
        this.vel.y = -this.vel.y * REST_GROUND;
      } else {
        this.vel.y = 0;
        // Rolling friction.
        const sp = Math.hypot(this.vel.x, this.vel.z);
        if (sp > 0) {
          const drop = Math.min(sp, ROLL_FRICTION * dt);
          this.vel.x -= (this.vel.x / sp) * drop;
          this.vel.z -= (this.vel.z / sp) * drop;
        }
        if (Math.hypot(this.vel.x, this.vel.z) < REST_SPEED) {
          this.vel.x = 0; this.vel.z = 0; this.rest = true;
        }
      }
    }

    // THE GEOFENCE. The ball bounces off the touchline instead of
    // disappearing across the plain.
    const f = this.fence;
    if (this.pos.x < f.x0 + this.r) { this.pos.x = f.x0 + this.r; this.vel.x = Math.abs(this.vel.x) * REST_WALL; }
    if (this.pos.x > f.x1 - this.r) { this.pos.x = f.x1 - this.r; this.vel.x = -Math.abs(this.vel.x) * REST_WALL; }
    if (this.pos.z < f.z0 + this.r) { this.pos.z = f.z0 + this.r; this.vel.z = Math.abs(this.vel.z) * REST_WALL; }
    if (this.pos.z > f.z1 - this.r) { this.pos.z = f.z1 - this.r; this.vel.z = -Math.abs(this.vel.z) * REST_WALL; }
    if (this.outOfBounds()) this.reset();
    this.spin += Math.hypot(this.vel.x, this.vel.z) * dt * 3;
    return prev;
  }

  /** Carry position for a player at (x,z) looking along yaw. */
  carryTo(x, z, yaw, eyeY) {
    this.pos.x = x - Math.sin(yaw) * CARRY_FWD;
    this.pos.z = z - Math.cos(yaw) * CARRY_FWD;
    this.pos.y = eyeY - CARRY_DOWN;
    this.vel.x = 0; this.vel.y = 0; this.vel.z = 0;
  }

  /** Outside its own field — by any margin worth acting on. */
  outOfBounds() {
    const f = this.fence;
    return !Number.isFinite(this.pos.x) || !Number.isFinite(this.pos.z) ||
      this.pos.x < f.x0 - 1.5 || this.pos.x > f.x1 + 1.5 ||
      this.pos.z < f.z0 - 1.5 || this.pos.z > f.z1 + 1.5;
  }

  canPickUp(x, z) {
    if (this.held || this.cool > 0) return false;
    return Math.hypot(this.pos.x - x, this.pos.z - z) < PICKUP_R;
  }
}

/**
 * SHOOTOUT — the game. It does not start when you press a button; it
 * starts when you score, which means nobody ever has to be told the
 * rules. Sixty seconds, one point a score, the ball moving further out
 * each time. Your best score is the only thing that persists.
 */
export class Shootout {
  constructor(kind) {
    this.kind = kind;
    this.score = 0;
    this.streak = 0;
    this.endsAt = 0;
    this.running = false;
    this.best = this._readBest();
    this.lastResult = null;      // 'score' | 'miss' | 'best' | 'time'
  }

  _key() { return `nonarkara.shootout.${this.kind}`; }
  _readBest() {
    try { return +(localStorage.getItem(this._key()) || 0); } catch (_) { return 0; }
  }
  _writeBest() {
    try { localStorage.setItem(this._key(), String(this.best)); } catch (_) {}
  }

  /** @param now performance.now() */
  onScore(now) {
    if (!this.running) {
      this.running = true;
      this.endsAt = now + ROUND_MS;
      this.score = 0;
      this.streak = 0;
    }
    this.score += 1;
    this.streak += 1;
    this.lastResult = 'score';
    return this.score;
  }

  onMiss() {
    if (this.running) this.streak = 0;
    this.lastResult = 'miss';
  }

  /** Returns true on the frame the round ends. */
  tick(now) {
    if (!this.running) return false;
    if (now < this.endsAt) return false;
    this.running = false;
    const beat = this.score > this.best;
    if (beat) { this.best = this.score; this._writeBest(); }
    this.lastResult = beat ? 'best' : 'time';
    return true;
  }

  secondsLeft(now) {
    return this.running ? Math.max(0, Math.ceil((this.endsAt - now) / 1000)) : 0;
  }

  /**
   * Where the next ball should appear: further out with every score, and
   * angled off-axis so you are never taking the same shot twice.
   * `rand` is injectable so the test is deterministic.
   */
  respawn(field, goalX, rand = Math.random) {
    const t = Math.min(1, this.score / 8);
    const near = 5.5, far = Math.min(field.w / 2 - 1.5, 13);
    const dist = near + (far - near) * t;
    const side = Math.sign(field.cx - goalX) || 1;
    const spread = (rand() * 2 - 1) * (field.d / 2 - 1.6);
    return {
      x: goalX + side * dist,
      z: field.cz + spread,
    };
  }
}

/** Build the meshes. Returns handles the caller ticks and reads. */
export function buildBalls(THREE, scene, defs, opts = {}) {
  const dark = opts.dark !== false;
  const out = [];
  for (const d of defs) {
    const ball = new Ball(d.kind, d.fence, d.home);
    const geo = new THREE.SphereGeometry(ball.r, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: dark ? 0xd6dee6 : 0xf2f0e8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(ball.pos.x, ball.pos.y, ball.pos.z);
    scene.add(mesh);
    // Seams: a couple of hairline rings so a sphere reads as a ball and
    // its spin is visible. Basketball gets meridians, football a belt.
    const seamMat = new THREE.LineBasicMaterial({
      color: dark ? 0x39424c : 0x5a636c, transparent: true, opacity: 0.85,
    });
    const rings = new THREE.Group();
    const ringPts = (axis) => {
      const p = [];
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const c = Math.cos(a) * ball.r * 1.002, s = Math.sin(a) * ball.r * 1.002;
        p.push(axis === 'y' ? new THREE.Vector3(c, 0, s)
             : axis === 'x' ? new THREE.Vector3(0, c, s)
                            : new THREE.Vector3(c, s, 0));
      }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), seamMat);
    };
    rings.add(ringPts('y'));
    if (d.kind === 'basket') { rings.add(ringPts('x')); rings.add(ringPts('z')); }
    mesh.add(rings);

    // A shadow disc, so a ball in the air reads as being in the air.
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(ball.r * 1.1, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false,
      }));
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    // Hit volume for tap-to-pick-up (bigger than the ball, thumbs are wide).
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshBasicMaterial({ visible: false }));
    const hitGroup = new THREE.Group();
    hitGroup.add(hit);
    scene.add(hitGroup);

    out.push({ ball, mesh, shadow, hit, hitGroup, mat, game: new Shootout(d.kind), def: d });
  }
  return out;
}
