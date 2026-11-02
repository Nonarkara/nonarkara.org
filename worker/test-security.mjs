import assert from "node:assert";
import { isCaptureOriginAllowed, sanitizeCapture, keyOk } from "./src/index.js";

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

// The shared-secret check: header or query, exact match only, never empty.
{
  const req = (h = {}) => ({ headers: new Headers(h) });
  const u = (q = "") => new URL("https://api.test/x" + q);
  assert(keyOk(req({ Authorization: "Bearer s3cret" }), u(), "s3cret"), "bearer header must pass");
  assert(keyOk(req(), u("?key=s3cret"), "s3cret"), "query key must still pass (the daemon uses it)");
  assert(!keyOk(req(), u("?key=s3cre"), "s3cret"), "a prefix of the secret must fail");
  assert(!keyOk(req(), u("?key=s3crets"), "s3cret"), "the secret plus more must fail");
  assert(!keyOk(req(), u("?key=s3creT"), "s3cret"), "a same-length wrong key must fail");
  assert(!keyOk(req(), u(), "s3cret"), "no key must fail");
  assert(!keyOk(req(), u("?key="), ""), "an unset secret must never match an empty key");
  assert(!keyOk(req({ Authorization: "Bearer " }), u(), undefined), "an undefined secret must fail");
}

console.log("worker security: capture origin + payload allowlists + shared-secret check pass");
