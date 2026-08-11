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

/**
 * Wassily chair (Model B3) — Marcel Breuer, 1925.
 *
 * The recognition shape is the two stacked U's of chromium-plated steel
 * tubing, one forming the arm-to-floor side and the other the seat
 * support, joined across by a single tube. Sitting in the Pavilion the
 * chair sat at the living-area end of the onyx wall — a chair that
 * looks as if it were welded out of bicycle handlebars, which is
 * exactly what Breuer said about it.
 */
function breuerWassily(THREE, mats, x, z, rotY = 0) {
  const g = new THREE.Group();
  const T = 0.022;        // tube radius, the chair's own scale
  const W = 0.79, D = 0.70, H = 0.74, SEAT = 0.44;

  const tube = (a, b) => {
    const v = [new THREE.Vector3(...a), new THREE.Vector3(...b)];
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(v), mats.chrome));
  };
  // The two side U's: arm+back tube on the outside, seat tube on the inside.
  // Each side is one continuous path, drawn as a polyline.
  const sidePath = (sx) => {
    const pts = [];
    pts.push([sx, H, -D / 2]);         // top of the back, rear corner
    pts.push([sx, H,  D / 2 - 0.05]);   // top of the arm front
    pts.push([sx, 0,  D / 2]);         // front foot
    // then come back up the inside
    pts.push([sx, SEAT, D / 2 - 0.04]);
    pts.push([sx, SEAT, -D / 2 + 0.04]);
    return pts;
  };
  for (const sx of [-W / 2, W / 2]) {
    for (let i = 0; i < sidePath(sx).length - 1; i++) {
      tube(sidePath(sx)[i], sidePath(sx)[i + 1]);
    }
  }
  // Cross tubes (chrome) at seat level front, mid-back top, foot rail.
  tube([-W / 2, H, 0], [W / 2, H, 0]);
  tube([-W / 2, SEAT, D / 2 - 0.04], [W / 2, SEAT, D / 2 - 0.04]);
  tube([-W / 2, 0, D / 2], [W / 2, 0, D / 2]);

  // Slings — seat, back, two arm caps. Canvas / leather planes.
  const sling = (w, d, y, z, rotX = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.leather);
    m.rotation.x = -Math.PI / 2 + rotX;
    m.position.set(0, y, z);
    g.add(m);
  };
  sling(W - 0.05, D - 0.10, SEAT + 0.005, 0.0);
  sling(W - 0.05, 0.32, SEAT + 0.16, -D / 2 + 0.20, -0.18);

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

/**
 * Cesca chair (Model S32) — Marcel Breuer, 1928.
 *
 * A continuous bent tube that makes a C-cantilever, with a cane seat
 * and back. The frame is the chair — the C is what you recognise. Cane
 * reads at distance as a single warm plane, which is what Mies would
 * have used; the frame stays the chrome.
 */
function breuerCesca(THREE, mats, x, z, rotY = 0) {
  const g = new THREE.Group();
  const W = 0.46, D = 0.52, H = 0.80, SEAT = 0.45;

  const tube = (a, b) => {
    const v = [new THREE.Vector3(...a), new THREE.Vector3(...b)];
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(v), mats.chrome));
  };
  // The C: a single path that starts at the back top, runs down the
  // back, across the seat front, down the front leg, under the chair,
  // and up the rear leg.
  const c = [
    [W / 2, H, 0],
    [W / 2, 0, 0],
    [-W / 2, 0, 0],
    [-W / 2, SEAT, 0],
    [W / 2, SEAT, 0],
    [W / 2, H, 0],
  ];
  for (let i = 0; i < c.length - 1; i++) tube(c[i], c[i + 1]);

  // Seat and back — wood-veneer planes. Cane is too small to read at 5m.
  const seat = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.02, D), mats.wood);
  seat.rotation.x = -Math.PI / 2;
  seat.position.set(0, SEAT + 0.005, D / 2 - 0.05);
  g.add(seat);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.02, 0.32), mats.wood);
  back.position.set(0, SEAT + 0.18, 0.0);
  back.rotation.x = -0.16;
  g.add(back);

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

/**
 * Laccio side table — Marcel Breuer, designed for the Pavilion itself.
 *
 * A low rectangular table on a chrome-tube ladder frame, a wood top.
 * Built in two heights: a low coffee version and a slightly higher
 * side version. The 1929 photographs show one in the sitting group.
 */
function breuerLaccio(THREE, mats, x, z, w = 0.65, d = 0.45, h = 0.46) {
  const g = new THREE.Group();
  // Ladder frame: two long tubes along X, three rungs in Z.
  const tube = (a, b) => {
    const v = [new THREE.Vector3(...a), new THREE.Vector3(...b)];
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(v), mats.chrome));
  };
  tube([-w / 2, h, -d / 2], [w / 2, h, -d / 2]);
  tube([-w / 2, h,  d / 2], [w / 2, h,  d / 2]);
  for (const z2 of [-d / 2, 0, d / 2]) tube([w / 2, 0, z2], [-w / 2, 0, z2]);
  for (const x2 of [-w / 2, w / 2]) for (const z2 of [-d / 2, d / 2]) tube([x2, 0, z2], [x2, h, z2]);

  const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.wood);
  top.rotation.x = -Math.PI / 2;
  top.position.y = h;
  g.add(top);

  g.position.set(x, 0, z);
  return g;
}

/**
 * Saarinen Tulip side chair — Eero Saarinen, 1957.
 *
 * One pedestal, one seat. The pedestal is a tapered cone; the seat is a
 * shallow dish. Johnson had several of these in the Glass House — they
 * were a 1950s-modernist staple and they read at distance as a single
 * white tulip.
 */
