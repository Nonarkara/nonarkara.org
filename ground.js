// ════════════════════════════════════════════════════════
// THE GROUND — look down and the floor becomes the earth
//
// The mirror of the sky. Same location, same compass, opposite
// direction: the room's floor goes to glass and underneath it is the
// actual ground you are standing on, from orbit, turned so that north
// on the image is north in the room.
//
// Imagery: Esri World Imagery, which serves tiles without a key and
// with CORS open — the only two properties that let a static site with
// no build step and no secrets draw a real map. Attribution is not
// optional and is rendered on screen, not buried in a comment.
// ════════════════════════════════════════════════════════

import * as THREE from 'three';

// OpenStreetMap raster tiles. Satellite imagery shows you what is
// there; a street map shows you where you ARE — road names, the shape
// of your own block, the lane you walked in on. That is the difference
// between a photograph of the ground and knowing your position on it,
// and it is what was asked for.
//
// OSM's tile policy is generous but not unlimited: attribution is
// required and must be visible, and bulk downloading is not allowed. A
// personal site pulling sixteen tiles when someone looks down is well
// inside it. If this ever gets real traffic, move to a paid tile host
// rather than leaning harder on a volunteer-funded one.
const TILE_URL = (z, x, y) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

export const ATTRIBUTION = '© OPENSTREETMAP CONTRIBUTORS';

export const ZOOM = 16;          // ~600 m per tile at this latitude
const GRID = 4;                  // 4×4 tiles ≈ 2.4 km across
const SPAN = 13;                 // scene units per tile

// Web Mercator, the standard slippy-map projection. Fractional on
// purpose: the whole point is to put the viewer's exact position at the
// origin rather than at the nearest tile corner.
export function tileXY(lat, lon, z) {
  const n = Math.pow(2, z);
  const latRad = lat * Math.PI / 180;
  return {
    x: (lon + 180) / 360 * n,
    y: (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n,
  };
}

// Metres per pixel, which is what makes the scale bar honest.
export const metresPerPixel = (lat, z) =>
  156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z);

export function buildGround(lineColor = 0xe6edf3, amber = 0xf59e0b, maxAnisotropy = 1) {
  const group = new THREE.Group();
  group.name = 'ground';
  group.position.y = -0.02;      // just under the room floor

  const tiles = [];
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');   // required: WebGL will not sample a tainted image

  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const geo = new THREE.PlaneGeometry(SPAN, SPAN);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      // Flat in the XZ plane. After this rotation local +X is world east
      // and local +Y is world north, which is exactly how the tile image
      // is oriented — so north on the photograph is north in the room.
      mesh.rotation.x = -Math.PI / 2;
      mesh.userData = { i, j, targetOpacity: 0.92 };
      group.add(mesh);
      tiles.push(mesh);
    }
  }

  // Hairline graticule over the imagery — the Vignelli move. The photo
  // says where; the grid says how far.
  const gLines = [];
  const half = (GRID * SPAN) / 2;
  for (let k = 0; k <= GRID; k++) {
    const p = -half + k * SPAN;
    gLines.push(new THREE.Vector3(p, 0, -half), new THREE.Vector3(p, 0, half));
    gLines.push(new THREE.Vector3(-half, 0, p), new THREE.Vector3(half, 0, p));
  }
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(gLines),
    new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0, depthWrite: false }));
  grid.userData = { targetOpacity: 0.2 };
  group.add(grid);

  // You are here. An amber cross at the origin, which is the one place
  // on this whole surface that is not an approximation.
  const c = 1.6, gap = 0.45;
  const crossPts = [
    new THREE.Vector3(-c, 0, 0), new THREE.Vector3(-gap, 0, 0),
    new THREE.Vector3(gap, 0, 0), new THREE.Vector3(c, 0, 0),
    new THREE.Vector3(0, 0, -c), new THREE.Vector3(0, 0, -gap),
    new THREE.Vector3(0, 0, gap), new THREE.Vector3(0, 0, c),
  ];
  const cross = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(crossPts),
    new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: 0, depthWrite: false }));
  cross.userData = { targetOpacity: 1 };
  group.add(cross);

  // North marker — a short amber tick on the north edge, so the map
  // never has to be taken on trust.
  const northTick = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -half), new THREE.Vector3(0, 0, -half + 2.4),
    ]),
    new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: 0, depthWrite: false }));
  northTick.userData = { targetOpacity: 0.8 };
  group.add(northTick);

  let loadedFor = null;

  // Fetch and place the imagery for one position. Re-runs only when the
  // viewer has actually moved to a different tile — panning the camera
  // does not re-download the planet.
  function load(site) {
    const key = `${site.lat.toFixed(4)},${site.lon.toFixed(4)}`;
    if (key === loadedFor) return;
    loadedFor = key;

    const f = tileXY(site.lat, site.lon, ZOOM);
    const cx = Math.floor(f.x), cy = Math.floor(f.y);
    const fracX = f.x - cx, fracY = f.y - cy;
    const o = Math.floor(GRID / 2);

    tiles.forEach(mesh => {
      const { i, j } = mesh.userData;
      const tx = cx + i - o, ty = cy + j - o;
      // Tile centre relative to the viewer, who sits at the origin.
      // Tile +y is south, and south is +Z in this scene.
      mesh.position.set((i - o + 0.5 - fracX) * SPAN, 0, (j - o + 0.5 - fracY) * SPAN);
      loader.load(
        TILE_URL(ZOOM, tx, ty),
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          // The map is always seen at a steep angle, which is the exact
          // case bilinear filtering smears. Anisotropy is the difference
          // between a photograph and a blur.
          tex.anisotropy = maxAnisotropy;
          mesh.material.map = tex;
          mesh.material.needsUpdate = true;
        },
        undefined,
        () => { /* a missing tile is a hole in the picture, not an error */ }
      );
    });
  }

  const scaleLabel = (lat) => {
    const m = Math.round(metresPerPixel(lat, ZOOM) * 256 * GRID);
    // Attribution is appended by the caller, which already shows
    // ATTRIBUTION alongside this label — adding it here too printed it
    // twice.
    return m >= 1000 ? `${(m / 1000).toFixed(1)} KM ACROSS` : `${m} M ACROSS`;
  };

  const fadeTargets = () => [...tiles, grid, cross, northTick];

  return { group, load, fadeTargets, scaleLabel, tiles, GRID, SPAN };
}
