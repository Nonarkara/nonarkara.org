# nonarkara.org — product law

Live: https://nonarkara.org · also https://www.nonarkara.org · Cloudflare Pages project `nonarkara-org` · ship via `./ship.sh`

## What this site is (the drawing board, 2026-08-06)

Two surfaces. One site. Do not collapse them into each other.

### 1. NON OS — host surface (keep open all day)

The personal operating system. Pristine, dense, only Non needs to understand it at a glance.

- Clock (Bangkok), today's intent, focus / steps
- Fleet console — health of every live system
- Signals — markets + weather
- Brain vitals (counts only; contents stay on the laptop)
- Morning brief
- Note capture → Worker KV → braind on the M5

Default for `data-mode="host"`. Phone-first. No WebGL required.

### 2. The Pavilion — guest / discovery surface (the escape room, rebuilt)

A walkable memory palace where strangers who want to can discover who Non is — by looking, not by reading a bio.

- 3D estate (Three.js, phone-safe — plan geometry, not SketchUp Warehouse meshes): Barcelona Pavilion at origin, Glass House NE, Savoye NW, Farnsworth House south (v4.9)
- Screens that open real projects
- Furniture that opens CV / LinkedIn / contact
- Sky (real stars) and ground (where you stand)
- Aphorism wall (his voice)
- Easter eggs + a quiet discovery counter (gamified, never loud)

Default for `data-mode="guest"`. Must load fast on any phone. WebGL fallback → plan view.

## What previous agents did (so we stop repeating the miss)

v3.0–v3.1 shipped real backend organs (fleet history, braind, Worker capture queue, BRAIN tile). Those matter. They are mostly invisible on first glance. The room geometry was still the May 2026 wireframe CAD — that is why the site "looked the same." Visible surface work is the open debt. Backend is not thrown out.

**v3.2 scar (2026-08-06):** shipped dual-surface routing + discovery + "architectural mass" at `#0a0e14` on black. Deploy was real (`PAVILION` HUD label). Look was not. Dr Non could not tell the difference from May. Rule: if a visual change needs a hex debugger to prove, it did not ship. v3.3 lights the TV wall, paints charcoal fills, and puts the discovery chip where you cannot miss it.

**v4.4→4.5 scar (2026-08-06):** `S` both walked backwards and toggled the sky. WASD enabled walk without pointer-lock, so the mouse could not look. Keyboard felt broken; sky/ground felt "missing." Fix: U/J for sky/ground, setWalk on WASD (pointer-lock), turn on baseRotY, pitch-to-enter.

**v4.10 Savoye promenade (2026-08-07):** Villa Savoye is no longer a façade you walk up to. Traction Avant under the pilotis; central ramp is a floor (not a wall); walk.js lifts the eye via sticky floor patches so stacked flights do not teleport you to the roof. Living terrace (north) and roof garden are reachable — look up for sky. Farnsworth still sits on the y≈0 well trick until someone raises its tray.

**Architizer / SketchUp icons (2026-08-07):** No local `.skp` files found on this machine. Estate icons are procedural plans from the same numbers the walk collides against — never Warehouse megabyte meshes. Farnsworth (Plano 1951) is the fourth building; next candidates from the Architizer free list if asked: Church of the Light, Fallingwater, Ronchamp.

## Conservation law

`visitor experience = host OS XOR guest Pavilion` on first entry; both remain reachable by toggle. Host never loses the all-day OS. Guest never lands in a private dashboard that isn't for them.

## Deploy

`./ship.sh` — stage with `.deployignore`, `wrangler pages deploy`, verify build hash on the live domain. GitHub Actions Cloudflare token is stale; OAuth on this machine is the path.

**Cache layers (do not call a deploy “visible” from one probe):** (1) SW cache-first — fixed network-first for CODE. (2) Version-number collision — fixed via `NON_BUILD` git hash. (3) Pages 4h edge cache ignoring query strings — `_headers` `no-cache` on code (honoured on `*.pages.dev`). (4) Custom-domain zone Browser Cache TTL rewrites JS/CSS to `max-age=14400` even when origin says `no-cache` — still open as of 2026-08-07. Zone `8809ee955a8edb681c34f45ed8f5b765` (`nonarkara.org`). Fix API: `PATCH /zones/{zone_id}/settings/browser_cache_ttl` with `{"value":0}` (= Respect Existing Headers). Wrangler OAuth has `zone (read)` only — PATCH returns `{"code":10000,"message":"Authentication error"}`. Needs an API token with **Zone Settings:Edit** on that zone (or broader Zone:Edit). Until then `/heal` + self-heal (`Clear-Site-Data`) is the client escape. Music/portraits keep long immutable cache on purpose.

**www custom domain (2026-08-07):** Apex was on Pages; `www` DNS was orange-cloud to CF but not a Pages project domain → intermittent/hard **522**. Added via `POST /accounts/.../pages/projects/nonarkara-org/domains` `{"name":"www.nonarkara.org"}`. Now `active` (Google CA, http validation). Domains: `nonarkara-org.pages.dev`, `nonarkara.org`, `www.nonarkara.org`.

## Do not

- Replace the room with a card grid or a LinkedIn-style bio page
- Ship photoreal / heavy GLTF that kills mid-range phones
- Announce Easter eggs; they whisper
- Collapse app.js by >30% in one edit
- Resurrect the dead Supabase project `rxalmylnjdvsbiowqari`
