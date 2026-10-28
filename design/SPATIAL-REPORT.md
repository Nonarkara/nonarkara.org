# SPATIAL REPORT — nonarkara.org

**Build:** v4.51 — the code is the commit that carries this file; the deployed stamp
is `https://nonarkara.org/version.json`

**The law:** an interface invents a reason for things to occupy space when it arranges
itself around a grid instead of around how people read, choose and act. The test is
*"why is this here, why this size, and why this far from that?"* — and the answer may
never be *"because the grid put it there."*

**The instrument:** `scripts/spatial/spatial-check.mjs` (vendored byte-identical), the
probe `scripts/spatial/spatial-probe.js`, the falsifier `scripts/spatial/spatial-falsify.mjs`.
The receipt: `design/spatial-baseline.json`.

The law is not a limit. It is a receipt. Every hole, orphan, scattered pair, wrap and
clipped row is measured, and a finding with no written reason is a failure — because
"no reason" is exactly what "the grid put it there" sounds like when you write it down.

---

## WHAT WAS MEASURED

| | |
|---|---|
| Surfaces | `/` (the landing: pavilion + sign) · `/?view=plan` (the host's desk) · `/?view=ioc` (the wall of twenty systems) |
| Widths | every width where this site's own CSS changes the layout — 31 widths, from 360 to 1920 |
| Browser | real Chrome, headless, **on the machine's real GPU** — see the finding about the instrument below |
| Clock | real. Every measurement is a fresh page load at the width being measured |

Run it:

```sh
CHROME_PATH="$PWD/scripts/spatial/chrome-webgl.sh" \
  node scripts/spatial/spatial-check.mjs \
    --base http://127.0.0.1:8786/ \
    --routes "/,/?view=plan,/?view=ioc" \
    --baseline design/spatial-baseline.json
```

And check what it actually measured — a gate that passes on a page the app had not
drawn yet is a gate that has certified the shell:

```sh
node scripts/msh/gate-guard.mjs /tmp/gate.json
```

`scripts/msh/capture-receipt.sh` does both in one step, and **only accepts a capture
that the guard agrees with**: a run that measured the sign instead of the desk writes
nothing to the committed receipt. That is not a nicety. The gate compares *findings*
against the baseline and has no idea which surface it was looking at, so a run that
measured the wrong page produces a clean, green, worthless receipt — and a machine
under load is enough to cause it.

---

## FOUND

### 1. The boot curtain was a full-screen wall (v4.49)

`#boot` was `position: fixed; inset: 0; z-index: 9999`, a centred wordmark at
`clamp(72px, 22vw, 120px)`, and the line *"a window to the mind"*. It covered the whole
first screen for 2.1 seconds on every device, for every reader — a rule #10 wall and a
rule #12 flat region. It was also the thing the instrument kept measuring: the old
receipt's own numbers said `largest: 120 (boot-n)`, which is the curtain's letter, at
every width.

### 2. The desk's footer was a slab of nothing (v4.49)

The footer was `display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 1px;
background: var(--line)` — four columns built for four calls to action. One button was
put in it: **ENTER ROOM**. The other three cells had no content and nothing to hide
them, so they were painted in the hairline colour: a **1,047 × 80px** block of grey at
the end of the desk, with the one real button in a quarter of it.

### 3. The fleet board was a row of flexible stops (v4.49)

`.fleet-stns` was `display: flex; flex-wrap: wrap` and every stop was `flex: 1 1 84px`.
Two things followed, and both were the grid's fault rather than the reader's:

- **One stop alone on a 1,400px line.** With 51 stops and 13 to a row, the last row
  held one stop, and `flex-grow: 1` stretched it to the full width of the board.
- **Stops stretched around their own labels.** The pipeline line — four stations, not
  deployed — became four 350px cells around a 60px label; the parked line — three
  domains kept on DNS — became three 466px cells around a 30px one. Rule #9: *"no
  small thing is wider than 2× what its content needs."*

### 4. The desk's prose ran to 176 characters a line (v4.49)

`.plan-philo p` had no measure at all, so on a 1,400px desk the closing paragraphs of
"about this space" ran to about 176 characters — nearly three times the house limit of
65ch, and the widest text on the site by a factor of two.

### 5. The desk's first loud control was 3,792px down (v4.49)

The instrument counts a control as loud when it carries its own weight: an opaque
background that contrasts, or a border of 3px or more. The desk's ten tiles are hairline
boxes, so they are not loud by that test — and the only loud thing on the desk was
ENTER ROOM, in the footer, at the end of the scroll. The receipt recorded it as the
first action of the desk: **3,792px** at 1440, **7,078px** at 390.

Worse, it moved. The desk's height above that button depends on the fleet board, and
the fleet board's height depends on how many systems are up this minute. The receipt
failed on data, not on layout: *"the first thing you can do moved up 579px (now 5303,
was 5882)"*. A receipt that fails when a dashboard comes up is a receipt that cannot be
reproduced.

