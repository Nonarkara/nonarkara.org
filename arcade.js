/**
 * THE ARCADE — a row of kiosks inside the Glass House.
 *
 * Johnson's one room takes furniture without complaint; that was the
 * argument. Six upright cabinets stand along the east glass, screens
 * facing into the room, each one a doorway into Dr Non's Non-Gaming
 * System (games.nonarkara.org) — brain expansion, not killing time.
 * Tap a cabinet: the arcade opens right there.
 *
 * Cabinets are zero-radius boxes with hairline edges — an arcade
 * cabinet is already Braun-shaped if you stop decorating it. Screens
 * are small canvas textures running slow attract patterns; the one
 * amber goes to a single INSERT COIN marquee, once, on the middle
 * cabinet.
 */

export const KIOSKS = [
  { key: 'classic',  label: 'CLASSIC',  url: 'https://games.nonarkara.org/games/classic' },
  { key: 'nineties', label: 'NINETIES', url: 'https://games.nonarkara.org/games/nineties' },
  { key: 'ai',       label: 'AI LAB',   url: 'https://games.nonarkara.org/games/ai' },
  { key: 'edu',      label: 'EDU',      url: 'https://games.nonarkara.org/games/edu' },
  { key: 'kids',     label: 'KIDS',     url: 'https://games.nonarkara.org/games/kids' },
  { key: 'labs',     label: 'LABS',     url: 'https://games.nonarkara.org/games/labs' },
];

/** Cabinet positions LOCAL to the Glass House origin. */
export function kioskPlan(plan) {
  const hw = plan.house.w / 2;               // 4.875
  const x = hw - 0.62;                       // backs to the east glass
  // Two banks of three, clear of the east door gap (|z| < door=1) and
  // the brick cylinder (z 3.2 ± 1.55 at x 1.85 — we sit further east).
  const zs = [-6.6, -5.0, -3.4, 5.9, 7.3, 4.5];
  return KIOSKS.map((k, i) => ({
    ...k, x, z: zs[i], ry: -Math.PI / 2,     // screens face west, into the room
    w: 0.78, d: 0.62, h: 1.78,
  }));
}

export function colliderBoxes(plan) {
  return kioskPlan(plan).map(k => ({
    minX: k.x - k.d / 2, maxX: k.x + k.d / 2,
    minZ: k.z - k.w / 2, maxZ: k.z + k.w / 2,
  }));
}

