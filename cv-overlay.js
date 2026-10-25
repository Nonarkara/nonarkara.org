/**
 * CV OVERLAY — what the truck's cameras think it is looking at.
 *
 * Drawn on a 2D canvas over the 3D scene, in the language of a real
 * detection display: a box around each thing the detector believes in, a
 * label chip naming it, and a percentage saying how sure it is.
 *
 * Three colours, because the percentage means nothing without one:
 *   green  — it is probably that
 *   amber  — it might be that
 *   red    — it is a guess, and the guess is weak
 *
 * The projection is honest. The world is 3D and the camera is real, so a
 * box is the screen-space bounds of the object's actual volume projected
 * through the actual camera — not a square pasted where the thing looks
 * like it is. If it is behind you, it is not drawn. If it is behind a
 * building, the building is drawn over it and the box is drawn over the
 * building, because the detector does not know about occlusion any better
 * than a real one does.
 *
 * And the counter at the bottom. Things in view that the detector CANNOT
 * name — the buildings, the goal frame, the hoop. That number is the
 * lesson, so it is on screen at all times, not buried in a caption.
 */

/**
 * Real-world sizes, in metres. A box has to be the size of the thing, or
 * the overlay is a cartoon of a detector rather than a detector.
 */
export const SIZES = {
  car:         { L: 4.4, W: 1.8, H: 1.45 },
  truck:       { L: 5.3, W: 2.0, H: 1.90 },
  bus:         { L: 9.6, W: 2.5, H: 3.00 },
  person:      { L: 0.5, W: 0.5, H: 1.75 },
  dog:         { L: 1.1, W: 0.4, H: 0.60 },
  motorcycle:  { L: 2.0, W: 0.7, H: 1.20 },
  bicycle:     { L: 1.8, W: 0.5, H: 1.10 },
  light:       { L: 0.3, W: 0.3, H: 0.90 },
  stopSign:    { L: 0.7, W: 0.7, H: 0.70 },
  planter:     { L: 0.6, W: 0.6, H: 0.90 },
  hydrant:     { L: 0.3, W: 0.3, H: 0.70 },
  bench:       { L: 1.8, W: 0.6, H: 0.90 },
  sportsBall:  { L: 0.24, W: 0.24, H: 0.24 },
};

export const CONF_HI = 0.75;
export const CONF_MID = 0.50;

/** The colour a confidence earns. */
export function confColour(conf) {
  if (conf >= CONF_HI) return '#4ade80';   // green
  if (conf >= CONF_MID) return '#fbbf24';   // amber
  return '#f87171';                          // red
}

/**
 * Project an object's volume into screen space.
 *
 * `project(x, y, z)` returns {x, y, z} in normalised device coordinates.
 * Returns null when the object is behind the camera, because a box for
 * something behind you is a lie.
 */
