/**
 * VISION — the camera's eye, in the estate.
 *
 * This is the detector from vision.nonarkara.org, carried across from the
 * street simulator where it ran against webcam frames. There it read pixels
 * through a neural network and guessed what was in them. Here it reads
 * GEOMETRY: the estate already knows every object in the world exactly,
 * so the honest thing to do is model the camera, not fake the pixels.
 *
 * The part worth carrying across is not the maths. It is the stance:
 *
 *   "Nothing returned here is a fact about the world. It is a guess about
 *    the picture, and it comes with its confidence attached."
 *
 * And the closed vocabulary. COCO has eighty categories. A detector built
 * on it cannot name a lamp post, a goal frame, a building, a tree. Those
 * things are not missed and not below threshold — they are UNNAMED, and
 * that is the whole lesson. Drive the Cybertruck across the yard and the
 * overlay will cheerfully box the dog, the bicycle and the basketball, and
 * will say nothing at all about Villa Savoye, because no category exists
 * for it. A classifier is a list of words, and the world is not.
 *
 * Everything here is a pure function over plain data so the tests can
 * drive it without a renderer. The renderer lives in cv-overlay.js.
 */

export const FOV = (150 * Math.PI) / 180;   // front + side cameras together
export const MEMORY = 0.7;                  // seconds a lost object is still believed in

/**
 * Conditions, not weather. The estate already knows the sun's altitude and
 * whether it is raining — these are the four states the detector cares
 * about, and each one costs range and certainty.
 */
export const CONDITIONS = {
  day:   { range: 1.00, p: 1.00 },
  sun:   { range: 0.85, p: 0.90 },   // low sun, long shadows, glare
  rain:  { range: 0.75, p: 0.88 },   // water on the lens
  night: { range: 0.60, p: 0.80 },   // headlights reach, eyes do not
};

/**
 * The closed vocabulary. Grounded in COCO, so the names mean what people
 * expect them to mean.
 *
 *   size — how much of the frame this thing eats; a big object is easier
 *   conf — how confidently a clean look identifies it
 *   far  — extra confidence lost once the thing is far away
 */
export const CLASSES = {
  car:         { size: 1.00, conf: 0.96 },
  truck:       { size: 1.25, conf: 0.97 },
  bus:         { size: 1.30, conf: 0.97 },
  person:      { size: 0.93, conf: 0.93 },
  dog:         { size: 0.82, conf: 0.88, far: 0.55 },
  motorcycle:  { size: 0.78, conf: 0.85, far: 0.50 },
  bicycle:     { size: 0.70, conf: 0.79, far: 0.45 },
  light:       { size: 0.64, conf: 0.83 },   // bright, high contrast, easy up close
  // A red octagon is deliberately high-contrast and is one of the first
  // roadside classes a driving detector is trained to hold onto.
  stopSign:    { size: 0.95, conf: 0.92 },
  planter:     { size: 0.58, conf: 0.74 },
  hydrant:     { size: 0.55, conf: 0.68 },   // small, often mistaken for a person
  bench:       { size: 0.52, conf: 0.62 },   // flat, and the easiest thing here to miss
  sportsBall:  { size: 0.50, conf: 0.60 },
};

/**
 * Confusion pairs: once the object is far enough to be ambiguous, the wrong
 * name is sometimes chosen. How often, and what the mistake costs.
 */
export const CONFUSE = {
  dog:        [['cat', 0.35, 0.55]],
  bicycle:    [['motorcycle', 0.25, 0.60]],
  motorcycle: [['bicycle', 0.20, 0.60]],
  hydrant:    [['person', 0.30, 0.45]],
  planter:    [['potted plant', 0.10, 0.80]],
};

export const BODY_SIZE  = { car: 1, pickup: 1.05, truck: 1.25, bus: 1.3 };
export const BODY_LABEL = { car: 'car', pickup: 'car', truck: 'truck', bus: 'bus' };

/** Wrap an angle to (-π, π]. */
export const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * World point → the Three.js camera yaw used by the truck.
 * North is 0; turning right toward +X makes yaw negative.
 */
export const cameraBearing = (dx, dz) => -Math.atan2(dx, -dz);

/** How far the truck's cameras can see right now, in metres. */
export function sightRange(ego, condition) {
  return ego.sensorRange * CONDITIONS[condition].range;
}

/**
 * Chance of seeing an object at distance d on this look, 0–1.
 * Not a probability of being right — a probability of being SEEN. Once seen,
 * classConfidence decides what it is called.
 */
export function detectChance(ego, kind, d, condition, body = 'car') {
  if (ego.blind) return 0;
  const R = sightRange(ego, condition);
  if (d > R) return 0;
  const cls = CLASSES[kind] ?? CLASSES.person;
  return ego.sensorQuality * CONDITIONS[condition].p * cls.size
       * BODY_SIZE[body] * (1 - 0.6 * (d / R) ** 2);
}

