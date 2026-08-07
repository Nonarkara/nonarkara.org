/**
 * THE REFLECTING POOL — the world, upside down, in the water.
 *
 * Mies put a sheet of black water at the end of the Pavilion so the
 * building would have something to look at itself in. Stand at its edge
 * and what you see is not the pool; it is everything else, inverted.
 *
 * So this pool reflects the world it actually sits in: markets. Twelve
 * live instruments — the baht, the SET, the Dow, the Nasdaq, Bitcoin,
 * gold, Brent, NVDA, TSLA, GOOGL — drawn as a trading floor seen in
 * water. A scoreboard that blinks when a number moves, ticker tape
 * running under it, and the whole thing mirrored, because a reflection
 * is mirrored. You read it by looking down, which is the only way
 * anybody has ever read a pool.
 *
 * On colour, and this is the interesting constraint: markets are drawn
 * in green and red everywhere on earth, and the house law is one amber
 * and nothing else. Hue is not doing the work here — POSITION and
 * BRIGHTNESS are. Up is a triangle above the line and bright; down is a
 * triangle below and dim. Amber is spent on exactly one thing: the
 * largest absolute mover in the set, the number that actually wants
 * your attention. That is Law 1 honoured rather than smuggled around,
 * and it is also better information design — a board where everything
 * is red or green is a board where nothing is.
 *
 * The chaos is real, not decorative. Cells update at different rates
 * because the data does; the tape runs continuously; the blink decays
 * over 1.2s so a busy minute looks busy. "Systematic, financially
 * chaotic" was the brief and the systematic half is the grid.
 */

const W = 1024, H = 1024;               // canvas; square, the pools are not
const BLINK_MS = 1200;

// Display order and labels. Grouped the way a trader's eye groups them:
// home first, then the majors, then commodities.
const ROWS = [
  { k: 'set',    label: 'SET',     dp: 2 },
  { k: 'ptt',    label: 'PTT',     dp: 2 },
  { k: 'usdthb', label: 'USD/THB', dp: 3 },
  { k: 'sgdthb', label: 'SGD/THB', dp: 3 },
  { k: 'dji',    label: 'DJIA',    dp: 0 },
  { k: 'nasdaq', label: 'NASDAQ',  dp: 0 },
  { k: 'nvda',   label: 'NVDA',    dp: 2 },
  { k: 'tsla',   label: 'TSLA',    dp: 2 },
  { k: 'googl',  label: 'GOOGL',   dp: 2 },
  { k: 'btc',    label: 'BTC',     dp: 0 },
  { k: 'gold',   label: 'XAU',     dp: 1 },
  { k: 'brent',  label: 'BRENT',   dp: 2 },
];

