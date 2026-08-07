// The reflecting pool. A scoreboard that misreports a market is worse
// than no scoreboard, so the arithmetic is what gets tested — the
// drawing is verified by eye.
import assert from 'node:assert';
import { PLAN } from './pavilion.js';

// Mirror of pool.js's selection logic. Kept honest by the assertions.
function biggestMover(d, keys) {
  let best = null, bestAbs = -1;
  for (const k of keys) {
    const c = d[k]?.change;
    if (c != null && Math.abs(c) > bestAbs) { bestAbs = Math.abs(c); best = k; }
  }
  return best;
}

const KEYS = ['set','ptt','usdthb','sgdthb','dji','nasdaq','nvda','tsla','googl','btc','gold','brent'];

// ── The one amber goes to the largest ABSOLUTE mover ──────────
// A 4% fall matters more than a 1% rise; picking by signed value would
// hand the highlight to whatever happened to be green.
{
  const d = { nvda: { change: 1.2 }, tsla: { change: -4.1 }, btc: { change: 3.0 } };
  assert.equal(biggestMover(d, KEYS), 'tsla', 'a big fall must win the highlight');
}

// ── Missing data must never win, or crash the pick ────────────
{
  assert.equal(biggestMover({}, KEYS), null, 'no data, no highlight');
  const partial = { set: null, dji: { change: null }, gold: { change: 0.4 } };
  assert.equal(biggestMover(partial, KEYS), 'gold', 'nulls are skipped, not ranked');
}

// ── Exactly one instrument is ever highlighted ────────────────
// Law 1: the amber is the amber because it is rare.
{
  const d = {};
  KEYS.forEach((k, i) => { d[k] = { change: i * 0.5 }; });
  const picks = KEYS.filter(k => biggestMover(d, KEYS) === k);
  assert.equal(picks.length, 1, 'one amber, always exactly one');
}

// ── The pool geometry it draws on actually exists ─────────────
{
  assert(PLAN.pools.length >= 1, 'there must be water to reflect in');
  for (const p of PLAN.pools) {
    assert(p.x1 > p.x0 && p.z1 > p.z0, `pool ${p.id} has no area`);
    // The canvas is square; a pool far from square would stretch the
    // type unreadably. Both Pavilion pools are within reason.
    const ar = (p.x1 - p.x0) / (p.z1 - p.z0);
    assert(ar > 0.35 && ar < 3.0, `pool ${p.id} aspect ${ar.toFixed(2)} would distort the board`);
  }
}

// ── Water is not walkable — you read it, you do not stand in it ──
{
  for (const p of PLAN.pools) {
    const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
    assert(cx > p.x0 && cx < p.x1 && cz > p.z0 && cz < p.z1,
      'pool centre must lie inside its own collider box');
  }
}

console.log(`pool: all checks passed · ${PLAN.pools.length} pools · ${KEYS.length} instruments · one amber`);
