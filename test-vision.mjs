// Self-check for the perception engine: what the detector can see, how
// sure it is, when it gets the name wrong, and what it refuses to name.
// `node test-vision.mjs`
import assert from 'node:assert';
import {
  FOV, MEMORY, CONDITIONS, CLASSES, CONFUSE,
  detectChance, classConfidence, conditionFor,
  perceive, unnamedInView, sightRange, wrap, cameraBearing,
} from './vision.js';
import { rng } from './rng.js';

const ego = (over = {}) => ({
  x: 0, z: 0, v: 0, heading: 0,
  style: null,
  tracks: new Map(),
  time: 0,
  sensorRange: 48,
  sensorQuality: 0.92,
  blind: false,
  ...over,
});

// ── Range and the four conditions ──────────────────────────
{
  assert(Object.keys(CONDITIONS).length === 4, 'exactly four conditions');
  assert(CONDITIONS.day.range === 1, 'clear day sees furthest');
  assert(CONDITIONS.night.range < CONDITIONS.day.range, 'night sees less than day');
  assert(CONDITIONS.rain.range < CONDITIONS.sun.range, 'rain sees less than clear sun');
  assert(sightRange(ego(), 'day') === 48, 'range is the sensor range on a clear day');
  assert(sightRange(ego(), 'night') < 48, 'and less at night');
}

// Three.js right turns are negative yaw. A detector using the opposite
// sign sees a mirror image of the road and misses what is on the windscreen.
{
  assert(Math.abs(cameraBearing(10, 0) + Math.PI / 2) < 1e-9, 'east is yaw -90°');
  const e = ego({ heading: -Math.PI / 2 });
  const seen = perceive(e, [
    { id: 'east', kind: 'person', x: 10, z: 0, y: 0 },
    { id: 'west', kind: 'person', x: -10, z: 0, y: 0 },
  ], 'day', rng(1));
  assert(seen.some((t) => t.id === 'east'), 'a right-facing camera sees east');
  assert(!seen.some((t) => t.id === 'west'), 'and does not see through its back');
}

// ── The condition follows the sky, not the clock ───────────
{
  assert(conditionFor(40, false) === 'day', 'high sun is day');
  assert(conditionFor(6, false) === 'sun', 'low sun is sun');
  assert(conditionFor(-20, false) === 'night', 'sun below the horizon is night');
  assert(conditionFor(40, true) === 'rain', 'rain wins over daylight');
  assert(conditionFor(-20, true) === 'rain', 'and over night');
}

// ── Chance of seeing something ─────────────────────────────
{
  assert(detectChance(ego(), 'person', 200, 'day') === 0, 'nothing beyond the range');
  assert(detectChance(ego({ blind: true }), 'person', 2, 'day') === 0, 'a blind camera sees nothing');
  const near = detectChance(ego(), 'person', 2, 'day');
  const far = detectChance(ego(), 'person', 30, 'day');
  assert(near > far, 'nearer things are easier to see');
  assert(near <= 1 && far >= 0, 'a chance is a chance');
  // A big thing is easier to see than a small thing at the same distance.
  assert(detectChance(ego(), 'bus', 20, 'day') > detectChance(ego(), 'bench', 20, 'day'),
    'a bus is easier to find than a bench');
}

// ── Confidence falls with distance, and never below the floor ──
{
  const close = classConfidence('car', 0.05, 'day');
  const far = classConfidence('car', 0.95, 'day');
  assert(close > far, 'confidence falls with distance');
  assert(close <= 0.99 && far >= 0.3, 'confidence stays inside its band');
  assert(classConfidence('bench', 0.9, 'day') < classConfidence('car', 0.9, 'day'),
    'a bench is never as sure as a car');
}

