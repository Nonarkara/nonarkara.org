// The Blender prop is allowed to improve the picture only while it remains a
// small, static visual skin. These gates stop an innocent re-export from
// becoming a first-load regression or a second source of vehicle mechanics.
//   node test-hero-model.mjs
import assert from 'node:assert';
import { readFileSync, statSync } from 'node:fs';
import * as THREE from './vendor-three-0.160.0.js';
import { parseGlb } from './glb-lite.js';
import { buildCybertruck } from './drive.js';

const FILE = new URL('./models/cybertruck.glb', import.meta.url);
const BUDGET = 160 * 1024;
const TRIANGLE_BUDGET = 3000;
const bytes = statSync(FILE).size;
assert(bytes <= BUDGET, `Cybertruck GLB is ${bytes} bytes; the budget is ${BUDGET}`);

const source = readFileSync(FILE);
const buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
const header = new DataView(buffer);
assert.equal(header.getUint32(0, true), 0x46546c67, 'asset must be a binary glTF');
assert.equal(header.getUint32(4, true), 2, 'asset must be glTF 2');

// Read the JSON chunk independently so the poly count is a format-level gate,
// not whatever a renderer happens to report after loading.
const jsonLength = header.getUint32(12, true);
const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
assert(!json.images && !json.textures, 'the hero prop must stay texture-free');
assert(!json.animations, 'the static exterior must not acquire animation data');
let triangles = 0;
for (const mesh of json.meshes || []) {
  for (const primitive of mesh.primitives || []) {
    assert(primitive.indices != null, 'every mesh primitive must be indexed');
    triangles += json.accessors[primitive.indices].count / 3;
  }
}
assert(triangles <= TRIANGLE_BUDGET,
  `Cybertruck has ${triangles} triangles; the budget is ${TRIANGLE_BUDGET}`);

const hero = parseGlb(THREE, buffer);
let meshes = 0;
hero.traverse((object) => { if (object.isMesh) meshes++; });
assert(meshes >= 20 && meshes <= 30, `expected a compact assembled prop, got ${meshes} meshes`);
const size = new THREE.Box3().setFromObject(hero).getSize(new THREE.Vector3());
// The 2.0 m body wears 0.12 m of tire outside each side.
assert(size.x > 2.1 && size.x < 2.3, `width drifted to ${size.x.toFixed(2)}m`);
assert(size.y > 1.7 && size.y < 2.0, `height drifted to ${size.y.toFixed(2)}m`);
assert(size.z > 5.1 && size.z < 5.4, `length drifted to ${size.z.toFixed(2)}m`);

const truck = buildCybertruck(THREE, { dark: true });
assert(truck.fallbackParts.every((part) => part.visible), 'procedural fallback starts visible');
assert(truck.useHeroExterior(hero), 'valid hero model is accepted');
assert(truck.fallbackParts.every((part) => !part.visible), 'fallback hides only after parse succeeds');
assert(truck.shell.getObjectByName('cybertruck-hero') === hero, 'hero lives in the exterior shell');
assert(!truck.useHeroExterior(new THREE.Group()), 'a second model cannot replace the verified hero');

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
assert(app.includes("import('./glb-lite.js')"), 'hero loader must remain lazy');
assert(app.includes('navigator.deviceMemory <= 2'), 'low-memory phones must keep the cheap fallback');
assert(!readFileSync(new URL('./sw.js', import.meta.url), 'utf8').includes("'/models/cybertruck.glb'"),
  'the model must not be precached during service-worker install');

console.log(`hero model: ${(bytes / 1024).toFixed(0)} KB · ${triangles} triangles · ${meshes} meshes · mechanics stay procedural`);
