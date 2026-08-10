/**
 * THE REFLECTING POOL — cyberpunk scoreboard in Mies' black water.
 *
 * Stand at the south-east approach and look down: the board faces you
 * (text upright when facing west into the Pavilion along the large
 * pool). Markets, estate buildings, discovery, clock, and version all
 * share one dense sheet — many lit readouts, not pastel cards.
 *
 * Colour grammar: amber `#f59e0b` is the one brand accent (largest
 * mover + live pulse). Cyan / magenta / green are DATA CHROME for
 * status rows — the Pavilion HUD already speaks that language. No
 * Tailwind blue as brand.
 */

const W = 1024, H = 1024;
const BLINK_MS = 1200;

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

const pad2 = (n) => String(n).padStart(2, '0');
const clockStr = (d = new Date()) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

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
  const group = new THREE.Group();
  const surfaces = [];
  const Y_UP = new THREE.Vector3(0, 1, 0);
  for (const p of plan.pools) {
    const w = p.x1 - p.x0, d = p.z1 - p.z0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    // Default (x-only): canvas top → world −Z. Rotate +90° about Y so
    // canvas top → world −X (into the Pavilion from the SE approach).
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

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // Flat near-black — no decorative gradient fill (house law). A single
    // solid field; depth comes from the denser lit rows, not a wash.
    ctx.fillStyle = 'rgba(4,8,12,0.96)';
    ctx.fillRect(0, 0, W, H);

    const dim = 'rgba(150,168,186,';
    const bright = 'rgba(226,238,248,';
    const amberCss = 'rgba(245,158,11,';
    const cyan = 'rgba(88,166,255,';
    const magenta = 'rgba(220,80,180,';
    const green = 'rgba(80,220,140,';

    // ── Top strip: estate identity + clock + version ──────────
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.fillStyle = cyan + '0.75)';
    ctx.fillText('ESTATE // REFLECT', 28, 28);
    ctx.fillStyle = amberCss + '0.95)';
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillText(meta.estate || '农博士爱的现代建筑世界之窗', 28, 52);

    ctx.textAlign = 'right';
    ctx.font = '500 18px "JetBrains Mono", monospace';
    ctx.fillStyle = bright + '0.9)';
    ctx.fillText(clockStr(), W - 28, 32);
    ctx.font = '400 12px "JetBrains Mono", monospace';
    ctx.fillStyle = green + '0.8)';
    const ver = `v${meta.version || '—'}` +
      (meta.build && meta.build !== 'dev' ? ` · ${meta.build}` : '');
    ctx.fillText(ver, W - 28, 54);
    if (data?._ts) {
      const age = Math.round((Date.now() - data._ts) / 1000);
      ctx.fillStyle = age < 90 ? amberCss + '0.9)' : dim + '0.55)';
      ctx.fillText(age < 90 ? '● LIVE' : `${Math.round(age / 60)}M AGO`, W - 28, 74);
    }
    ctx.textAlign = 'left';

    // ── Building status row ───────────────────────────────────
    const buildings = meta.buildings?.length
      ? meta.buildings
      : ['PAVILION', 'GLASS', 'SAVOYE', 'FARNSWORTH', 'FALLINGWATER'];
    const bx0 = 28, by = 92, bw = (W - 56) / buildings.length;
    buildings.forEach((name, i) => {
      const x = bx0 + i * bw;
      ctx.strokeStyle = cyan + '0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, by - 14, bw - 8, 36);
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = cyan + '0.55)';
      ctx.fillText('NODE', x + 8, by);
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillStyle = bright + '0.88)';
      const label = String(name).replace(/^THE\s+/i, '').slice(0, 12);
      ctx.fillText(label, x + 8, by + 14);
      // Alive pip
      ctx.fillStyle = green + '0.85)';
      ctx.beginPath();
      ctx.arc(x + bw - 22, by + 2, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Discovery + phase + site ──────────────────────────────
    const disc = meta.discovery || {};
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.fillStyle = magenta + '0.8)';
    ctx.fillText(
      `DISC ${disc.found ?? 0}/${disc.total ?? 0}`,
      28, 138,
    );
    ctx.fillStyle = dim + '0.65)';
    ctx.fillText(`· ${meta.site || 'BANGKOK'}`, 130, 138);
    if (meta.phase) {
      ctx.fillStyle = amberCss + '0.75)';
      ctx.fillText(`· ${meta.phase}`, 260, 138);
    }
    // Scanline ticks — density chrome, not decoration cards.
    ctx.strokeStyle = dim + '0.12)';
    for (let sx = 28; sx < W - 28; sx += 14) {
      ctx.beginPath();
      ctx.moveTo(sx, 148);
      ctx.lineTo(sx + 6, 148);
      ctx.stroke();
    }

    // ── Market grid: 4 columns × 3 rows — denser ─────────────
    const cols = 4, rows = Math.ceil(ROWS.length / cols);
    const padX = 28, padY = 168;
    const cw = (W - padX * 2) / cols, chh = 78;

    ctx.textBaseline = 'middle';
    ROWS.forEach((r, i) => {
      const col = i % cols, row = (i / cols) | 0;
      const x = padX + col * cw, y = padY + row * chh;
      const q = data?.[r.k];
      const up = (q?.change ?? 0) >= 0;
      const isBig = r.k === biggest && q?.change != null;

      const since = now - (blinkAt[r.k] || -1e9);
      const blink = Math.max(0, 1 - since / BLINK_MS);

      ctx.strokeStyle = (isBig ? amberCss : dim) + (0.18 + blink * 0.45) + ')';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y - chh / 2 + 4, cw - 10, chh - 10);

      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = isBig ? amberCss + '0.95)' : cyan + '0.7)';
      ctx.fillText(r.label, x + 8, y - 14);

      ctx.font = '300 17px "JetBrains Mono", monospace';
      ctx.fillStyle = isBig ? amberCss + (0.85 + blink * 0.15) + ')'
                            : (up ? bright : dim) + (0.72 + blink * 0.28) + ')';
      ctx.fillText(fmt(q?.price, r.dp), x + 8, y + 8);

      if (q?.change != null) {
        const cx = x + cw - 28, cy = y + (up ? -10 : 10);
        ctx.beginPath();
        if (up) { ctx.moveTo(cx, cy - 5); ctx.lineTo(cx - 4, cy + 3); ctx.lineTo(cx + 4, cy + 3); }
        else    { ctx.moveTo(cx, cy + 5); ctx.lineTo(cx - 4, cy - 3); ctx.lineTo(cx + 4, cy - 3); }
        ctx.closePath();
        ctx.fillStyle = isBig ? amberCss + '0.9)'
          : (up ? green : magenta) + '0.75)';
        ctx.fill();

        ctx.font = '400 11px "JetBrains Mono", monospace';
        ctx.fillStyle = isBig ? amberCss + '0.8)' : dim + '0.55)';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.abs(q.change).toFixed(2)}%`, x + cw - 38, y + 10);
        ctx.textAlign = 'left';
      }
    });

    // ── Multi-rate ticker bands ───────────────────────────────
    const tape = tapeText();
    ctx.font = '300 14px "JetBrains Mono", monospace';
    const tw = ctx.measureText(tape).width;
    const ty = H - 120;
    ctx.strokeStyle = dim + '0.16)';
    ctx.beginPath(); ctx.moveTo(padX, ty - 18); ctx.lineTo(W - padX, ty - 18); ctx.stroke();
    ctx.fillStyle = amberCss + '0.55)';
    ctx.fillText(tape, -tapeX, ty);
    ctx.fillText(tape, -tapeX + tw, ty);

    ctx.font = '300 12px "JetBrains Mono", monospace';
    const tw2 = ctx.measureText(tape).width;
    ctx.fillStyle = cyan + '0.35)';
    const t2 = (tapeX * 0.55) % tw2;
    ctx.fillText(tape, t2 - tw2, H - 84);
    ctx.fillText(tape, t2, H - 84);

    // Mid-board weave — denser floor.
    ctx.font = '300 11px "JetBrains Mono", monospace';
    const twM = ctx.measureText(tape).width;
    for (let b = 0; b < 4; b++) {
      const by2 = padY + 30 + b * 78 + 40;
      const rate = [0.42, -0.61, 0.83, -0.37][b];
      const off = ((tapeX * rate) % twM + twM) % twM;
      ctx.fillStyle = (b % 2 ? magenta : cyan) + (0.12 + b * 0.03) + ')';
      ctx.fillText(tape, off - twM, by2);
      ctx.fillText(tape, off, by2);
    }

    ctx.font = '300 11px "JetBrains Mono", monospace';
    const tw3 = ctx.measureText(tape).width;
    ctx.fillStyle = green + '0.22)';
    const t3 = (-tapeX * 0.33) % tw3;
    ctx.fillText(tape, t3, H - 48);
    ctx.fillText(tape, t3 + tw3, H - 48);

    // Footer identity strip
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = dim + '0.45)';
    ctx.fillText('SYS · MARKETS · NODES · DISC · TIME · HASH', 28, H - 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = amberCss + '0.5)';
    ctx.fillText('ONE AMBER', W - 28, H - 22);
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
