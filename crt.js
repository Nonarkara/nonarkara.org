/**
 * CRT — the signal.
 *
 * A 1990s television that has lost its lock shows three things: a bright
 * band rolling slowly up the picture, a picture that tears sideways when
 * the signal drops, and a burst of snow when it loses the frame entirely.
 *
 * That is what this draws, and it is drawn on a canvas over the wall
 * rather than baked into the images, because the point is that it
 * MOVES — a static photograph of static is just a photograph.
 *
 * The bursts are rare on purpose. A screen that is always glitching is
 * a decoration; a screen that mostly works and occasionally loses the
 * signal is a fault, and a fault is what you notice.
 *
 * Everything here is cheap, and it has to be. This canvas is the size of
 * the screen and it draws every frame over a live WebGL scene. The first
 * version drew the scanlines as four hundred full-width rectangles per
 * frame and the page stopped answering altogether — a picture effect that
 * takes the whole site down with it is not a picture effect. So the
 * scanlines are a repeating pattern (one fill), the roll bar is a
 * pre-rendered band (one blit), and the snow is a bounded number of
 * pixels. Three draw calls a frame.
 */

/** How often a burst arrives, in seconds. The wall is usually fine. */
const BURST_EVERY = [7, 19];

/** The roll bar's speed, in screen heights per second. Slow. */
const ROLL_SPEED = 0.055;

/** The roll bar's height in pixels. */
const BAND_H = 220;

/**
 * A little static, seedable, so the snow is reproducible for a test and
 * arbitrary for a person.
 */
function noise(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Crt {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.t = 0;
    this.burst = 0;          // seconds remaining in a burst
    this.next = 6 + Math.random() * 8;
    this.seed = (opts.seed ?? 1) >>> 0;
    this.enabled = true;
    this._pattern = null;
    this._band = null;
  }

  /** The two reusable assets: a scanline pattern and a roll band. */
  _assets() {
    if (!this._pattern) {
      const p = document.createElement('canvas');
      p.width = 1; p.height = 3;
      const pc = p.getContext('2d');
      pc.fillStyle = 'rgba(0,0,0,0.5)';
      pc.fillRect(0, 0, 1, 1);
      this._pattern = this.ctx.createPattern(p, 'repeat');
    }
    if (!this._band) {
      const b = document.createElement('canvas');
      b.width = 1; b.height = BAND_H;
      const bc = b.getContext('2d');
      const g = bc.createLinearGradient(0, 0, 0, BAND_H);
      g.addColorStop(0, 'rgba(214,232,255,0)');
      g.addColorStop(0.5, 'rgba(214,232,255,0.10)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      bc.fillStyle = g;
      bc.fillRect(0, 0, 1, BAND_H);
      this._band = b;
    }
  }

  /**
   * Draw one frame of the signal over whatever is underneath.
   *
   * `strong` raises the effect: used when the visitor asks for it, so the
   * fault can be seen on purpose rather than waited for.
   */
  draw(dt, strong = false) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.t += dt;

    const w = this.canvas.width, h = this.canvas.height;
    if (!w || !h) return;
    this._assets();

    ctx.clearRect(0, 0, w, h);

    // ── The roll bar ───────────────────────────────────────
    // A wide, soft band travelling up the picture. This is the picture
    // losing its vertical hold, and it is the oldest television artefact
    // there is. One blit of a pre-rendered band.
    const rollY = ((this.t * ROLL_SPEED) % 1) * (h + BAND_H * 1.2) - BAND_H * 0.6;
    ctx.drawImage(this._band, 0, rollY, w, BAND_H);

    // ── The burst ──────────────────────────────────────────
    // Snow. Rare, short, and gone.
    if (this.burst > 0) {
      this.burst -= dt;
      const rand = noise(this.seed + Math.floor(this.t * 60));
      const strength = Math.min(1, this.burst / 0.22);
      // Bounded: about one pixel per four thousand. Enough to read as
      // snow, not enough to cost anything.
      const cells = Math.max(1, Math.min(600, Math.floor((w * h) / 4000)));
      ctx.globalAlpha = 0.5 * strength;
      ctx.fillStyle = '#dfe9f4';
      for (let i = 0; i < cells; i++) {
        const x = Math.floor(rand() * w);
        const y = Math.floor(rand() * h);
        ctx.fillRect(x, y, rand() < 0.15 ? 3 : 1, 1);
      }
      ctx.globalAlpha = 1;
      // A tear: one band of the picture displaced sideways. The canvas is
      // copied onto itself — a GPU blit, not a read-back of four million
      // pixels.
      if ((Math.floor(this.t * 60) & 3) === 0) {
        const bandY = Math.floor(rand() * Math.max(1, h - 30));
        const bandH = 4 + Math.floor(rand() * 26);
        const shift = Math.round((rand() - 0.5) * w * 0.12);
        ctx.drawImage(this.canvas, 0, bandY, w, bandH, shift, bandY, w, bandH);
      }
    } else {
      this.next -= dt;
      if (this.next <= 0) {
        const [lo, hi] = BURST_EVERY;
        this.burst = 0.18 + Math.random() * 0.22;
        this.next = lo + Math.random() * (hi - lo);
      }
    }

    // ── The scanlines ──────────────────────────────────────
    // Every cathode-ray tube had them, and without them the picture stops
    // reading as a picture from the nineties and starts reading as a
    // website. One fill with a repeating pattern.
    ctx.globalAlpha = strong ? 0.7 : 0.45;
    ctx.fillStyle = this._pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  /** Force a burst now — used when the visitor asks to see the fault. */
  kick() {
    this.burst = 0.3;
  }
}
