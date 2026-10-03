// ════════════════════════════════════════════════════════
// THE GROUND — look down and the floor becomes the earth
//
// The mirror of the sky. Same location, same compass, opposite
// direction: the room's floor goes to glass and underneath it is the
// actual ground you are standing on, turned so that north on the map
// is north in the room.
//
// Two layers now, because one answered "where exactly am I?" and never
// "where am I in the city?". The DETAIL layer is your district at the
// current zoom; under it a CONTEXT layer three zoom levels coarser
// covers 8× the width, so the city is always around you the way it is
// when you look out of an aeroplane — location underfoot, continuous to
// the horizon. Default is CITY (z13), not lane level: close-up street
// tiles pixelate when the floor is a few metres under your eyes; a
// coarser map only has to suggest where you are. Pinch/wheel still
// reaches lane level (z17) or the whole region (z11).
// ════════════════════════════════════════════════════════

import * as THREE from 'three';

// OSM raster tiles: attribution required and shown; a personal site
// pulling a few dozen tiles per look-down is well inside the policy.
const TILE_URL = (z, x, y) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

export const ATTRIBUTION = '© OPENSTREETMAP CONTRIBUTORS';

export const ZOOM = 13;          // default: city — location, not a street atlas
export const ZOOM_MIN = 11;      // whole-region view
export const ZOOM_MAX = 17;      // lane level
const GRID = 4;                  // detail: 4×4 tiles
const CGRID = 4;                 // context: 4×4 tiles at (zoom - 3)
const CTX_DZ = 3;                // context is 8× the width of detail
// Larger span: each texel covers more floor — fewer pixels in your face
// when looking straight down at eye height.
const SPAN = 18;                 // scene units per detail tile

// Web Mercator. Fractional on purpose: the viewer's exact position goes
// at the origin, not the nearest tile corner.
export function tileXY(lat, lon, z) {
  const n = Math.pow(2, z);
  const latRad = lat * Math.PI / 180;
  return {
    x: (lon + 180) / 360 * n,
    y: (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n,
  };
}

// Metres per pixel — what makes the scale bar honest.
export const metresPerPixel = (lat, z) =>
  156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z);

