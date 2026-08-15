/**
 * THE YARD — paths, a pitch, a court, and two games of aim.
 *
 * Harvard Yard's lesson is that a campus is made by its crossings, not
 * its buildings: straight paths cut corner-to-corner between doors,
 * and the diagonals meeting on the green ARE the place. Five houses
 * on a plain earn the same network — flat pale strips, hairline edged,
 * legible from eye height and from the city-zoom map alike.
 *
 * Between the crossings, two fields:
 *   - a soccer pitch with two goals,
 *   - a basketball half-pair with two hoops,
 * each carrying the simplest possible game: stand near, tap the goal
 * mouth or the hoop, and the ball arcs from your chest to the point
 * you tapped. Inside the mouth: score, net pulse, the board counts.
 * Wide: the post says no. Scores persist on the device.
 *
 * One amber in the yard: the ball in flight. Attention goes to the
 * thing that is moving — everything standing still stays quiet.
 */

// ── The network ─────────────────────────────────────────────
// Nodes are door thresholds and the quad crossing; edges are straight
// runs. World coordinates.
export const NODES = {
  pavNE:  { x: 24, z: 13 },
  pavNW:  { x: -24, z: 13 },
  pavS:   { x: 8, z: -13 },
  pavE:   { x: 28, z: -4 },
  quad:   { x: 0, z: 30 },
  glass:  { x: 40, z: 40 },
  savoye: { x: -40, z: 60 },
  farns:  { x: 0, z: -30 },
  fwBend: { x: 30, z: -6 },
  fw:     { x: 57.5, z: -12 },
};

export const EDGES = [
  ['pavNE', 'quad'], ['pavNW', 'quad'],
  ['quad', 'glass'], ['quad', 'savoye'],
  ['pavNE', 'glass'], ['pavNW', 'savoye'],
  ['pavS', 'farns'],
  ['pavE', 'fwBend'], ['fwBend', 'fw'],
  ['farns', 'fwBend'],
];

export const PATH_W = 2.6;

// ── The fields ──────────────────────────────────────────────
export const PITCH = {           // soccer — long axis X
  cx: -13, cz: 27, w: 28, d: 16,
  goalW: 4.4, goalH: 1.7,
};
export const COURT = {           // basketball — long axis X
  cx: 15, cz: 27, w: 15, d: 8.5,
  rimH: 3.05, rimR: 0.28, boardW: 1.4, boardH: 0.9, poleH: 3.35,
};

/** Pure shot judgement, exported for the test. Local target space. */
export function judgeShot(kind, dx, dy) {
  if (kind === 'goal') {
    // dx along the goal mouth, dy above the ground.
    return Math.abs(dx) < PITCH.goalW / 2 - 0.12 &&
      dy > 0.05 && dy < PITCH.goalH - 0.08;
  }
  // Hoop: radial distance from the ring centre.
  return Math.hypot(dx, dy) < COURT.rimR + 0.06;
}

/** Ball flight: simple gravity arc hitting `to` at time T. */
export function ballAt(from, to, t, T) {
  const k = Math.min(1, t / T);
  const g = 9.8;
  // Vertical: solve the parabola through both endpoints with real g.
  const y = from.y + (to.y - from.y) * k + 0.5 * g * T * T * k * (1 - k);
  return {
    x: from.x + (to.x - from.x) * k,
    y,
    z: from.z + (to.z - from.z) * k,
    done: t >= T,
  };
}

export function colliderBoxes() {
  const out = [];
  // Goal posts (thin) — you can walk into the goal, not through posts.
  for (const s of [-1, 1]) {
    const gx = PITCH.cx + s * PITCH.w / 2;
    for (const dz of [-PITCH.goalW / 2, PITCH.goalW / 2]) {
      out.push({ minX: gx - 0.07, maxX: gx + 0.07,
                 minZ: PITCH.cz + dz - 0.07, maxZ: PITCH.cz + dz + 0.07 });
    }
  }
  // Hoop poles.
  for (const s of [-1, 1]) {
    const px = COURT.cx + s * COURT.w / 2;
    out.push({ minX: px - 0.09, maxX: px + 0.09,
               minZ: COURT.cz - 0.09, maxZ: COURT.cz + 0.09 });
  }
  return out;
}

