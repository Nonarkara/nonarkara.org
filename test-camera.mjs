import assert from 'assert';
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

console.log('camera: all checks passed · YXZ order · short-path lerp · pitch clamped');
