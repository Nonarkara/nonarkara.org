# SPATIAL REPORT — nonarkara.org

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
| Widths | every width where this site's own CSS changes the layout — 23 widths, from 360 to 1920 |
| Browser | real Chrome, headless, **with a working WebGL** — see the finding below |
| Clock | real. Every measurement is a fresh page load at the width being measured |

Run it:

```sh
CHROME_PATH="$PWD/scripts/spatial/chrome-webgl.sh" \
  node scripts/spatial/spatial-check.mjs \
    --base http://127.0.0.1:8784/ \
    --routes "/,/?view=plan,/?view=ioc" \
    --baseline design/spatial-baseline.json
```

---

## FOUND

### 1. The gate was measuring a curtain, not the site

The instrument launches Chrome with `--headless=new --disable-gpu`. On macOS that leaves
headless Chrome with **no WebGL at all**, and this site shows a "your browser can't run
the 3D room" panel when WebGL is missing. So the gate measured *that panel*: a
full-screen black curtain that no reader with a working GPU ever sees.

The tell was a first action of exactly 523px at every width — the curtain's
`CONTINUE TO PLAN VIEW` button.

**A PASS on the wrong surface is not a PASS.** The baseline that existed before this
pass was a receipt for the curtain, not for nonarkara.org.

### 2. The no-WebGL panel was a wall on first load

The panel itself was a second offender: `inset: 0`, opaque black, a centred column, and
a button. Rule #10 of `ANTI-SLOP.md` — no pop-up or wall on first load — and rule #12 —
no phone column centred on a desktop.

### 3. A phone opened on the wrong world, for over a second

`chooseDefaultView()` guessed the first view from the viewport width: a phone (≤768px)
got the **NON OS dashboard**, a desktop got the pavilion. And the desk switch is
animated, so on a phone the dashboard sat *behind the sign* for over a second while the
`setView('room')` transition waited 280ms on a busy main thread. Two different first
screens for one site.

### 4. The desk was mounted behind every other view

`body[data-view="room"] #plan { display: none; }` hid the desk in the pavilion only. In
the IOC wall the desk was still there, behind the wall — so the wall's receipt included
the desk's geometry, and the room's own intent line was measured on top of the desk's
masthead.

### 5. A class name put the desk's date and the council status in the wrong place

`.meta` is the room overlay's link row: `position: absolute`. The desk reused the class
for its date (`#plan-date`) and for the AI Council status (`#council-meta`) — and both
were yanked out of their containers and pinned to the top-left corner of the page,
2074px and 3676px above the rows they belong to. A class that means "floating label"
and is also used for "text in a row" will do this again.

### 6. Three grids whose column count did not divide their count

