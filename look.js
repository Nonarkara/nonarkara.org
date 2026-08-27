/**
 * LOOK — one pair of angles, one owner. The Doom model.
 *
 * Every FPS since 1993 works the same way: the player owns a yaw and a
 * pitch, inputs ADD to them, and the camera is set from them directly —
 * same frame, no easing, no negotiation. The view never lags the hand,
 * and nothing else is allowed to write to it.
 *
 * What this replaces was the opposite: four systems that each SET the
 * camera. A mouse-parallax handler wrote the look direction on every
 * mouse move (so any turn snapped back the moment the mouse twitched);
 * an easing lerp trailed a third of a second behind every input (the
 * "swimming"); the sky and ground were modes that hijacked the camera
 * to a fixed pitch; and the gyro fought all three. Individually tuned,
 * collectively unusable — which is what "not smooth and impossible" was.
 *
 * Rules, in priority order:
 *   1. The hand wins. addDelta applies 1:1 immediately and cancels any
 *      programmatic aim in flight.
 *   2. Aims (LOOK UP, dolly-to-object, travel) ease through the same
 *      state, so there is never a second camera authority.
 *   3. The gyro is an additive OFFSET on top, never a writer. On a
 *      phone that offset is a 1:1 AR window (Pokémon GO): hold it
 *      upright to see the room, tilt up to see the sky, turn to turn.
 *      The finger still owns the base frame.
 */

const PITCH_MAX = 1.55;                 // ±89° — never past vertical

export const clampPitch = (p) => Math.max(-PITCH_MAX, Math.min(PITCH_MAX, p));
export const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Framerate-independent easing shared by visual camera transitions. */
export const dampingFactor = (rate, dt) =>
  1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));

export const damp = (current, target, rate, dt) =>
  current + (target - current) * dampingFactor(rate, dt);

export class Look {
  constructor(yaw = 0, pitch = 0) {
    this.yaw = yaw;
    this.pitch = pitch;
    this.gyroYaw = 0;                   // additive device offsets
    this.gyroPitch = 0;
    this.turnRate = 0;                  // rad/s, from arrows / nav pad
    this.aim = null;                    // {yaw, pitch, k} — programmatic ease
  }

  /** 1:1 input: pointer lock, drag, touch. Cancels any aim — rule 1. */
  addDelta(dyaw, dpitch) {
    if (dyaw || dpitch) this.aim = null;
    this.yaw += dyaw;
    this.pitch = clampPitch(this.pitch + dpitch);
  }

  /** Held turning (arrows, pad). Rate in rad/s; 0 to stop. */
  setTurnRate(r) {
    if (r && this.aim) this.aim = null;
    this.turnRate = r;
  }

  /** Ease toward a direction — LOOK UP, dolly, travel. k per 60Hz frame. */
  aimAt(yaw, pitch, k = 0.08) {
    this.aim = { yaw, pitch: clampPitch(pitch), k };
  }

  cancelAim() { this.aim = null; }

  /**
   * Adopt a direction produced by a temporary camera owner (the truck).
   * Gyro is already folded into the direction on screen, so subtract its
   * offsets before storing the base angles. The next tick then returns the
   * exact same view: ownership changes hands without a one-frame snap.
   */
  adopt(yaw, pitch) {
    this.yaw = yaw - this.gyroYaw;
    this.pitch = clampPitch(pitch - this.gyroPitch);
    this.aim = null;
    this.turnRate = 0;
  }

  /**
   * Integrate one frame. Returns the effective direction (gyro folded
   * in) which is what the camera is set to — directly, no lag.
   */
  tick(dt) {
    if (this.turnRate) this.yaw += this.turnRate * dt;

    if (this.aim) {
      const a = this.aim;
      const dy = normAngle(a.yaw - this.yaw);
      const dp = a.pitch - this.pitch;
      // Framerate-independent exponential ease.
      const k = 1 - Math.pow(1 - a.k, Math.max(dt, 0.0001) * 60);
      this.yaw += dy * k;
      this.pitch = clampPitch(this.pitch + dp * k);
      if (Math.abs(dy) < 0.004 && Math.abs(dp) < 0.004) this.aim = null;
    }

    return {
      yaw: this.yaw + this.gyroYaw,
      pitch: clampPitch(this.pitch + this.gyroPitch),
    };
  }
}

/**
 * Pokémon GO AR window. DeviceOrientation → look pitch/yaw.
 *
 * Hold the phone upright (beta = 90°) → pitch 0, the horizon, the room.
 * Tilt it up (beta → 0, screen toward the sky) → pitch +90°, the stars.
 * Tilt it down (beta → 180) → pitch negative, the ground.
 * Turn left/right (alpha) → yaw, relative to `headingZero` so the
 * direction you were facing when the window opened stays forward.
 *
 * Landscape remaps the pitch axis onto gamma the same way the sky
 * already did. Pitch is absolute — never calibrated to a first sample
 * or a "natural hold." That was the old bug: zero at the table, and
 * every upright pose read as the zenith.
 */
export function deviceLook(alpha, beta, gamma, screenAngle = 0, headingZero = 0) {
  let pitchAxis = beta ?? 0;
  if (screenAngle === 90) pitchAxis = -(gamma ?? 0);
  else if (screenAngle === -90 || screenAngle === 270) pitchAxis = (gamma ?? 0);
  const pitch = clampPitch((90 - pitchAxis) * Math.PI / 180);

  // W3C alpha increases as the device turns counterclockwise about Z.
  // Turning the phone right therefore decreases alpha, and looking
  // right is negative yaw (same sign as a mouse-right drag).
  const heading = (alpha ?? 0) + (screenAngle ?? 0);
  const yaw = normAngle((heading - headingZero) * Math.PI / 180);
  return { pitch, yaw };
}

/** Absolute device pitch. Upright = 0, flat face-up = zenith. */
export function pitchFromBeta(beta, gamma, screenAngle = 0) {
  return deviceLook(0, beta, gamma, screenAngle, 0).pitch;
}

/**
 * Wrapped heading step in radians. Drops the ~180° jumps iOS fires
 * when the compass kicks in after a stream of alpha=0 samples.
 */
export function headingDelta(prevHeading, heading) {
  if (prevHeading == null || heading == null) return 0;
  let d = heading - prevHeading;
  d = ((d + 180) % 360 + 360) % 360 - 180;
  if (Math.abs(d) >= 40) return 0;
  return d * Math.PI / 180;
}

/**
 * How much of the sky (or ground) you are looking at, from pitch alone.
 * Smoothstep between 31° and 60° — a glance, not a doorway.
 */
export function overheadBlend(pitch) {
  // Starts at ~31°. Upright (Pokémon GO) is pitch 0; a browsing hold
  // around beta 72° is only ~18° up — still the room. 31° is a real
  // tilt toward the sky, and the transition still spans a glance.
  const t = (pitch - 0.55) / 0.5;
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}
export function underfootBlend(pitch) {
  return overheadBlend(-pitch);
}