const fmt = (v, dp) => v == null ? '—' :
  v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export function buildPool(THREE, plan, opts = {}) {
  const amber = opts.amber ?? 0xf59e0b;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;

  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0, depthWrite: false,
  });

  // One mesh per pool, sitting a hair above the water plane.
  const group = new THREE.Group();
  const surfaces = [];
  for (const p of plan.pools) {
    const w = p.x1 - p.x0, d = p.z1 - p.z0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    // Mirrored: a reflection reads backwards. rotation.z flips it in the
    // plane without needing a second, inverted canvas.
    m.rotation.z = Math.PI;
    m.position.set((p.x0 + p.x1) / 2, 0.025, (p.z0 + p.z1) / 2);
    group.add(m);
    surfaces.push({ mesh: m, pool: p });
  }

  let data = null;
  let prevPrices = {};
  const blinkAt = {};                   // key → timestamp of last change
  let biggest = null;                   // key of the largest absolute mover
  let tapeX = 0;
  let lastDraw = 0;

  function setData(d) {
    if (!d) return;
    const now = performance.now();
    for (const r of ROWS) {
      const v = d[r.k]?.price;
      if (v != null && prevPrices[r.k] != null && v !== prevPrices[r.k]) {
        blinkAt[r.k] = now;
      }
      if (v != null) prevPrices[r.k] = v;
    }
    // One amber: whichever instrument has moved most today.
    let best = null, bestAbs = -1;
    for (const r of ROWS) {
      const c = d[r.k]?.change;
      if (c != null && Math.abs(c) > bestAbs) { bestAbs = Math.abs(c); best = r.k; }
    }
    biggest = best;
    data = d;
  }

  /** The tape line — one long string of everything, for the scroller. */
  function tapeText() {
    if (!data) return 'AWAITING MARKET DATA · ';
    return ROWS.map(r => {
      const q = data[r.k];
      if (!q || q.price == null) return `${r.label} —`;
      const ch = q.change == null ? '' :
        `${q.change >= 0 ? '▲' : '▼'}${Math.abs(q.change).toFixed(2)}%`;
      return `${r.label} ${fmt(q.price, r.dp)} ${ch}`;
    }).join('   ·   ') + '   ·   ';
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // The water itself. Near-black with a faint vertical gradient so the
    // far end of the pool reads as deeper.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(6,10,14,0.92)');
    g.addColorStop(1, 'rgba(3,6,9,0.97)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const dim = 'rgba(150,168,186,';
    const bright = 'rgba(226,238,248,';
    const amberCss = 'rgba(245,158,11,';

    // ── Scoreboard: 3 columns × 4 rows ────────────────────────
    // Denser and finer than a wall of numbers. A reflection glimpsed in
    // water has many small cells, not a few large ones — and the
    // smaller type reads as something you are looking *down into*.
    const cols = 3, rows = Math.ceil(ROWS.length / cols);
    const padX = 34, padY = 92;
    const cw = (W - padX * 2) / cols, chh = 104;

    ctx.textBaseline = 'middle';
    ROWS.forEach((r, i) => {
      const col = i % cols, row = (i / cols) | 0;
      const x = padX + col * cw, y = padY + row * chh;
      const q = data?.[r.k];
      const up = (q?.change ?? 0) >= 0;
      const isBig = r.k === biggest && q?.change != null;

      // Blink decay — a cell that just changed is briefly lit.
      const since = now - (blinkAt[r.k] || -1e9);
      const blink = Math.max(0, 1 - since / BLINK_MS);

      // Cell rule. Structure is visible, per the house grid law.
      ctx.strokeStyle = dim + (0.14 + blink * 0.5) + ')';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y - chh / 2 + 6, cw - 16, chh - 14);

      // Symbol
      ctx.font = '500 13px "JetBrains Mono", monospace';
      ctx.fillStyle = isBig ? amberCss + '0.95)' : dim + '0.72)';
      ctx.fillText(r.label, x + 11, y - 12);

      // Price — the number you actually read
      ctx.font = '300 21px "JetBrains Mono", monospace';
      ctx.fillStyle = isBig ? amberCss + (0.85 + blink * 0.15) + ')'
                            : (up ? bright : dim) + (0.72 + blink * 0.28) + ')';
      ctx.fillText(fmt(q?.price, r.dp), x + 11, y + 13);

      // Direction: a triangle above or below the line, and brightness.
      // Not hue — see the note at the top of this file.
      if (q?.change != null) {
        const cx = x + cw - 34, cy = y + (up ? -11 : 11);
        ctx.beginPath();
        if (up) { ctx.moveTo(cx, cy - 6); ctx.lineTo(cx - 5, cy + 3); ctx.lineTo(cx + 5, cy + 3); }
        else    { ctx.moveTo(cx, cy + 6); ctx.lineTo(cx - 5, cy - 3); ctx.lineTo(cx + 5, cy - 3); }
        ctx.closePath();
        ctx.fillStyle = isBig ? amberCss + '0.9)' : (up ? bright : dim) + '0.6)';
        ctx.fill();

        ctx.font = '400 12px "JetBrains Mono", monospace';
        ctx.fillStyle = isBig ? amberCss + '0.8)' : dim + '0.55)';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.abs(q.change).toFixed(2)}%`, x + cw - 46, y + 14);
        ctx.textAlign = 'left';
      }
    });

    // ── Header ────────────────────────────────────────────────
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillStyle = dim + '0.5)';
    ctx.fillText('THE WORLD · REFLECTED', padX, 34);
    if (data?._ts) {
      const age = Math.round((Date.now() - data._ts) / 1000);
      ctx.textAlign = 'right';
      ctx.fillText(age < 90 ? 'LIVE' : `${Math.round(age / 60)}M AGO`, W - padX, 34);
      ctx.textAlign = 'left';
    }

    // ── Ticker tape, running ──────────────────────────────────
    const tape = tapeText();
    ctx.font = '300 16px "JetBrains Mono", monospace';
    const tw = ctx.measureText(tape).width;
    const ty = H - 150;
    ctx.strokeStyle = dim + '0.16)';
    ctx.beginPath(); ctx.moveTo(padX, ty - 22); ctx.lineTo(W - padX, ty - 22); ctx.stroke();
    ctx.fillStyle = dim + '0.62)';
    // Two copies so the loop has no seam.
    ctx.fillText(tape, -tapeX, ty);
    ctx.fillText(tape, -tapeX + tw, ty);

    // A second tape, opposite direction and dimmer — depth, and the
    // "chaotic" half of systematic-chaotic.
    ctx.font = '300 13px "JetBrains Mono", monospace';
    const tw2 = ctx.measureText(tape).width;
    ctx.fillStyle = dim + '0.3)';
    const t2 = (tapeX * 0.55) % tw2;
    ctx.fillText(tape, t2 - tw2, H - 104);
    ctx.fillText(tape, t2, H - 104);

    // Tape woven THROUGH the board, not only under it. The pool is a
    // 12×16m sheet and the scoreboard alone left its middle empty; a
    // trading floor has text moving everywhere you look. Each band runs
    // at its own rate and its own dimness, which is where the "chaotic"
    // half of systematic-chaotic actually comes from.
    ctx.font = '300 12px "JetBrains Mono", monospace';
    const twM = ctx.measureText(tape).width;
    for (let b = 0; b < 3; b++) {
      const by = padY + 46 + b * 104 + 52;
      const rate = [0.42, -0.61, 0.83][b];
      const off = ((tapeX * rate) % twM + twM) % twM;
      ctx.fillStyle = dim + (0.14 + b * 0.04) + ')';
      ctx.fillText(tape, off - twM, by);
      ctx.fillText(tape, off, by);
    }

    // A third, slowest tape. Three rates running at once is what makes a
    // trading floor look like weather rather than a table.
    ctx.font = '300 11px "JetBrains Mono", monospace';
    const tw3 = ctx.measureText(tape).width;
    ctx.fillStyle = dim + '0.2)';
    const t3 = (-tapeX * 0.33) % tw3;
    ctx.fillText(tape, t3, H - 58);
    ctx.fillText(tape, t3 + tw3, H - 58);

    tex.needsUpdate = true;
  }

  return {
    group, material: mat, setData,
    /** @param dt seconds @param visible how much of the pool is showing */
    tick(dt, visible) {
      const target = visible ? 0.92 : 0;
      mat.opacity += (target - mat.opacity) * 0.06;
      if (mat.opacity < 0.01) { group.visible = false; return; }
      group.visible = true;

      tapeX = (tapeX + dt * 78) % 100000;
      const now = performance.now();
      // 12fps is plenty for a scoreboard and leaves the frame budget to
      // the room. A canvas this size redrawn every frame is what makes
      // phones hot.
      if (now - lastDraw > 83) { lastDraw = now; draw(now); }
    },
  };
}