export function buildYard(THREE, scene, opts = {}) {
  const dark = opts.dark !== false;
  const G = new THREE.Group();
  G.name = 'yard';
  scene.add(G);

  const line = new THREE.LineBasicMaterial({
    color: dark ? 0x8b98a6 : 0x4a5058, transparent: true, opacity: 0.4,
  });
  const white = new THREE.LineBasicMaterial({
    color: dark ? 0xaebccb : 0xf2f0e8, transparent: true, opacity: 0.55,
  });

  const MATS = {
    path:  new THREE.MeshBasicMaterial({ color: dark ? 0x232823 : 0xcfc9b8, side: THREE.DoubleSide }),
    grass: new THREE.MeshBasicMaterial({ color: dark ? 0x141c14 : 0x5d7a5d, side: THREE.DoubleSide }),
    court: new THREE.MeshBasicMaterial({ color: dark ? 0x20242a : 0xc9c2b0, side: THREE.DoubleSide }),
    steel: new THREE.MeshBasicMaterial({ color: dark ? 0x8e9aa6 : 0xaab4bd, side: THREE.DoubleSide }),
    ball:  new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
  };

  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

  // ── Paths ─────────────────────────────────────────────────
  for (const [a, b] of EDGES) {
    const A = NODES[a], B = NODES[b];
    const dx = B.x - A.x, dz = B.z - A.z;
    const len = Math.hypot(dx, dz);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len, PATH_W), MATS.path);
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = Math.atan2(-dz, dx);
    strip.position.set((A.x + B.x) / 2, 0.006, (A.z + B.z) / 2);
    G.add(strip);
    // Hairline edges along both sides.
    const eg = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(len, PATH_W)), line);
    eg.rotation.copy(strip.rotation);
    eg.position.copy(strip.position);
    eg.position.y += 0.001;
    G.add(eg);
  }

  // ── Soccer pitch ──────────────────────────────────────────
  {
    const P = PITCH;
    const field = new THREE.Mesh(new THREE.PlaneGeometry(P.w, P.d), MATS.grass);
    field.rotation.x = -Math.PI / 2;
    field.position.set(P.cx, 0.004, P.cz);
    G.add(field);
    // Touchlines, halfway line, centre circle — white hairlines.
    const pts = [];
    const hw = P.w / 2, hd = P.d / 2;
    const push = (x0, z0, x1, z1) => pts.push(
      new THREE.Vector3(P.cx + x0, 0.012, P.cz + z0),
      new THREE.Vector3(P.cx + x1, 0.012, P.cz + z1));
    push(-hw, -hd, hw, -hd); push(hw, -hd, hw, hd);
    push(hw, hd, -hw, hd); push(-hw, hd, -hw, -hd);
    push(0, -hd, 0, hd);
    for (let i = 0; i < 32; i++) {
      const a0 = (i / 32) * Math.PI * 2, a1 = ((i + 1) / 32) * Math.PI * 2;
      push(Math.cos(a0) * 2.6, Math.sin(a0) * 2.6, Math.cos(a1) * 2.6, Math.sin(a1) * 2.6);
    }
    // Goal boxes.
    for (const s of [-1, 1]) {
      push(s * hw, -3.6, s * (hw - 3.2), -3.6);
      push(s * (hw - 3.2), -3.6, s * (hw - 3.2), 3.6);
      push(s * (hw - 3.2), 3.6, s * hw, 3.6);
    }
    G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), white));
  }

  // Goals: posts, crossbar, net grid. Net materials pulse on a score.
  const nets = [];
  const goalDefs = [];
  for (const s of [-1, 1]) {
    const gx = PITCH.cx + s * PITCH.w / 2;
    const post = (z) => {
      const p = box(0.1, PITCH.goalH, 0.1, MATS.steel);
      p.position.set(gx, PITCH.goalH / 2, PITCH.cz + z);
      G.add(p);
    };
    post(-PITCH.goalW / 2); post(PITCH.goalW / 2);
    const bar = box(0.1, 0.1, PITCH.goalW + 0.1, MATS.steel);
    bar.position.set(gx, PITCH.goalH, PITCH.cz);
    G.add(bar);
    // Soccer Net: 3D boxed enclosure net grid behind the posts.
    const netMat = new THREE.LineBasicMaterial({
      color: dark ? 0xb0bec5 : 0xf2f0e8, transparent: true, opacity: 0.55,
    });
    const np = [];
    const back = s * 1.0;
    const nVert = 12;
    const nHoriz = 6;
    for (let i = 0; i <= nVert; i++) {
      const z = -PITCH.goalW / 2 + (PITCH.goalW * i) / nVert;
      // Top to bottom back wall
      np.push(new THREE.Vector3(gx + back, PITCH.goalH, PITCH.cz + z),
              new THREE.Vector3(gx + back, 0.02, PITCH.cz + z));
      // Top roof run
      np.push(new THREE.Vector3(gx, PITCH.goalH, PITCH.cz + z),
              new THREE.Vector3(gx + back, PITCH.goalH, PITCH.cz + z));
    }
    for (let j = 0; j <= nHoriz; j++) {
      const y = (PITCH.goalH * j) / nHoriz;
      // Back wall crossbar
      np.push(new THREE.Vector3(gx + back, y, PITCH.cz - PITCH.goalW / 2),
              new THREE.Vector3(gx + back, y, PITCH.cz + PITCH.goalW / 2));
      // Side wall crossbars
      np.push(new THREE.Vector3(gx, y, PITCH.cz - PITCH.goalW / 2),
              new THREE.Vector3(gx + back, y, PITCH.cz - PITCH.goalW / 2));
      np.push(new THREE.Vector3(gx, y, PITCH.cz + PITCH.goalW / 2),
              new THREE.Vector3(gx + back, y, PITCH.cz + PITCH.goalW / 2));
    }
    const net = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(np), netMat);
    G.add(net);
    nets.push({ mat: netMat, mesh: net });
    goalDefs.push({
      kind: 'goal', side: s, x: gx, z: PITCH.cz,
      hit: { w: 0.6, h: PITCH.goalH + 0.4, d: PITCH.goalW + 0.5 },
    });
  }

  // ── Basketball court ──────────────────────────────────────
  {
    const C = COURT;
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(C.w, C.d), MATS.court);
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(C.cx, 0.004, C.cz);
    G.add(slab);
    const pts = [];
    const hw = C.w / 2, hd = C.d / 2;
    const push = (x0, z0, x1, z1) => pts.push(
      new THREE.Vector3(C.cx + x0, 0.012, C.cz + z0),
      new THREE.Vector3(C.cx + x1, 0.012, C.cz + z1));
    push(-hw, -hd, hw, -hd); push(hw, -hd, hw, hd);
    push(hw, hd, -hw, hd); push(-hw, hd, -hw, -hd);
    push(0, -hd, 0, hd);
    // Keys and arcs, sketched.
    for (const s of [-1, 1]) {
      push(s * hw, -1.6, s * (hw - 2.4), -1.6);
      push(s * (hw - 2.4), -1.6, s * (hw - 2.4), 1.6);
      push(s * (hw - 2.4), 1.6, s * hw, 1.6);
      for (let i = 0; i < 12; i++) {
        const a0 = -Math.PI / 2 + (i / 12) * Math.PI;
        const a1 = -Math.PI / 2 + ((i + 1) / 12) * Math.PI;
        push(s * (hw - Math.cos(a0) * 3.4) - s * 0, Math.sin(a0) * 3.4,
             s * (hw - Math.cos(a1) * 3.4), Math.sin(a1) * 3.4);
      }
    }
    G.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), white));
  }

  // Hoops: pole, board, ring (a true circle — the allowed shape).
  const hoopDefs = [];
  const ringMats = [];
  for (const s of [-1, 1]) {
    const px = COURT.cx + s * COURT.w / 2;
    const pole = box(0.14, COURT.poleH, 0.14, MATS.steel);
    pole.position.set(px, COURT.poleH / 2, COURT.cz);
    G.add(pole);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.boardW, COURT.boardH),
      new THREE.MeshBasicMaterial({
        color: dark ? 0x2a3138 : 0xe8e4da, side: THREE.DoubleSide,
        transparent: true, opacity: 0.85,
      }));
    board.position.set(px - s * 0.12, COURT.rimH + 0.42, COURT.cz);
    board.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    G.add(board);
    const ringMat = new THREE.LineBasicMaterial({
      color: dark ? 0xaebccb : 0x4a5058, transparent: true, opacity: 0.9,
    });
    const rp = [];
    const rx = px - s * (0.12 + COURT.rimR + 0.05);
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      rp.push(new THREE.Vector3(rx + Math.cos(a) * COURT.rimR, COURT.rimH,
        COURT.cz + Math.sin(a) * COURT.rimR));
    }
    G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rp), ringMat));
    ringMats.push(ringMat);

    // Basketball Net: 3D conical woven mesh hanging down 0.48m from the rim.
    const bnetMat = new THREE.LineBasicMaterial({
      color: dark ? 0xcfdaf0 : 0xffffff, transparent: true, opacity: 0.85,
    });
    const bnp = [];
    const nLoops = 14;
    const nRings = 4;
    const netH = 0.48;
    for (let i = 0; i < nLoops; i++) {
      const a0 = (i / nLoops) * Math.PI * 2;
      const a1 = (((i + 0.5) % nLoops) / nLoops) * Math.PI * 2;
      for (let j = 0; j < nRings; j++) {
        const t0 = j / nRings;
        const t1 = (j + 1) / nRings;
        const r0 = COURT.rimR * (1 - 0.58 * t0);
        const r1 = COURT.rimR * (1 - 0.58 * t1);
        const y0 = COURT.rimH - t0 * netH;
        const y1 = COURT.rimH - t1 * netH;
        bnp.push(new THREE.Vector3(rx + Math.cos(a0) * r0, y0, COURT.cz + Math.sin(a0) * r0),
                 new THREE.Vector3(rx + Math.cos(a1) * r1, y1, COURT.cz + Math.sin(a1) * r1));
        bnp.push(new THREE.Vector3(rx + Math.cos(a1) * r0, y0, COURT.cz + Math.sin(a1) * r0),
                 new THREE.Vector3(rx + Math.cos(a0) * r1, y1, COURT.cz + Math.sin(a0) * r1));
      }
    }
    const bnetObj = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(bnp), bnetMat);
    G.add(bnetObj);

    hoopDefs.push({
      kind: 'hoop', side: s, x: rx, z: COURT.cz, y: COURT.rimH,
      hit: { w: 1.6, h: 1.6, d: 1.6 },
      bnetObj, bnetMat,
    });
  }

  // ── Scoreboards — one per game, session-persistent ────────
  const scores = {
    goal: +((typeof localStorage !== 'undefined' && localStorage.getItem('nonarkara.yard.goal')) || 0),
    hoop: +((typeof localStorage !== 'undefined' && localStorage.getItem('nonarkara.yard.hoop')) || 0),
  };
  const boards = {};
  const makeBoard = (label, key, x, z, ry) => {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const c2 = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    m.position.set(x, 2.6, z);
    m.rotation.y = ry;
    G.add(m);
    boards[key] = { cv, c2, tex, label, best: scores[key], seconds: 0 };
    paintBoard(key);
  };
  function paintBoard(key) {
    const b = boards[key];
    if (!b) return;
    const c2 = b.c2;
    c2.fillStyle = 'rgba(6,10,14,0.9)';
    c2.fillRect(0, 0, 256, 64);
    c2.strokeStyle = 'rgba(150,168,186,0.4)';
    c2.strokeRect(1, 1, 254, 62);
    c2.textBaseline = 'alphabetic';
    c2.font = '600 13px "JetBrains Mono", monospace';
    c2.fillStyle = 'rgba(226,238,248,0.9)';
    c2.fillText(b.label, 12, 22);
    // The live score, big. Amber, because it is the number you are
    // playing for — and the only amber on this board.
    c2.font = '600 26px "JetBrains Mono", monospace';
    c2.fillStyle = '#f59e0b';
    c2.textAlign = 'right';
    c2.fillText(String(scores[key]), 244, 46);
    c2.textAlign = 'left';
    // The clock while a round runs; the best when it is not.
    c2.font = '500 12px "JetBrains Mono", monospace';
    if (b.seconds > 0) {
      c2.fillStyle = b.seconds <= 10 ? '#f59e0b' : 'rgba(88,166,255,0.85)';
      c2.fillText(`${b.seconds}s`, 12, 46);
    } else {
      c2.fillStyle = 'rgba(150,168,186,0.7)';
      c2.fillText(`BEST ${b.best}`, 12, 46);
    }
    b.tex.needsUpdate = true;
  }
  makeBoard('YARD FC · SHOOTOUT', 'goal', PITCH.cx, PITCH.cz - PITCH.d / 2 - 1.2, 0);
  makeBoard('THE HOOP · SHOOTOUT', 'hoop', COURT.cx, COURT.cz - COURT.d / 2 - 1.2, 0);

  /**
   * The board reads the game, rather than keeping its own count. Two
   * numbers for the same score is how they end up disagreeing.
   * @param kind 'soccer' | 'basket' — the ball's own word
   */
  function setBoard(kind, game, seconds = 0) {
    const key = kind === 'soccer' ? 'goal' : 'hoop';
    if (!boards[key]) return;
    scores[key] = game.score;
    boards[key].best = game.best;
    boards[key].seconds = seconds;
    paintBoard(key);
  }

  /** A score pulses the net or the ring it went through. */
  function celebrate(kind) {
    const mats = kind === 'soccer' ? nets : ringMats;
    for (const m of mats) {
      pulses.push({ mat: m, t: 0, base: kind === 'soccer' ? 0.22 : 0.9 });
    }
  }

  // ── Balls in flight ───────────────────────────────────────
  const balls = [];
  const ballGeo = new THREE.SphereGeometry(0.13, 12, 10);
  /**
   * Fire a shot. from: player position; to: the tapped world point;
   * target: a goalDef/hoopDef. Returns whether the shot will score —
   * decided at launch (the tap IS the aim), revealed at landing.
   */
  function shoot(from, to, target) {
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    if (dist > 32) return null;                 // too far to bother
    const T = 0.55 + dist * 0.035;
    let scored;
    if (target.kind === 'goal') {
      scored = judgeShot('goal', to.z - target.z, to.y);
    } else {
      scored = judgeShot('hoop', Math.hypot(to.x - target.x, to.z - target.z), to.y - target.y);
    }
    const mesh = new THREE.Mesh(ballGeo, MATS.ball);
    mesh.position.set(from.x, from.y, from.z);
    G.add(mesh);
    balls.push({
      mesh, t: 0, T, scored, target,
      from: { ...from }, to: { ...to },
    });
    return { scored, T };
  }

  const pulses = [];   // {mat, t}
  const swishes = [];  // {mesh, t}
  function tick(dt) {
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      b.t += dt;
      const p = ballAt(b.from, b.to, b.t, b.T);
      b.mesh.position.set(p.x, p.y, p.z);
      if (p.done) {
        G.remove(b.mesh);
        balls.splice(i, 1);
        if (b.scored) {
          scores[b.target.kind] += 1;
          try { localStorage.setItem('nonarkara.yard.' + b.target.kind, String(scores[b.target.kind])); } catch (_) {}
          paintBoard(b.target.kind);
          const idx = b.target.side < 0 ? 0 : 1;
          const mat = b.target.kind === 'goal' ? nets[idx].mat : ringMats[idx];
          pulses.push({ mat, t: 0, base: b.target.kind === 'goal' ? 0.55 : 0.9 });
          if (b.target.kind === 'hoop' && hoopDefs[idx]?.bnetObj) {
            swishes.push({ mesh: hoopDefs[idx].bnetObj, t: 0 });
          }
        }
      }
    }
    for (let i = swishes.length - 1; i >= 0; i--) {
      const s = swishes[i];
      s.t += dt;
      const k = Math.sin(Math.min(1, s.t / 0.4) * Math.PI);
      s.mesh.scale.set(1 + k * 0.3, 1 + k * 0.2, 1 + k * 0.3);
      if (s.t >= 0.4) { s.mesh.scale.set(1, 1, 1); swishes.splice(i, 1); }
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt;
      const k = Math.max(0, 1 - p.t / 0.9);
      p.mat.opacity = p.base + k * (1 - p.base) * 0.9;
      if (k <= 0) { p.mat.opacity = p.base; pulses.splice(i, 1); }
    }
  }

  /** Palette response — the yard answers the same light. */
  function paint(p) {
    const mixHex = (a, b, t) => {
      const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
      return (m(16) << 16) | (m(8) << 8) | m(0);
    };
    MATS.path.color.setHex(mixHex(p.podium, p.travertine, 0.4));
    MATS.grass.color.setHex(mixHex(p.green, p.podium, 0.25));
    MATS.court.color.setHex(mixHex(p.podium, p.bg, 0.15));
    MATS.steel.color.setHex(p.chrome);
  }

  return {
    group: G, materials: MATS, shoot, tick, paint, setBoard, celebrate,
    targets: [...goalDefs, ...hoopDefs],
    scores, balls,
    colliders: colliderBoxes(),
  };
}