- The **OS grid**: ten tiles for the host, six for a guest (four are the host's tools),
  both in four columns → a half-empty last row on both desks.
- The **date strip**: seven dates in a wrapping flex row → at 480px, six fitted and the
  seventh was stranded alone.
- The **council footer**: at ≤600px the build stamp broke away and sat alone.

### 7. The IOC wall clipped the names of the systems it was showing

Between 901px and ~1040px the wall is four screens across, so a cell is ~225px — too
narrow to carry a code and a name side by side. The name lost up to 19px to an
ellipsis: the wall was hiding the name of the system it was displaying.

---

## CHANGED

| # | The defect | The repair | Where |
|---|---|---|---|
| 1 | The gate measured the no-WebGL curtain | Chrome runs with SwiftShader's ANGLE backend, so the gate has WebGL. The instrument is untouched, byte for byte — only the browser's backend changed. | `scripts/spatial/chrome-webgl.sh` (new) |
| 2 | The no-WebGL panel was a wall on first load | One line in the corner: `NO WEBGL — SHOWING THE OS INSTEAD`. The desk opens underneath it, and the sign is skipped — without a pavilion there is no question to ask. | `index.html`, `styles.css`, `app.js` |
| 3 | A phone opened on the wrong world for over a second | The first view is never guessed from the viewport. No mode yet means the pavilion, on every device. | `app.js` `chooseDefaultView()` |
| 4 | The desk was mounted behind every other view | The desk is closed until the app opens it: `#plan { display: none }`, shown only for `data-view="plan"`. No flash behind the boot screen, no desk behind the wall. | `styles.css` |
| 5 | The desk's date and council status were pinned to the top-left corner | `.meta` is the room overlay's floating link row. The overlay's rules are scoped to `.overlay`; the desk's two elements flow in their own rows again. | `styles.css` |
| 6 | Six grids whose column count did not divide their count | The OS grid takes its columns from the tiles it holds (5 for the host's ten, 3 for a guest's six); the date strip is seven columns for seven dates; the weather cell is a row only where the row fits; the fleet head and the council footer are deliberate two-row grids on a phone. | `styles.css` |
| 7 | The wall clipped the names of the systems it was showing | In the four-across band below 1040px a cell is too narrow for a code and a name side by side, so the name goes underneath. No name loses a letter now. | `styles.css` |
| 8 | The room's intent line existed outside the room | `body:not([data-view="room"]) .intent-line { display: none }` — furniture that is not in its room is not furniture. | `styles.css` |

---

## VERIFIED

**The gate.** Three surfaces, every width where this site's own CSS changes the layout,
every measurement a fresh page load at the width being measured:

```
84 measurements · 3 surfaces · 28 widths · 0 unexplained findings
```

The only finding the sweep carries is the fleet board's terminus, and it carries a
written reason (below). The receipt is `design/spatial-baseline.json`.

**The rest of the estate.** The repo's own instruments cover what the vendored gate
cannot reach — the WebGL views, where the DOM is only the chrome over a canvas:

| Gate | What it proves |
|---|---|
| `test-door.mjs` | the landing is one object and one sign; the sign is ≤380px and ≤40% of the screen; no room furniture over the pavilion |
| `test-overlap.mjs` | twelve surfaces (room · sky · ground · IOC × 390 · 1024 · 1440) with no chrome on chrome, no clipped captions, no stray labels |
| `test-truck` (in `scripts/msh/truck.mjs`) | the seat view, both mirrors drawing, the autopilot taking the wheel |
| `node --test test-*.mjs` | the whole suite, 30 suites |

**The instrument itself.** `scripts/spatial/spatial-falsify.mjs` injects one real defect
per mode of spatial hallucination into a copy of the site and checks that the gate
catches each one — and then checks that the clean copy passes, so the gate is not
simply always-failing.

---

## REMAINING

1. **The desk's first *loud* control is 4,018px down** (at 1440; 2,248px at 900px).
   The instrument counts a control as loud when it carries its own weight — an opaque
   background that contrasts, or a border of 3px or more. The desk's ten tiles are
   hairline boxes, so they are not loud by that test. The first *action* on the desk is
   the tiles, at 282px. The receipt records what the instrument measured; this note
   records what it means. Making the tiles loud would mean filled boxes, which is the
   look this house does not have.

2. **The landing's first loud control is null.** The sign asks one question and offers
   two answers, so the two answers are siblings — and neither is filled, because a
   filled one would rank them against each other. The instrument counts no loud control
   on the first screen. The receipt records `null` rather than a number it did not
   measure.

3. **The fleet board's last stop is alone when the live count says so.** The number of
   stations is live — systems come up and go down between one measurement and the next —
   so the shape of the last row changes. The reason is written down; the shape is not
   ours to fix.

4. **The instrument measures loudness, not actionability**, and it does not look through
   an ancestor's opacity. Two of the findings in this pass were that blindness, not
   defects: the sky panel's hidden clock counted as content. The repo's own overlap
   instrument (`scripts/msh/overlap.mjs`) does look through ancestor opacity, and it
   found nothing. The vendored instrument was not modified — it is byte-identical in
   every project that uses it, and that is worth more than a local patch.
