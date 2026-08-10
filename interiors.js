/**
 * INTERIORS — the reason walking there means something.
 *
 * Three of the houses were shells: perfect envelopes with nothing
 * inside them. You walked the plain, arrived, and the payoff was a
 * roof and a core. A building you can only read from outside is a
 * model, not a place.
 *
 * Everything placed here is the furniture those houses actually
 * contain, because in this particular set of buildings the furniture is
 * not decoration — it IS the argument. Mies designed the Barcelona
 * chair for the Pavilion and then put the same chairs in Farnsworth and
 * Johnson put them in the Glass House, which is why all three interiors
 * look like relatives. The Nadelman sculpture is the only thing in the
 * Glass House that is not architecture, and Johnson kept it in the one
 * spot where it interrupts the view on purpose.
 *
 * Drawn as hairline frames with one filled plane where a cushion or a
 * top belongs — enough to read the silhouette at 5m, cheap enough that
 * four houses of it costs nothing. Real modelling would be the wrong
 * kind of effort: these rooms are about proportion and emptiness, and a
 * lovingly detailed sofa would wreck both.
 */

/** Barcelona chair — the X-frame in profile is the whole recognition. */
function barcelonaChair(THREE, mats, x, z, rotY = 0) {
  const g = new THREE.Group();
  const W = 0.75, D = 0.78, SEAT = 0.42;

  // The chrome X, drawn as two crossing strokes per side.
  const pts = [
    [[-W / 2, SEAT, -D / 2], [-W / 2, 0, D / 2 - 0.1]],
    [[-W / 2, 0, -D / 2 + 0.1], [-W / 2, SEAT + 0.38, D / 2 - 0.06]],
    [[W / 2, SEAT, -D / 2], [W / 2, 0, D / 2 - 0.1]],
    [[W / 2, 0, -D / 2 + 0.1], [W / 2, SEAT + 0.38, D / 2 - 0.06]],
  ];
  const v = [];
  for (const [a, b] of pts) v.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(v), mats.chrome));

  // Seat and back: leather, one plane each.
  const seat = new THREE.Mesh(new THREE.PlaneGeometry(W, D * 0.72), mats.leather);
  seat.rotation.x = -Math.PI / 2;
  seat.position.set(0, SEAT, 0.02);
  g.add(seat);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.5), mats.leather);
  back.position.set(0, SEAT + 0.26, D / 2 - 0.16);
  back.rotation.x = -0.34;
  g.add(back);

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

function ottoman(THREE, mats, x, z, rotY = 0) {
  const g = new THREE.Group();
  const W = 0.6, D = 0.58, H = 0.36;
  g.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), mats.chrome));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.leather);
  top.rotation.x = -Math.PI / 2;
  top.position.y = H / 2;
  g.add(top);
  g.position.set(x, H / 2, z);
  g.rotation.y = rotY;
  return g;
}

/** A low table: a plane on a hairline frame. */
function table(THREE, mats, x, z, w, d, h, mat) {
  const g = new THREE.Group();
  g.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), mats.chrome));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat || mats.wood);
  top.rotation.x = -Math.PI / 2;
  top.position.y = h / 2;
  g.add(top);
  g.position.set(x, h / 2, z);
  return g;
}

/** A bed: low plane, headboard implied by a single line. */
function bed(THREE, mats, x, z, rotY = 0) {
  const g = new THREE.Group();
  const W = 1.4, D = 2.0, H = 0.34;
  g.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), mats.chrome));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.leather);
  top.rotation.x = -Math.PI / 2;
  top.position.y = H / 2;
  g.add(top);
  g.position.set(x, H / 2, z);
  g.rotation.y = rotY;
  return g;
}

/**
 * Nadelman's "Two Circus Women" — the papier-mâché pair Johnson stood in
 * the Glass House. Two figures, abstracted to what you see at distance:
 * a body and a head, leaning together.
 */