### 6. The instrument was rendering the site in software (v4.50)

The gate's browser was launched through `scripts/spatial/chrome-webgl.sh`, which forced
`--use-angle=swiftshader` — WebGL in software. The app assembles a 3D world before the
desk is painted, and a world built in software on a loaded machine takes a minute. The
gate's settle deadline is five seconds. So the desk was never on the screen when the
instrument looked, and the receipt was a receipt for the sign.

Measured on this machine, same flags otherwise, desk painted at:

| Browser | Desk painted at | What the gate would have measured |
|---|---|---|
| `--disable-gpu` (no WebGL at all) | 1.5s | the desk — but the app takes its no-WebGL path, which **opens the OS instead of the pavilion**, so the landing route would be measured as the desk: the wrong surface |
| `--use-angle=swiftshader` (software) | **44s** (125s with Chrome's throttling left on) | the sign |
| ANGLE on the real GPU (Metal) | **1.5s** | the site |

The wrapper now lets ANGLE use the machine's GPU and keeps SwiftShader only as the
fallback for a machine that has none.

### 7. The desk was built after the room (v4.50)

The desk's content — eighty-two project cells, the clock, the fleet board — was painted
at the **end** of a module whose middle is the 3D world. So a reader who asked for
`/?view=plan` waited for a room to be assembled before a document could be read, and any
instrument that measured the page in the first seconds measured the sign.

The desk is a document. It now has its own module (`desk.js`) and its own entry point,
beside the room's, and it imports **nothing** from the room: no three.js, no pavilion,
no yard. It paints at the parse itself — measured at **0–87ms** after the document
parses, against the hundred-odd milliseconds the instrument's settle needs.

### 8. The theme was applied after the room (v4.50)

`applyTheme()` ran at the end of the module, so every page painted in the default dark
theme and then **flipped** to the reader's theme. Two things were wrong with that:

- The reader watched the site change colour under them.
- For the length of the flip, a cell's background and the surface behind it could be
  in **different colours** — which is what the instrument reads as "loud".

That is the only way the previous receipt's two `scattered` findings could arise. Both
named cells whose background is `var(--bg)` — *the same variable their container paints
with* — so a cell can only read as loud if it and the surface behind it are
momentarily different, and the only thing that changes that variable is the theme.
The theme was applied at the end of the module, so the page existed in two themes in
its lifetime, and there were windows in which a cell and its container disagreed.

The theme is now decided in `common.js` and put on the body before anything is painted,
so every surface is born in one colour and no such window exists. The receipt —
93 measurements, zero findings — says the window is gone.

### 9. The URL named a desk that the app then closed (v4.50)

`/?view=plan` opened the desk at the top of the module — and then, after the world was
built, a line that set the default view replaced it with `room`. The reader watched the
desk open, close, and open again. The door module (further down) had always honoured
the URL; the module's default-view line had to agree with it.

### 10. The self-heal threw away the reader's URL (v4.50)

The self-heal answers a stale build by replacing the URL with `/?build=…` — which
quietly discarded everything else the reader asked for. Open the desk with
`/?view=plan`, have a new build land, and the desk closed and the sign came back. The
build marker is ours to set; the rest of the query belongs to the reader.

### 11. The measurement server made the reader download the world 93 times (v4.50)

The local server answered `Cache-Control: no-store`, so every one of the sweep's
ninety-three measurements re-downloaded the whole module graph. On a loaded machine
that is the difference between a desk that paints inside the instrument's five-second
budget and one that does not. It revalidates now (ETag, 304 when nothing changed).

### 12. The document had no outline at all (v4.51)

The site had **no `<h1>`, `<h2>` or `<h3>` anywhere on its main page**. Every mark and
every section label was a `<div>` or a `<span>`: the wordmark on the sign, the room's
brand, the desk's masthead, the wall's title, and the five section labels of the desk.

Two things were wrong with that, and only one of them is about the reader.

A reader using a screen reader met a wall of text with no landmarks. The desk is a
document — v4.50 said so out loud — and a document with no headings is not a document.

And the instrument's hierarchy rule — *"is the title louder than the page?"* — had
nothing to compare. The probe recorded `h1: 0` on all ninety-three measurements and a
ratio of `null`: a rule with nothing to measure is a rule that has never failed, and it
had never failed here because it had never been able to run.

### 13. The receipt was measuring the sign, and the theme was one tick from the paint (v4.51)

The theme and the "the URL names a desk" decision lived in modules that import the desk's
data and the room's library. They landed at the *end* of a module chain. The resource
timeline of one page load said it plainly:

```
HTML answered            35ms
desk.js, app.js fetched   42 → 71ms
the parse ends          357ms          ← the theme and the view should be here
common.js, ioc.js       356 → 407ms    ← the desk's data, only now on the wire
first paint             412ms
DOMContentLoaded        887ms
```

The theme landed **two milliseconds** before the first paint, and the view landed
after it. So a reader who asked for `/?view=plan` was shown the **sign** for half a
second while the desk's own data was fetched and parsed — and the gate, whose settle
window is about 175ms after the parse, measured the sign instead of the desk at
**27 of the 31 desk widths**. The old receipt was right by luck: the fonts had been
slow enough to hold the settle open until the desk had arrived.

---

---

## CHANGED

| # | The defect | The repair | Where |
|---|---|---|---|
| 1 | A full-screen wall with a 120px letter on first load | The curtain is gone. The room fades in over 0.7s when its **first frame has been rendered** — the world is assembled before that frame, so nothing half-built is ever shown and nothing is hidden behind a wall. | `index.html`, `styles.css`, `app.js` |
| 2 | A 1,047×80px slab of nothing at the end of the desk | ENTER ROOM moved into the desk's bar, where the other controls live, and the four-column footer went with it. The bar's controls are a **row**, so the band is one band tall and there is no second row under the brand block to leave a hole in. | `index.html`, `styles.css` |
| 3 | One stop alone on a 1,400px line; four stops 350px wide around a 60px label | The board is a grid whose column count is **worked out from the live number of stops**: a line short enough for one row stays one row, sized to its stops; a longer line takes the count that leaves the fullest last row, and never leaves exactly one stop alone on it. Every stop keeps the same width in every row of its line. | `app.js` (`fleetColumns`, `fitFleetColumns`), `styles.css` |
| 4 | Prose running to 176 characters a line | `.plan-philo p { max-width: 65ch }`. The margin on the right is the point of it. | `styles.css` |
| 5 | The first loud control 3,792px down, moving with the live fleet count | ENTER ROOM is in the bar: one tap away whatever the desk's length, and its position does not depend on how many systems are up. The desk's first action is now at the top of the bar — measured at **y = 20px**. | `index.html`, `styles.css` |
| 6 | The gate's browser rendered the site in software, so the desk never painted inside the instrument's budget | The wrapper lets ANGLE use the machine's real GPU and keeps SwiftShader only as the fallback. Measured: 44–125s → **1.5s**. | `scripts/spatial/chrome-webgl.sh` |
| 7 | The desk was painted after the 3D world | The desk is its own module (`desk.js`) with its own entry point, importing nothing from the room. The words, the data and the theme are shared through `common.js` — one source of truth. The desk paints **at the parse**. | `desk.js`, `common.js`, `index.html`, `app.js` |
| 8 | The theme was applied after the world, so the page painted in the wrong colours and then flipped | The theme is decided and put on the body before the first paint. No flip, and no window in which a cell and the surface behind it are different colours. | `common.js`, `app.js` |
| 9 | A desk named in the URL was closed again by the module's default view | The URL wins over the default, in the early block and in the default-view line alike. | `app.js` |
| 10 | The self-heal replaced the reader's URL | The heal sets the build marker and keeps every other parameter. | `index.html` |
| 11 | The local measurement server made every measurement re-download the world | The server revalidates (ETag → 304). | `scripts/msh/serve.mjs` |
| 12 | The document had no headings at all | The marks and the section labels are what they always were — the same words, the same type, the same place — and are now headings. Each gives up the browser's default margins, weight and size and keeps the type the house had already chosen: **a heading is a heading, not a different design**. Zero pixels moved, proved by a before/after geometry diff. | `index.html`, `styles.css`, `mixtape.html` |
| 13 | The theme and the view landed at the end of a module chain, so the receipt measured the sign | Both decisions moved into `boot.js`, a module that imports **nothing**, and the desk's data is now fetched with the page instead of after it. The theme lands before the first paint **by ordering, not by luck**, and a URL-named desk is on screen while the room is still downloading. | `boot.js`, `common.js`, `desk.js`, `index.html` |

The room and the desk now talk through one event (`desk:open`) instead of sharing a
module, so the desk can be painted without the room and the room can still open what
the desk asks for.

---

## VERIFIED

**The gate.** Three surfaces, every width where this site's own CSS changes the layout,
every measurement a fresh page load at the width being measured:

```
93 measurements · 3 surfaces · 31 widths · 0 findings
```

The receipt carries no findings and no reasons: there is nothing left to justify.

**And what it measured.** The run is checked, not assumed:

```
ok    /              31 measurements · chars    337…573
ok    /?view=plan    31 measurements · chars  25948…25949
ok    /?view=ioc     31 measurements · chars    510…510

All 93 measurements were of the surface a reader gets.
```

`scripts/msh/gate-guard.mjs` asks each measurement what it saw: the landing is proven
by the sign being there, the desk by tens of thousands of characters against the sign's
few hundred, and the wall by the **absence** of the sign — a wall with the sign still up
is the landing wearing a wall's name.

**And the receipt is reproducible.** The gate was run a second time against the
committed receipt, with no `--update`, and every one of the ninety-three cells agreed
with it: 93 measurements, 0 findings, 0 cells that disagreed. A receipt that only
exists because it was just written is a receipt nobody can check.

**And the receipt describes this build.** The receipt was captured before the version
string moved from 4.50 to 4.51, so the difference between the two builds is one
character in the desk's version stamp — measured: the stamp is **39px wide either
way, a difference of 0px**, because it is set in a monospace face. The rest of the
difference is proved by the geometry diff below.

**One honest caveat about the instrument.** A measurement of the desk is only a
measurement of the desk if the app has drawn the desk before the gate's settle window
closes — about 175ms after the parse. On a machine running at load 200 with four other
agents in it, the desk's data sometimes lands later than that, and the gate measures
the sign instead. The gate cannot tell: it compares findings, and the sign has no
findings, so it goes green. That is why every capture is checked with the guard, and
why the capture script only accepts a receipt the guard agrees with. On this machine
at load 200 a proving run had nine of ninety-three cells land on the sign; the
receipt's own capture had none.

**And the title is real.** The probe's hierarchy, which used to read `h1: 0` and a
ratio of `null` on all ninety-three measurements, now reads a title on every one:

| Surface | the title | the loudest text | ratio |
|---|---|---|---|
| `/` | "NON" — the sign's mark, 22px | 22px (the mark) | 1.0 |
| `/?view=plan` | "NON OS" — the desk's masthead, 22px | 54px (the clock — a number) | 0.41 |
| `/?view=ioc` | "IOC WALL", 11px | 11px | 2.0 |

The desk's ratio is below 1 because the desk's loudest text is its **clock**: a
number, which the law explicitly allows to dominate ("no hero over half the screen
*unless it is the map or the number*"). The instrument cannot tell a clock from a
shouting heading — it weighs every text, not every heading — so the title-ratio limit
stays off for this site and the honest number is published instead.

**And nothing moved.** The outline was added without touching the design, and that is
a claim, so it was measured: `scripts/msh/snapshot.mjs` records where every piece of
text sits and what type it is set in, and `scripts/msh/geometry-diff.mjs` compares two
snapshots. Both sides of the comparison had to be the same page — the same state
(the sign up, or the sign answered) and the same data (the market and fleet feeds
blocked, because they answer with different numbers every second) — or the diff
reports two different screens as a change in one:

```
0 moved · 0 added · 0 removed · 22 retagged — the page is the same page.
```

Twenty-two elements changed their tag: the sign's mark, the room's brand, the wall's
title, the desk's masthead and its five section labels became headings; three `div`s
inside the desk's button became `span`s (a button may only hold phrasing content, so
the `div`s were invalid HTML and are now correct). **Not one pixel moved.**

**The rest of the estate.** The repo's own instruments cover what the vendored gate
cannot reach — the WebGL views, where the DOM is only the chrome over a canvas:

| Gate | What it proves |
|---|---|
| `node scripts/msh/suite.mjs` | the whole suite, **32/32** |
| `test-outline.mjs` | the document's outline: one visible title per surface, the title is the loudest heading, no skipped levels, no empty heading, no heading wearing the browser's margins, no heading inside a button, and the sign first in the document |
| `test-door.mjs` | the landing is one object and one sign; the sign is ≤380px and ≤40% of the screen; no room furniture over the pavilion |
| `test-overlap.mjs` | twelve surfaces (room · sky · ground · IOC × 390 · 1024 · 1440) with no chrome on chrome, no clipped captions, no stray labels |
| `test-truck` (in `scripts/msh/truck.mjs`) | the seat view, both mirrors drawing, the autopilot taking the wheel |
| `scripts/msh/paint-time.mjs` | the desk's first paint, against the parse — 0–87ms |
| `scripts/msh/boot-matrix.mjs` | which browser flags let the desk paint inside the instrument's budget |

**The board's geometry, measured directly** (`scripts/msh/fleet-fit.mjs`, the live
board, every line, every row):

