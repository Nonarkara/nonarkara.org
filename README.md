<p align="center">
  <img src="docs/hero-banner.png" alt="Manga-style workshop street at dusk in Bangkok: a civic studio window, maps on the desk, and a cyan city-block HUD. The HUD overlays are illustration only — not a live product surface." width="100%">
</p>
<p align="center"><em>Workshop street / civic maps. The cyan HUD is <strong>illustration only</strong> — a drawing of the idea, not a live command surface.</em></p>

# nonarkara.org

**Live: [https://nonarkara.org](https://nonarkara.org)** · also [www.nonarkara.org](https://www.nonarkara.org)

Personal civic site of **Dr Non Arkaraprasertkul** (ดร.นน อัครประเสริฐกุล) — urbanist, architect (MIT), anthropologist (Harvard), city-systems builder. Bangkok. GitHub [@Nonarkara](https://github.com/Nonarkara). Practice: [Axiom](https://github.com/Nonarkara/Axiom).

This repository is the source for that site. It is the studio's **front door**, not the catalogue. The site is trilingual — **EN / ไทย / 中文** — English first.

---

## What this is

A personal civic site. Two surfaces, one origin. They are not the same page with a theme switch.

**The Pavilion** is the guest surface: a walkable memory palace (Three.js, built to load on a phone). You find out who he is by looking — screens open real work; furniture opens CV, LinkedIn, contact. Barcelona Pavilion at the origin; Glass House, Villa Savoye, Farnsworth, Fallingwater around it.

**NON OS** is the host surface: the personal operating system he keeps open during the day. Clock (Bangkok), fleet health, signals, notes. Visitors land in the Pavilion, not in a private dashboard.

Plan view is there if WebGL is not.

The work lives next door, in its own public repositories. Do not treat this tree as the source of those systems.

| | GitHub | Live |
|---|---|---|
| **Axiom** — decision systems for cities and operators | [Nonarkara/Axiom](https://github.com/Nonarkara/Axiom) | [axiom.nonarkara.org](https://axiom.nonarkara.org) |
| **SLIC-Index** — the city ranking that declares what it measures | [Nonarkara/SLIC-Index](https://github.com/Nonarkara/SLIC-Index) | [slic.nonarkara.org](https://slic.nonarkara.org) |
| **FloodDash-Blueprint** — how to build a flood watch from open data (the blueprint, not the running code) | [Nonarkara/FloodDash-Blueprint](https://github.com/Nonarkara/FloodDash-Blueprint) | [flood.nonarkara.org](https://flood.nonarkara.org) |
| **BKKx** — Bangkok, heritage register and walking atlas | [Nonarkara/BKKx](https://github.com/Nonarkara/BKKx) | [bkk.nonarkara.org](https://bkk.nonarkara.org) |
| **zero-to-one** — reconstructable history of this GitHub account, from a city-reporter bot to an open civic studio | [Nonarkara/zero-to-one](https://github.com/Nonarkara/zero-to-one) | — |

The Pavilion's project wall points at more live systems. Those URLs are on the site; they are not duplicated here so this file cannot drift.

This is not a starter kit and not a consulting deck. If you want the method, start with [Axiom](https://github.com/Nonarkara/Axiom) and [zero-to-one](https://github.com/Nonarkara/zero-to-one). If you want a city ranking, go to SLIC. If you want to build a flood system, go to the blueprint.

---

## Philosophy

Zero-to-one studio tenets. They are constraints, not slogans.

**Fork the method.** The public studio publishes how a thing is made so another team can build their own. [FloodDash-Blueprint](https://github.com/Nonarkara/FloodDash-Blueprint) is the architecture, the formulas, and the roadmap — not the running source. [zero-to-one](https://github.com/Nonarkara/zero-to-one) is the reconstructable trail of this GitHub account. This repo is the door to that method, not a dump of every private system.

**One Mac.** Civic software here is meant to ship from one desk in Bangkok. FloodDash's public write-up is explicit: the reference system runs on one machine. This site ships the same way — a static tree and a Worker, not a vendor farm. If it only works as an enterprise install, it is the wrong shape for this studio.

**No black-box rankings.** If a number ranks a city, the formula is public and every score is traceable. [SLIC](https://github.com/Nonarkara/SLIC-Index) exists because most indices will not say what they measure, who paid, or what they left out. A ranking that will not declare its method is not used as authority here.

**Bilingual as audience.** Thai speakers are the audience, not a localization pass. English is the primary language of this repo; the live site is written for EN / ไทย / 中文 as first-class surfaces. Civic copy is for people who live in the city, not only for English-speaking evaluators.

---

## Ethical use

This is a **personal civic site**. It is not an official publication of depa, a ministry, or a city government. Linked systems that are independent civic work say so in their own READMEs — read those before citing them as institutional products.

- **Do not treat the banner HUD as a product.** The cyan maps in `docs/hero-banner.png` are illustration only. They are not an operations room, a live twin, or a command console.
- **Do not fabricate a number.** No invented metrics, awards, or rankings in a PR or a fork of this README. If a figure is not in this tree or a linked public repo, it does not belong here.
- **Do not present a ranking as a black box or a paid placement.** SLIC declares its pillars and refuses paid inclusion. Fork the method; do not imply endorsement or that a city bought its score.
- **Do not present a civic watch as an official warning.** Tools in this studio (flood, air, monitors) help people read public data faster. Legal warnings come from the agencies mandated to issue them.
- **Do not copy secrets, host-only paths, or biometrics out of this tree.** `.env` files, Worker secrets, voice samples, and the host OS are not the public door. [`.deployignore`](.deployignore) is the list of what must not ship.
- **Fork the method, not a private implementation.** Where the studio published a blueprint instead of source, that choice is the license of the idea. Build your own; send a link.

---

## How the site is built

Static files at the repo root. No framework, no site-level `package.json`, no compile step.

- `index.html`, `app.js`, `styles.css` — shell
- Building modules beside them (`pavilion.js`, `glasshouse.js`, `savoye.js`, `farnsworth.js`, `fallingwater.js`, walk/look/sky/ground)
- Three.js is vendored as `vendor-three-0.160.0.js`
- Tests are the `test-*.mjs` files next to the modules they cover

**Cloudflare Pages** is the host. Project name `nonarkara-org`. Custom domains `nonarkara.org` and `www.nonarkara.org` (`CNAME`).

On push to `main`, [`.github/workflows/cloudflare-pages.yml`](.github/workflows/cloudflare-pages.yml) stages a clean tree with [`rsync` + `.deployignore`](.deployignore) and deploys that directory with Wrangler (`pages deploy` → project `nonarkara-org`). Pages has no ignore mechanism of its own, so the workflow never uploads the raw git tree.

The studio ship path is [`./ship.sh`](ship.sh): stage the same way, stamp `NON_BUILD` with the git short hash (the repo keeps `'dev'`), deploy with Wrangler from a signed-in session, then poll the live `app.js` until the hash matches. A green upload is not a visible site; the hash check is.

A Cloudflare Worker under [`worker/`](worker/) (`api.nonarkara.org`, wrangler project `nonarkara-status`) serves fleet status and a few host-only paths. It is not the guest page. Worker secrets stay in Wrangler, not in this tree.

---

## How to run locally / contribute

No build step. From the repo root:

```bash
python3 -m http.server 5210
```

Open [http://localhost:5210](http://localhost:5210). The service worker is disabled on localhost, so a reload shows what you just saved.

```bash
node --test test-*.mjs
```

This is a personal site. Pull requests that fix a fact — a broken link, a wrong name, a stale date — are welcome. Feature pitches, card-grid redesigns, and secrets are not. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE). Copyright Non Arkaraprasertkul.

Hero banner: original illustration for this README. HUD overlays in that image are illustration only.

## Contact

[nonarkara.org](https://nonarkara.org) · [LinkedIn](https://www.linkedin.com/in/drnon/) · [nonsmartcity@gmail.com](mailto:nonsmartcity@gmail.com)
