import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { AdaptiveResolution, preferredPixelRatio } from './render-quality.js';

assert.equal(preferredPixelRatio({ devicePixelRatio: 3, width: 390, height: 844, deviceMemory: 8, coarsePointer: true }), 2,
  'a capable phone starts at a crisp 2x render');
assert.equal(preferredPixelRatio({ devicePixelRatio: 3, width: 390, height: 844, deviceMemory: 2, coarsePointer: true }), 1.25,
  'a memory-constrained phone must not allocate a 3x world');
assert.equal(preferredPixelRatio({ devicePixelRatio: 2, width: 1440, height: 900, deviceMemory: 8 }), 1.5,
  'very large canvases use a bounded starting buffer');

const renderer = {
  ratio: 1,
  domElement: { dataset: {} },
  getPixelRatio() { return this.ratio; },
  setPixelRatio(value) { this.ratio = value; },
};
const quality = new AdaptiveResolution(renderer, { maxPixelRatio: 2, sampleFrames: 4 });
assert.equal(renderer.ratio, 2, 'controller applies the preferred resolution immediately');
assert.equal(renderer.domElement.dataset.pixelRatio, '2', 'canvas exposes its active quality for live verification');
for (let i = 0; i < 4; i += 1) quality.sample(30);
assert.equal(renderer.ratio, 1.75, 'sustained slow frames lower cost one quiet step');
for (let window = 0; window < 2; window += 1) {
  for (let i = 0; i < 4; i += 1) quality.sample(12);
}
assert.equal(renderer.ratio, 1.75, 'two fast windows are not enough to shimmer upward');
for (let i = 0; i < 4; i += 1) quality.sample(12);
assert.equal(renderer.ratio, 2, 'three fast windows restore full quality');
quality.sample(1000);
assert.equal(renderer.ratio, 2, 'background-tab gaps are ignored');

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
for (const token of [
  'new AdaptiveResolution(renderer',
  'window.visualViewport?.addEventListener',
  'frameScale = dtFrame * 60',
  'RENDER_QUALITY.sample(rawFrameMs)',
]) assert(app.includes(token), `runtime quality integration missing: ${token}`);

console.log('render quality: adaptive DPR · resize coalescing · refresh-rate-correct motion');
