// Phone PLAN regression guard. The failure was not a bad button: app.js
// started animate() while the module was still evaluating, touched the later
// `let GROUND`, and never reached the door wiring on a fresh phone.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

// Boot must yield once before the render loop can touch world bindings that
// are initialized farther down the module.
assert(!/^animate\(\);$/m.test(app),
  'render loop must not execute synchronously during module evaluation');
assert(app.includes('requestAnimationFrame(animate);'),
  'render loop must start on the first post-initialization frame');
assert(app.includes('const groundNow = window.__ground;'),
  'early render path must use the published ground handle, not a later let');
assert(app.trimEnd().endsWith("document.body.dataset.appReady = '1';"),
  'readiness is published only after every synchronous initializer lands');

// Both directions remain reachable and truthful to assistive technology.
assert(html.includes('id="view-toggle" aria-label="Switch to plan view"'),
  'room must expose a labeled PLAN control');
assert(html.includes('id="plan-room"') && html.includes('aria-label="Enter 3D room"'),
  'PLAN must expose a labeled room control');
assert(app.includes("planRoomBtn.addEventListener('click'"),
  'PLAN → room control must be wired');
assert(app.includes("viewToggleBtn.addEventListener('click'"),
  'room → PLAN control must be wired');
assert(app.includes("planEl.setAttribute('aria-hidden', v === 'plan' ? 'false' : 'true')"),
  'view handoff must keep PLAN aria state truthful');

// The compact phone override used to shrink the button below the project's
// own 44px minimum. Keep the thumb target intact at the narrow breakpoint.
assert(/@media \(max-width: 600px\)[\s\S]*?\.view-toggle \{[\s\S]*?height:\s*44px;/.test(css),
  'phone PLAN control must keep a 44px touch target');

console.log('plan: phone boot deferred · controls wired · 44px touch target');