/** The confidence a class reaches at this distance, before any confusion. */
export function classConfidence(kind, far, condition, body = 'car') {
  const cls = CLASSES[kind] ?? CLASSES.person;
  return Math.max(0.3, Math.min(0.99,
    (cls.conf + (BODY_SIZE[body] - 1) * 0.35) * (1 - 0.3 * far) * CONDITIONS[condition].p));
}

/**
 * Which condition the estate is in, from what the site already knows.
 * Sun above the horizon and dry is 'day'; low sun is 'sun'; rain wins over
 * both; below the horizon is 'night'.
 */
export function conditionFor(sunAltDeg, raining) {
  if (raining) return 'rain';
  if (sunAltDeg <= -6) return 'night';
  if (sunAltDeg < 12) return 'sun';
  return 'day';
}

/**
 * One look: update the truck's tracks from everything in its field of view.
 *
 * `objects` are plain records: { id, kind, x, z, vx, vz, body, named }.
 * `named: false` means there is no category for it — it is in the world,
 * it is visible, and the detector cannot say a word about it.
 */
export function perceive(ego, objects, condition, rng) {
  const R = sightRange(ego, condition);
  const t = ego.time;
  const seen = [];

  for (const obj of objects) {
    if (obj === ego || obj.gone) continue;
    const dx = obj.x - ego.x, dz = obj.z - ego.z;
    const d = Math.hypot(dx, dz);
    if (d > R) continue;
    if (Math.abs(wrap(cameraBearing(dx, dz) - ego.heading)) > FOV / 2) continue;

    const body = obj.kind === 'car' ? (obj.body ?? 'car') : 'car';
    if (rng() >= detectChance(ego, obj.kind, d, condition, body)) continue;

    const id = obj.id;
    const prev = ego.tracks.get(id);
    const track = prev ?? { id, x: obj.x, z: obj.z, vx: 0, vz: 0, seen: 0, age: 0, kind: obj.kind };
    track.obj = obj;                         // the raw record, for the decision engine
    track.r = obj.r ?? 0.5;                  // radius, for gap arithmetic
    track.x = obj.x; track.z = obj.z;
    track.vx = obj.vx ?? 0; track.vz = obj.vz ?? 0;
    track.d = d;
    track.far = d / R;
    track.seen = t;
    track.age = (t - (prev?.seen ?? t)) + (prev?.age ?? 0);
    track.body = body;
    track.named = obj.named !== false;

    if (!track.named) {
      // Seen, and there is no word for it. No label, no confidence, no
      // confusion — a detector with a closed vocabulary does not get to
      // guess "person" at a building. It is in the frame and unnamed, and
      // that is the whole point.
      track.label = null;
      track.conf = 0;
      ego.tracks.set(id, track);
      seen.push(track);
      continue;
    }

    const far = d / R;
    let label = obj.kind === 'car' ? BODY_LABEL[obj.body ?? 'car'] : obj.kind;
    let conf = classConfidence(label, far, condition, body);

    // Confusion: far enough, and the wrong name gets picked.
    const pairs = CONFUSE[obj.kind];
    if (pairs && far > (CLASSES[obj.kind]?.far ?? 0.5)) {
      const [wrong, p, cost] = pairs[0];
      if (rng() < p) { label = wrong; conf *= cost; }
    }

    track.label = label;
    track.conf = conf;
    ego.tracks.set(id, track);
    seen.push(track);
  }

  // Forget what has not been seen for a while — memory is short on purpose.
  for (const [id, tr] of ego.tracks) {
    if (tr.gone || t - tr.seen > MEMORY) ego.tracks.delete(id);
  }
  return seen;
}

/**
 * What is in view that the camera has NO NAME for.
 *
 * This is the point of the whole exercise. A detector is a closed list.
 * The goal frame at the end of the pitch, the hoop pole, the lamp post, the
 * buildings — all perfectly well described by the geometry, and all
 * unnameable, because no category exists for them.
 */
export function unnamedInView(ego, objects, condition) {
  const R = sightRange(ego, condition);
  const out = [];
  for (const obj of objects) {
    if (obj === ego || obj.gone || obj.named !== false) continue;
    const dx = obj.x - ego.x, dz = obj.z - ego.z;
    const d = Math.hypot(dx, dz);
    if (d > R) continue;
    if (Math.abs(wrap(cameraBearing(dx, dz) - ego.heading)) > FOV / 2) continue;
    out.push({ ...obj, d });
  }
  return out.sort((a, b) => a.d - b.d);
}

/**
 * Tracks that are worth driving on: close enough to matter.
 * Sorted by distance, nearest first.
 */
export function relevantTracks(ego, maxDistance = 60) {
  return [...ego.tracks.values()]
    .filter((t) => t.d <= maxDistance)
    .sort((a, b) => a.d - b.d);
}
