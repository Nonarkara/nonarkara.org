/**
 * THE REFLECTING POOL — a departure board in Mies' black water.
 *
 * Look down and the pool is an airport hall's board: every instrument
 * the estate watches, one row each, with a STATUS column that speaks
 * departure-board English (SURGING · CLIMBING · STEADY · EASING ·
 * DIVING). Rows split-flap when their number changes — a burst of
 * wrong glyphs settling into the right one, which is how those boards
 * actually behave and why everyone loves them.
 *
 * Colour grammar: amber `#f59e0b` is the one brand accent (the largest
 * mover's row + the LIVE pulse). Cyan / magenta / green are DATA
 * CHROME for status rows — the Pavilion HUD already speaks that
 * language. No Tailwind blue as brand.
 *
 * The plate fits the water now. It used to be built w×d and then
 * rotated 90° about Y, which lands the dimensions transposed — a
 * 12×16 pool carried a 16×12 plate, overhanging the travertine by 2m
 * a side. The geometry is built pre-swapped instead.
 */

const W = 1024, H = 1024;
const BLINK_MS = 1400;
const FLAP = '▓▒░ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const ROWS = [
  { k: 'set',    label: 'SET',    name: 'BANGKOK SET INDEX',   dp: 2 },
  { k: 'ptt',    label: 'PTT',    name: 'PTT PCL · BKK',       dp: 2 },
  { k: 'usdthb', label: 'USDTHB', name: 'US DOLLAR · BAHT',    dp: 3 },
  { k: 'sgdthb', label: 'SGDTHB', name: 'SING DOLLAR · BAHT',  dp: 3 },
  { k: 'dji',    label: 'DJIA',   name: 'DOW JONES INDUST',    dp: 0 },
  { k: 'nasdaq', label: 'IXIC',   name: 'NASDAQ COMPOSITE',    dp: 0 },
  { k: 'nvda',   label: 'NVDA',   name: 'NVIDIA CORP',         dp: 2 },
  { k: 'tsla',   label: 'TSLA',   name: 'TESLA INC',           dp: 2 },
  { k: 'googl',  label: 'GOOGL',  name: 'ALPHABET INC',        dp: 2 },
  { k: 'btc',    label: 'BTC',    name: 'BITCOIN · USD',       dp: 0 },
  { k: 'eth',    label: 'ETH',    name: 'ETHEREUM · USD',      dp: 0 },
  { k: 'sol',    label: 'SOL',    name: 'SOLANA · USD',        dp: 2 },
  { k: 'gold',   label: 'XAU',    name: 'GOLD SPOT · OZ',      dp: 1 },
  { k: 'brent',  label: 'BRENT',  name: 'BRENT CRUDE · BBL',   dp: 2 },
];

const fmt = (v, dp) => v == null ? '—' :
  v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const pad2 = (n) => String(n).padStart(2, '0');
const clockStr = (d = new Date()) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

/** Departure-board English for a percent change. */
export function statusFor(change) {
  if (change == null) return { word: 'NO DATA', tone: 'dim' };
  if (change >= 1.5) return { word: 'SURGING', tone: 'green' };
  if (change >= 0.15) return { word: 'CLIMBING', tone: 'green' };
  if (change > -0.15) return { word: 'STEADY', tone: 'dim' };
  if (change > -1.5) return { word: 'EASING', tone: 'magenta' };
  return { word: 'DIVING', tone: 'magenta' };
}