function saarinenTulip(THREE, mats, x, z, rotY = 0) {
  const g = new THREE.Group();
  // Pedestal — inverted truncated cone, white plastic reading as light.
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.20, 0.42, 14, 1, false),
    new THREE.MeshBasicMaterial({ color: 0xe6e1d5 }));
  ped.position.y = 0.21;
  g.add(ped);
  // Foot disc.
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.30, 0.30, 0.025, 16, 1, false),
    new THREE.MeshBasicMaterial({ color: 0xcfcbbf }));
  foot.position.y = 0.012;
  g.add(foot);
  // The seat — a shallow dish, the shape that gives the chair its name.
  const seat = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 10, 0, Math.PI * 2, 0, Math.PI / 3.2),
    mats.leather);
  seat.position.y = 0.43;
  g.add(seat);

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

/**
 * Barcelona stool — the same X-frame as the chair, lower and without
 * a back. The third piece in the Pavilion's "Barcelona set" (chair,
 * stool, daybed), used as an ottoman for the chair or as a side seat.
 */
function barcelonaStool(THREE, mats, x, z, rotY = 0) {
  const g = new THREE.Group();
  const W = 0.62, D = 0.62, SEAT = 0.40;
  const pts = [
    [[-W / 2, SEAT, -D / 2], [-W / 2, 0, D / 2 - 0.08]],
    [[-W / 2, 0, -D / 2 + 0.08], [-W / 2, SEAT, D / 2 - 0.04]],
    [[W / 2, SEAT, -D / 2], [W / 2, 0, D / 2 - 0.08]],
    [[W / 2, 0, -D / 2 + 0.08], [W / 2, SEAT, D / 2 - 0.04]],
  ];
  const v = [];
  for (const [a, b] of pts) v.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(v), mats.chrome));

  const seat = new THREE.Mesh(new THREE.PlaneGeometry(W, D * 0.7), mats.leather);
  seat.rotation.x = -Math.PI / 2;
  seat.position.set(0, SEAT, 0.02);
  g.add(seat);

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

/**
 * Barcelona lamp — the chrome rod and frosted white globe Mies designed
 * for the 1929 Pavilion. Tall, slim, the only vertical in the room
 * apart from the columns themselves. Reads as a single luminous dot
 * at night and a thin line in daylight.
 */
function barcelonaLamp(THREE, mats, x, z) {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.85, 6),
    new THREE.MeshBasicMaterial({ color: 0xb0b4b8 }));
  rod.position.set(0, 0.92, 0);
  g.add(rod);
  // A small base disc where the rod meets the floor.
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.12, 0.04, 12),
    new THREE.MeshBasicMaterial({ color: 0xa0a4a8 }));
  base.position.y = 0.02;
  g.add(base);
  // The globe — the only lit thing in the building, white on dark.
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.20, 18, 12),
    new THREE.MeshBasicMaterial({ color: 0xf2efe8 }));
  globe.position.set(0, 1.92, 0);
  g.add(globe);
  g.position.set(x, 0, z);
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
  // Saarinen Tulip chair — Johnson had several of these in the dining
  // area. The pedestal and the dish seat are the recognition shape.
  g.add(saarinenTulip(THREE, M, 3.0, 0.8, Math.PI * 0.6));
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

/**
 * THE PAVILION — only Mies's own furniture.
 *
 * v4.25 furnished the room with Marcel Breuer's Wassily, Cesca and
 * Laccio. The 1929 photograph does not show them: Mies and Lilly Reich
 * designed the Barcelona chair, stool, daybed, table and lamp for
 * this room, and that is what was in it. Breuer's pieces belong to
 * Dessau, not Barcelona. The set below is the full Mies 1929 suite.
 *
 * The famous photograph was taken from the south-east corner of the
 * podium, looking across the large pool to the onyx wall with the
 * long travertine back wall behind it. In the foreground of that
 * photograph are: the daybed and two Barcelona chairs, with the
 * small stool as ottoman and the lamp at the eastern end.
 */
export function furnishPavilion(THREE, group, dark) {
  const M = interiorMats(THREE, dark);
  const g = new THREE.Group();

  // The rug — the only soft edge in the whole building, and it defines
  // the sitting area under the onyx.
  g.add(rug(THREE, M, -1.5, 1.2, 4.4, 3.6));

  // The daybed. In the photographs it sits in front of the onyx with
  // its back to the long travertine wall.
  g.add(ottoman(THREE, M, -1.2, 1.4, Math.PI * 1.0));

  // Two Barcelona chairs, facing each other across the daybed — the
  // canonical 1929 photo arrangement.
  g.add(barcelonaChair(THREE, M, -3.0, 1.0, Math.PI * 0.45));
  g.add(barcelonaChair(THREE, M,  0.6, 1.6, Math.PI * 0.55));

  // The Barcelona stool — the third piece of the set, used as ottoman
  // for the chair. At the east end of the onyx on the green marble's
  // side of the room.
  g.add(barcelonaStool(THREE, M, 4.4, 0.2, Math.PI * 0.4));

  // The low Mies table in front of the daybed — chrome frame, onyx top.
  g.add(table(THREE, M, -1.2, 0.4, 0.65, 0.45, 0.40, M.wood));

  // The Barcelona lamp at the west end — the only lit thing in the
  // building after the onyx wash, the dot of white that draws the eye
  // to the lamp's own end of the onyx wall.
  g.add(barcelonaLamp(THREE, M, -5.6, 0.4));

  group.add(g);
  return g;
}
