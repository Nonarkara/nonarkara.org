
## 2026-08-11 · UI clicks leaked into the 3D scene through a window-level raycast listener
- **What went wrong:** `onClick` (the raycast dispatcher) listened on `window`, so every HTML button's click also fired a ray into the scene at that screen position. Tapping "enter the pavilion" opened the portrait share sheet — the ray went through the door button into the poster wall behind it.
- **Correct behaviour:** a window-level scene-click listener must first check `e.target === renderer.domElement`. Only taps that BEGIN on the canvas may raycast; anything else is UI and already has its own handler.
- **How to recognise:** any `window.addEventListener('click'/'touchend', sceneHandler)` in a page that also has HTML chrome over the canvas. If a modal "opens itself" right after a UI tap, suspect this first.

## 2026-08-11 · Fixed-position HUD chips each hardcoding the same corner
- **What went wrong:** WALK and FOCUS both defaulted `.hud-chip`'s `top/right` and sat exactly on top of each other in host mode; the lang chip landed on the version stamp; the hint ran through the joystick ring. Nobody had measured the phone top strip as one composition.
- **Correct behaviour:** a rail of fixed chips is a COLUMN — declare every occupant's row in one place in the CSS, with a comment mapping the rows. Then measure with real mobile emulation (CDP `Emulation.setDeviceMetricsOverride`, `mobile: true`) and assert zero rect intersections between all HUD pairs.
- **How to recognise:** more than one element sharing `position: fixed` + the same corner offsets; any new chip added "next to" existing ones without a declared row.

## 2026-08-11 · Multi-terrace floor patches must rise in approach order under FLOOR_STEP
- **What went wrong:** Farnsworth’s hi-steps between the lower terrace and the upper tray were indexed from the north (low z). The first riser off the lower deck jumped 0.85m; walk.js `FLOOR_STEP` is 0.55m, so the climber stayed on grass and walked under the house at y=0.
- **Correct behaviour:** order step patches in the direction the walker approaches. Each consecutive rise must be ≤ `FLOOR_STEP`. For a south→north climb, i=0 is the high-z riser.
- **How to recognise:** a walk test that ends at `floorY=0` under a lifted tray, or any gap flight whose first sample from the approach side jumps more than ~0.55m.

