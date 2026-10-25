/**
 * WORLD LIGHTING — one real sun, one restrained shadow layer.
 *
 * The estate deliberately uses MeshBasicMaterial so its architectural
 * colours remain exact through dawn, noon and night. Converting every house
 * to a lit material would make the palette and the physical sun compete.
 * Three.js can still cast those meshes into a ShadowMaterial, however, which
 * gives feet, columns, trees and the truck contact with the ground while the
 * colour system remains the single source of daylight.
 */

/** A phone gets a useful shadow map without spending four desktop maps. */
export function shadowMapSizeFor({
  width = 1,
  height = 1,
  deviceMemory = 8,
  coarsePointer = false,
} = {}) {
  const pixels = Math.max(1, width) * Math.max(1, height);
  if (deviceMemory <= 4 || coarsePointer || pixels > 1_500_000) return 1024;
  return 2048;
}

/**
 * Horizontal coordinates to the site's world convention:
 * north = -Z, east = +X, up = +Y.
 */
export function sunVector(altDeg, azDeg, radius = 180) {
  const alt = altDeg * Math.PI / 180;
  const az = azDeg * Math.PI / 180;
  const flat = Math.cos(alt) * radius;
  return {
    x: Math.sin(az) * flat,
    y: Math.sin(alt) * radius,
    z: -Math.cos(az) * flat,
  };
}

/** Opaque visible meshes cast; glass and invisible interaction solids do not. */
export function enableShadowCasters(roots = []) {
  let count = 0;
  for (const root of roots.filter(Boolean)) {
    root.traverse?.((obj) => {
      if (!obj?.isMesh || obj.visible === false) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const opaque = materials.some((m) => m && m.visible !== false &&
        (!m.transparent || (m.opacity ?? 1) >= 0.85));
      if (!opaque) return;
      obj.castShadow = true;
      count += 1;
    });
  }
  return count;
}

export function buildWorldLighting(THREE, renderer, scene, {
  roots = [],
  width = 1,
  height = 1,
  deviceMemory = 8,
  coarsePointer = false,
} = {}) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.name = 'real-sun-shadow';
  sun.castShadow = true;
  const mapSize = shadowMapSizeFor({ width, height, deviceMemory, coarsePointer });
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.camera.left = -115;
  sun.shadow.camera.right = 115;
  sun.shadow.camera.top = 115;
  sun.shadow.camera.bottom = -115;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 430;
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.025;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);

  const receiverMaterial = new THREE.ShadowMaterial({
    color: 0x06101a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const receiver = new THREE.Mesh(new THREE.PlaneGeometry(230, 230), receiverMaterial);
  receiver.name = 'estate-shadow-receiver';
  receiver.rotation.x = -Math.PI / 2;
  receiver.position.y = 0.008;
  receiver.receiveShadow = true;
  receiver.renderOrder = 4;
  scene.add(receiver);

  const casterCount = enableShadowCasters(roots);

  const setSun = ({ alt = -18, az = 0 } = {}) => {
    const daylight = Math.max(0, Math.min(1, (alt + 1) / 18));
    const v = sunVector(Math.max(2, alt), az);
    sun.position.set(v.x, v.y, v.z);
    sun.visible = daylight > 0.01;
    sun.intensity = daylight;
    // Long low shadows are present but quieter; midday contact remains crisp.
    receiverMaterial.opacity = daylight * (0.16 + (1 - daylight) * 0.10);
    receiver.visible = daylight > 0.01;
    return { daylight, position: v };
  };

  return { sun, receiver, receiverMaterial, mapSize, casterCount, setSun };
}
