/** Procedural horizon: three quiet mountain rings, no texture or network. */

const fract = (n) => n - Math.floor(n);
const noise = (n, seed) => fract(Math.sin(n * 91.17 + seed * 37.31) * 43758.5453);

/** Deterministic ridge height, exported so the horizon can be tested. */
export function ridgeHeight(i, count, layer = 0) {
  const a = (i / count) * Math.PI * 2;
  const broad = 0.48 + 0.22 * Math.sin(a * (3 + layer) + layer * 1.7) +
    0.13 * Math.sin(a * (7 + layer * 2) - 0.8);
  const detail = (noise(i, layer + 11) - 0.5) * 0.16;
  return Math.max(0.14, Math.min(0.92, broad + detail));
}

export function buildMountains(THREE, scene) {
  const group = new THREE.Group();
  group.name = 'mountain-horizon';
  const layers = [
    { radius: 270, base: -9, height: 37, color: 0x253442, opacity: 0.68, seed: 0 },
    { radius: 235, base: -7, height: 27, color: 0x304453, opacity: 0.62, seed: 1 },
    { radius: 205, base: -5, height: 18, color: 0x3a505c, opacity: 0.54, seed: 2 },
  ];
  const count = 144;
  const materials = [];

  for (const layer of layers) {
    const vertices = [];
    const indices = [];
    for (let i = 0; i <= count; i++) {
      const j = i % count;
      const a = (j / count) * Math.PI * 2;
      const x = Math.sin(a) * layer.radius;
      const z = -Math.cos(a) * layer.radius;
      const y = layer.base + ridgeHeight(j, count, layer.seed) * layer.height;
      vertices.push(x, layer.base, z, x, y, z);
      if (i < count) {
        const k = i * 2;
        indices.push(k, k + 1, k + 3, k, k + 3, k + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    const material = new THREE.MeshBasicMaterial({
      color: layer.color,
      transparent: true,
      opacity: layer.opacity,
      depthWrite: false,
      fog: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -20 + layer.seed;
    group.add(mesh);
    materials.push({ material, layer });
  }

  scene.add(group);

  const mixHex = (a, b, t) => {
    const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
    return (m(16) << 16) | (m(8) << 8) | m(0);
  };

  return {
    group,
    materials,
    setPalette(palette, sunAlt) {
      const daylight = Math.max(0, Math.min(1, (sunAlt + 8) / 48));
      materials.forEach(({ material, layer }, i) => {
        const nightRidge = [0x172532, 0x1d3040, 0x284252][i];
        const dayRidge = mixHex(palette.bg, palette.podium, 0.52 + i * 0.10);
        const cool = mixHex(nightRidge, dayRidge, daylight);
        const dusk = mixHex(cool, 0x6d4435, Math.max(0, 1 - Math.abs(sunAlt) / 12) * 0.34);
        material.color.setHex(dusk);
        material.opacity = layer.opacity * (0.82 + daylight * 0.18);
      });
    },
  };
}
