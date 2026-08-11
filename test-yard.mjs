// Self-check for the yard: path network, field placement, shot
// judgement, ball flight. `node test-yard.mjs`
import assert from 'node:assert';
import { NODES, EDGES, PITCH, COURT, judgeShot, ballAt, colliderBoxes, PATH_W } from './yard.js';
import { PLAN as PAV } from './pavilion.js';
import { PLAN as GH } from './glasshouse.js';
import { PLAN as SAV } from './savoye.js';
import { PLAN as FW } from './fallingwater.js';

// ── Network sanity ────────────────────────────────────────
{
  for (const [a, b] of EDGES) {
    assert(NODES[a] && NODES[b], `edge ${a}–${b} names real nodes`);
  }
  // Every building has at least one path reaching toward it.
  const near = (n, x, z, r) => Math.hypot(NODES[n].x - x, NODES[n].z - z) < r;
  assert(near('glass', GH.origin.x, GH.origin.z, 16), 'a path reaches the Glass House');
  assert(near('savoye', SAV.origin.x, SAV.origin.z, 16), 'a path reaches Savoye');
  assert(near('fw', FW.origin.x + FW.spawn.x, FW.origin.z + FW.spawn.z, 8),
    'a path reaches the Fallingwater approach');
  assert(PATH_W >= 2, 'paths are walkable side by side');
}

// ── Fields sit in the open, clear of every footprint ──────
{
  const rects = [
    { x0: PITCH.cx - PITCH.w / 2, x1: PITCH.cx + PITCH.w / 2,
      z0: PITCH.cz - PITCH.d / 2, z1: PITCH.cz + PITCH.d / 2 },
    { x0: COURT.cx - COURT.w / 2, x1: COURT.cx + COURT.w / 2,
      z0: COURT.cz - COURT.d / 2, z1: COURT.cz + COURT.d / 2 },
  ];
  const buildings = [
    { x0: -PAV.podium.w / 2, x1: PAV.podium.w / 2, z0: -PAV.podium.d / 2, z1: PAV.podium.d / 2 },
    { x0: GH.origin.x - GH.podium.w / 2, x1: GH.origin.x + GH.podium.w / 2,
      z0: GH.origin.z - GH.podium.d / 2, z1: GH.origin.z + GH.podium.d / 2 },
    { x0: SAV.origin.x - SAV.box.w / 2, x1: SAV.origin.x + SAV.box.w / 2,
      z0: SAV.origin.z - SAV.box.d / 2, z1: SAV.origin.z + SAV.box.d / 2 },
    { x0: FW.origin.x + FW.hill.x0, x1: FW.origin.x + FW.hill.x1,
      z0: FW.origin.z + FW.hill.z0, z1: FW.origin.z + FW.hill.z1 },
  ];
  const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
  for (const r of rects) for (const b of buildings) {
    assert(!overlap(r, b), 'a field overlaps a building footprint');
  }
  assert(!overlap(rects[0], rects[1]), 'the pitch overlaps the court');
}

// ── Shot judgement: in is in, out is out ──────────────────
{
  assert(judgeShot('goal', 0, 0.8), 'centre of the goal scores');
  assert(!judgeShot('goal', PITCH.goalW / 2 + 0.3, 0.8), 'wide of the post misses');
  assert(!judgeShot('goal', 0, PITCH.goalH + 0.4), 'over the bar misses');
  assert(judgeShot('hoop', 0.05, 0.02), 'through the ring scores');
  assert(!judgeShot('hoop', 0.8, 0), 'off the rim misses');
}

// ── Ball flight: leaves the hand, arcs, arrives ───────────
{
  const from = { x: 0, y: 1.3, z: 0 };
  const to = { x: 8, y: 1.2, z: 4 };
  const T = 0.9;
  const mid = ballAt(from, to, T / 2, T);
  assert(mid.y > Math.max(from.y, to.y), 'the ball arcs above both endpoints');
  const end = ballAt(from, to, T, T);
  assert(end.done, 'the flight ends');
  assert(Math.abs(end.x - to.x) < 1e-9 && Math.abs(end.z - to.z) < 1e-9, 'it lands where aimed');
}

// ── Posts and poles are solid, and thin ───────────────────
{
  const boxes = colliderBoxes();
  assert(boxes.length === 6, 'four posts + two poles');
  for (const b of boxes) {
    assert(b.maxX - b.minX < 0.3 && b.maxZ - b.minZ < 0.3, 'goal furniture stays thin');
  }
}

console.log('yard: all checks passed · paths reach every house · fields in the open · shots judged honestly');