export function buildGround(lineColor = 0xe6edf3, amber = 0xf59e0b, maxAnisotropy = 1) {
  const group = new THREE.Group();
  group.name = 'ground';
  group.position.y = -0.02;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  // One tile layer: a grid of planes that place and texture themselves
  // for a location at a zoom. Detail and context are the same machine
  // at two scales.
  function makeLayer(grid, span, targetOpacity, yOff) {
    const meshes = [];
    for (let j = 0; j < grid; j++) {
      for (let i = 0; i < grid; i++) {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(span, span),
          new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
            // The wide zooms sit 12–53 units below the walker, straight
            // through the room's fog band — with fog on, the city came
            // back as a black sheet. Same fix as the star dome.
            fog: false,
          }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = yOff;
        mesh.userData = { i, j, targetOpacity };
        group.add(mesh);
        meshes.push(mesh);
      }
    }
    return meshes;
  }

  // Context first so it renders beneath; slightly dimmer so the block
  // you are standing on reads sharper than the city around it.
  const ctxTiles = makeLayer(CGRID, SPAN * Math.pow(2, CTX_DZ), 0.55, -0.004);
  const tiles = makeLayer(GRID, SPAN, 0.92, 0);

  function placeAndLoad(meshes, grid, span, site, z, gen) {
    const f = tileXY(site.lat, site.lon, z);
    const cx = Math.floor(f.x), cy = Math.floor(f.y);
    const fracX = f.x - cx, fracY = f.y - cy;
    const o = Math.floor(grid / 2);
    meshes.forEach(mesh => {
      const { i, j } = mesh.userData;
      const tx = cx + i - o, ty = cy + j - o;
      mesh.position.x = (i - o + 0.5 - fracX) * span;
      mesh.position.z = (j - o + 0.5 - fracY) * span;
      // Drop the old texture before the new one arrives. A dark tile for
      // 200ms is honest; the previous zoom's imagery standing at the new
      // position is a map of somewhere you are not. The colour also goes
      // dark while the map is absent — without this, the cleared tile
      // reads as a bright white square for the duration of the fetch.
      mesh.material.map?.dispose();   // the dropped texture is GPU memory
      mesh.material.map = null;
      mesh.material.color.setHex(0x0a0d10);
      mesh.material.needsUpdate = true;
      loader.load(
        TILE_URL(z, tx, ty),
        (tex) => {
          // A tile from a superseded zoom resolving late would paint a map
          // of somewhere you are not; drop it instead.
          if (gen !== loadGen) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAnisotropy;   // steep viewing angle; without this it smears
          mesh.material.map = tex;
          mesh.material.color.setHex(0xffffff);   // restore so the new tile isn't tinted
          mesh.material.needsUpdate = true;
        },
        undefined,
        () => { /* a missing tile is a hole in the picture, not an error */ }
      );
    });
  }

  // Graticule over the detail layer. The map says where; the grid says
  // how far.
  const gLines = [];
  const half = (GRID * SPAN) / 2;
  for (let k = 0; k <= GRID; k++) {
    const p = -half + k * SPAN;
    gLines.push(new THREE.Vector3(p, 0, -half), new THREE.Vector3(p, 0, half));
    gLines.push(new THREE.Vector3(-half, 0, p), new THREE.Vector3(half, 0, p));
  }
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(gLines),
    new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  grid.userData = { targetOpacity: 0.2 };
  group.add(grid);

  // You are here — the one point on this surface that is not an
  // approximation — and a north tick, so the map is never on trust.
  const c = 1.6, gap = 0.45;
  const cross = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-c, 0, 0), new THREE.Vector3(-gap, 0, 0),
      new THREE.Vector3(gap, 0, 0), new THREE.Vector3(c, 0, 0),
      new THREE.Vector3(0, 0, -c), new THREE.Vector3(0, 0, -gap),
      new THREE.Vector3(0, 0, gap), new THREE.Vector3(0, 0, c),
    ]),
    new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  cross.userData = { targetOpacity: 1 };
  group.add(cross);

  const northTick = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -half), new THREE.Vector3(0, 0, -half + 2.4),
    ]),
    new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  northTick.userData = { targetOpacity: 0.8 };
  group.add(northTick);

  let loadedFor = null;
  let loadGen = 0;   // bumped per load(); a late tile from an old gen is dropped
  let zoom = ZOOM;
  let lastSite = null;

  function load(site) {
    const key = `${site.lat.toFixed(4)},${site.lon.toFixed(4)}@${zoom}`;
    if (key === loadedFor) return;
    loadedFor = key;
    lastSite = site;
    const gen = ++loadGen;
    placeAndLoad(tiles, GRID, SPAN, site, zoom, gen);
    placeAndLoad(ctxTiles, CGRID, SPAN * Math.pow(2, CTX_DZ), site, zoom - CTX_DZ, gen);
  }

  /**
   * Step the zoom. dir +1 = closer (lanes), -1 = wider (the city, then
   * the region). Both layers re-tile; the graticule and scene geometry
   * stay put, because the FLOOR is not what changed — the map under it
   * did, exactly like turning the knob on a chart plotter.
   */
  function setZoom(next) {
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(next)));
    if (z === zoom) return zoom;
    const prev = zoom;
    zoom = z;
    loadedFor = null;
    if (lastSite) load(lastSite);
    // Integer changed — anyone who wants to update derived labels (scale,
    // caption) gets a heads-up. The handler is set by setZoomListener.
    if (zoomHandler && Math.round(prev) !== Math.round(zoom)) zoomHandler(zoom);
    return zoom;
  }
  const getZoom = () => zoom;

  // ── Pokemon Go: tilt-to-zoom ──────────────────────────────────
  // As the user tilts the view down, the map zooms in from the city
  // default to lane level — "streets on which we stand." Tilting back
  // up returns the zoom to the city default. The auto-zoom is a soft
  // target: user wheel/pinch is a temporary override that gets pulled
  // back over a few frames. Pokemon Go's tilt = camera AND zoom.
  const AUTO_ZOOM_REST = ZOOM;             // 13 — city, the horizontal default
  const AUTO_ZOOM_STREET = ZOOM_MAX;       // 17 — lane / streets
  const AUTO_ZOOM_PITCH_A = -0.5;          // start ramping (~28° down)
  const AUTO_ZOOM_PITCH_B = -1.4;          // end at max (~80° down)
  const AUTO_ZOOM_SPEED = 2.2;             // damp rate — fast enough to feel live
  const pitchToZoom = (pitch) => {
    if (pitch >= AUTO_ZOOM_PITCH_A) return AUTO_ZOOM_REST;
    if (pitch <= AUTO_ZOOM_PITCH_B) return AUTO_ZOOM_STREET;
    // smoothstep — the most natural "the camera knows what I want" curve.
    // PITCH_B is more negative than PITCH_A, so the denominator is
    // negative; invert both to keep t in [0, 1] for pitch in
    // [PITCH_B, PITCH_A].
    const t = (pitch - AUTO_ZOOM_PITCH_A) / (AUTO_ZOOM_PITCH_B - AUTO_ZOOM_PITCH_A);
    const s = t * t * (3 - 2 * t);
    return Math.round(AUTO_ZOOM_REST + s * (AUTO_ZOOM_STREET - AUTO_ZOOM_REST));
  };
  let autoZoom = null;
  function setAutoZoomForPitch(pitch) { autoZoom = pitchToZoom(pitch); }
  // Manual wheel/pinch calls this so the auto-zoom yields for a moment
  // — otherwise the next frame the system would pull the zoom right
  // back, and the user's input would be invisible. 2.2s is long enough
  // for a multi-step pinch to settle, short enough that looking up and
  // back down returns the zoom to the right level within a beat.
  let lastManualZoomTime = 0;
  const MANUAL_ZOOM_RESPECT_MS = 2200;
  function markManualZoom() { lastManualZoomTime = performance.now(); }
  function tickAutoZoom(dt) {
    if (autoZoom == null) return;
    if (performance.now() - lastManualZoomTime < MANUAL_ZOOM_RESPECT_MS) return;
    if (Math.abs(zoom - autoZoom) < 0.05) {
      if (Math.round(zoom) !== autoZoom) setZoom(autoZoom);
      return;
    }
    // Inlined exponential ease — ground.js stays dependency-free.
    const k = 1 - Math.exp(-AUTO_ZOOM_SPEED * Math.max(0, dt));
    setZoom(zoom + (autoZoom - zoom) * k);
  }

  // Caller can register a callback for integer-zoom changes (used by the
  // app to keep the HUD scale label honest while the auto-zoom runs).
  let zoomHandler = null;
  const setZoomListener = (fn) => { zoomHandler = fn; };

  /**
   * How far below the walker the map sits, in scene units. At the
   * default city zoom it is just under the floor; every zoom step out
   * doubles the altitude, so the texel density on screen stays roughly
   * constant — zooming out FEELS like rising above the city rather than
   * smearing a small picture across the same glass.
   */
  const getDepth = () => 0.06 - 1.7 * (Math.pow(2, ZOOM - zoom > 0 ? ZOOM - zoom : 0) - 1);

  const scaleLabel = (lat) => {
    const m = Math.round(metresPerPixel(lat, zoom) * 256 * GRID);
    const across = m >= 1000 ? `${(m / 1000).toFixed(1)} KM ACROSS` : `${m} M ACROSS`;
    // Name the altitude of the view in human terms — the label is how
    // you know which world you are reading.
    const kind = zoom >= 16 ? 'BLOCK' : zoom >= 14 ? 'DISTRICT' : zoom >= 12 ? 'CITY' : 'REGION';
    return `${across} · ${kind}`;
  };

  const fadeTargets = () => [...tiles, ...ctxTiles, grid, cross, northTick];

  return {
    group, load, setZoom, getZoom, setZoomListener,
    setAutoZoomForPitch, tickAutoZoom, markManualZoom, pitchToZoom,
    getDepth, fadeTargets, scaleLabel, tiles, GRID, SPAN,
  };
}
