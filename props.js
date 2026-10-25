/**
 * PROPS — the things in the estate a camera might see.
 *
 * These exist for the computer-vision lesson, and they earn their place by
 * being honest. A detector with nothing to detect teaches nothing, and a
 * detector that names the buildings teaches the wrong thing.
 *
 * So the estate gets a short list of objects that COCO genuinely has words
 * for — a dog, a bicycle, a bench, a potted plant, a hydrant, a traffic
 * light, the two balls in flight — and the buildings themselves are
 * registered as UNNAMEABLE. Drive up to Villa Savoye and the overlay will
 * draw you a dog with 88% confidence and will say nothing whatsoever about
 * Savoye, because there is no category for a building. The counter in the
 * corner is the point of the whole exercise.
 *
 * The dog is the important one. It wanders, it sometimes stops, and at
 * distance it is called a cat — because that is what happens when the
 * pixels are all you have, and it is why the confidence falls when the
 * name changes.
 */

import { rng } from './rng.js';

const PROP_RANDOM = new WeakMap();

/** COCO names, and the sizes the overlay draws them at. */
export const PROP_KINDS = {
  dog:        { r: 0.45, h: 0.62 },
  bicycle:    { r: 0.6,  h: 1.10 },
  bench:      { r: 0.8,  h: 0.92 },
  planter:    { r: 0.35, h: 0.90 },
  hydrant:    { r: 0.18, h: 0.70 },
  light:      { r: 0.16, h: 0.90 },
  stopSign:   { r: 0.3,  h: 1.95 },
  sportsBall: { r: 0.12, h: 0.24 },
};

/**
 * Where the props stand. The yard is the football pitch (x −27…1, z 19…35)
 * and the basketball court (x 7.5…22.5, z 22.75…31.25); the paths between
 * the buildings are 2.6 m wide. Every prop here stands clear of all three,
 * because a bench in the middle of a football pitch is a glitch, not a
 * detail.
 */
export const PROP_DEFS = [
  { id: 'dog',      kind: 'dog',      x: 16,  z: 34,  roam: 11, pet: false },
  { id: 'bike-1',   kind: 'bicycle',  x: -28, z: 44,  yaw: 0.7 },
  { id: 'bike-2',   kind: 'bicycle',  x: 32,  z: 46,  yaw: -0.9 },
  { id: 'bench-1',  kind: 'bench',    x: -14, z: 16,  yaw: 0 },
  { id: 'bench-2',  kind: 'bench',    x: 14,  z: 18,  yaw: 0 },
  { id: 'bench-3',  kind: 'bench',    x: 20,  z: -16, yaw: Math.PI / 2 },
  { id: 'planter-1',kind: 'planter',  x: -8,  z: 16,  yaw: 0 },
  { id: 'planter-2',kind: 'planter',  x: 8,   z: 16,  yaw: 0 },
  { id: 'planter-3',kind: 'planter',  x: -44, z: 44,  yaw: 0.4 },
  { id: 'hydrant-1',kind: 'hydrant',  x: 24,  z: 34,  yaw: 0 },
  { id: 'light-1',   kind: 'light',    x: 2,   z: 18,  yaw: 0 },
  { id: 'light-2',   kind: 'light',    x: -22, z: 6,   yaw: Math.PI / 2 },
  // On the shoulder ahead of the truck's parked heading: the windscreen
  // has an honest first detection before the autonomous tour turns away.
  { id: 'stop-1',    kind: 'stopSign', x: -25.5, z: 65, y: 1.28, yaw: -2.35 },
];

/**
 * The buildings. Registered so the detector can SEE them and refuse to
 * name them — the count in the corner is the lesson, and it needs
 * something to count.
 */
export const UNNAMED_DEFS = [
  { id: 'b-pavilion',      kind: 'building', x: 0,   z: 0,  r: 26 },
  { id: 'b-savoye',       kind: 'building', x: -40, z: 48, r: 11 },
  { id: 'b-glasshouse',    kind: 'building', x: 40,  z: 48, r: 9 },
  { id: 'b-farnsworth',    kind: 'building', x: 0,   z: -52, r: 12 },
  { id: 'b-fallingwater',  kind: 'building', x: 48,  z: -28, r: 10 },
  { id: 'b-goal',          kind: 'goal',     x: 0,   z: 58, r: 4 },
  { id: 'b-hoop',          kind: 'goal',     x: -30, z: -44, r: 3 },
];

