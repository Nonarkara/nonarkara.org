# nonarkara.org — product law

Live: https://nonarkara.org · Cloudflare Pages project `nonarkara-org` · ship via `./ship.sh`

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

- 3D room (Three.js, phone-safe — mass + edge lines, not a game engine dump)
- Screens that open real projects
- Furniture that opens CV / LinkedIn / contact
- Sky (real stars) and ground (where you stand)
- Aphorism wall (his voice)
- Easter eggs + a quiet discovery counter (gamified, never loud)

Default for `data-mode="guest"`. Must load fast on any phone. WebGL fallback → plan view.

## What previous agents did (so we stop repeating the miss)

v3.0–v3.1 shipped real backend organs (fleet history, braind, Worker capture queue, BRAIN tile). Those matter. They are mostly invisible on first glance. The room geometry was still the May 2026 wireframe CAD — that is why the site "looked the same." Visible surface work is the open debt. Backend is not thrown out.

## Conservation law

`visitor experience = host OS XOR guest Pavilion` on first entry; both remain reachable by toggle. Host never loses the all-day OS. Guest never lands in a private dashboard that isn't for them.

## Deploy

`./ship.sh` — stage with `.deployignore`, `wrangler pages deploy`, verify `NON_VERSION` on the live domain. GitHub Actions Cloudflare token is stale; OAuth on this machine is the path.

## Do not

- Replace the room with a card grid or a LinkedIn-style bio page
- Ship photoreal / heavy GLTF that kills mid-range phones
- Announce Easter eggs; they whisper
- Collapse app.js by >30% in one edit
- Resurrect the dead Supabase project `rxalmylnjdvsbiowqari`