## 2026-08-11 · Flat floor patches swallowed rising stairs (walk.js arbitration asymmetry)
- **What went wrong:** the sticky floor patch only re-arbitrated when the CURRENT patch descended. On flat ground (Fallingwater's streambed) the walker strolled straight under the hatch stair — the rising patch never won, so the stair was climbable top-down but not bottom-up.
- **Correct behaviour:** while the sticky patch is flat-or-rising, scan for another patch that is genuinely higher (> 2cm) and still within FLOOR_STEP of the current floor — that is a climb; take it. Symmetric to the existing descend-switch.
- **How to recognise:** any walkable slope that works in one direction only; a walker whose floorY never changes while crossing a stair's footprint.

## 2026-08-11 · Teleporting into a collider bricks the walker
- **What went wrong:** teleport() placed the walker wherever asked; inside a solid, per-axis collision zeroes velocity on both axes forever — stuck until reload, no visible cause.
- **Correct behaviour:** teleport depenetrates — if the target is blocked, spiral-search (12 directions × 0.5m rings, up to 4m) for the nearest open point.
- **How to recognise:** pos frozen, vel zeroed every frame, keys held; any teleport/travel API without a blocked-target check.

## 2026-08-11 · Gyro zeroed on its first sample, which arrives before the user is holding the phone
- **What went wrong:** `deviceorientation` calibration captured `gyroBetaZero` from the FIRST event, which fires the instant permission is granted — phone flat on a table or mid-pickup. Neutral ≈ 0° meant every natural hold (beta 60–80°) read as a 70° upward tilt: the user could only see the horizon by holding the phone parallel to the floor, and nothing ever re-zeroed.
- **Correct behaviour:** neutral is a KNOWN human constant (72° = how people hold phones), not whatever arrived first. Only accept a first-sample calibration if it is plausibly a hold (30–110°). Always ship an explicit recentre control. Clamp the gyro's contribution (±40°) so it can never pin the camera and the finger always has somewhere to go.
- **How to recognise:** any absolute-sensor input calibrated on first sample; symptom is "I have to hold the device in an unnatural position to use it."

## 2026-08-11 · A control that only exists in one mode is a control that doesn't exist
- **What went wrong:** the touch thumbstick was created and `.in`-classed only inside `setWalk(true)`. A phone visitor arrived in the room with no visible way to move until they guessed the WALK chip; and entering the truck (`WALK.enabled = false`) removed the stick, making the truck enterable but undrivable on the only device where it mattered.
- **Correct behaviour:** the primary movement control exists from the start on touch devices; touching it IS the request to move. Modes that suspend a system must not delete its UI — freeze the system (stop calling update) and let the other consumer read the same input.
- **How to recognise:** UI created inside a mode-enter branch; any `enabled = false` that also hides an input surface.

## 2026-08-11 · Ball games: three physics invariants that each looked like a different bug
- **What went wrong:** (1) a shot launched from the player's own position was re-picked-up on the next frame and hovered in front of them; (2) a solved parabola aimed AT a goal plane stops 0cm short of crossing it, and one aimed below a hoop crosses rim height 1.2m downrange; (3) the launch solve ignored the air drag the integrator applied, undershooting ~7% — invisible close in, a guaranteed miss at 20m.
- **Correct behaviour:** release cooldown after a shot; aim BEYOND a crossing plane and EXACTLY at a ring (with T forced past the apex so arrival is descending); and the solve must model whatever drag the step applies — `v₀ = dx·k/(1−e^(−kT))`.
- **How to recognise:** projectile that never leaves the hand, shots that visually pass through a target without scoring, or misses that scale with distance. Test by integrating the real step function, never a drag-free closed form.

## 2026-08-11 · Villa Savoye's ramp is straight; the SPIRAL is the separate stair
- **What went wrong:** an agent rewrote Savoye's straight 4-flight axial ramp as a single helix, describing it as "what Le Corbusier actually built," and deleted the working switchback geometry (11 floor patches → 3) plus its tests. Corbusier built a straight, centrally-aligned, double-flight ramp AND a tight spiral staircase beside it — the pairing (slow ceremonial vs fast utilitarian) is the argument of the building. Conflating them replaces a correct feature with a wrong one.
- **Correct behaviour:** check a named architectural claim against a source before rewriting geometry around it, especially when the rewrite deletes tested code. When an agent's usability complaint is fair but its diagnosis is wrong, keep the complaint and fix the real cause — here: restore the ramp, and add the spiral stair that was missing, which gives the fast route the complaint was actually asking for.
- **How to recognise:** a commit that justifies deleting a feature with "this is what X really is"; a large drop in test-covered surface (patches/colliders) framed as simplification.

## 2026-08-11 · A wrapper that drops an argument is invisible in a module test and total in the scene
- **What went wrong:** extending the floor-patch protocol to `heightAt(x, z, curY)` let a helical stair answer for the lap the walker is on. It passed its module test perfectly and stalled after exactly one turn in the live scene: the per-building origin-offset wrapper was `(x, z) => f.heightAt(x - o.x, z - o.z)` — the third argument never arrived, so the helix always answered for lap 0.
- **Correct behaviour:** when widening a callback protocol, grep every wrapper/adapter for the old arity and forward the new parameter. Module tests call the patch directly and therefore cannot see a lossy wrapper — the check has to run in the assembled scene.
- **How to recognise:** behaviour that is correct in isolation and wrong in situ; any `(a, b) => f(a', b')` forwarding layer near a protocol you just extended.