function twoFigures(THREE, mats, x, z) {
  const g = new THREE.Group();
  for (const [dx, lean, h] of [[-0.22, 0.09, 1.42], [0.2, -0.07, 1.5]]) {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.19, h, 10, 1, true), mats.plaster);
    body.position.set(dx, h / 2, 0);
    body.rotation.z = lean;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mats.plaster);
    head.position.set(dx + Math.sin(lean) * h * 0.5, h + 0.09, 0);
    g.add(head);
  }
  g.position.set(x, 0, z);
  return g;
}

/** A rug — the only soft edge Mies allowed, and it defines the sitting area. */
function rug(THREE, mats, x, z, w, d) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.rug);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.012, z);
  return m;
}

/** Shared materials, matched to each house's own palette. */
export function interiorMats(THREE, dark) {
  const m = (c, o = 1) => new THREE.MeshBasicMaterial({
    color: c, side: THREE.DoubleSide, transparent: o < 1, opacity: o,
  });
  return {
    chrome: new THREE.LineBasicMaterial({
      color: dark ? 0x9aa8b6 : 0x55606c, transparent: true, opacity: 0.75,
    }),
    leather: m(dark ? 0x2b2622 : 0xbdb2a4),
    wood:    m(dark ? 0x2a1d12 : 0xb59b7c),
    plaster: m(dark ? 0x3d4149 : 0xcfc9bd),
    rug:     m(dark ? 0x1a1f26 : 0xcbc4b6, 0.85),
  };
}

/**
 * The Glass House interior. Johnson's plan is famously a single room
 * with zones and no walls, so the furniture IS the floor plan: the
 * seating group faces the brick cylinder, the bed sits in the far
 * corner with its back to the view, and the sculpture stands where it
 * blocks the diagonal.
 */
export function furnishGlassHouse(THREE, group, dark) {
  const M = interiorMats(THREE, dark);
  const g = new THREE.Group();
  g.add(rug(THREE, M, -1.6, 0.4, 3.6, 3.0));
  g.add(barcelonaChair(THREE, M, -2.6, -0.5, Math.PI * 0.62));
  g.add(barcelonaChair(THREE, M, -2.4, 1.5, Math.PI * 0.42));
  g.add(ottoman(THREE, M, -1.2, -0.9, Math.PI * 0.6));
  g.add(table(THREE, M, -1.5, 0.5, 1.1, 0.7, 0.34, M.wood));
  g.add(bed(THREE, M, 5.2, -2.2, Math.PI / 2));
  g.add(table(THREE, M, 3.4, 2.6, 1.6, 0.9, 0.72, M.wood));   // desk
  g.add(twoFigures(THREE, M, 1.4, 2.4));
  group.add(g);
  return g;
}

/**
 * Farnsworth. Mies fixed the furniture positions and Edith Farnsworth
 * famously resented it — the plan is the primavera core with living to
 * its west and sleeping to its east, and you are not invited to
 * rearrange. Placed relative to the tray's own centre.
 */
export function furnishFarnsworth(THREE, group, dark, floorY = 1.55) {
  const M = interiorMats(THREE, dark);
  const g = new THREE.Group();
  // Living west of the primavera, sleeping east — Mies's fixed plan.
  g.add(rug(THREE, M, -2.4, -0.4, 3.6, 3.0));
  g.add(barcelonaChair(THREE, M, -3.0, -1.2, Math.PI * 0.55));
  g.add(barcelonaChair(THREE, M, -2.8, 0.8, Math.PI * 0.45));
  g.add(ottoman(THREE, M, -1.8, -1.6, Math.PI * 0.5));
  g.add(table(THREE, M, -2.4, 0.1, 1.2, 0.7, 0.34, M.wood));
  g.add(table(THREE, M, -2.2, 2.8, 1.6, 0.9, 0.74, M.wood));  // dining
  g.add(bed(THREE, M, -2.6, -4.8, 0));
  g.position.y = floorY;
  group.add(g);
  return g;
}
