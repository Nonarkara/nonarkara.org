// Phone PLAN regression guard. The failure was not a bad button: app.js
// started animate() while the module was still evaluating, touched the later
// `let GROUND`, and never reached the door wiring on a fresh phone.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
// The theme decision, the words and the data live in common.js: the desk
// and the room share them, so the desk can be painted without the room.
const common = readFileSync(new URL('./common.js', import.meta.url), 'utf8');
// The theme and the view are decided in boot.js: a module that imports
// nothing, so both land before anything is painted.
const boot = readFileSync(new URL('./boot.js', import.meta.url), 'utf8');

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

// A deep-work home has one first action and does not open on market noise.
assert(/#hud-focus[\s\S]*?grid-column:\s*1\s*\/\s*-1/.test(css),
  'FOCUS must dominate the owner home grid');
assert(html.includes('class="plan-brief folded"') &&
  html.includes('id="os-signals-toggle"') && html.includes('aria-expanded="false"'),
  'market signals must begin folded');
// The theme rule now lives in boot.js, which imports nothing, so it lands on
// the body before the first paint rather than at the end of a module chain.
// The rule itself is unchanged: light by day, dark only at night.
assert(boot.includes("SAVED_THEME || (LOCAL_HOUR >= 18 || LOCAL_HOUR < 6 ? 'dark' : 'light')"),
  'first-run theme must be light by day and dark only at night');
assert(boot.includes("document.body.dataset.theme = THEME"),
  'the theme must be on the body before the first paint');
assert(common.includes("import { THEME, SAVED_THEME, LOCAL_HOUR } from './boot.js'"),
  'the room and the desk must read the one theme decision, not make their own');
// A desk named in the URL is on screen before the room's module graph is
// fetched: the view is decided in boot.js, too.
assert(boot.includes("document.body.dataset.view = VIEW"),
  'a desk named in the URL must be opened before the room is built');
assert(html.includes('<script type="module" src="boot.js"></script>'),
  'boot.js must be the page\'s first module');

console.log('plan: phone boot deferred · controls wired · focus-first · quiet signals · solar theme');
