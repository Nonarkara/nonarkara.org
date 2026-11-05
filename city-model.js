/**
 * THE CITY MASSING — the real city, under the glass.
 *
 * The estate stands a kilometre above a map plate. Below that plate is
 * where the city is, and this module draws it: the real buildings of
 * the real place, baked into a massing and hung under the floor you
 * are standing on.
 *
 * THE STYLE IS THE POINT
 *
 * This is drawn the way a city is drawn when somebody wants to SEE the
 * city rather than look at it: flat tone, no texture, no light and no
 * shadow, and a hairline on every edge. Each face is one of four
 * tones — the tops lightest, the two sides in between, the front
 * darkest — so the massing reads as form without a single lamp. The
 * lines are the drawing; the tone only says which way a wall faces.
 *
 * It is the look of the city as a MODEL, seen from above, which is
 * exactly what it is.
 *
 * ONE UNIT IS ONE METRE
 *
 * The map plate is 1:1 with the earth: a tile is as wide in the scene
 * as it is on the ground. So the model is 1:1 too — its footprints sit
 * exactly where those buildings stand, and the streets between them
 * are the streets you are standing over. The only thing that is not
 * to scale is the HEIGHT, and that is stated on the HUD, because a
 * height that was quietly multiplied is a height that is lying.
 *
 * WHY IT IS NOT LIT BY THE SUN, AND NOT PAINTED WITH THE PALETTE
 *
 * The estate's own materials carry their colour rather than a lamp's,
 * so the palette can be exact. The model does the same: its tones are
 * fixed by the face's orientation, and its ink is a fixed dark — see
 * paintCityModel for why it does not follow the room's palette.
 *
 * A sun that moved across the model would be prettier, and it would
 * cost a redraw of two hundred and sixty thousand vertices every ten
 * seconds, and it would be a second sun: the estate already has one,
 * and it is the real one.
 */

import { MODEL_CENTER, MODEL_MAX_H, MODEL_RADIUS_M, decodeCityModel } from './citymass.js';

/** How much of the gap between the plate and the floor the model fills. */
const RELIEF_FILL = 0.34;

const D2R = Math.PI / 180;

/**
 * The four tones of a face, as multipliers of the ink.
 *
 * The classic convention: the top is the lightest because it sees the
 * sky, the south and west are darkest because they are the faces that
 * never see it, and the north and east sit between. It is a drawing
 * convention, not a simulation — and it is the convention that makes a
 * city read as a city in a single glance.
 */
const TONE = { top: 0.95, north: 0.72, east: 0.62, west: 0.52, south: 0.44 };

/** The tone for a wall's outward normal, in scene coordinates. */
function toneFor(nx, nz) {
  // +x is east, +z is south.
  if (nz < 0) return TONE.north;    // the face looks north
  if (nz > 0) return TONE.south;    // the face looks south
  return nx > 0 ? TONE.east : TONE.west;
}

let _model = null;

/** Load the model once. It is a file, not a request. */
export async function loadCityModel() {
  if (!_model) _model = { ...decodeCityModel(), maxHeight: MODEL_MAX_H };
  return _model;
}

/** The model's own centre, and the radius it covers. */
export const cityCentre = () => MODEL_CENTER;
export const cityRadius = () => MODEL_RADIUS_M;

/**
 * Is the visitor standing inside the city the model is of?
 *
 * The model is BANGKOK. It is drawn at the centre of the world, which
 * is the centre of the map, which is wherever the visitor is. So if the
 * visitor is somewhere else, the model would stand Bangkok's buildings
 * under somebody else's street — which is a lie told in geometry, and
 * the only defence against it is to draw the model only where it is
 * true.
 */
export function cityInside(site) {
  const o = cityOffset(site);
  return Math.hypot(o.x, o.z) <= MODEL_RADIUS_M;
}

/**
 * Where the model's centre sits in the scene, for a visitor standing at
 * `site`.
 *
 * The plate puts the visitor's own coordinates at the middle of the
 * scene, so the model — which is baked about ITS centre — is placed by
 * the difference between the two. When they are the same place, the
 * model is centred under your feet.
 */
export function cityOffset(site) {
  return {
    x: (MODEL_CENTER.lon - site.lon) * 111320 * Math.cos(site.lat * D2R),
    z: -(MODEL_CENTER.lat - site.lat) * 110574,
  };
}

/**
 * Build the model's geometry.
 *
 * One geometry for the faces and one for the lines, both built once:
 * the model never changes, only where it stands and how tall it is
 * drawn.
 */