| Width | pages line | external line | pipeline | parked |
|---|---|---|---|---|
| 390 | 3 columns × 17 full rows | 4 columns, last row 3 of 4 | one row of 4 | one row of 3 |
| 1024 | 9 columns, last row 6 of 9 | 10 columns, last row 9 of 10 | one row of 4 | one row of 3 |
| 1440 | 13 columns, last row 12 of 13 | 10 columns, last row 9 of 10 | one row of 4 | one row of 3 |

No line ends with one stop alone, and every stop is the same width in every row of its
line — at 1440 the last stop of the pages line is 108px wide, exactly like the 12
before it.

**The bar's geometry, measured at nine widths** (`scripts/msh/head-check.mjs`): the
hole under any item in the desk's bar is 12px at 390 and 15px at 768 and above — the
instrument's threshold for a hole is 72px.

---

## REMAINING

1. **The landing's first loud control is `null`.** The sign asks one question and offers
   two answers, so the two answers are siblings — and neither is filled, because a
   filled one would rank them against each other. The instrument counts no loud
   control on the first screen. The receipt records `null` rather than a number it did
   not measure.

2. **The instrument measures loudness, not actionability**, and it does not look through
   an ancestor's opacity. Two of the findings in an earlier pass were that blindness,
   not defects: the sky panel's hidden clock counted as content. The repo's own overlap
   instrument (`scripts/msh/overlap.mjs`) does look through ancestor opacity, and it
   found nothing. The vendored instrument was not modified — it is byte-identical in
   every project that uses it, and that is worth more than a local patch.