export function projectBox(project, obj, dims, width, height) {
  const d = dims ?? SIZES[obj.kind] ?? SIZES.person;
  const hx = d.W / 2, hz = d.L / 2;
  const y0 = obj.y ?? 0, y1 = y0 + d.H;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let anyFront = false;
  let nearest = Infinity;

  for (const sx of [-hx, hx]) {
    for (const sz of [-hz, hz]) {
      for (const sy of [y0, y1]) {
        const p = project(obj.x + sx, sy, obj.z + sz);
        if (!p) return null;
        if (p.z < -1 || p.z > 1) continue;
        anyFront = true;
        nearest = Math.min(nearest, p.z);
        const px = (p.x * 0.5 + 0.5) * width;
        const py = (-p.y * 0.5 + 0.5) * height;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
  }
  if (!anyFront) return null;

  // A box wider than the screen is a box we cannot draw. Clamp it so the
  // label chip still has an edge to sit on.
  const w = Math.min(maxX - minX, width * 1.6);
  const h = Math.min(maxY - minY, height * 1.6);
  return {
    x: Math.max(-w, Math.min(minX, width)),
    y: Math.max(-h, Math.min(minY, height)),
    w, h,
    depth: nearest,
  };
}

/** The text on the chip: the class name and the confidence. */
export function labelFor(track) {
  const label = String(track.label ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return `${label} ${Math.round((track.conf ?? 0) * 100)}%`;
}

/**
 * Draw the whole overlay.
 *
 * `state` carries everything the frame needs:
 *   tracks    — what the detector believes in
 *   unnamed   — things in view it has no word for
 *   decision  — what the autopilot is doing and why
 *   project   — world → NDC
 *   width, height — the canvas size
 */
export function drawOverlay(ctx, state) {
  const {
    tracks, unnamed = [], decision = null, project, width, height,
    autopilot = false, condition = 'day', range = null,
  } = state;
  if (!ctx || !project) return;

  ctx.clearRect(0, 0, width, height);
  ctx.lineJoin = 'round';
  ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';

  // Far things first, so the near things draw over them.
  const drawn = [];
  for (const tr of tracks) {
    const dims = SIZES[tr.kind] ?? SIZES.person;
    const box = projectBox(project, { x: tr.x, z: tr.z, y: tr.y ?? 0, kind: tr.kind }, dims, width, height);
    if (!box) continue;
    drawn.push({ tr, box });
  }
  drawn.sort((a, b) => b.box.depth - a.box.depth);

  // The unnamed count comes from the tracks, not from a separate list, so
  // the number on screen is the number of things actually boxed.
  const unnamedCount = drawn.filter(d => d.tr.named === false).length;
  const namedCount = drawn.length - unnamedCount;

  // A live sensor must say that it is alive even when the road is empty.
  // Otherwise an empty frame is indistinguishable from a stalled detector.
  const status = `CV · ${namedCount} TRACK${namedCount === 1 ? '' : 'S'} · ${condition.toUpperCase()}`
    + (range ? ` · ${Math.round(range)}m` : '');
  const statusW = ctx.measureText(status).width;
  const statusY = Math.min(132, Math.max(44, height * 0.16));
  ctx.fillStyle = 'rgba(11,14,18,0.78)';
  ctx.fillRect(12, statusY, statusW + 16, 20);
  ctx.strokeStyle = namedCount ? '#4ade80' : 'rgba(232,238,244,0.42)';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, statusY, statusW + 16, 20);
  ctx.fillStyle = '#e8eef4';
  ctx.fillText(status, 20, statusY + 14);

  for (const { tr, box } of drawn) {
    if (tr.named === false) {
      // Seen. Not named. A hollow grey outline with no label, because a
      // label is a word and there is no word for this. The building is
      // right there in the frame and the detector has nothing to say.
      ctx.strokeStyle = 'rgba(232,238,244,0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.setLineDash([]);
      continue;
    }
    const colour = confColour(tr.conf ?? 0);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    // Corner ticks — the little right-angle marks a real detector draws, so
    // the box reads as a tracking overlay rather than a rectangle.
    const c = Math.min(10, box.w / 3, box.h / 3);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + c); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + c, box.y);
    ctx.moveTo(box.x + box.w - c, box.y); ctx.lineTo(box.x + box.w, box.y); ctx.lineTo(box.x + box.w, box.y + c);
    ctx.moveTo(box.x + box.w, box.y + box.h - c); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.lineTo(box.x + box.w - c, box.y + box.h);
    ctx.moveTo(box.x + c, box.y + box.h); ctx.lineTo(box.x, box.y + box.h); ctx.lineTo(box.x, box.y + box.h - c);
    ctx.stroke();

    const text = labelFor(tr);
    const tw = ctx.measureText(text).width;
    const chipH = 15;
    const chipY = Math.max(0, box.y - chipH - 2);
    ctx.fillStyle = colour;
    ctx.fillRect(box.x, chipY, tw + 10, chipH);
    ctx.fillStyle = '#0b0e12';
    ctx.fillText(text, box.x + 5, chipY + chipH - 4);
  }

  // The reason the autopilot is doing what it is doing. If nothing is
  // holding it back, it says so — silence would be indistinguishable
  // from a hang.
  if (autopilot && decision) {
    const msg = decision.reason === 'clear'
      ? 'AUTO · clear'
      : `AUTO · ${decision.reason}${decision.label ? ` · ${decision.label}` : ''}${decision.dist != null ? ` · ${decision.dist.toFixed(0)}m` : ''}`;
    const tw = ctx.measureText(msg).width;
    // Keep reasoning in the windscreen, below sensor state. The lower-right
    // corner belongs to the seat/camera controls on every device.
    const x = 20, y = statusY + 44;
    ctx.fillStyle = 'rgba(11,14,18,0.78)';
    ctx.fillRect(x - 8, y - 13, tw + 16, 20);
    ctx.strokeStyle = decision.action === 'braking_hard' ? '#f87171'
      : decision.action === 'slowing' ? '#fbbf24' : '#4ade80';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 8, y - 13, tw + 16, 20);
    ctx.fillStyle = '#e8eef4';
    ctx.fillText(msg, x, y);
  }

  // The counter. The number of things in view the detector cannot name.
  if (unnamedCount) {
    const msg = `${unnamedCount} in view, unnamed — no category exists`;
    const tw = ctx.measureText(msg).width;
    ctx.fillStyle = 'rgba(11,14,18,0.78)';
    ctx.fillRect(12, height - 44, tw + 16, 20);
    ctx.strokeStyle = 'rgba(232,238,244,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, height - 44, tw + 16, 20);
    ctx.fillStyle = '#e8eef4';
    ctx.fillText(msg, 20, height - 30);
  }
}
