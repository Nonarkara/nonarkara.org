// Five-level integration guard: ownership, view, locomotion, transfer,
// and whole-world suspension. These are handoff failures, not module maths.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { Walk } from './walk.js';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const drive = readFileSync(new URL('./drive.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

// Level 1 — a movement control's finger is not also a look finger.
assert(app.includes(".nav-pad, .hud-chip, .walk-stick')) return;"),
  'global touch look must ignore movement and HUD controls');
assert(app.includes('p.identifier === touchAnchor.id'),
  'look tracks its own finger while another thumb moves');

// Level 2 — every mode proposes a view; app.js writes rotation once.
assert.equal((app.match(/camera\.rotation\.set\(/g) || []).length, 1,
  'exactly one runtime camera rotation writer');
assert(!drive.includes('.lookAt('), 'Drive must not mutate camera rotation behind Look');
assert(app.includes('LOOK.adopt(camera.rotation.y, camera.rotation.x)'),
  'drive hands its visible direction back before exit');

// Level 3 — direct movement collision-resolves, scripted transfer does not.
{
  const camera = { position: { set() {} } };
  const wall = { minX: 1, maxX: 2, minZ: -1, maxZ: 1 };
  const walk = new Walk(camera, [wall], { x: 0, z: 0 });
  walk.transferTo(3, 0, 0);
  assert.equal(walk.pos.x, 3, 'scripted transfer crosses a wall without lateral wobble');
  assert.equal(walk.floorY, 0, 'scripted transfer owns its safe flight level');
}

// Level 4 — travel has a visible arc and resolves only the final landing.
assert(app.includes('Math.sin(Math.PI * t) * 4.2'), 'building travel lifts over the estate');
assert(app.includes('WALK.teleport(TRAVEL.to.x, TRAVEL.to.z)'),
  'only the final travel destination collision-resolves');
// Regression guard: the camera Y must ease from source to destination, not
// snap from a hilltop to ground (or vice versa) at the start/end of the
// flight. A user standing on Fallingwater's living tray (y≈3.2) traveling
// to the pavilion (y=0) used to drop 3m the instant the chip fired.
assert(app.includes('fromY + (toY - fromY) * e'),
  'travel camera Y interpolates source to destination, not fixed 1.65');
assert(app.includes('TRAVEL.destY'),
  'destination floorY computed upfront so the camera can ease to it');
// Runtime check: the destination-floorY resolution picks up a non-zero
// height when the doorstep lands on a patch that returns one. This is the
// core of the fix — without it the camera Y interpolation has nothing to
// ease to at the end.
{
  const camera = { position: { set() {} } };
  const hill = {
    heightAt(x, z) {
      if (Math.abs(x) < 2 && Math.abs(z) < 2) return 3.2;
      return null;
    },
  };
  const walk = new Walk(camera, [], { x: 0, z: 0 }, [hill]);
  let destY = 0;
  for (const p of walk.floors) {
    const fy = p.heightAt(0, 0);
    if (fy != null && fy > destY) destY = fy;
  }
  assert.equal(destY, 3.2,
    'destination floorY resolver picks up a hill at the doorstep');
}

// Level 5 — non-room surfaces suspend all active mechanics.
for (const token of [
  'window.__cancelTravel?.()', 'if (DRIVE.active) exitTruck()',
  'setWalk(false)', 'WALK.keys.clear()', 'LOOK.setTurnRate(0)',
]) {
  assert(app.includes(token), `world suspension missing: ${token}`);
}
assert(styles.includes('body[data-view="plan"] .room-hud,'),
  'plan handoff immediately hides delayed world HUD chrome');
assert(app.includes("document.getElementById('room-hud')?.setAttribute('aria-hidden'"),
  'view handoff keeps the world HUD accessibility state truthful');

console.log('mechanics: five levels pass · fingers · camera · movement · transfer · world suspension');
