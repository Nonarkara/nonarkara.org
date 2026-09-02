# Contributing

This is a **personal site**, not a product company and not a community framework. The live door is [https://nonarkara.org](https://nonarkara.org). The source is this repository.

## What is welcome

Factual fixes. A broken link, a misspelled name, a wrong date, a dead screenshot path, a license or credit error.

Open a pull request against `main`. Keep the diff small. English is the primary language of this repo; Thai or Chinese copy on the site should stay in register with the existing EN/TH/ZH strings in `app.js`, not become a parallel translation dump.

## What is not

- Feature pitches, redesigns, or "I made it a card grid." The Pavilion is the guest surface on purpose.
- Secrets, `.env` files, tokens, private dashboards, or anything from a machine that is not this public tree.
- Changes to deploy credentials, Worker bindings, or host-only paths.
- PRs that treat this repo as SLIC, FloodDash, BKKx, or Axiom. Those have their own public homes — link them; do not merge them here.
- Invented metrics, awards, official-agency status, or copy that treats the README hero HUD as a live product. See **Ethical use** in [README.md](README.md).

If you are unsure whether a change is a fact or a redesign, open an issue first and say what is wrong on the live page.

## Local check

```bash
python3 -m http.server 5210
node --test test-*.mjs
```

No CLA. MIT license already covers the tree.
