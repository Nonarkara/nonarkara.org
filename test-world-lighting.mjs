import assert from 'node:assert';
import { shadowMapSizeFor, sunVector } from './world-lighting.js';

assert.equal(shadowMapSizeFor({ width: 390, height: 844, deviceMemory: 4, coarsePointer: true }), 1024,
  'phones use a stable 1024px shadow map');
assert.equal(shadowMapSizeFor({ width: 1440, height: 900, deviceMemory: 8, coarsePointer: false }), 2048,
  'desktop gets the crisp map');

const east = sunVector(0, 90, 100);
assert(Math.abs(east.x - 100) < 1e-6 && Math.abs(east.z) < 1e-6, 'east is +X');
const north = sunVector(0, 0, 100);
assert(Math.abs(north.z + 100) < 1e-6 && Math.abs(north.x) < 1e-6, 'north is -Z');
const noon = sunVector(90, 180, 100);
assert(Math.abs(noon.y - 100) < 1e-6, 'zenith is +Y');

console.log('world-lighting: all checks passed · phone/desktop maps · real sun axes');