// ── The detector only believes what is in front of it ──────
{
  const e = ego();
  const r = rng(1);
  const seen = perceive(e, [
    { id: 'ahead', kind: 'person', x: 0, z: -10, y: 0 },
    { id: 'behind', kind: 'person', x: 0, z: 10, y: 0 },
    { id: 'side', kind: 'person', x: 20, z: 0, y: 0 },
    { id: 'far', kind: 'person', x: 0, z: -200, y: 0 },
  ], 'day', r);
  const ids = seen.map(s => s.id);
  assert(ids.includes('ahead'), 'the thing in front is seen');
  assert(!ids.includes('behind'), 'the thing behind is not');
  assert(!ids.includes('side'), 'the thing at 90° is outside a 150° field');
  assert(!ids.includes('far'), 'the thing beyond the range is not');
  assert(Math.abs(FOV / 2 - Math.PI * 75 / 180) < 1e-9, 'the field is 150° wide');
}

// ── Memory is short: a lost object is forgotten ────────────
{
  const e = ego();
  const r = rng(2);
  perceive(e, [{ id: 'p', kind: 'person', x: 0, z: -8, y: 0 }], 'day', r);
  assert(e.tracks.has('p'), 'seen and remembered');
  e.time += MEMORY + 0.05;
  perceive(e, [], 'day', r);
  assert(!e.tracks.has('p'), 'forgotten once it has been gone longer than memory');
}

// ── A far dog may be called a cat, and the confidence pays ─
{
  assert(CONFUSE.dog && CONFUSE.dog[0][0] === 'cat', 'a dog is confused with a cat');
  assert(CLASSES.dog.far > 0.5, 'and only once it is far enough to be ambiguous');
  // Over many looks, a distant dog is sometimes misnamed.
  let wrong = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const e = ego();
    const r = rng(seed);
    for (let i = 0; i < 20; i++) {
      perceive(e, [{ id: 'dog', kind: 'dog', x: 0, z: -40, y: 0 }], 'day', r);
    }
    const t = e.tracks.get('dog');
    if (t && t.label === 'cat') wrong++;
  }
  assert(wrong > 0, 'a far dog is sometimes called a cat');
  assert(wrong < 60, 'and usually not');
}

// ── The named and the unnamed ──────────────────────────────
{
  const e = ego();
  const r = rng(3);
  perceive(e, [
    { id: 'dog', kind: 'dog', x: 0, z: -12, y: 0 },
    { id: 'savoye', kind: 'building', x: -30, z: -30, y: 0, named: false },
    { id: 'behind', kind: 'building', x: 0, z: 80, y: 0, named: false },
  ], 'day', r);
  assert(e.tracks.has('dog'), 'the dog is named');
  assert(e.tracks.has('savoye'), 'a building in view is still SEEN');
  assert(e.tracks.get('savoye').named === false, 'and it is not named');
  assert(e.tracks.get('savoye').label === null, 'a building gets no label at all');
  assert(e.tracks.get('savoye').conf === 0, 'and no confidence');
  const un = unnamedInView(e, [
    { id: 'savoye', kind: 'building', x: -30, z: -30, y: 0, named: false },
    { id: 'behind', kind: 'building', x: 0, z: 80, y: 0, named: false },
    { id: 'dog', kind: 'dog', x: 0, z: -12, y: 0 },
  ], 'day');
  assert(un.length === 1, `one thing in view has no name (got ${un.length})`);
  assert(un[0].id === 'savoye', 'and it is the building that is in front');
}

// ── A named object is never counted as unnamed ─────────────
{
  const e = ego();
  const un = unnamedInView(e, [{ id: 'd', kind: 'dog', x: 0, z: -5, y: 0 }], 'day');
  assert(un.length === 0, 'the dog has a name and is not counted');
}

// ── wrap keeps an angle inside ±π ──────────────────────────
{
  assert(Math.abs(wrap(Math.PI * 3)) < Math.PI + 1e-9, 'wraps');
  assert(Math.abs(wrap(-Math.PI * 3)) < Math.PI + 1e-9, 'both ways');
}

console.log('vision: all checks passed · closed vocabulary · confidence falls with distance · '
  + 'confusion costs confidence · the unnamed are counted');
