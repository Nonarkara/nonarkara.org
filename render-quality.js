/**
 * Keep the world as sharp as the device can sustain, without letting a
 * high-density screen turn every frame into four or nine frames of work.
 * The controller starts at the best sensible device resolution, steps down
 * only after sustained missed frames, and needs three calm windows before it
 * steps back up. That hysteresis keeps resolution changes from shimmering.
 */

export function preferredPixelRatio({
  devicePixelRatio = 1,
  width = 1,
  height = 1,
  deviceMemory = 8,
  coarsePointer = false,
} = {}) {
  const dpr = Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
  const memory = Number.isFinite(deviceMemory) ? deviceMemory : 8;
  const cssPixels = Math.max(1, width) * Math.max(1, height);

  let cap = 2;
  if (memory <= 2) cap = 1.25;
  else if ((coarsePointer && memory <= 4) || cssPixels > 1_100_000) cap = 1.5;
  else if (coarsePointer && cssPixels > 650_000) cap = 1.75;

  return Math.max(1, Math.round(Math.min(dpr, cap) * 4) / 4);
}

export class AdaptiveResolution {
  constructor(renderer, {
    maxPixelRatio = 2,
    minPixelRatio = 1,
    sampleFrames = 90,
    slowFrameMs = 22,
    fastFrameMs = 17.2,
  } = {}) {
    this.renderer = renderer;
    this.maxPixelRatio = maxPixelRatio;
    this.minPixelRatio = Math.min(minPixelRatio, maxPixelRatio);
    this.sampleFrames = sampleFrames;
    this.slowFrameMs = slowFrameMs;
    this.fastFrameMs = fastFrameMs;
    this.pixelRatio = maxPixelRatio;
    this.frames = 0;
    this.totalMs = 0;
    this.fastWindows = 0;
    this.apply(this.pixelRatio);
  }

  apply(next) {
    const ratio = Math.max(
      this.minPixelRatio,
      Math.min(this.maxPixelRatio, Math.round(next * 4) / 4),
    );
    const unchanged = ratio === this.pixelRatio && this.renderer.getPixelRatio?.() === ratio;
    this.pixelRatio = ratio;
    if (this.renderer.domElement?.dataset) {
      this.renderer.domElement.dataset.pixelRatio = String(ratio);
    }
    if (unchanged) return false;
    this.renderer.setPixelRatio(ratio);
    return true;
  }

  sample(frameMs) {
    // Background tabs and debugger pauses are not GPU performance samples.
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 100) return false;
    this.frames += 1;
    this.totalMs += frameMs;
    if (this.frames < this.sampleFrames) return false;

    const average = this.totalMs / this.frames;
    this.frames = 0;
    this.totalMs = 0;

    if (average > this.slowFrameMs && this.pixelRatio > this.minPixelRatio) {
      this.fastWindows = 0;
      return this.apply(this.pixelRatio - 0.25);
    }

    if (average < this.fastFrameMs && this.pixelRatio < this.maxPixelRatio) {
      this.fastWindows += 1;
      if (this.fastWindows >= 3) {
        this.fastWindows = 0;
        return this.apply(this.pixelRatio + 0.25);
      }
    } else {
      this.fastWindows = 0;
    }
    return false;
  }
}
