<p align="center"><img src="icon.svg" width="88" alt="NON"></p>

# nonarkara.org

**Live: [https://nonarkara.org](https://nonarkara.org)**

Personal site of **Dr Non Arkaraprasertkul** (ดร.นน อัครประเสริฐกุล) — urbanist, architect (MIT), anthropologist (Harvard), city-systems builder. Bangkok. GitHub [@Nonarkara](https://github.com/Nonarkara). Practice: [Axiom](https://github.com/Nonarkara/Axiom).

This repository is the source for that site. It is the studio's public door, not the catalogue.

The site itself is trilingual — **EN / ไทย / 中文** — English first.

---

## What this is

Two surfaces. One origin. They are not the same page with a theme switch.

**The Pavilion** is the guest surface: a walkable memory palace (Three.js, built to load on a phone). You find out who he is by looking — screens open real work; furniture opens CV, LinkedIn, contact. Barcelona Pavilion at the origin; Glass House, Villa Savoye, Farnsworth, Fallingwater around it.

**NON OS** is the host surface: the personal operating system he keeps open during the day. Clock (Bangkok), fleet health, signals, notes. Visitors land in the Pavilion, not in a private dashboard.

Plan view is there if WebGL is not.

---

## This repo, and the rest of the public studio

`nonarkara.org` is the door. The work lives next door, in its own public repositories. Do not treat this tree as the source of those systems.

| | GitHub | Live |
|---|---|---|
| **Axiom** — decision systems for cities and operators | [Nonarkara/Axiom](https://github.com/Nonarkara/Axiom) | [axiom.nonarkara.org](https://axiom.nonarkara.org) |
| **SLIC-Index** — the city ranking that declares what it measures | [Nonarkara/SLIC-Index](https://github.com/Nonarkara/SLIC-Index) | [slic.nonarkara.org](https://slic.nonarkara.org) |
| **FloodDash-Blueprint** — how to build a flood watch from open data (the blueprint, not the running code) | [Nonarkara/FloodDash-Blueprint](https://github.com/Nonarkara/FloodDash-Blueprint) | [flood.nonarkara.org](https://flood.nonarkara.org) |
| **BKKx** — Bangkok, heritage register and walking atlas | [Nonarkara/BKKx](https://github.com/Nonarkara/BKKx) | [bkk.nonarkara.org](https://bkk.nonarkara.org) |
| **zero-to-one** — reconstructable history of this GitHub account, from a city-reporter bot to an open civic studio | [Nonarkara/zero-to-one](https://github.com/Nonarkara/zero-to-one) | — |

The Pavilion's project wall points at more live systems. Those URLs are on the site; they are not duplicated here so this file cannot drift.

---

## What's in the tree

Static site at the root (`index.html`, `app.js`, `styles.css`, the building modules). A Cloudflare Worker under `worker/` serves live status and a few host-only paths — not the guest page. Tests are the `test-*.mjs` files next to the modules they cover.

Deploy is Cloudflare Pages (`nonarkara.org` / `www.nonarkara.org`).

This is not a starter kit and not a consulting deck. If you want the method, start with [Axiom](https://github.com/Nonarkara/Axiom) and [zero-to-one](https://github.com/Nonarkara/zero-to-one). If you want a city ranking, go to SLIC. If you want to build a flood system, go to the blueprint.

---

## Local

No build step. From the repo root:

```bash
python3 -m http.server 5210
```

Open [http://localhost:5210](http://localhost:5210). Service worker is disabled on localhost so reloads show what you just saved.

```bash
node --test test-*.mjs
```

---

## License

[MIT](LICENSE). Copyright Non Arkaraprasertkul.

## Contributing

This is a personal site. Pull requests that fix a fact — a broken link, a wrong name, a stale date — are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contact

[nonarkara.org](https://nonarkara.org) · [LinkedIn](https://www.linkedin.com/in/drnon/) · [nonsmartcity@gmail.com](mailto:nonsmartcity@gmail.com)
