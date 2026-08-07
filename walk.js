/**
 * WALKING — first-person movement through the Pavilion.
 *
 * Counter-Strike controls, because everyone already knows them: WASD to
 * move, mouse to look, shift to walk slowly, pointer lock so the cursor
 * does not run off the screen. On a phone: a thumb stick on the left,
 * drag anywhere on the right to look.
 *
 * Three things make movement feel right rather than technically correct:
 *
 *   - Acceleration and friction, not on/off velocity. Instant start and
 *     stop reads as a camera being teleported, not a person walking.
 *   - Collision resolved per-axis. Slide along a wall instead of
 *     stopping dead on it — the single biggest difference between
 *     movement that feels good and movement that feels broken.
 *   - Head bob, tiny. 3cm at 1.9Hz. You do not notice it; you notice its
 *     absence, which reads as floating.
 *
 * Floor height: optional `floors` patches (each exposes heightAt(x,z)).
 * When several surfaces share an XZ — Savoye's stacked ramp flights —
 * the walker stays on the one nearest its current floorY within a short
 * step. That is how you climb without teleporting to the roof.
 *
 * Colliders may carry minY/maxY so a first-floor wall does not block
 * the grass under the pilotis.
 *
 * The controller owns position only. Look direction stays with the
 * existing camera code so gyro, drag, the sky and the dolly keep working
 * exactly as they did.
 */

const EYE = 1.65;          // eye height, metres
const RADIUS = 0.34;       // how fat you are, for collision
const ACCEL = 28;          // m/s² — was 42; hard launches read as teleport
const FRICTION = 14;       // stop sooner so releases feel planted
const SPEED = 3.1;         // m/s — indoor walk, not a jog across the podium
// Crossing 120m of open plain at an indoor pace is forty seconds of
// holding a button, which turns a place you explore into a chore. Keep
// going and you break into a jog, the way anyone does when the ground
// opens up. It engages only after 1.2s of continuous movement, so it
// never interferes with placing yourself inside a room — and shift
// still gives you the slow, precise walk with no acceleration at all.
const SPEED_RUN = 6.4;
const RUN_AFTER = 1.2;
const SPEED_SLOW = 1.4;
const BOB_HZ = 1.7;
const BOB_M = 0.025;
// Largest vertical step accepted when picking among overlapping floors
// (ramp flights stacked in plan). Gentler than a stair riser; steeper
// than one frame of ramp climb at walk speed.
const FLOOR_STEP = 0.55;

export class Walk {
  constructor(camera, colliders, spawn, floors = []) {
    this.camera = camera;
    this.colliders = colliders || [];
    this.floors = floors || [];
    this.pos = { x: spawn.x, z: spawn.z };
    this.floorY = spawn.floorY || 0;
    this._floorPatch = null; // sticky surface — see floorAt()
    this.vel = { x: 0, z: 0 };
    this.keys = new Set();
    this.stick = null;        // {dx, dy} from the touch thumbstick
    this.enabled = false;
    this.bobT = 0;
    this.moved = false;       // has the user ever actually walked?
    this.heldFor = 0;         // seconds of continuous movement, for the jog
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.keys.clear();
  }

