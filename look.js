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
 *   3. The gyro is an additive OFFSET on top, never a writer — the
 *      phone shifts the window; the finger still owns the frame.
 */

const PITCH_MAX = 1.55;                 // ±89° — never past vertical

const clampPitch = (p) => Math.max(-PITCH_MAX, Math.min(PITCH_MAX, p));
const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

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
 * How much of the sky (or ground) you are looking at, from pitch alone.
 * This is what makes them places instead of modes: the stars are always
 * up there and the map is always underfoot — look, and they are there;
 * look away, and the room comes back. Smoothstep between 26° and 54°,
 * so the transition is a glance, not a doorway.
 */
export function overheadBlend(pitch) {
  const t = (pitch - 0.45) / 0.5;
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}
export function underfootBlend(pitch) {
  return overheadBlend(-pitch);
}