/** Flat, cheap, in the house language: planes and boxes, no textures. */
function buildProp(THREE, def, mats) {
  const G = new THREE.Group();
  const k = PROP_KINDS[def.kind];

  switch (def.kind) {
    case 'dog': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.30, 0.62), mats.dog);
      body.position.y = 0.34;
      G.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.24), mats.dog);
      head.position.set(0, 0.46, -0.38);
      G.add(head);
      for (const [lx, lz] of [[-0.09, -0.2], [0.09, -0.2], [-0.09, 0.2], [0.09, 0.2]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.07), mats.dog);
        leg.position.set(lx, 0.11, lz);
        G.add(leg);
      }
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.26), mats.dog);
      tail.position.set(0, 0.44, 0.42);
      G.add(tail);
      break;
    }
    case 'bicycle': {
      const wheelGeo = new THREE.TorusGeometry(0.33, 0.03, 6, 14);
      for (const wz of [-0.52, 0.52]) {
        const w = new THREE.Mesh(wheelGeo, mats.metal);
        w.position.set(0, 0.33, wz);
        G.add(w);
      }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.0), mats.metal);
      frame.position.set(0, 0.55, 0);
      G.add(frame);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), mats.metal);
      bar.position.set(0, 0.92, -0.44);
      G.add(bar);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.26), mats.metal);
      seat.position.set(0, 0.82, 0.34);
      G.add(seat);
      break;
    }
    case 'bench': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.44), mats.wood);
      seat.position.y = 0.46;
      G.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.36, 0.07), mats.wood);
      back.position.set(0, 0.68, 0.19);
      G.add(back);
      for (const lx of [-0.72, 0.72]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.36), mats.metal);
        leg.position.set(lx, 0.22, 0);
        G.add(leg);
      }
      break;
    }
    case 'planter': {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.42, 10), mats.pot);
      pot.position.y = 0.21;
      G.add(pot);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.52, 8), mats.leaf);
      leaf.position.y = 0.66;
      G.add(leaf);
      break;
    }
    case 'hydrant': {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.58, 8), mats.hydrant);
      b.position.y = 0.29;
      G.add(b);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mats.hydrant);
      cap.position.y = 0.6;
      G.add(cap);
      break;
    }
    case 'light': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.4, 7), mats.metal);
      pole.position.y = 1.2;
      G.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.5, 0.22), mats.lightBox);
      head.position.y = 2.5;
      G.add(head);
      const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.16), mats.lamp);
      lamp.position.set(0, 2.58, -0.12);
      G.add(lamp);
      break;
    }
    case 'stopSign': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.55, 7), mats.metal);
      pole.position.y = 0.775;
      G.add(pole);
      const signMat = new THREE.MeshBasicMaterial({
        color: 0x9f332d,
        side: THREE.DoubleSide,
      });
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.055, 8), signMat);
      face.position.y = 1.62;
      face.rotation.x = Math.PI / 2;
      G.add(face);
      break;
    }
    default: {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, k.h, 0.4), mats.metal);
      b.position.y = k.h / 2;
      G.add(b);
    }
  }

  G.position.set(def.x, 0, def.z);
  G.rotation.y = def.yaw || 0;
  return G;
}

/**
 * Build every prop and hand back the records the detector reads.
 *
 * The records are deliberately plain: { id, kind, x, z, y, r, named }.
 * The detector never touches the scene graph.
 */