export function buildArcade(THREE, group, plan, opts = {}) {
  const dark = opts.dark !== false;
  const line = new THREE.LineBasicMaterial({
    color: dark ? 0x8b98a6 : 0x3a4048, transparent: true, opacity: 0.5,
  });
  const bodyMat = new THREE.MeshBasicMaterial({
    color: dark ? 0x1a1f26 : 0x3a4048, side: THREE.DoubleSide,
  });
  const kiosks = [];

  kioskPlan(plan).forEach((k, i) => {
    const holder = new THREE.Group();
    holder.position.set(k.x, 0, k.z);
    holder.rotation.y = k.ry;

    // The cabinet: body, control deck, marquee.
    const body = new THREE.Mesh(new THREE.BoxGeometry(k.w, k.h, k.d), bodyMat);
    body.position.y = k.h / 2;
    holder.add(body);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(k.w, k.h, k.d)), line);
    edge.position.y = k.h / 2;
    holder.add(edge);
    // Control deck jutting toward the player.
    const deck = new THREE.Mesh(new THREE.BoxGeometry(k.w, 0.08, 0.3), bodyMat);
    deck.position.set(0, 1.02, k.d / 2 + 0.14);
    holder.add(deck);
    holder.add((() => {
      const e = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(k.w, 0.08, 0.3)), line);
      e.position.copy(deck.position); return e;
    })());

    // The screen: a small canvas running an attract pattern.
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 96;
    const c2 = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(k.w - 0.14, 0.42),
      new THREE.MeshBasicMaterial({ map: tex }));
    scr.position.set(0, 1.32, k.d / 2 + 0.005);
    holder.add(scr);

    // Marquee label; the middle cabinet carries the one amber.
    const isCoin = i === 2;
    const mq = document.createElement('canvas');
    mq.width = 128; mq.height = 24;
    const m2 = mq.getContext('2d');
    m2.fillStyle = '#0c1014'; m2.fillRect(0, 0, 128, 24);
    m2.font = '600 11px "JetBrains Mono", monospace';
    m2.textAlign = 'center'; m2.textBaseline = 'middle';
    m2.fillStyle = isCoin ? '#f59e0b' : '#aebccb';
    m2.fillText(k.label, 64, 13);
    const mqTex = new THREE.CanvasTexture(mq);
    mqTex.colorSpace = THREE.SRGBColorSpace;
    const marquee = new THREE.Mesh(
      new THREE.PlaneGeometry(k.w - 0.1, 0.14),
      new THREE.MeshBasicMaterial({ map: mqTex }));
    marquee.position.set(0, k.h - 0.12, k.d / 2 + 0.005);
    holder.add(marquee);

    // Invisible hit volume for the raycaster.
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(k.w + 0.3, k.h, k.d + 0.6),
      new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = k.h / 2;
    holder.add(hit);

    group.add(holder);
    kiosks.push({ holder, hit, cv, c2, tex, seed: i * 17.3, def: k });
  });

  // Attract mode — each screen runs its own slow pattern. Cheap: tiny
  // canvases, redrawn a few times a second by tick().
  let t = 0, lastDraw = 0;
  function drawScreens() {
    kiosks.forEach(({ cv, c2, tex, seed }, i) => {
      const w = cv.width, h = cv.height;
      c2.fillStyle = '#05080c';
      c2.fillRect(0, 0, w, h);
      const phase = t * 0.6 + seed;
      if (i % 3 === 0) {
        // Breakout rows.
        for (let r = 0; r < 4; r++) for (let b = 0; b < 8; b++) {
          const on = Math.sin(phase + r + b * 0.7) > -0.3;
          c2.fillStyle = on ? '#4a6c8a' : '#14202c';
          c2.fillRect(6 + b * 15, 8 + r * 9, 12, 6);
        }
        const bx = w / 2 + Math.sin(phase * 2.1) * 40;
        const by = 62 + Math.abs(Math.sin(phase * 3.2)) * 22;
        c2.fillStyle = '#e6edf3'; c2.fillRect(bx, by, 4, 4);
        c2.fillRect(w / 2 + Math.sin(phase * 2.1) * 40 - 10, 90, 24, 4);
      } else if (i % 3 === 1) {
        // Pong rally.
        const py = h / 2 + Math.sin(phase * 1.7) * 28;
        c2.fillStyle = '#e6edf3';
        c2.fillRect(6, py - 10, 4, 20);
        c2.fillRect(w - 10, h - py - 10, 4, 20);
        c2.fillRect(w / 2 + Math.sin(phase * 2.6) * 50, h / 2 + Math.cos(phase * 2.2) * 34, 4, 4);
        c2.strokeStyle = '#2a3642'; c2.setLineDash([3, 4]);
        c2.beginPath(); c2.moveTo(w / 2, 0); c2.lineTo(w / 2, h); c2.stroke();
        c2.setLineDash([]);
      } else {
        // 15-puzzle shuffle.
        for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) {
          if ((r * 4 + col + Math.floor(phase)) % 16 === 0) continue;
          c2.fillStyle = '#1c2836';
          c2.fillRect(18 + col * 24, 4 + r * 23, 21, 20);
          c2.fillStyle = '#8ba3ba';
          c2.font = '9px monospace'; c2.textAlign = 'center';
          c2.fillText(String((r * 4 + col + 1) % 16 || 15), 28 + col * 24, 17 + r * 23);
        }
      }
      tex.needsUpdate = true;
    });
  }

  return {
    kiosks,
    tick(dt) {
      t += dt;
      const now = performance.now();
      if (now - lastDraw > 200) { lastDraw = now; drawScreens(); }
    },
  };
}
