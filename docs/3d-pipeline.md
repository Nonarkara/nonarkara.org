# Unreal Engine and Blender — what they can and cannot do for the estate

Assessed 2026-11-02. Measured against this repo, not against general claims.

## The constraints that decide it

| Fact (measured) | Why it matters |
|---|---|
| three.js core is 258 KB gzipped; the vendored build has no GLTFLoader, Draco or KTX2 | Any imported model costs a loader plus the model. Nothing is paid today. |
| The estate is 154 KB of procedural JS (savoye 42 KB, fallingwater 28 KB, farnsworth 20 KB…) | Geometry is *generated from the same numbers `walk.js` collides against*. That is the conservation law: one source of plan geometry. |
| Materials are `MeshBasicMaterial` (unlit); one real sun shadow map sized by device memory | The look is flat by design and cheap. Lighting is the thing that is missing, and the thing a bake can add for free. |
| `context.md` "Do not": no photoreal or heavy glTF that kills mid-range phones; guests must load fast on any phone | Hard budget. A visitor opens a shared link on a 390 px phone first (§11.8). |

## Unreal Engine — not in the runtime, yes in the studio

**Runtime: no.** Unreal has had no WebGL/HTML5 export since 4.24 (2019). The only web path is Pixel Streaming: a GPU server renders each visitor's session and streams video. That is a per-visitor cloud GPU bill, a connection-quality dependency, a cold start measured in seconds, and a first impression made of a loading spinner. It inverts the site's promise (loads fast on any phone, works with no GPU, falls back to the plan view). It also gives up the walk/collision code that is already tested.

**Studio: worth a day, when a still or a film is the product.** Movie Render Queue plus Lumen or path tracing produces the best architectural stills and walkthrough video available. Use it for: the `og.png` share card, a 20-second hero film for the Pavilion, press images of Savoye and Fallingwater. These ship as ordinary compressed images/video. No runtime cost, no new dependency, and the "no AI-generated images" rule is untouched because these are renders of the site's own geometry.

## Blender — yes, as an offline bake, one building first

Blender is scriptable (`blender -b -P script.py`), free, and exports glTF. The useful thing it does is the thing the unlit estate lacks: **baked light**.

1. **Baked ambient occlusion and sun/sky light into a texture, applied to the existing `MeshBasicMaterial`.** The building looks lit and grounded (contact shadows under the Farnsworth trays, under the Savoye pilotis, inside the Pavilion's roof plane) at zero per-frame cost and with no light in the scene. This is how phone-safe 3D gets depth.
2. **Hero props as glTF with meshopt compression.** The Traction Avant under the pilotis, furniture, the Barcelona chair: anything where procedural boxes read as a placeholder. Budget below.
3. **Offline truth renders** for visual regression: Cycles renders of the same geometry to compare against what the room shows.

### The rule that keeps this safe

Do **not** model the buildings in Blender and import them. That creates a second source of geometry that `walk.js` knows nothing about, and the room and the collision drift apart (the Savoye ramp incident in `tasks/lessons.md`, 2026-08-11, is exactly this failure).

Instead: the JS plan functions stay the single source. A small node script exports the *generated* scene to glTF with a second UV set, Blender bakes it headless, and only the **textures** come back. The geometry in the browser never changes.

### Spike, smallest testable thing

One building: the Barcelona Pavilion (origin, first thing a guest sees).

- Export the generated Pavilion to glTF (node, from the existing plan code).
- Bake AO + a fixed morning sun into one 1024 or 2048 px atlas.
- Load it lazily with the plan-view fallback intact; skip entirely when WebGL is absent or `deviceMemory <= 2`.
- **Budget (hard gate):** ≤ 250 KB for the building's bake as WebP/KTX2, fetched only after the room is interactive; first-load bytes unchanged; frame time within the existing `AdaptiveResolution` thresholds on a mid-range phone.
- **Done means:** side-by-side screenshots at 390 × 844, the spatial gate still 93/93, the byte-budget assertion in a test, and a way to turn it off.

If the spike misses the budget or the look does not clearly improve, it is deleted. Nothing else is built on it first.

## What this machine has today

Neither Blender nor Unreal is installed here (`/Applications` has neither; no `blender` on PATH). Blender is a ~400 MB cask (`brew install --cask blender`). Unreal needs the Epic launcher and tens of GB. Installing Blender is the only step the spike needs before it can start.

## Recommendation

1. Blender, bake-only, Pavilion first. Install it, run the spike, keep it only if it clears the budget.
2. Unreal, studio-only, when a hero film or share card is wanted. Not before.
3. No Pixel Streaming, no glTF buildings, no second geometry source.