3. **The philosophy band's right-hand margin.** The prose is now 65ch and the band's
   rules still run the full width of the desk, so there is a wide margin to the right
   of the closing paragraphs. It is a margin and not a hole — the rule frames the
   band — but it is the one place where the desk is wider than its content.

4. **The zone still caches for four hours.** Cloudflare's Browser Cache TTL is not
   honouring the site's own `no-cache` headers; `pages.dev` is, the custom domain is
   not. The build is on the edge now and the self-heal covers the difference, but
   "Respect Existing Headers" on the zone would make releases land as soon as they
   are deployed.

5. **The falsifier caught 8 of its 10 rules — and the other 2 cannot bite on this
   site, for reasons that are checkable.**

   `spatial-falsify.mjs` injects one real defect per mode into a copy of the site
   and checks that the gate catches each one. On this build:

   ```
   caught: an unjustified gap opens between two blocks      [unjustified gaps]
   caught: a picture is stranded beside an empty column       [orphan elements]
   caught: two related actions are pushed to opposite edges   [scattered actions]
   caught: a row breaks and leaves one item alone             [accidental wrapping]
   caught: a heading louder than the title                    [false hierarchy]
   caught: the chrome of the page grows                       [chrome cost]
   caught: a fixed bar sits on top of the work                [overlapping chrome]
   caught: a fixed bar pinned to the right sits on the work   [overlapping chrome]
   ```

   The two that do not bite are dead **on this page**, and the reason is the
   page's own shape, not a broken rule:

   - *The page scrolls sideways.* The site clips its own overflow
     (`html, body { overflow: hidden }`) — a 4,000px div cannot scroll a page that
     does not scroll sideways. The rule is alive; the condition cannot arise here.
   - *The page makes you scroll before you can do anything.* The landing's first
     **loud** control is `null` (see REMAINING 1) — the sign's two answers are
     siblings and neither is filled. There is no first action for the rule to move.

   The **title rule used to be one of the dead ones**, and this pass brought it
   back: the site had no `h1` at all, so the rule had nothing to compare a
   heading against. Now that the document has a title, the rule bites — and the
   receipt can weigh the title against the rest of the page.

   The falsifier's own verdict is still a FAIL — *"2 rule(s) did not bite. The gate
   is not trustworthy."* — and it is recorded as a FAIL. Two rules of ten cannot
   bite on a page that does not scroll sideways and has no loud first control;
   the other eight have each been seen to fail on a real defect.

   **One thing about the run itself.** The falsifier measures a COPY of the site
   with the same browser the gate uses, so it must be run with the same browser:
   `CHROME_PATH="$PWD/scripts/spatial/chrome-webgl.sh" node scripts/spatial/spatial-falsify.mjs <site>`.
   Without it the inner gate runs Chrome with `--disable-gpu`, the site answers
   with its no-WebGL notice instead of the pavilion, and the falsifier measures a
   different surface than the one the receipt describes. The first run of this
   pass did exactly that and reported a rule caught for the wrong reason — the
   WebGL notice, not the defect the fixture had planted.
