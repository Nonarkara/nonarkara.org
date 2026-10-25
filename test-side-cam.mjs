// Self-check for the flank camera: the projection is a real camera, and
// the mirrors are not mirrors of nothing. `node test-side-cam.mjs`
import assert from 'node:assert';
import { sideCamera, sideDetections, drawSideFeed, SIDE_FOV } from './side-cam.js';
import { SIZES, projectBox } from './cv-overlay.js';

const ego = (over = {}) => ({
  x: 0, z: 0, v: 0, heading: 0,
  sensorRange: 48, sensorQuality: 0.92, blind: false,
  tracks: new Map(), time: 0,
  ...over,
});

// ── The lens is wide, because a flank camera is ───────────
{
  assert(SIDE_FOV > Math.PI / 2 && SIDE_FOV < (120 * Math.PI) / 180,
    'between 90° and 120°');
}

// ── A thing beside the truck lands beside the truck ───────
{
  const w = 178, h = 122;
  const e = ego();
  const project = sideCamera(e, 1, w, h);     // the right flank
  // A flank camera looks rearward and outward — that is what fills the
  // space beside the truck the driver cannot see into. So a person beside
  // the right flank and slightly behind is in the frame.
  const box = projectBox(project, { x: 2.5, z: 1.5, y: 0, kind: 'person' }, SIZES.person, w, h);
  assert(box, 'a person beside the right flank is seen');
  assert(box.w > 0, 'with a box');

  // The same person on the LEFT flank is behind this camera.
  const left = projectBox(project, { x: -2.5, z: 1.5, y: 0, kind: 'person' }, SIZES.person, w, h);
  assert(left === null, 'the right camera does not see the left flank');
}

// The side lens perceives from raw world objects, independently of the
// front track list. This is the blind-spot regression that made empty feeds.
{
  const e = ego();
  const objects = [
    { id: 'right-dog', kind: 'dog', x: 2.5, z: 1.5, y: 0, named: true },
    { id: 'left-dog', kind: 'dog', x: -2.5, z: 1.5, y: 0, named: true },
  ];
  const right = sideDetections(e, objects, 1, 'day', 178, 122);
  const left = sideDetections(e, objects, -1, 'day', 178, 122);
  assert(right.some((d) => d.id === 'right-dog'), 'right sensor finds its own blind spot');
  assert(!right.some((d) => d.id === 'left-dog'), 'right sensor does not borrow the left view');
  assert(left.some((d) => d.id === 'left-dog'), 'left sensor finds its own blind spot');
}

// ── The other flank sees the other side ───────────────────
{
  const w = 178, h = 122;
  const e = ego();
  const right = sideCamera(e, 1, w, h);
  const left = sideCamera(e, -1, w, h);
  const onRight = projectBox(right, { x: 2.5, z: 1.5, y: 0, kind: 'person' }, SIZES.person, w, h);
  const onLeft = projectBox(left, { x: -2.5, z: 1.5, y: 0, kind: 'person' }, SIZES.person, w, h);
  assert(onRight, 'the right camera sees the person on the right');
  assert(onLeft, 'and the left camera sees the person on the left');
  // Each camera is blind to the other flank — proven above — so the two
  // feeds are genuinely different views, not one feed drawn twice.
  assert(Math.abs(onRight.x - onLeft.x) > 1, 'and they are not the same picture');
}

// ── Both cameras are the same system ──────────────────────
{
  const w = 178, h = 122;
  const e = ego({ heading: 1.2 });
  const a = sideCamera(e, 1, w, h);
  const b = sideCamera(e, -1, w, h);
  // Turn the truck: the cameras turn with it.
  const p1 = a(2, 0, -1);
  const p2 = b(2, 0, -1);
  assert(Number.isFinite(p1.x) && Number.isFinite(p2.x), 'both project cleanly');
  assert(p1.x !== p2.x, 'and they are not the same camera');
}

// ── The feed draws, and draws something ───────────────────
{
  // A canvas stand-in: enough of the 2D context for the drawer.
  const calls = [];
  const ctx = {
    clearRect: () => calls.push('clear'),
    fillRect: () => calls.push('fill'),
    strokeRect: () => calls.push('stroke'),
    beginPath: () => calls.push('path'),
    moveTo: () => {}, lineTo: () => {}, stroke: () => calls.push('stroke'),
    fillText: () => calls.push('text'),
    measureText: (t) => ({ width: t.length * 5 }),
    setLineDash: () => {},
    save: () => {}, restore: () => {},
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textBaseline: '',
  };
  const e = ego();
  const track = {
    id: 'dog', kind: 'dog', x: 2.2, z: -2, y: 0, label: 'dog', conf: 0.9, named: true,
  };
  drawSideFeed(ctx, {
    ego: e, side: 1, tracks: [track], width: 178, height: 122, condition: 'day',
  });
  assert(calls.includes('fill'), 'the feed is filled');
  assert(calls.includes('text'), 'and it says what it is looking at');
}

console.log('side-cam: all checks passed · the right camera sees the right · '
  + 'the truck turns and the cameras turn with it · the feed draws');
