
## 2026-08-11 · UI clicks leaked into the 3D scene through a window-level raycast listener
- **What went wrong:** `onClick` (the raycast dispatcher) listened on `window`, so every HTML button's click also fired a ray into the scene at that screen position. Tapping "enter the pavilion" opened the portrait share sheet — the ray went through the door button into the poster wall behind it.
- **Correct behaviour:** a window-level scene-click listener must first check `e.target === renderer.domElement`. Only taps that BEGIN on the canvas may raycast; anything else is UI and already has its own handler.
- **How to recognise:** any `window.addEventListener('click'/'touchend', sceneHandler)` in a page that also has HTML chrome over the canvas. If a modal "opens itself" right after a UI tap, suspect this first.

## 2026-08-11 · Fixed-position HUD chips each hardcoding the same corner
- **What went wrong:** WALK and FOCUS both defaulted `.hud-chip`'s `top/right` and sat exactly on top of each other in host mode; the lang chip landed on the version stamp; the hint ran through the joystick ring. Nobody had measured the phone top strip as one composition.
- **Correct behaviour:** a rail of fixed chips is a COLUMN — declare every occupant's row in one place in the CSS, with a comment mapping the rows. Then measure with real mobile emulation (CDP `Emulation.setDeviceMetricsOverride`, `mobile: true`) and assert zero rect intersections between all HUD pairs.
- **How to recognise:** more than one element sharing `position: fixed` + the same corner offsets; any new chip added "next to" existing ones without a declared row.