export function buildCityModel(THREE, model, { ink = 0xffffff, edge = 0xffffff } = {}) {
  const { count, offsets, points, heights } = model;

  const facePos = [];
  const faceCol = [];
  const linePos = [];

  const push = (arr, x, y, z) => { arr.push(x, y, z); };

  for (let b = 0; b < count; b++) {
    const start = offsets[b];
    const end = offsets[b + 1];
    const n = end - start;
    if (n < 3) continue;
    const h = heights[b];

    // The ring, and the walls around it.
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x0 = points[start * 2 + i * 2];
      const z0 = points[start * 2 + i * 2 + 1];
      const x1 = points[start * 2 + j * 2];
      const z1 = points[start * 2 + j * 2 + 1];
      // The outward normal of this wall, in the horizontal plane.
      const ex = x1 - x0;
      const ez = z1 - z0;
      const len = Math.hypot(ex, ez) || 1e-6;
      const nx = ez / len;
      const nz = -ex / len;
      const tone = toneFor(nx, nz);

      // Two triangles, wound so the face looks outward.
      push(facePos, x0, 0, z0); push(facePos, x1, 0, z1); push(facePos, x1, h, z1);
      push(facePos, x0, 0, z0); push(facePos, x1, h, z1); push(facePos, x0, h, z0);
      for (let k = 0; k < 6; k++) push(faceCol, tone, tone, tone);

      // The line along the top edge of that wall.
      push(linePos, x0, h, z0); push(linePos, x1, h, z1);
      // And the line along the ground.
      push(linePos, x0, 0, z0); push(linePos, x1, 0, z1);
    }

    // The roof: the ring triangulated, so the building has a top.
    const contour = [];
    for (let i = 0; i < n; i++) {
      contour.push(new THREE.Vector2(points[start * 2 + i * 2], points[start * 2 + i * 2 + 1]));
    }
    let tris = [];
    try {
      tris = THREE.ShapeUtils.triangulateShape(contour, []);
    } catch (_) { tris = []; }
    for (const t of tris) {
      for (const idx of t) {
        const v = contour[idx];
        push(facePos, v.x, h, v.y);
        push(faceCol, TONE.top, TONE.top, TONE.top);
      }
    }
  }

  const faceGeo = new THREE.BufferGeometry();
  faceGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(facePos), 3));
  faceGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(faceCol), 3));

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));

  const group = new THREE.Group();
  group.name = 'city-mass';

  const faces = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({
    vertexColors: true,
    color: ink,
    transparent: true,
    opacity: 0.9,
    // The blocks are SOLID and they occlude each other. A massing whose
    // far blocks show through its near ones is a wireframe, and a
    // wireframe is not a city.
    depthWrite: true,
    // The city is a kilometre below the walker — straight through the
    // room's fog band. With fog on, the whole model comes back as a flat
    // sheet of sky colour. The map's own tiles opt out for exactly this
    // reason, and the model has to opt out for the same one.
    fog: false,
    side: THREE.DoubleSide,
  }));
  // Drawn after the map's own tiles, which are transparent and sit on
  // the same plane: the tiles carry renderOrder 1, so without this the
  // map paints over the city standing on it.
  faces.renderOrder = 2;
  faces.frustumCulled = false;
  group.add(faces);

  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    color: edge,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    fog: false,
  }));
  lines.renderOrder = 3;
  lines.frustumCulled = false;
  group.add(lines);

  return { group, faces, lines, vertices: facePos.length / 3, maxHeight: model.maxHeight };
}

/**
 * The model's relief factor for a given depth.
 *
 * The model's tallest building is drawn at a fixed share of the gap
 * between the plate and the floor above it — so the model always fills
 * the same amount of the space it hangs in, whatever the zoom, and it
 * can never grow up through the estate.
 *
 * The factor is returned as well as applied: it is a number the site
 * prints, because a height that has been multiplied is a height that
 * has to be said out loud.
 */
export function reliefFor(depth, maxHeight) {
  if (!(maxHeight > 0)) return 1;
  const gap = Math.abs(depth);
  return Math.max(0.02, (gap * RELIEF_FILL) / maxHeight);
}

/**
 * The model's ink.
 *
 * It does NOT follow the room's palette, and that is deliberate. The
 * map below is a photograph: the tiles are the same bright raster at
 * noon and at midnight, because a photograph does not change with the
 * hour. A model that changed colour with the room would be pale ink on
 * a pale map at noon and dark ink on a pale map at night — legible in
 * one hour and invisible in the other.
 *
 * So the model is printed in a fixed dark ink, like a massing model
 * cut out of black paper, and the hairline on every edge is the same
 * ink at full strength. The drawing reads against the map in every
 * light, which is the only thing a drawing has to do.
 */
const MASS_INK = 0x2b343c;

export function paintCityModel(built) {
  built.faces.material.color.setHex(MASS_INK);
  built.faces.material.needsUpdate = true;
  built.lines.material.color.setHex(MASS_INK);
  built.lines.material.needsUpdate = true;
}
