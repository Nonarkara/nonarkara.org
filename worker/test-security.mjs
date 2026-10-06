import assert from "node:assert";
import { isCaptureOriginAllowed, sanitizeCapture } from "./src/index.js";

assert(isCaptureOriginAllowed("https://nonarkara.org"));
assert(isCaptureOriginAllowed("https://www.nonarkara.org"));
assert(!isCaptureOriginAllowed("http://nonarkara.org"));
assert(!isCaptureOriginAllowed("https://nonarkara.org.attacker.example"));
assert(!isCaptureOriginAllowed("null"));
assert(!isCaptureOriginAllowed(""));

assert.equal(sanitizeCapture({}), null);
assert.equal(sanitizeCapture({ text: "   " }), null);
assert.equal(sanitizeCapture({ text: "x".repeat(4001) }), null);

assert.deepEqual(
  sanitizeCapture({
    text: "  a note  ", source: "invented", session_id: "s".repeat(100),
    tags: ["one", 2, "t".repeat(60)], metadata: { admin: true },
  }),
  {
    text: "a note", source: "note", session_id: "s".repeat(80),
    tags: ["one", "t".repeat(40)], metadata: {},
  },
);

assert.deepEqual(
  sanitizeCapture({
    text: "Steps: 12000", source: "steps",
    metadata: { steps: 12000, date: "2026-10-02", extra: "drop me" },
  }).metadata,
  { steps: 12000, date: "2026-10-02" },
);
assert.deepEqual(
  sanitizeCapture({ text: "Steps", source: "steps", metadata: { steps: -1, date: "today" } }).metadata,
  {},
);

console.log("worker security: capture origin + payload allowlists pass");
