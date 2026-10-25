/**
 * SIDE CAMERA — what the truck sees past its own shoulder.
 *
 * A truck's mirrors do not show you the world. They show you a camera
 * feed: a wide lens, mounted on the flank, pointed rearward and a little
 * outward, with the ground sliding away and everything in the frame
 * annotated by the same detector that annotates the front.
 *
 * So the mirrors are drawn, not rendered. A second and third WebGL
 * render pass would triple the frame cost of a scene that is already
 * heavy, and a mirror in a driving game exists to tell you what is beside
 * you — which is a list of things and where they are, not a beauty render.
 * The projection here is a real pinhole camera: the same arithmetic a
 * camera does, so a thing 4 m off the flank lands 4 m off the flank in
 * the picture.
 *
 * The boxes carry the same labels and the same percentages as the front
 * view, because it is the same computer looking.
 */

import { SIZES, confColour, projectBox } from './cv-overlay.js';
import { BODY_LABEL, classConfidence, detectChance, sightRange } from './vision.js';

/** How wide the side lens is. A real flank camera is very wide. */
export const SIDE_FOV = (100 * Math.PI) / 180;

/** Where the side camera is mounted: on the flank, at mirror height, a little back. */
const MOUNT = { y: 1.22, back: 0.5, out: 0.96 };

/**
 * A pinhole camera on the truck's flank.
 *
 * `side` is −1 for the left flank and +1 for the right. The camera looks
 * rearward and a little outward, which is what a flank camera does: the
 * point of it is to fill the space beside the truck that the driver
 * cannot see into.
 */
export function sideCamera(ego, side, width, height) {
  const s = Math.sin(ego.heading), c = Math.cos(ego.heading);
  // forward = (−s, −c); right = (c, −s)
  const fx = -s, fz = -c;
  const rx = c, rz = -s;

  // The mount point: out along the flank, back along the truck.
  const px = ego.x + rx * side * MOUNT.out - fx * MOUNT.back;
  const pz = ego.z + rz * side * MOUNT.out - fz * MOUNT.back;

  // The look direction: mostly rearward, some outward.
  const backX = -fx, backZ = -fz;
  const outX = rx * side, outZ = rz * side;
  let lx = backX * 0.84 + outX * 0.54;
  let lz = backZ * 0.84 + outZ * 0.54;
  const l = Math.hypot(lx, lz) || 1;
  lx /= l; lz /= l;

  // The camera's own right: perpendicular to the look, in the ground plane.
  const ux = -lz, uz = lx;

  const tanHalf = Math.tan(SIDE_FOV / 2);
  const aspect = width / Math.max(1, height);

  /** World point → normalised device coordinates for this camera. */
  return function project(x, y, z) {
    const dx = x - px, dy = y - MOUNT.y, dz = z - pz;
    const depth = dx * lx + dz * lz;
    if (depth <= 0.15) return { x: 0, y: 0, z: 2 };   // behind the lens
    const lateral = dx * ux + dz * uz;
    const nx = (lateral / depth) / (tanHalf * aspect);
    const ny = (dy / depth) / tanHalf;
    // Depth normalised the same way the main camera normalises it, so the
    // box sorter can treat the two the same way.
    return { x: nx, y: ny, z: depth / 120 };
  };
}

/**
 * Each flank lens gets its own perception pass. Feeding it the front
 * camera's tracks made both mirrors blind to precisely the objects beside
 * and behind the truck that a side camera exists to reveal.
 */
export function sideDetections(ego, objects, side, condition, width, height) {
  const project = sideCamera(ego, side, width, height);
  const R = sightRange(ego, condition);
  const out = [];
  for (const obj of objects || []) {
    if (!obj || obj === ego || obj.gone) continue;
    const d = Math.hypot(obj.x - ego.x, obj.z - ego.z);
    if (d > R) continue;
    const box = projectBox(project, obj, SIZES[obj.kind] ?? SIZES.person, width, height);
    if (!box || box.x + box.w < 0 || box.x > width || box.y + box.h < 0 || box.y > height) continue;
    const body = obj.kind === 'car' ? (obj.body ?? 'car') : 'car';
    const chance = detectChance(ego, obj.kind, d, condition, body);
    if (chance < 0.18) continue;
    const kind = obj.kind;
    const label = kind === 'car' ? BODY_LABEL[body] : kind;
    out.push({
      ...obj,
      d,
      far: d / R,
      named: obj.named !== false,
      label: obj.named === false ? null : label,
      conf: obj.named === false ? 0 : classConfidence(label, d / R, condition, body),
      box,
    });
  }
  return out.sort((a, b) => a.d - b.d);
}

/**
 * Draw one side camera feed.
 *
 * The ground is drawn as a perspective grid because that is what a
 * flank camera sees — the floor streaming away under the truck — and
 * without it the boxes float in a void and read as a diagram rather
 * than as a camera.
 */