export function buildProps(THREE, scene, opts = {}) {
  const dark = opts.dark !== false;
  const mats = {
    dog:     new THREE.MeshBasicMaterial({ color: dark ? 0x8a6a4a : 0xb08a5e, side: THREE.DoubleSide }),
    metal:   new THREE.MeshBasicMaterial({ color: dark ? 0x59636d : 0x8d979f, side: THREE.DoubleSide }),
    wood:    new THREE.MeshBasicMaterial({ color: dark ? 0x6b4c34 : 0xa9754b, side: THREE.DoubleSide }),
    pot:     new THREE.MeshBasicMaterial({ color: dark ? 0x6a5a4c : 0x9c8a76, side: THREE.DoubleSide }),
    leaf:    new THREE.MeshBasicMaterial({ color: dark ? 0x2f4a34 : 0x4a6b45, side: THREE.DoubleSide }),
    hydrant: new THREE.MeshBasicMaterial({ color: dark ? 0x7a2a24 : 0xb03a30, side: THREE.DoubleSide }),
    lightBox:new THREE.MeshBasicMaterial({ color: dark ? 0x1c2228 : 0x2b333a, side: THREE.DoubleSide }),
    lamp:    new THREE.MeshBasicMaterial({ color: 0xffd479, side: THREE.DoubleSide }),
  };

  const group = new THREE.Group();
  const objects = [];

  for (const def of PROP_DEFS) {
    const mesh = buildProp(THREE, def, mats);
    group.add(mesh);
    const k = PROP_KINDS[def.kind];
    objects.push({
      id: def.id,
      kind: def.kind,
      x: def.x, z: def.z, y: def.y ?? 0,
      vx: 0, vz: 0,
      r: k.r,
      h: k.h,
      named: true,
      pet: def.pet === true,
      state: 'still',
      mesh,
      home: { x: def.x, z: def.z },
      roam: def.roam ?? 0,
    });
  }

  // The buildings. In the world, visible, and unnamed.
  for (const def of UNNAMED_DEFS) {
    objects.push({
      id: def.id,
      kind: def.kind,
      x: def.x, z: def.z, y: 0,
      vx: 0, vz: 0,
      r: def.r,
      h: 6,
      named: false,
      state: 'still',
    });
  }

  scene.add(group);
  return { group, objects, mats };
}

/**
 * The dog's day. It wanders inside its patch, stops sometimes, and
 * occasionally bolts — which is the only reason the autopilot has a
 * `dog_will_cross` constraint to be afraid of.
 */
export function tickProps(objects, dt, seed = 7) {
  // Keep the generator alive. Recreating it here used to make every frame
  // draw the same first three values, so an animal could only repeat one
  // steering decision forever.
  let rand = PROP_RANDOM.get(objects);
  if (!rand) {
    rand = rng(seed);
    PROP_RANDOM.set(objects, rand);
  }
  for (const o of objects) {
    if (!o.roam) continue;
    const dx = o.x - o.home.x, dz = o.z - o.home.z;
    const dist = Math.hypot(dx, dz);
    if (dist > o.roam) {
      // Back toward the middle of its patch.
      o.vx = (-dx / dist) * 1.1;
      o.vz = (-dz / dist) * 1.1;
    } else if (rand() < 0.004) {
      // A startle. It runs, for a little while, in whatever direction.
      o.state = 'run';
      o.runFor = 1.2 + rand() * 1.6;
      const a = rand() * Math.PI * 2;
      o.vx = Math.sin(a) * 3.4;
      o.vz = Math.cos(a) * 3.4;
    } else if (rand() < 0.02) {
      o.vx = 0; o.vz = 0;
      o.state = 'still';
    } else if (o.state !== 'run') {
      const a = rand() * Math.PI * 2;
      o.vx = Math.sin(a) * 0.55;
      o.vz = Math.cos(a) * 0.55;
      o.state = 'walk';
    }
    if (o.state === 'run') {
      o.runFor -= dt;
      if (o.runFor <= 0) { o.state = 'walk'; o.vx *= 0.4; o.vz *= 0.4; }
    }
    o.x += o.vx * dt;
    o.z += o.vz * dt;
    if (o.mesh) {
      o.mesh.position.set(o.x, 0, o.z);
      if (o.vx || o.vz) o.mesh.rotation.y = Math.atan2(-o.vx, -o.vz);
    }
  }
}
