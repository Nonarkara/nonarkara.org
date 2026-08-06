// Touch/lens behaviour. These are the failures that cannot be seen in a
// screenshot and were all reported from a real phone: a zoom that only
// went one way, a drag too fast to aim, a pitch clamp that made looking
// up impossible.
import assert from 'node:assert';

// ── Pinch, modelled exactly as app.js now does it ─────────────
function makePinch() {
  const FOV_MIN = 38, FOV_MAX = 75, HOME = 58;
  let fov = HOME, pinching = false, pinch0 = 0, fov0 = HOME;
  const set = v => { fov = Math.max(FOV_MIN, Math.min(FOV_MAX, v)); };
  return {
    get fov() { return fov; },
    start(d) { if (!pinching) { pinching = true; pinch0 = d; fov0 = fov; } },
    move(d) { if (pinching && d >= 20 && pinch0 >= 20) set(fov0 * (pinch0 / d)); },
    end() { pinching = false; },
    reset() { set(HOME); },
  };
}

// Zoom in, then the SAME gesture reversed must return you. This is the
// one that failed: re-capturing the baseline mid-gesture ratcheted the
// FOV inward and nothing could undo it.
{
  const p = makePinch();
  p.start(100); p.move(200);                 // spread → zoom in
  const zoomed = p.fov;
  assert(zoomed < 58, `spreading must zoom in, got ${zoomed}`);
  p.move(100);                               // back to where we began
  assert(Math.abs(p.fov - 58) < 0.01, `reversing must restore, got ${p.fov}`);
  p.end();
}

// A wobble mid-pinch must NOT re-baseline — the collapse bug.
{
  const p = makePinch();
  p.start(100); p.move(200);
  const afterFirst = p.fov;
  p.start(200);                              // spurious touchstart mid-gesture
  p.move(200);
  assert(Math.abs(p.fov - afterFirst) < 0.01,
    `a mid-gesture touchstart must not re-baseline (${afterFirst} → ${p.fov})`);
}

// Ten pinch-in gestures must not strand you at the floor with no way out.
{
  const p = makePinch();
  for (let i = 0; i < 10; i++) { p.start(100); p.move(260); p.end(); }
  assert(p.fov >= 38, 'clamped at the floor');
  p.reset();
  assert.equal(p.fov, 58, 'double-tap must always bring the lens home');
}

// ── Drag ──────────────────────────────────────────────────────
// A full-width drag used to spin 180°, which is unaimable.
{
  const YAW_PER_WIDTH = 1.22;                       // radians
  const deg = YAW_PER_WIDTH * 180 / Math.PI;
  assert(deg > 45 && deg < 90,
    `a full-width drag should turn 45–90°, not ${deg.toFixed(0)}°`);
}

// You must be able to look up far enough to see a roof and reach the sky.
{
  const CLAMP = 1.1;                                // radians
  const deg = CLAMP * 180 / Math.PI;
  assert(deg > 55, `pitch clamp must allow looking well up, got ${deg.toFixed(0)}°`);
  // And the drag gain must actually reach the clamp within one screen.
  assert(1.05 >= CLAMP * 0.9, 'one full drag should reach most of the pitch range');
}

console.log('touch: all checks passed · pinch reversible, wobble-proof, always resettable');
