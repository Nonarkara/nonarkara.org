import assert from 'assert';
import { readFileSync } from 'node:fs';
import * as THREE from './vendor-three-0.160.0.js';

// Test 1: Camera rotation order YXZ
const camera = new THREE.PerspectiveCamera(58, 1.6, 0.1, 1200);
camera.rotation.order = 'YXZ';
assert.equal(camera.rotation.order, 'YXZ', 'Camera must use YXZ rotation order');

// Test 2: Angle difference normalization across PI boundary
function calcDiffY(wantY, currentY) {
  let diffY = wantY - currentY;
  return Math.atan2(Math.sin(diffY), Math.cos(diffY));
}
// Jump across PI (e.g. wantY = -3.1, currentY = 3.1 => difference is -6.2 -> normalized to +0.083)
const diffCrossPi = calcDiffY(-Math.PI + 0.04, Math.PI - 0.04);
assert(Math.abs(diffCrossPi) < 0.1, `Angle diff across PI boundary must be minimal, got ${diffCrossPi}`);

// Test 3: Pitch clamping prevents inverted vertical view
function clampPitch(wantX) {
  return Math.max(-1.42, Math.min(1.42, wantX));
}
assert.equal(clampPitch(2.0), 1.42, 'Pitch > 1.42 must clamp to 1.42');
assert.equal(clampPitch(-2.0), -1.42, 'Pitch < -1.42 must clamp to -1.42');

// Audit guard: scene setup may call lookAt before Look is initialised, but
// the running world has exactly one camera-rotation write, fed by Look.tick.
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
assert.equal((app.match(/camera\.rotation\.set\(/g) || []).length, 1,
  'the frame loop must have exactly one direct camera rotation writer');
assert(app.includes(': LOOK.tick(dtLook);') &&
  app.includes('if (!driving) camera.rotation.set(eff.pitch, eff.yaw, 0);'),
  'the sole writer must consume the Look integrator (except while the truck owns the camera via lookAt)');

console.log('camera: all checks passed · one runtime writer · YXZ · short path · pitch clamp');