export function drawSideFeed(ctx, state) {
  const { ego, side, tracks = [], objects = null, width, height, condition = 'day' } = state;
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);

  const project = sideCamera(ego, side, width, height);

  // The feed's own darkness. A camera at night is a camera at night.
  ctx.fillStyle = condition === 'night' ? '#05070a' : condition === 'rain' ? '#35414a' : '#66849a';
  ctx.fillRect(0, 0, width, height / 2);
  ctx.fillStyle = condition === 'night' ? '#0a1014' : '#26343a';
  ctx.fillRect(0, height / 2, width, height / 2);

  // The horizon: level with the camera, so it sits at the vertical centre.
  ctx.strokeStyle = 'rgba(174,196,218,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  // Ground lines running away from the camera. They are the frame of
  // reference that makes the distance legible.
  ctx.strokeStyle = 'rgba(138,164,192,0.30)';
  ctx.beginPath();
  for (let i = -4; i <= 4; i++) {
    const p = project(ego.x + 0, 0, ego.z);
    // Anchor lines on the camera's own axes, projected to the floor.
    const a = sideCameraPoint(ego, side, i * 2.2, 0.1, width, height);
    const b = sideCameraPoint(ego, side, i * 2.2, 12, width, height);
    if (!a || !b) continue;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  // The detected objects, boxed and named, nearest first.
  const sensed = objects
    ? sideDetections(ego, objects, side, condition, width, height)
    : tracks;
  const drawn = [];
  for (const tr of sensed) {
    const dims = SIZES[tr.kind] ?? SIZES.person;
    const box = projectBox(project, { x: tr.x, z: tr.z, y: tr.y ?? 0, kind: tr.kind }, dims, width, height);
    if (!box) continue;
    drawn.push({ tr, box });
  }
  drawn.sort((a, b) => b.box.depth - a.box.depth);

  ctx.font = '600 9px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'top';
  const labelRects = [];
  for (const { tr, box } of drawn) {
    if (tr.named === false) {
      ctx.strokeStyle = 'rgba(200,216,232,0.30)';
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.setLineDash([]);
      continue;
    }
    const colour = confColour(tr.conf ?? 0);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    const text = `${String(tr.label).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()} `
      + `${Math.round((tr.conf ?? 0) * 100)}%`;
    const tw = ctx.measureText(text).width;
    const labelX = Math.max(0, Math.min(box.x, width - tw - 6));
    const labelY = Math.max(0, Math.min(box.y - 11, height - 26));
    const overlaps = labelRects.some((r) =>
      labelX < r.x + r.w && labelX + tw + 6 > r.x &&
      labelY < r.y + 11 && labelY + 11 > r.y);
    if (overlaps) continue;
    labelRects.push({ x: labelX, y: labelY, w: tw + 6 });
    ctx.fillStyle = colour;
    ctx.fillRect(labelX, labelY, tw + 6, 11);
    ctx.fillStyle = '#0b0e12';
    ctx.fillText(text, labelX + 3, labelY + 1);
  }

  // The label of the lens itself. Which mirror you are looking at matters
  // more than it sounds: a box on the left is a thing on the left.
  const cap = `${side < 0 ? 'CV · LEFT' : 'CV · RIGHT'} · ${drawn.length} TRACK${drawn.length === 1 ? '' : 'S'}`;
  ctx.font = '600 9px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = 'rgba(11,14,18,0.7)';
  ctx.fillRect(0, height - 15, ctx.measureText(cap).width + 10, 15);
  ctx.fillStyle = '#9fb3c8';
  ctx.fillText(cap, 5, height - 13);
}

/**
 * A point in the camera's own frame: `out` metres to the side, `ahead`
 * metres back along the truck. Used to lay the ground lines.
 */
function sideCameraPoint(ego, side, out, ahead, width, height) {
  const s = Math.sin(ego.heading), c = Math.cos(ego.heading);
  const fx = -s, fz = -c;
  const rx = c, rz = -s;
  const backX = -fx, backZ = -fz;
  const outX = rx * side, outZ = rz * side;
  let lx = backX * 0.84 + outX * 0.54;
  let lz = backZ * 0.84 + outZ * 0.54;
  const l = Math.hypot(lx, lz) || 1;
  lx /= l; lz /= l;
  const px = ego.x + rx * side * MOUNT.out - fx * MOUNT.back + outX * out + backX * ahead;
  const pz = ego.z + rz * side * MOUNT.out - fz * MOUNT.back + outZ * out + backZ * ahead;
  const dx = px - (ego.x + rx * side * MOUNT.out - fx * MOUNT.back);
  const dz = pz - (ego.z + rz * side * MOUNT.out - fz * MOUNT.back);
  const depth = dx * lx + dz * lz;
  if (depth <= 0.15) return null;
  const ux = -lz, uz = lx;
  const lateral = dx * ux + dz * uz;
  const tanHalf = Math.tan(SIDE_FOV / 2);
  const aspect = width / Math.max(1, height);
  const nx = (lateral / depth) / (tanHalf * aspect);
  return { x: (nx * 0.5 + 0.5) * width, y: height / 2, z: depth };
}
