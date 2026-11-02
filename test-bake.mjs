// The baked light is a budget, not a feature: each bake must stay small, be
// shaped like the ground it is laid over, and land exactly where the exporter
// says the building's shade falls.
//   node test-bake.mjs
import assert from 'node:assert';
import { readFileSync, statSync } from 'node:fs';
import { SHADE as PAV_SHADE } from './pavilion.js';
import { SHADE as FARN_SHADE } from './farnsworth.js';
import { groundRect } from './tools/export-building.mjs';

const BUDGET = 250 * 1024;   // docs/3d-pipeline.md: per building, fetched after the room is interactive
const BAKES = [
  ['pavilion', 'bake/pavilion-podium.png', PAV_SHADE],
  ['farnsworth', 'bake/farnsworth-ground.png', FARN_SHADE],
];

const out = [];
for (const [name, file, shade] of BAKES) {
  const path = new URL('./' + file, import.meta.url);
  const bytes = statSync(path).size;
  assert(bytes <= BUDGET, `the ${name} bake is ${bytes} bytes; the budget is ${BUDGET}`);

  const png = readFileSync(path);
  assert.equal(png.subarray(1, 4).toString(), 'PNG', `${name}: the bake must be a PNG`);
  assert.equal(png[25], 6, `${name}: the shade lives in the alpha channel, so the PNG must be RGBA`);
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  const W = shade.x1 - shade.x0, D = shade.z1 - shade.z0;
  // sized to multiples of 8 px, so allow 2%
  assert(Math.abs((h / w) / (D / W) - 1) < 0.02, `${name}: the bake is ${w}x${h}; laid over ${W}x${D} it would stretch`);

  // The rect the browser lays the plane on is the rect the bake was lit for.
  assert.deepEqual(shade, groundRect(name), `${name}: SHADE has drifted from the geometry it was baked from; re-run tools/export-building.mjs`);
  out.push(`${name} ${(bytes / 1024).toFixed(0)} KB ${w}x${h}`);
}

const ignore = readFileSync(new URL('./.deployignore', import.meta.url), 'utf8').split('\n');
assert(ignore.includes('/tools/'), 'the bake scripts must not ship to the public site');

console.log(`bake: ${out.join(' · ')} (budget 250 KB each)`);
