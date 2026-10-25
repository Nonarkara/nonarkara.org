// ═══════════════════════════════════════════════════════════════════════════
// THE GROUND — look down and the floor becomes the earth
//
// ONE SCALE, EVERYWHERE. 1 scene unit = 1 metre. The pavilion is 54 m across,
// the walker's eye is 1.65 m up, and the map underneath is the real ground at
// your coordinates — also 1:1, drawn the way the ground is actually drawn:
// one tile per tile, as wide in metres as it is in units.
//
// The old version broke that rule, and the rule was the whole bug. SPAN was
// a constant 18 units per tile while the zoom changed underneath it, so the
// plate claimed 19 km of Bangkok at z13 and 2.4 km at z16 while covering
// exactly the same 72 units on screen. The map silently changed scale under
// a fixed footprint, and a z16 texel — 2.3 m of real city — was squeezed into
// 7 cm of floor. One texel, fourteen screen pixels: the smear Dr Non called
// ugly.
//
// Changing the zoom level cannot fix that. Texel density on screen depends
// on how far the eye is from the plate, not on which tile is loaded: z11,
// z13 and z17 all produce the same 14 px per texel, because SPAN never
// moved. So the plate's DEPTH and the zoom are now locked together. Every
// zoom level has exactly one altitude at which its texels land on about two
// screen pixels, and the plate falls to that depth when you look down.
//
// The result is the neighbourhood, honestly scaled: at z16 the frame holds
// roughly 1.7 km of real Bangkok at 1:1, and the estate is the 54 m it has
// always been — a speck of glass floor above a city that is finally the
// right size.
//
// The plate lies at the estate's own ground level, and the map is the earth
// under it: same compass, same coordinates, opposite direction to the sky.
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Three explicitly attributed, public OSM raster edges. OSMF is usually the
// fastest global edge; OSM Germany and OSM France are fallbacks.
// Keeping the provider list here makes the dependency swappable without
// touching map geometry, as the OSMF tile policy recommends.
const TILE_URLS = [
  (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  (z, x, y) => `https://tile.openstreetmap.de/${z}/${x}/${y}.png`,
  (z, x, y) => `https://a.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png`,
];

export const ATTRIBUTION = '© OPENSTREETMAP CONTRIBUTORS';
const TILE_TIMEOUT_MS = 3500;

export const ZOOM = 16;          // the neighbourhood: ~1.7 km across the frame
export const ZOOM_MIN = 15;      // the district: ~3.4 km
export const ZOOM_MAX = 18;      // your street: ~430 m
export const GRID = 5;           // 5×5 tiles — the plate covers the frame
const TILE_PX = 256;

// The plate's own level: the estate's ground. The map is the earth UNDER
// the room, so the room keeps its floor and the map keeps its altitude.
const PLATE_Y = 0.06;

// How far above the plate the eye must sit for one texel to land on about
// two screen pixels. Derived, not guessed: at the ground pitch (78°) with a
// 58° vertical field of view, one screen pixel covers 1.176e-3 × altitude
// metres radially and 1.031e-3 × altitude laterally. At 480 × metresPerPixel
// a texel is ~1.9 px across and ~2.05 px tall — sharp enough to read a
// street name, and the only way a raster map ever is.
const ALT_PER_TEXEL = 480;

// The camera's vertical field of view, in degrees. The visible width of the
// ground cannot be computed without it, and the HUD must not lie about how
// much map is on screen.
export const VFOV = 58;

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

// The real width of one tile, in metres. At 1:1 this is also the tile's
// width in scene units: the whole geometry of the ground is this number.
export const tileMetres = (lat, z) => metresPerPixel(lat, z) * TILE_PX;

// The one altitude at which this zoom's texels resolve. Depth and zoom are
// not two independent controls; they are one control.
export const altitudeFor = (lat, z) => ALT_PER_TEXEL * metresPerPixel(lat, z);

/** One refresh-rate-independent zoom step; exported for the regression test. */
export const dampZoom = (current, target, dt, speed = 2.2) =>
  current + (target - current) * (1 - Math.exp(-speed * Math.max(0, dt)));

// How many metres of real ground are across the frame, given the camera's
// shape and where it is pointing. This is what the caption must report:
// not the size of the tile grid, but the size of the thing on screen.
export function visibleWidth(lat, z, aspect = 1.6, pitch = -1.36) {
  const h = altitudeFor(lat, z);
  const half = Math.atan(Math.tan((VFOV / 2) * Math.PI / 180) * aspect);
  const phi = Math.max(0.25, Math.abs(pitch));
  // Distance along the view axis to the plate, then the width across it.
  return 2 * (h / Math.sin(phi)) * Math.tan(half);
}

export function buildGround(lineColor = 0xe6edf3, amber = 0xf59e0b, maxAnisotropy = 1) {
  const group = new THREE.Group();
  group.name = 'ground';
  group.position.y = PLATE_Y;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  // One layer: a grid of planes that place and texture themselves for a
  // location at a zoom. Each plane is scaled to its tile's real width, so
  // the picture and the world are the same size.
  const tiles = [];
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
          // The wide zooms sit a kilometre below the walker, straight
          // through the room's fog band — with fog on, the city came
          // back as a black sheet. Same fix as the star dome.
          fog: false,
        }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.userData = { i, j, targetOpacity: 0.95 };
      mesh.renderOrder = 1;
      group.add(mesh);
      tiles.push(mesh);
    }
  }

  let tileHandler = null;
  let tileStatus = { generation: 0, expected: 0, loaded: 0, failed: 0 };
  const reportTile = () => tileHandler?.({ ...tileStatus });

  function placeAndLoad(meshes, grid, span, site, z, gen) {
    const f = tileXY(site.lat, site.lon, z);
    const cx = Math.floor(f.x), cy = Math.floor(f.y);
    const fracX = f.x - cx, fracY = f.y - cy;
    const o = Math.floor(grid / 2);
    meshes.forEach(mesh => {
      const { i, j } = mesh.userData;
      const tx = cx + i - o, ty = cy + j - o;
      // 1 unit = 1 m: the tile is as wide in the scene as it is on Earth.
      mesh.scale.set(span, span, 1);
      mesh.position.set((i - o + 0.5 - fracX) * span, 0, (j - o + 0.5 - fracY) * span);
      // Drop the old texture before the new one arrives. A dark tile for
      // 200ms is honest; the previous zoom's imagery standing at the new
      // position is a map of somewhere you are not. The colour also goes
      // dark while the map is absent — without this, the cleared tile
      // reads as a bright white square for the duration of the fetch.
      mesh.material.map?.dispose();   // the dropped texture is GPU memory
      mesh.material.map = null;
      mesh.material.color.setHex(0x0a0d10);
      mesh.material.needsUpdate = true;
      const onTile = (tex) => {
          // A tile from a superseded zoom resolving late would paint a map
          // of somewhere you are not; drop it instead.
          if (gen !== loadGen) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAnisotropy;   // steep viewing angle; without this it smears
          mesh.material.map = tex;
          mesh.material.color.setHex(0xffffff);   // restore so the new tile isn't tinted
          mesh.material.needsUpdate = true;
          tileStatus.loaded++;
          reportTile();
      };
      const loadFrom = (provider) => {
        let finished = false;
        const next = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          if (provider + 1 < TILE_URLS.length) loadFrom(provider + 1);
          else if (gen === loadGen) {
            tileStatus.failed++;
            reportTile();
            // All missing: a hole in the picture is quieter than an error.
          }
        };
        // HTML image requests can hang for minutes on a dead tile edge and
        // TextureLoader has no timeout. Move on quickly so looking down never
        // becomes a blank-floor lottery on mobile networks.
        const timer = setTimeout(next, TILE_TIMEOUT_MS);
        loader.load(
          TILE_URLS[provider](z, tx, ty),
          (tex) => {
            if (finished) { tex.dispose(); return; }
            finished = true;
            clearTimeout(timer);
            onTile(tex);
          },
          undefined,
          next);
      };
      loadFrom(0);
    });
  }

  // Graticule over the detail layer. The map says where; the grid says
  // how far. It is an overlay, not an object in the world: at a kilometre
  // below the eye, a line lying in the same plane as the tiles would fight
  // them for depth, so it is drawn on top of them instead.
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: lineColor, transparent: true, opacity: 0,
      depthWrite: false, depthTest: false, fog: false,
    }));
  grid.userData = { targetOpacity: 0.22 };
  grid.renderOrder = 10;
  group.add(grid);

  // You are here — the one point on this surface that is not an
  // approximation — and a north tick, so the map is never on trust.
  const cross = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: amber, transparent: true, opacity: 0,
      depthWrite: false, depthTest: false, fog: false,
    }));
  cross.userData = { targetOpacity: 1 };
  cross.renderOrder = 11;
  group.add(cross);

  const northTick = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: amber, transparent: true, opacity: 0,
      depthWrite: false, depthTest: false, fog: false,
    }));
  northTick.userData = { targetOpacity: 0.85 };
  northTick.renderOrder = 11;
  group.add(northTick);

  // Rebuild the overlay whenever the scale changes. Everything on it is
  // sized in metres, because everything on it is a real thing.
  function rebuildOverlay(span) {
    const half = (GRID * span) / 2;
    const gLines = [];
    for (let k = 0; k <= GRID; k++) {
      const p = -half + k * span;
      gLines.push(new THREE.Vector3(p, 0, -half), new THREE.Vector3(p, 0, half));
      gLines.push(new THREE.Vector3(-half, 0, p), new THREE.Vector3(half, 0, p));
    }
    grid.geometry.dispose();
    grid.geometry = new THREE.BufferGeometry().setFromPoints(gLines);

    // The marker is a real distance on the ground, not a fixed number of
    // pixels: a cross you cannot see is not a location.
    const c = span * 0.06, gap = span * 0.017;
    cross.geometry.dispose();
    cross.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-c, 0, 0), new THREE.Vector3(-gap, 0, 0),
      new THREE.Vector3(gap, 0, 0), new THREE.Vector3(c, 0, 0),
      new THREE.Vector3(0, 0, -c), new THREE.Vector3(0, 0, -gap),
      new THREE.Vector3(0, 0, gap), new THREE.Vector3(0, 0, c),
    ]);

    const tick = span * 0.16;
    northTick.geometry.dispose();
    northTick.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -half), new THREE.Vector3(0, 0, -half + tick),
    ]);
  }

  let loadedFor = null;
  let loadGen = 0;   // bumped per load(); a late tile from an old gen is dropped
  let zoom = ZOOM;
  // Keep the fractional state separate from the integer tile level. The old
  // loop rounded every tiny damped step back to 13, so auto-zoom could never
  // accumulate enough motion to load z14. The HUD promised tilt-to-streets
  // while the floor remained a blurred city tile forever.
  let zoomFloat = ZOOM;
  let lastSite = null;
  let lastLat = 13.7563;

  function load(site) {
    const key = `${site.lat.toFixed(4)},${site.lon.toFixed(4)}@${zoom}`;
    if (key === loadedFor) return;
    loadedFor = key;
    lastSite = site;
    lastLat = site.lat;
    const gen = ++loadGen;
    const span = tileMetres(site.lat, zoom);
    tileStatus = { generation: gen, expected: tiles.length, loaded: 0, failed: 0 };
    reportTile();
    rebuildOverlay(span);
    placeAndLoad(tiles, GRID, span, site, zoom, gen);
  }

  /**
   * Step the zoom. dir +1 = closer (lanes), -1 = wider (the city, then
   * the region). Both layers re-tile; the graticule and scene geometry
   * stay put, because the FLOOR is not what changed — the map under it
   * did, exactly like turning the knob on a chart plotter.
   */
  function setZoom(next) {
    zoomFloat = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    const z = Math.round(zoomFloat);
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
  // As the user tilts the view down, the map zooms in from the
  // neighbourhood to lane level — "the streets on which we stand."
  // Tilting back up returns the zoom to the neighbourhood. The auto-zoom
  // is a soft target: user wheel/pinch is a temporary override that gets
  // pulled back over a few frames. Pokemon Go's tilt = camera AND zoom.
  const AUTO_ZOOM_REST = ZOOM;             // 16 — the neighbourhood
  const AUTO_ZOOM_STREET = ZOOM_MAX;       // 18 — your street
  const AUTO_ZOOM_PITCH_A = -1.30;          // start ramping (~74° down)
  const AUTO_ZOOM_PITCH_B = -1.50;          // end at max (~86° down)
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
    setZoom(dampZoom(zoomFloat, autoZoom, dt, AUTO_ZOOM_SPEED));
  }

  // Caller can register a callback for integer-zoom changes (used by the
  // app to keep the HUD scale label honest while the auto-zoom runs).
  let zoomHandler = null;
  const setZoomListener = (fn) => { zoomHandler = fn; };
  const setTileListener = (fn) => { tileHandler = fn; reportTile(); };

  /**
   * Where the plate sits, in scene units below the estate's ground. The
   * altitude is not a taste decision: it is the one distance at which this
   * zoom's texels land on about two screen pixels. Zoom in and the plate
   * comes up to meet you; zoom out and it falls away, and either way the
   * map stays the same size on the screen.
   */
  const getDepth = () => PLATE_Y - altitudeFor(lastLat, zoom);

  const scaleLabel = (lat, aspect = 1.6, pitch = -1.36) => {
    const m = Math.round(visibleWidth(lat, zoom, aspect, pitch));
    const across = m >= 1000 ? `${(m / 1000).toFixed(1)} KM ACROSS` : `${m} M ACROSS`;
    // Name the altitude of the view in human terms — the label is how
    // you know which world you are reading.
    const kind = zoom >= 18 ? 'STREET' : zoom >= 17 ? 'BLOCK' : zoom >= 16 ? 'NEIGHBOURHOOD' : 'DISTRICT';
    return `${across} · ${kind}`;
  };

  const fadeTargets = () => [...tiles, grid, cross, northTick];

  return {
    group, load, setZoom, getZoom, setZoomListener, setTileListener,
    setAutoZoomForPitch, tickAutoZoom, markManualZoom, pitchToZoom,
    getDepth, fadeTargets, scaleLabel, tiles, GRID,
    span: () => tileMetres(lastLat, zoom),
  };
}