  _typing(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  _onKeyDown(e) {
    if (this._typing(e)) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e',
         'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
         'pageup', 'pagedown', 'shift'].includes(k)) {
      // Arrow keys scroll the page underneath; WASD must not be swallowed
      // by anything else either once you are walking.
      if (k !== 'shift') e.preventDefault();
      this.keys.add(k);
    }
  }

  _onKeyUp(e) {
    this.keys.delete(e.key.toLowerCase());
  }

  /**
   * Floor under (x,z). Stacked surfaces that share a footprint (Savoye's
   * ramp flights) cannot be resolved by "highest" or "nearest" alone —
   * both pick the wrong flight at a switchback. Stick to the current
   * patch while it stays continuous; if that patch starts descending and
   * another patch at the same height is level or rising, take the switch
   * (the landing turn). Otherwise a real descent stays on the patch.
   */
  floorAt(x, z) {
    if (!this.floors.length) return 0;
    const cur = this.floorY;

    const sample = (f) => {
      const fy = f.heightAt(x, z);
      return fy == null || Number.isNaN(fy) ? null : fy;
    };

    if (this._floorPatch) {
      const fy = sample(this._floorPatch);
      if (fy != null && Math.abs(fy - cur) <= FLOOR_STEP) {
        // Rising or flat: stay. A real frame of ramp descent is ~8mm at
        // walk speed — anything lower than that is a drop, and at a
        // switchback another flight will still be at `cur`.
        if (fy >= cur - 1e-4) return fy;
        for (const f of this.floors) {
          if (f === this._floorPatch) continue;
          const ay = sample(f);
          if (ay != null && ay >= cur - 1e-4 && Math.abs(ay - cur) <= FLOOR_STEP) {
            this._floorPatch = f;
            return ay;
          }
        }
        return fy;
      }
    }

    let best = null;
    let bestFy = null;
    let bestScore = Infinity;
    let below = 0;
    for (const f of this.floors) {
      const fy = sample(f);
      if (fy == null) continue;
      if (fy <= cur + 0.05 && fy > below) below = fy;
      const d = Math.abs(fy - cur);
      if (d > FLOOR_STEP) continue;
      // Near a switchback two flights sit at the same height. Prefer the
      // one that is not already below you — that is the flight that
      // continues the promenade up rather than sending you back down.
      const score = d + (fy < cur - 1e-3 ? 0.25 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = f;
        bestFy = fy;
      }
    }
    if (best) {
      this._floorPatch = best;
      return bestFy;
    }
    this._floorPatch = null;
    return below;
  }

  /** Axis-aligned box test with the player treated as a circle-ish box. */
  _blocked(x, z) {
    const y = this.floorY;
    for (const c of this.colliders) {
      if (c.minY != null && y < c.minY - 0.05) continue;
      if (c.maxY != null && y > c.maxY + 0.05) continue;
      if (x > c.minX - RADIUS && x < c.maxX + RADIUS &&
          z > c.minZ - RADIUS && z < c.maxZ + RADIUS) return true;
    }
    return false;
  }

  /**
   * @param dt      seconds since last frame
   * @param yaw     camera yaw in radians — movement is relative to gaze
   */
  update(dt, yaw) {
    if (!this.enabled) return;
    dt = Math.min(dt, 0.05);   // a backgrounded tab must not teleport you

    const k = this.keys;
    let fwd = 0, str = 0;
    if (k.has('w') || k.has('arrowup')) fwd += 1;
    if (k.has('s') || k.has('arrowdown')) fwd -= 1;
    // A/D strafe. Left/Right arrows and Q/E turn you — see turnInput().
    // Q/E used to strafe, which left keyboard-only users with no way to
    // look around except the arrows (already used for turn+move).
    if (k.has('a')) str -= 1;
    if (k.has('d')) str += 1;
    if (this.stick) { fwd += -this.stick.dy; str += this.stick.dx; }

    const mag = Math.hypot(fwd, str);
    if (mag > 1) { fwd /= mag; str /= mag; }

    if (mag > 0.01) this.heldFor += dt; else this.heldFor = 0;
    const slow = k.has('shift');
    const top = slow ? SPEED_SLOW : (this.heldFor > RUN_AFTER ? SPEED_RUN : SPEED);

    // Camera yaw: -Z is forward in three.js, so forward is (-sin, -cos).
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const wishX = (-sin * fwd) + (cos * str);
    const wishZ = (-cos * fwd) - (sin * str);

    if (mag > 0.01) {
      this.vel.x += wishX * ACCEL * dt;
      this.vel.z += wishZ * ACCEL * dt;
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > top) { this.vel.x = (this.vel.x / sp) * top; this.vel.z = (this.vel.z / sp) * top; }
      this.moved = true;
    } else {
      const drop = Math.max(0, 1 - FRICTION * dt);
      this.vel.x *= drop;
      this.vel.z *= drop;
      if (Math.abs(this.vel.x) < 0.001) this.vel.x = 0;
      if (Math.abs(this.vel.z) < 0.001) this.vel.z = 0;
    }

    // Per-axis resolution — this is what lets you slide along a wall
    // instead of sticking to it.
    const nx = this.pos.x + this.vel.x * dt;
    if (!this._blocked(nx, this.pos.z)) this.pos.x = nx; else this.vel.x = 0;
    const nz = this.pos.z + this.vel.z * dt;
    if (!this._blocked(this.pos.x, nz)) this.pos.z = nz; else this.vel.z = 0;

    this.floorY = this.floorAt(this.pos.x, this.pos.z);

    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.bobT += dt * speed * BOB_HZ;
    const bob = Math.sin(this.bobT * Math.PI * 2) * BOB_M * Math.min(1, speed / SPEED);

    this.camera.position.set(this.pos.x, this.floorY + EYE + bob, this.pos.z);
  }

  /**
   * Turn intent from the keyboard, -1..1. Read by whoever owns the
   * camera yaw — this controller deliberately does not, so gyro, drag,
   * the sky and the dolly keep working exactly as they did.
   */
  turnInput() {
    let t = 0;
    if (this.keys.has('arrowleft') || this.keys.has('q')) t += 1;
    if (this.keys.has('arrowright') || this.keys.has('e')) t -= 1;
    return t;
  }

  /** Pitch intent from the keyboard, -1..1 (up positive).
   *  PageUp / PageDown only — F already means FOCUS in the room. */
  pitchInput() {
    let p = 0;
    if (this.keys.has('pageup')) p += 1;
    if (this.keys.has('pagedown')) p -= 1;
    return p;
  }

  teleport(x, z, floorY) {
    this.pos.x = x; this.pos.z = z;
    this.vel.x = 0; this.vel.z = 0;
    this._floorPatch = null;
    if (floorY != null) this.floorY = floorY;
    else this.floorY = this.floorAt(x, z);
  }
}

/**
 * The on-screen thumbstick. Phones have no WASD, and a d-pad of buttons
 * is miserable — a stick you can put your thumb anywhere on the left
 * half and drag is the only control that works one-handed.
 */
export function attachStick(walk, root = document.body) {
  const el = document.createElement('div');
  el.className = 'walk-stick';
  el.innerHTML = '<div class="walk-stick-base"><div class="walk-stick-knob"></div></div>';
  root.appendChild(el);
  const base = el.querySelector('.walk-stick-base');
  const knob = el.querySelector('.walk-stick-knob');
  const R = 46;
  let id = null;

  const set = (dx, dy) => {
    knob.style.transform = `translate(${dx * R}px, ${dy * R}px)`;
    walk.stick = (dx || dy) ? { dx, dy } : null;
  };

  base.addEventListener('pointerdown', (e) => {
    id = e.pointerId; base.setPointerCapture(id); e.preventDefault();
    // Touching the stick is the request to move — no mode to discover.
    if (!walk.enabled) {
      walk.enabled = true;
      walk.teleport(walk.camera.position.x, walk.camera.position.z);
    }
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const r = base.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / R;
    let dy = (e.clientY - (r.top + r.height / 2)) / R;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    set(dx, dy);
  });
  const end = (e) => { if (e.pointerId === id) { id = null; set(0, 0); } };
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
  return el;
}
