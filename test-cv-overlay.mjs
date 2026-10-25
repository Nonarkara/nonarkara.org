// Self-check for the camera overlay: the projection, the confidence
// colours, and the label. `node test-cv-overlay.mjs`
import assert from 'node:assert';
import { SIZES, CONF_HI, CONF_MID, confColour, projectBox, labelFor } from './cv-overlay.js';

/**
 * A perspective camera looking down −Z, so −Z is forward and +X is right.
 * The half-width of the frame at distance d is 0.6·d metres, which makes
 * it a real camera rather than an orthographic one: things nearer the
 * lens are bigger, which is the whole point of projecting.
 */
const frontCam = (width, height) => (x, y, z) => {
  if (z > -0.01) return { x: 0, y: 0, z: 2 };   // behind the lens
  const d = -z;
  return { x: x / d / 0.6, y: y / d / 0.6, z: d / 100 };
};

// ── The confidence colours mean something ─────────────────
{
  assert(confColour(0.95) !== confColour(0.55), 'high and medium differ');
  assert(confColour(0.55) !== confColour(0.2), 'medium and low differ');
  assert(confColour(CONF_HI) === confColour(0.99), 'a high confidence is one colour');
  assert(confColour(CONF_MID) === confColour(0.6), 'a medium confidence is one colour');
  assert(confColour(0) === confColour(0.3), 'a weak guess is one colour');
}

// ── A box is the size of the thing ────────────────────────
{
  const w = 800, h = 600;
  const project = frontCam(w, h);
  const box = projectBox(project, { x: 0, z: -20, y: 0, kind: 'car' }, SIZES.car, w, h);
  assert(box, 'a car in front has a box');
  assert(box.w > 0 && box.h > 0, 'with area');

  // Closer is bigger.
  const near = projectBox(project, { x: 0, z: -10, y: 0, kind: 'car' }, SIZES.car, w, h);
  assert(near.w > box.w, 'a nearer car has a wider box');

  // A bus is bigger than a car at the same distance.
  const bus = projectBox(project, { x: 0, z: -20, y: 0, kind: 'bus' }, SIZES.bus, w, h);
  assert(bus.w > box.w, 'a bus is wider than a car');
}

// ── What is behind you is not drawn ───────────────────────
{
  const w = 800, h = 600;
  const project = frontCam(w, h);
  const behind = projectBox(project, { x: 0, z: 20, y: 0, kind: 'car' }, SIZES.car, w, h);
  assert(behind === null, 'a car behind the camera has no box');
}

// ── The label carries the name and the number ─────────────
{
  assert(labelFor({ label: 'dog', conf: 0.88 }) === 'dog 88%', 'the chip says both');
  assert(labelFor({ label: 'bicycle', conf: 0.5 }) === 'bicycle 50%', 'and rounds honestly');
  assert(labelFor({ label: 'stopSign', conf: 0.9 }) === 'stop sign 90%', 'camel-case classes read as words');
}

// ── The sizes are real things' sizes ──────────────────────
{
  assert(SIZES.car.L > 4 && SIZES.car.L < 5, 'a car is about 4.4 m long');
  assert(SIZES.bus.L > 9, 'a bus is longer than a car');
  assert(SIZES.person.H > 1.6 && SIZES.person.H < 1.9, 'a person is about 1.75 m tall');
  assert(SIZES.sportsBall.L < 0.3, 'a ball is not a boulder');
}

console.log('cv-overlay: all checks passed · the box is the size of the thing · '
  + 'behind you is not drawn · the chip says the name and the number');
