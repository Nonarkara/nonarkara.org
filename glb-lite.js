/**
 * A deliberately small GLB reader for static, texture-free hero props.
 *
 * Full GLTFLoader is the correct tool for animated or textured models. The
 * estate's first Blender prop has neither, so paying that loader on a phone
 * would cost more code than the format we use. Unsupported features fail
 * closed and leave the procedural fallback visible.
 */
const COMPONENTS = {
  5121: Uint8Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};
const ITEMS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function attribute(json, binary, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  const TypedArray = COMPONENTS[accessor.componentType];
  const itemSize = ITEMS[accessor.type];
  if (!TypedArray || !itemSize || accessor.sparse || view.byteStride) {
    throw new Error('GLB feature outside the static-prop contract');
  }
  const byteOffset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const array = new TypedArray(binary, byteOffset, accessor.count * itemSize);
  return { array, itemSize, normalized: !!accessor.normalized };
}

function makeMaterial(THREE, def = {}) {
  const pbr = def.pbrMetallicRoughness || {};
  if (pbr.baseColorTexture || pbr.metallicRoughnessTexture || def.normalTexture) {
    throw new Error('Textures require the full GLTFLoader');
  }
  const base = pbr.baseColorFactor || [1, 1, 1, 1];
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(base[0], base[1], base[2]),
    opacity: base[3],
    transparent: base[3] < 1,
    metalness: pbr.metallicFactor ?? 1,
    roughness: pbr.roughnessFactor ?? 1,
    side: def.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
  });
  material.name = def.name || '';
  if (def.emissiveFactor) {
    material.emissive.setRGB(...def.emissiveFactor);
    material.emissiveIntensity = def.extensions?.KHR_materials_emissive_strength?.emissiveStrength || 1;
  }
  return material;
}

/** Parse one GLB ArrayBuffer into a Three.js group. */
export function parseGlb(THREE, buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    throw new Error('Not a glTF 2 binary');
  }
  let offset = 12, json = null, binary = null;
  while (offset < buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (type === 0x4e4f534a) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, length)));
    } else if (type === 0x004e4942) {
      binary = buffer.slice(start, start + length);
    }
    offset = start + length;
  }
  if (!json || !binary) throw new Error('GLB has no JSON or binary chunk');

  const materials = (json.materials || []).map((def) => makeMaterial(THREE, def));
  const meshes = (json.meshes || []).map((meshDef) => {
    const parts = meshDef.primitives.map((primitive) => {
      if (primitive.mode != null && primitive.mode !== 4) throw new Error('Only triangles are supported');
      const geometry = new THREE.BufferGeometry();
      const names = { POSITION: 'position', NORMAL: 'normal', TEXCOORD_0: 'uv' };
      for (const [semantic, accessorIndex] of Object.entries(primitive.attributes || {})) {
        const name = names[semantic];
        if (!name) continue;
        const attr = attribute(json, binary, accessorIndex);
        geometry.setAttribute(name, new THREE.BufferAttribute(attr.array, attr.itemSize, attr.normalized));
      }
      if (primitive.indices != null) {
        const index = attribute(json, binary, primitive.indices);
        geometry.setIndex(new THREE.BufferAttribute(index.array, 1));
      }
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const object = new THREE.Mesh(geometry, materials[primitive.material] || new THREE.MeshStandardMaterial());
      object.castShadow = true;
      object.receiveShadow = true;
      return object;
    });
    if (parts.length === 1) return parts[0];
    const group = new THREE.Group();
    group.add(...parts);
    return group;
  });

  const nodes = (json.nodes || []).map((def) => {
    const object = def.mesh == null ? new THREE.Group() : meshes[def.mesh].clone();
    object.name = def.name || '';
    if (def.matrix) object.matrix.fromArray(def.matrix).decompose(object.position, object.quaternion, object.scale);
    else {
      if (def.translation) object.position.fromArray(def.translation);
      if (def.rotation) object.quaternion.fromArray(def.rotation);
      if (def.scale) object.scale.fromArray(def.scale);
    }
    return object;
  });
  (json.nodes || []).forEach((def, i) => (def.children || []).forEach((child) => nodes[i].add(nodes[child])));
  const sceneDef = json.scenes?.[json.scene || 0];
  if (!sceneDef) throw new Error('GLB has no scene');
  const root = new THREE.Group();
  root.name = 'cybertruck-hero';
  for (const node of sceneDef.nodes || []) root.add(nodes[node]);
  root.userData.gltf = { generator: json.asset?.generator || '', version: json.asset?.version || '' };
  return root;
}

export async function loadGlb(THREE, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GLB ${response.status}`);
  return parseGlb(THREE, await response.arrayBuffer());
}