export function buildPool(THREE, plan, opts = {}) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;

  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0, depthWrite: false,
  });

  // One mesh per pool. Orient so canvas-up faces the typical approach:
  // walker at SE spawn faces west along the large pool — text "up" = −X.
  // The plane is created (d, w) because the 90° Y-rotation swaps which
  // world axis each geometry axis lands on. See header note.
  const group = new THREE.Group();
  const surfaces = [];
  const Y_UP = new THREE.Vector3(0, 1, 0);
  for (const p of plan.pools) {
    const w = p.x1 - p.x0, d = p.z1 - p.z0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d, w), mat);
    m.rotation.x = -Math.PI / 2;
    m.rotateOnWorldAxis(Y_UP, Math.PI / 2);
    m.position.set((p.x0 + p.x1) / 2, 0.025, (p.z0 + p.z1) / 2);
    group.add(m);
    surfaces.push({ mesh: m, pool: p });
  }

  let data = null;
  let meta = {
    version: opts.version ?? '',
    build: opts.build ?? '',
    estate: opts.estate ?? '农博士爱的现代建筑世界之窗',
    buildings: opts.buildings ?? [],
    discovery: { found: 0, total: 0 },
    phase: '',
    site: 'BANGKOK',
  };
  let prevPrices = {};
  const blinkAt = {};
  let biggest = null;
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
    let best = null, bestAbs = -1;
    for (const r of ROWS) {
      const c = d[r.k]?.change;
      if (c != null && Math.abs(c) > bestAbs) { bestAbs = Math.abs(c); best = r.k; }
    }
    biggest = best;
    data = d;
  }

  function setMeta(m) {
    if (!m) return;
    for (const k of Object.keys(m)) {
      if (m[k] === undefined) continue;
      if (k === 'discovery') {
        meta.discovery = { ...meta.discovery, ...m.discovery };
      } else {
        meta[k] = m[k];
      }
    }
  }

  function tapeText() {
    const bits = [];
    bits.push(meta.estate);
    bits.push(`v${meta.version || '—'}${meta.build && meta.build !== 'dev' ? '·' + meta.build : ''}`);
    bits.push(clockStr());
    if (meta.buildings?.length) bits.push(meta.buildings.join(' · '));
    const disc = meta.discovery || {};
    bits.push(`DISC ${disc.found ?? 0}/${disc.total ?? 0}`);
    if (!data) {
      bits.push('AWAITING MARKET DATA');
      return bits.join('   ·   ') + '   ·   ';
    }
    const mk = ROWS.map(r => {
      const q = data[r.k];
      if (!q || q.price == null) return `${r.label} —`;
      const ch = q.change == null ? '' :
        `${q.change >= 0 ? '▲' : '▼'}${Math.abs(q.change).toFixed(2)}%`;
      return `${r.label} ${fmt(q.price, r.dp)} ${ch}`;
    }).join('   ·   ');
    return bits.join('   ·   ') + '   ·   ' + mk + '   ·   ';
  }

  /** Split-flap: while a row blinks, glyphs cycle before settling. */
  const flap = (text, blink) => {
    if (blink <= 0.03) return text;
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === ' ' || ch === '·' || ch === '.') { out += ch; continue; }
      // Later characters settle later — the wave every real board has.
      const settle = 1 - (i / Math.max(1, text.length)) * 0.5;
      out += (blink > 0.25 * settle && Math.random() < blink * 0.8)
        ? FLAP[(Math.random() * FLAP.length) | 0]
        : ch;
    }
    return out;
  };

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // Flat near-black — one solid field, no decorative gradient.
    ctx.fillStyle = 'rgba(4,8,12,0.96)';
    ctx.fillRect(0, 0, W, H);

    const dim = 'rgba(150,168,186,';
    const bright = 'rgba(226,238,248,';
    const amberCss = 'rgba(245,158,11,';
    const cyan = 'rgba(88,166,255,';
    const magenta = 'rgba(220,80,180,';
    const green = 'rgba(80,220,140,';
    const tone = { dim, green, magenta, amber: amberCss };

    // ── Header: hall identity, clock, version, LIVE ───────────
    ctx.textBaseline = 'alphabetic';
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillStyle = cyan + '0.75)';
    ctx.fillText('MARKET DEPARTURES · ' + (meta.site || 'BANGKOK'), 28, 30);
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillStyle = amberCss + '0.95)';
    ctx.fillText(meta.estate || '农博士爱的现代建筑世界之窗', 28, 56);

    ctx.textAlign = 'right';
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillStyle = bright + '0.92)';
    ctx.fillText(clockStr(), W - 28, 34);
    ctx.font = '400 12px "JetBrains Mono", monospace';
    ctx.fillStyle = green + '0.8)';
    const ver = `v${meta.version || '—'}` +
      (meta.build && meta.build !== 'dev' ? ` · ${meta.build}` : '');
    ctx.fillText(ver, W - 28, 56);
    if (data?._ts) {
      const age = Math.round((Date.now() - data._ts) / 1000);
      ctx.fillStyle = age < 90 ? amberCss + '0.9)' : dim + '0.55)';
      ctx.fillText(age < 90 ? '● LIVE' : `${Math.round(age / 60)}M AGO`, W - 28, 76);
    }
    ctx.textAlign = 'left';

    // ── Column headers, ruled like the hall board ─────────────
    const colX = { sym: 28, name: 148, price: 560, chg: 700, status: 830 };
    const headY = 104;
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = dim + '0.6)';
    ctx.fillText('CODE', colX.sym, headY);
    ctx.fillText('INSTRUMENT', colX.name, headY);
    ctx.textAlign = 'right';
    ctx.fillText('LAST', colX.price + 90, headY);
    ctx.fillText('CHANGE', colX.chg + 92, headY);
    ctx.textAlign = 'left';
    ctx.fillText('STATUS', colX.status, headY);
    ctx.strokeStyle = dim + '0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(28, headY + 10); ctx.lineTo(W - 28, headY + 10); ctx.stroke();

    // ── The board: one row per instrument ─────────────────────
    const rowH = 46;
    const rowY0 = headY + 26;
    ctx.textBaseline = 'middle';
    ROWS.forEach((r, i) => {
      const y = rowY0 + i * rowH + rowH / 2 - 6;
      const q = data?.[r.k];
      const isBig = r.k === biggest && q?.change != null;
      const since = now - (blinkAt[r.k] || -1e9);
      const blink = Math.max(0, 1 - since / BLINK_MS);
      const st = statusFor(q?.change ?? null);

      // Row rule — hairline between rows, brighter while flapping.
      ctx.strokeStyle = dim + (0.1 + blink * 0.3) + ')';
      ctx.beginPath();
      ctx.moveTo(28, y + rowH / 2 - 3);
      ctx.lineTo(W - 28, y + rowH / 2 - 3);
      ctx.stroke();

      // The one amber: the largest mover's whole row.
      const rowInk = isBig ? amberCss : bright;
      const subInk = isBig ? amberCss : dim;

      ctx.font = '600 17px "JetBrains Mono", monospace';
      ctx.fillStyle = rowInk + (isBig ? '0.95' : '0.9') + ')';
      ctx.fillText(flap(r.label, blink), colX.sym, y);

      ctx.font = '400 13px "JetBrains Mono", monospace';
      ctx.fillStyle = subInk + '0.6)';
      ctx.fillText(flap(r.name, blink), colX.name, y);

      ctx.font = '500 18px "JetBrains Mono", monospace';
      ctx.fillStyle = rowInk + (0.78 + blink * 0.22) + ')';
      ctx.textAlign = 'right';
      ctx.fillText(flap(fmt(q?.price, r.dp), blink), colX.price + 90, y);

      // Change column: signed, with the direction triangle.
      if (q?.change != null) {
        const up = q.change >= 0;
        ctx.font = '500 14px "JetBrains Mono", monospace';
        ctx.fillStyle = isBig ? amberCss + '0.9)'
          : (up ? green : magenta) + '0.8)';
        ctx.fillText(
          `${up ? '▲' : '▼'} ${Math.abs(q.change).toFixed(2)}%`, colX.chg + 92, y);
      } else {
        ctx.font = '400 13px "JetBrains Mono", monospace';
        ctx.fillStyle = dim + '0.4)';
        ctx.fillText('—', colX.chg + 92, y);
      }
      ctx.textAlign = 'left';

      // Status word — the departure-board column.
      ctx.font = '500 14px "JetBrains Mono", monospace';
      const ink = isBig ? tone.amber : tone[st.tone];
      ctx.fillStyle = ink + (isBig ? '0.95' : '0.8') + ')';
      ctx.fillText(flap(st.word, blink), colX.status, y);
    });
    ctx.textBaseline = 'alphabetic';

    // ── Estate nodes + conditions strip ───────────────────────
    const stripY = rowY0 + ROWS.length * rowH + 18;
    const buildings = meta.buildings?.length
      ? meta.buildings
      : ['PAVILION', 'GLASS', 'SAVOYE', 'FARNSWORTH', 'FALLINGWATER'];
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = cyan + '0.6)';
    ctx.fillText('NODES', 28, stripY);
    ctx.fillStyle = bright + '0.75)';
    ctx.fillText(buildings.map(b => String(b).replace(/^THE\s+/i, '')).join(' · '), 92, stripY);
    // GISTDA air, when the brief carries it — the hall's weather line.
    const pmB = data?.pm25_bkk, pmP = data?.pm25_phuket;
    if (pmB != null || pmP != null) {
      ctx.textAlign = 'right';
      ctx.fillStyle = dim + '0.65)';
      ctx.fillText(
        `PM2.5 · BKK ${pmB ?? '—'} · PHUKET ${pmP ?? '—'}`, W - 28, stripY);
      ctx.textAlign = 'left';
    }
    const disc = meta.discovery || {};
    ctx.fillStyle = magenta + '0.75)';
    ctx.fillText(`DISC ${disc.found ?? 0}/${disc.total ?? 0}`, 28, stripY + 20);
    if (meta.phase) {
      ctx.fillStyle = amberCss + '0.7)';
      ctx.fillText(`· ${meta.phase}`, 130, stripY + 20);
    }

    // ── Ticker tape, two rates ────────────────────────────────
    const tape = tapeText();
    ctx.font = '300 14px "JetBrains Mono", monospace';
    const tw = ctx.measureText(tape).width;
    const ty = H - 64;
    ctx.strokeStyle = dim + '0.16)';
    ctx.beginPath(); ctx.moveTo(28, ty - 18); ctx.lineTo(W - 28, ty - 18); ctx.stroke();
    ctx.fillStyle = amberCss + '0.55)';
    ctx.fillText(tape, -tapeX % tw, ty);
    ctx.fillText(tape, (-tapeX % tw) + tw, ty);

    ctx.font = '300 12px "JetBrains Mono", monospace';
    const tw2 = ctx.measureText(tape).width;
    ctx.fillStyle = cyan + '0.3)';
    const t2 = (tapeX * 0.55) % tw2;
    ctx.fillText(tape, t2 - tw2, H - 38);
    ctx.fillText(tape, t2, H - 38);

    // Footer identity strip
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = dim + '0.45)';
    ctx.fillText('SYS · MARKETS · NODES · DISC · TIME · HASH', 28, H - 14);
    ctx.textAlign = 'right';
    ctx.fillStyle = amberCss + '0.5)';
    ctx.fillText('ONE AMBER', W - 28, H - 14);
    ctx.textAlign = 'left';

    tex.needsUpdate = true;
  }

  return {
    group, material: mat, setData, setMeta, surfaces,
    /** @param dt seconds @param visible how much of the pool is showing */
    tick(dt, visible) {
      const target = visible ? 0.94 : 0;
      mat.opacity += (target - mat.opacity) * 0.06;
      if (mat.opacity < 0.01) { group.visible = false; return; }
      group.visible = true;

      tapeX = (tapeX + dt * 86) % 100000;
      const now = performance.now();
      // 12fps is plenty for a scoreboard and leaves the frame budget to
      // the room. A canvas this size redrawn every frame is what makes
      // phones hot.
      if (now - lastDraw > 83) { lastDraw = now; draw(now); }
    },
  };
}
