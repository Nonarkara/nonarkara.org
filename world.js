/** Procedural horizon: quiet mountain rings plus Khao Yai to the north-east. */

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

// Bangkok → Khao Yai is roughly north-east. The silhouette is intentionally
// a landmark profile rather than a claim to be a survey-grade terrain model:
// a long forested table with two shoulders, not a generic alpine triangle.
export const KHAO_YAI_BEARING = 51;

export function khaoYaiHeight(offsetDeg) {
  const off = Math.max(-40, Math.min(40, offsetDeg));
  const broad = 0.48 * Math.exp(-Math.pow(off / 31, 6));
  const west = 0.24 * Math.exp(-Math.pow((off + 10) / 7.5, 2));
  const east = 0.29 * Math.exp(-Math.pow((off - 9) / 6.5, 2));
  const saddle = 0.07 * Math.exp(-Math.pow(off / 4.2, 2));
  return Math.max(0.03, broad + west + east - saddle);
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

  // A directional landmark within the rings. It is only 81 vertices and
  // shares the same untextured language, so phones pay almost nothing for
  // a horizon that now has a place and an orientation.
  const landmarkMaterial = new THREE.MeshBasicMaterial({
    color: 0x263f3a,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    fog: true,
    side: THREE.DoubleSide,
  });
  {
    const radius = 218;
    const base = -4;
    const span = 40;
    const segments = 80;
    const vertices = [];
    const indices = [];
    for (let i = 0; i <= segments; i++) {
      const offset = -span + (i / segments) * span * 2;
      const bearing = (KHAO_YAI_BEARING + offset) * Math.PI / 180;
      const x = Math.sin(bearing) * radius;
      const z = -Math.cos(bearing) * radius;
      const y = base + khaoYaiHeight(offset) * 34;
      vertices.push(x, base, z, x, y, z);
      if (i < segments) {
        const k = i * 2;
        indices.push(k, k + 1, k + 3, k, k + 3, k + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    const landmark = new THREE.Mesh(geometry, landmarkMaterial);
    landmark.name = 'khao-yai-ridge';
    landmark.renderOrder = -16;
    landmark.userData = { landmark: 'KHAO YAI', bearing: KHAO_YAI_BEARING };
    group.add(landmark);
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
      const landmarkNight = 0x18312c;
      const landmarkDay = mixHex(palette.bg, 0x315a45, 0.58);
      landmarkMaterial.color.setHex(mixHex(landmarkNight, landmarkDay, daylight));
      landmarkMaterial.opacity = 0.60 + daylight * 0.16;
    },
  };
}
