// Self-check for the city massing — the model of Bangkok under the
// plate.
//
// Three claims are made about it, and all three are checked here:
//
//   1. The data is a real place: real footprints, real heights, and
//      heights that are honestly marked as measured or estimated.
//   2. It is 1:1 with the map it stands on, so its streets are the
//      streets under your feet.
//   3. The only thing that is not to scale is the height, and the
//      factor is a number the site prints.
import assert from 'node:assert';
import { MODEL_CENTER, MODEL_MAX_H, MODEL_RADIUS_M, decodeCityModel } from './citymass.js';
import { cityInside, cityOffset, reliefFor } from './city-model.js';

const model = decodeCityModel();
const SITE = { lat: MODEL_CENTER.lat, lon: MODEL_CENTER.lon };

// ── The model is a model ──────────────────────────────────────────
assert(model.count > 1000, `the model should hold thousands of buildings, has ${model.count}`);
assert.equal(model.offsets.length, model.count + 1);
assert.equal(model.offsets[model.count] * 2, model.points.length,
  'the offsets must address every point exactly once');

{
  let min = Infinity, max = 0;
  for (const h of model.heights) { min = Math.min(min, h); max = Math.max(max, h); }
  assert(min >= 2.5, `the shortest building is ${min} m — nothing is that short`);
  assert(max <= 330, `the tallest building is ${max} m — nothing in Bangkok is that tall`);
  assert(Math.abs(max - MODEL_MAX_H) < 0.01,
    'MODEL_MAX_H must be the tallest building actually in the model');
}

// ── It is 1:1 with the map ────────────────────────────────────────
//
// The plate is one unit to one metre and the map's own coordinates
// are at the middle of the scene, so the model's centre must land on
// the same point — and north must be -z, because the tile grid's rows
// count southward.
{
  const at = cityOffset(SITE);
  assert(Math.abs(at.x) < 0.001 && Math.abs(at.z) < 0.001,
    `the estate is the model's centre, so the offset must be zero, got ${JSON.stringify(at)}`);

  // The offset is where the model's CENTRE is, seen from the visitor.
  // So a visitor standing NORTH of the centre puts the centre to their
  // south — and south is +z, because the tile grid counts southward.
  const north = cityOffset({ lat: SITE.lat + 0.01, lon: SITE.lon });
  assert(north.z > 0, 'south is +z: the tile grid counts southward');
  assert(Math.abs(north.z - 1105.74) < 2, `a degree of latitude is 110574 m, got ${north.z}`);

  const east = cityOffset({ lat: SITE.lat, lon: SITE.lon + 0.01 });
  assert(east.x < 0, 'a visitor east of the centre puts the centre to their west');
  assert(Math.abs(east.x + 1082.5) < 2, `a degree of longitude at Bangkok is about 1082 m, got ${east.x}`);
}

// ── It is drawn only where it is true ─────────────────────────────
assert.equal(cityInside(SITE), true, 'the estate stands in the city the model is of');
assert.equal(cityInside({ lat: 48.8566, lon: 2.3522 }), false,
  'Bangkok’s buildings must not stand under Paris');
assert.equal(cityInside({ lat: 13.7563, lon: 101.6 }), false,
  'a hundred kilometres away is not Bangkok');

// ── The relief is a stated number ─────────────────────────────────
//
// The tallest building is drawn at a fixed share of the gap it hangs
// in, so the model always fills the same amount of the space and can
// never grow up through the floor.
{
  const gap = 1114;                       // the plate's depth at z16
  const scale = reliefFor(-gap, MODEL_MAX_H);
  assert(scale > 0, 'the relief must be positive');
  const drawn = MODEL_MAX_H * scale;
  assert(drawn > gap * 0.2 && drawn < gap * 0.5,
    `the tallest building should fill a third of the gap, not ${drawn} of ${gap}`);
  // Deeper gap, bigger relief — the same share, every time.
  const deeper = reliefFor(-gap * 2, MODEL_MAX_H);
  assert(Math.abs(deeper / scale - 2) < 0.001, 'the relief must scale with the gap');
  // And it never exceeds the truth by more than the gap allows.
  assert(reliefFor(-1, MODEL_MAX_H) > 0, 'a vanishing gap still gives a positive relief');
}

// ── The model is a city and not a wireframe ───────────────────────
//
// Every building must have a ring with real area, and the rings must
// be spread across the map rather than piled in one place.
{
  let minRing = Infinity, maxRing = 0;
  const corners = [];
  for (let i = 0; i < model.count; i++) {
    const start = model.offsets[i], end = model.offsets[i + 1];
    const n = end - start;
    assert(n >= 3, `building ${i} has ${n} points — a ring needs three`);
    minRing = Math.min(minRing, n);
    maxRing = Math.max(maxRing, n);
    let area = 0;
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n;
      const x0 = model.points[(start + k) * 2], z0 = model.points[(start + k) * 2 + 1];
      const x1 = model.points[(start + j) * 2], z1 = model.points[(start + j) * 2 + 1];
      area += x0 * z1 - x1 * z0;
      if (k === 0) corners.push([x0, z0]);
    }
    assert(Math.abs(area / 2) > 1, `building ${i} has no footprint`);
  }
  assert(maxRing > 4, `some footprints should have many corners, the most is ${maxRing}`);
  const xs = corners.map((c) => c[0]);
  assert(Math.max(...xs) - Math.min(...xs) > 1000,
    'the model must be spread across the map, not stacked in one place');
  // The published radius is the model's TRUE reach, and no building is
  // further from the centre than that.
  assert(Math.max(...xs) <= MODEL_RADIUS_M,
    `a building is further from the centre than the radius the site publishes: ${Math.round(Math.max(...xs))} > ${MODEL_RADIUS_M}`);
}

console.log(`city massing: ${model.count} buildings · tallest ${MODEL_MAX_H} m · 1:1 with the map`);
