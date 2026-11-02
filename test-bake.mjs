// The baked light is a budget, not a feature: it must stay small, and it must
// still be shaped like the podium it is laid over.
//   node test-bake.mjs
import assert from 'node:assert';
import { readFileSync, statSync } from 'node:fs';
import { PLAN } from './pavilion.js';

const FILE = new URL('./bake/pavilion-podium.png', import.meta.url);
const BUDGET = 250 * 1024;   // docs/3d-pipeline.md: the Pavilion's bake, fetched after the room is interactive

const bytes = statSync(FILE).size;
assert(bytes <= BUDGET, `the Pavilion bake is ${bytes} bytes; the budget is ${BUDGET}`);

const png = readFileSync(FILE);
assert.equal(png.subarray(1, 4).toString(), 'PNG', 'the bake must be a PNG');
const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
const want = PLAN.podium.d / PLAN.podium.w;
assert(Math.abs(h / w - want) < 0.01,
  `the bake is ${w}x${h}; laid over a ${PLAN.podium.w}x${PLAN.podium.d} podium it would stretch`);
assert.equal(png[25], 6, 'the shade lives in the alpha channel, so the PNG must be RGBA');

const ignore = readFileSync(new URL('./.deployignore', import.meta.url), 'utf8').split('\n');
assert(ignore.includes('/tools/'), 'the bake scripts must not ship to the public site');

console.log(`bake: ${(bytes / 1024).toFixed(0)} KB (budget 250) · ${w}x${h} · matches the ${PLAN.podium.w}x${PLAN.podium.d} podium`);
