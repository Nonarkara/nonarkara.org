/**
 * THE BANGKOK ROOM — a photo exhibition on Villa Savoye's living floor.
 *
 * Le Corbusier's piano nobile was built for exactly this: a free plan,
 * a ribbon window's even light, and a promenade that walks you past
 * the walls. Nine real photographs of Bangkok — Dr Non's own city,
 * from the BKKx project — hang at eye height around the living level.
 * The ramp is the vernissage route.
 *
 * Each frame: a hairline steel surround, the photograph as a lazily
 * loaded texture, and a small caption plate. Tap a frame for the full
 * photograph and its story. Real curated photos, credited by their own
 * filenames — never filler (§11.4).
 */

export const PHOTOS = [
  { file: 'bkk-01-safe-city-night.jpg',
    title: 'SAFE CITY, LATE',
    cap: 'People out at night, unhurried — Bangkok’s charm is that they feel safe enough to linger.' },
  { file: 'bkk-02-waterfront.jpg',
    title: 'WATERFRONT',
    cap: 'The Chao Phraya edge, where the city has always faced the water.' },
  { file: 'bkk-03-thammasat.jpg',
    title: 'THAMMASAT',
    cap: 'Dr Non at Thammasat University — where his parents studied, where he taught, where he grew up.' },
  { file: 'bkk-04-wat-arun-alley.jpg',
    title: 'THE ALLEY VIEW',
    cap: 'The famous alley that frames Wat Arun — the city’s best-known borrowed view.' },
  { file: 'bkk-05-foodstalls.jpg',
    title: 'FOODSTALLS',
    cap: 'Old-neighbourhood foodstalls at night, in front of the shophouses that raised them.' },
  { file: 'bkk-06-shophouses-midnight.jpg',
    title: 'SHOPHOUSES, MIDNIGHT',
    cap: 'Old-town shophouse rows holding their charm long after closing.' },
  { file: 'bkk-07-oldtown-open-space.jpg',
    title: 'OPEN SPACE',
    cap: 'A clearing in the heart of old-town Bangkok — rarer than any tower.' },
  { file: 'bkk-08-temples.jpg',
    title: 'TEMPLES EVERYWHERE',
    cap: 'In the old town a temple is never more than a street away.' },
  { file: 'bkk-09-wat-arun-night.jpg',
    title: 'WAT ARUN, NIGHT',
    cap: 'The Temple of Dawn, lit — the skyline Bangkok had before it had a skyline.' },
];

/**
 * Frame positions on the living level, LOCAL to the Savoye origin.
 * The box is 21.5² with the living floor at levels.first (3.5); frames
 * hang at eye height (+1.5) on the inner face of three walls, clear of
 * the ramp slot on the centre axis and the north terrace opening.
 */
export function framePlan(plan) {
  const L = plan.levels;
  const half = plan.box.w / 2;              // 10.75
  const y = L.first + 1.55;                 // frame centre, eye height
  const inset = half - 0.15;                // just inside the ribbon wall
  // was half - 0.55 (10.20) while the wall's inner face is ~10.64 — every
  // photograph hung 44cm off the wall in mid-air.
  const out = [];
  // South wall (z = +inset, faces −Z into the room): 3 frames.
  for (let i = 0; i < 3; i++) {
    out.push({ x: -6 + i * 6, y, z: inset, ry: Math.PI, w: 3.0, h: 2.0 });
  }
  // West wall (x = −inset, faces +X): 3 frames.
  for (let i = 0; i < 3; i++) {
    out.push({ x: -inset, y, z: 6 - i * 6, ry: Math.PI / 2, w: 3.0, h: 2.0 });
  }
  // East wall (x = +inset, faces −X): 3 frames.
  for (let i = 0; i < 3; i++) {
    out.push({ x: inset, y, z: -6 + i * 6, ry: -Math.PI / 2, w: 3.0, h: 2.0 });
  }
  return out;
}

/**
 * Build the exhibition into the Savoye group. Textures load lazily and
 * failures leave an empty frame rather than an error — a gallery with
 * one photo away for cleaning is still a gallery.
 * Returns { frames } where each frame carries { mesh, hit, photo, i }
 * so app.js can register hit volumes as clickables (kind 'exhibit').
 */
export function buildExhibit(THREE, group, plan, opts = {}) {
  const dark = opts.dark !== false;
  const loader = new THREE.TextureLoader();
  const line = new THREE.LineBasicMaterial({
    color: dark ? 0x8b98a6 : 0x4a5058, transparent: true, opacity: 0.5,
  });
  const plates = framePlan(plan);
  const frames = [];

  plates.forEach((p, i) => {
    const photo = PHOTOS[i % PHOTOS.length];
    const holder = new THREE.Group();
    holder.position.set(p.x, p.y, p.z);
    holder.rotation.y = p.ry;

    // The photograph. Starts as near-black card; the texture arrives.
    const mat = new THREE.MeshBasicMaterial({
      color: 0x10151a, side: THREE.DoubleSide,
    });
    const img = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mat);
    holder.add(img);
    loader.load(`bkk-photos/${photo.file}`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.color.setHex(0xffffff);
      mat.needsUpdate = true;
    }, undefined, () => { /* an empty frame, not an error */ });

    // Hairline steel surround.
    const fr = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(p.w + 0.12, p.h + 0.12)),
      line);
    fr.position.z = 0.01;
    holder.add(fr);

    // Caption plate — a small pale bar under the frame.
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.16),
      new THREE.MeshBasicMaterial({
        color: dark ? 0x2a2f35 : 0xd8d2c4, side: THREE.DoubleSide,
      }));
    plate.position.set(-(p.w / 2) + 0.78, -(p.h / 2) - 0.22, 0);
    holder.add(plate);

    // Invisible hit volume for the raycaster.
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(p.w + 0.2, p.h + 0.5, 0.4),
      new THREE.MeshBasicMaterial({ visible: false }));
    holder.add(hit);

    group.add(holder);
    frames.push({ holder, hit, photo, i });
  });

  return { frames };
}
