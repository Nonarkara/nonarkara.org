// Self-check for the fleet state machine. `node worker/test-fold.mjs`
// Covers the one thing that must not be wrong: when an alert fires.
import assert from "node:assert";
import { emptyFleet, foldRound, uptimeFor, isUp, PARKED } from "./src/index.js";

const at = m => new Date(Date.UTC(2026, 7, 5, 0, m * 5));  // cron ticks, 5 min apart
const round = (fleet, code, tick, domain = "nonarkara.org") =>
  foldRound(fleet, { [domain]: { code, ms: 120 } }, at(tick));

// ── code semantics ────────────────────────────────────────────
assert(isUp(200) && isUp(307) && isUp(399), "2xx/3xx are up");
assert(!isUp(404) && !isUp(530) && !isUp(0), "4xx/5xx/timeout are down");

// ── flap suppression: one bad probe never alerts ──────────────
let f = emptyFleet();
assert.equal(round(f, 200, 0).length, 0, "healthy probe is silent");
assert.equal(round(f, 502, 1).length, 0, "first failure is silent");
const down = round(f, 502, 2);
assert.equal(down.length, 1, "second consecutive failure alerts");
assert.equal(down[0].kind, "down");
assert.equal(round(f, 502, 3).length, 0, "staying down does not re-alert");
assert.equal(f.incidents.length, 1, "one incident opened");

// ── recovery closes the incident, exactly once ────────────────
const up = round(f, 200, 4);
assert.equal(up.length, 1, "recovery alerts");
assert.equal(up[0].kind, "up");
assert.equal(f.incidents[0].upAt, at(4).toISOString(), "incident closed");
assert.equal(round(f, 200, 5).length, 0, "staying up is silent");

// ── a single blip between healthy probes stays silent ─────────
let g = emptyFleet();
round(g, 200, 0); round(g, 503, 1); round(g, 200, 2);
assert.equal(g.incidents.length, 0, "isolated blip opens no incident");

// ── parked domains never alert ────────────────────────────────
let p = emptyFleet();
for (let i = 0; i < 5; i++) round(p, 404, i, PARKED[0]);
assert.equal(p.incidents.length, 0, "parked host is silent");
assert(p.history[PARKED[0]].length === 5, "parked host is still recorded");

// ── uptime arithmetic: 3 up of 4 probes = 75% ─────────────────
let u = emptyFleet();
round(u, 200, 0); round(u, 200, 1); round(u, 200, 2); round(u, 500, 3);
assert.equal(uptimeFor(u, "nonarkara.org").d1, 75, "24h uptime from history");
assert.equal(uptimeFor(u, "nonarkara.org").d7, 75, "7d uptime from rollups");

// ── ring buffer caps at 24h ───────────────────────────────────
let r = emptyFleet();
for (let i = 0; i < 300; i++) round(r, 200, i);
assert.equal(r.history["nonarkara.org"].length, 288, "history capped at 288");

console.log("fleet state machine: all checks passed");
