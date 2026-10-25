// ═══════════════════════════════════════════════════════════════════════════
// THE SKY — a real sky over wherever you are standing
//
// Look up and the room fades to a memory underfoot. What you see is not
// a texture: it is the actual sky, computed from your latitude, your
// longitude, the current instant, and — on a phone — the direction the
// device is physically pointing. Turn around and the stars stay put,
// because they are the fixed thing and you are the one moving.
//
// No dependency, no API, no network. The catalogue is in starcat.js, the
// arithmetic is forty lines, and the whole thing works in airplane mode
// over the Andaman Sea. That is the point.
//
// THE CATALOGUE IS THE SKY. It used to be 152 stars typed out by hand in
// this file, the faintest of them magnitude 3.85. A real naked-eye sky
// holds about five thousand stars to magnitude 6, and the difference is
// the whole reason the sky read as a planetarium with the lights on: not
// a wrong sky, a nearly empty one. The catalogue is now 5,022 real stars
// from HYG v41, with the magnitudes the catalogue gives them, fetched the
// first time somebody looks up so the room never waits on a star chart to
// boot.
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import {
  altAz, daysSinceJ2000, gmst, lst, moonPhase, moonPosition,
  sunPosition,
} from './astronomy.js';

export { altAz, daysSinceJ2000, gmst, lst, moonPhase, moonPosition, sunPosition };

// The decoded catalogue: { RA, DEC, MAG, NAME, count }. Flat typed arrays
// rather than five thousand little ones — the renderer walks them every
// ten seconds and the tap handler walks all of them on every tap.
let CATALOG = null;

/** Load the catalogue if it is not loaded yet. The dome does this. */
export async function loadCatalog() {
  if (!CATALOG) {
    const { decodeCatalog } = await import('./starcat.js');
    CATALOG = decodeCatalog();
  }
  return CATALOG;
}

// Constellation lines, by star name. Only the figures a person can
// actually pick out of an urban sky — a full 88-constellation atlas at
// this magnitude limit would be drawing lines between stars that are not
// there. Each entry is a list of chains; a chain is a run of stars, and
// the run is what gets drawn.
//
// The names resolve against the catalogue when it arrives, and a name
// that does not resolve is an error rather than a silently missing line.
export const FIGURES = {
  Orion: [
    ['Betelgeuse', 'Alnitak', 'Alnilam', 'Mintaka', 'Bellatrix', 'Betelgeuse'],
    ['Alnitak', 'Saiph'],
    ['Mintaka', 'Rigel'],
  ],
  'Ursa Major': [['Alkaid', 'Mizar', 'Alioth', 'Phecda', 'Merak', 'Dubhe', 'Alioth']],
  Cassiopeia: [['Segin', 'Ruchbah', 'Navi', 'Schedar', 'Caph']],
  Crux: [['Acrux', 'Gacrux'], ['Mimosa', 'Acrux']],
  Scorpius: [
    ['Dschubba', 'Acrab'],
    ['Dschubba', 'Antares', 'Larawag', 'Sargas', 'Girtab', 'Shaula', 'Lesath'],
  ],
  Sagittarius: [['Alnasl', 'Kaus Media', 'Kaus Australis', 'Ascella', 'Nunki', 'Kaus Borealis', 'Kaus Media']],
  Cygnus: [['Deneb', 'Sadr', 'Albireo'], ['Aljanah', 'Sadr']],
  Leo: [['Regulus', 'Algieba', 'Zosma', 'Denebola', 'Chertan', 'Regulus']],
  Gemini: [['Castor', 'Pollux'], ['Pollux', 'Wasat', 'Alhena'], ['Castor', 'Mebsuta', 'Tejat', 'Propus']],
  Corvus: [['Epsilon Corvi', 'Gienah', 'Algorab', 'Kraz', 'Epsilon Corvi']],
  Bootes: [['Arcturus', 'Izar', 'Seginus', 'Nekkar']],
  Pegasus: [['Markab', 'Scheat', 'Alpheratz', 'Algenib', 'Markab'], ['Markab', 'Enif']],
  Andromeda: [['Alpheratz', 'Mirach', 'Almach']],
  'Canis Major': [['Mirzam', 'Sirius', 'Wezen', 'Adhara', 'Sirius'], ['Wezen', 'Aludra']],
  Centaurus: [['Rigil Kentaurus', 'Hadar', 'Epsilon Centauri', 'Zeta Centauri']],
};

/**
 * Resolve the figures against the catalogue: names to indices, chains to
 * the pairs of indices the line is drawn from. Every name must resolve —
 * a line with a star missing from it is a line that is not drawn, and
 * nobody would ever know.
 */
function resolveFigures(catalog) {
  const index = new Map();
  catalog.NAME.forEach((n, i) => { if (n && !index.has(n)) index.set(n, i); });
  const pairs = {};
  for (const [fig, chains] of Object.entries(FIGURES)) {
    const out = [];
    for (const chain of chains) {
      const idx = chain.map((n) => index.get(n));
      if (idx.some((i) => i == null)) {
        const missing = chain.filter((n) => !index.has(n));
        throw new Error(`constellation ${fig} names a star the catalogue does not have: ${missing.join(', ')}`);
      }
      for (let i = 0; i < idx.length - 1; i++) out.push(idx[i], idx[i + 1]);
    }
    pairs[fig] = out;
  }
  return { pairs, index };
}

const D2R = Math.PI / 180;

// Horizontal → three.js direction on a dome of radius r.
// Scene convention: +Y is up, north is −Z, east is +X.
export function altAzToVec(altDeg, azDeg, r = 1) {
  const alt = altDeg * D2R, az = azDeg * D2R;
  const cosAlt = Math.cos(alt);
  return new THREE.Vector3(r * cosAlt * Math.sin(az), r * Math.sin(alt), -r * cosAlt * Math.cos(az));
}

// ── The dome ────────────────────────────────────────────

export const BANGKOK = { lat: 13.7563, lon: 100.5018, label: 'BANGKOK' };
const R = 400;                                          // dome radius, scene units

// The folly. One star carries an amber ring: the star that stood at the
// zenith over Non's birthplace at the moment he was born. It is not
// labelled with the date and it never will be — the point is that it is
// still up there, and it has been the whole time.
//
// Placeholder until he supplies the moment privately: the zenith star
// over Bangkok at 2026-05-08 12:38 ICT, when this site was first
// committed. Swap FOLLY for { name } of the real one.
export const FOLLY = { name: 'Alphard', caption: 'the one overhead' };

// Magnitude bins. One Points object each — eight draw calls for the whole
// sky, and each bin gets the size and opacity that magnitude deserves.
// The faint end needs its own levels now the catalogue runs to magnitude 6:
// four thousand stars in one bin is a fog, and the point of the catalogue
// is that the sky has depth in it.
const BINS = [
  { max: 1.0, size: 7.0, opacity: 1.00 },
  { max: 2.0, size: 5.4, opacity: 0.96 },
  { max: 2.6, size: 4.2, opacity: 0.88 },
  { max: 3.2, size: 3.2, opacity: 0.76 },
  { max: 4.0, size: 2.4, opacity: 0.62 },
  { max: 4.8, size: 1.9, opacity: 0.48 },
  { max: 5.4, size: 1.6, opacity: 0.36 },
  { max: 99,  size: 1.3, opacity: 0.26 },
];

/**
 * A star is a round glow, not a square. Default PointsMaterial draws an
 * unfiltered square of colour — which at 2px reads as dust and at 6px
 * reads as confetti, and is the whole reason the sky looked flat rather
 * than beautiful. One shared radial-gradient sprite fixes every bin at
 * once: a bright core, a soft falloff, nothing at the edge.
 */
let _starSprite = null;
function starSprite(THREE) {
  if (_starSprite) return _starSprite;
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0.00, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.92)');
  grad.addColorStop(0.42, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  _starSprite = new THREE.CanvasTexture(c);
  _starSprite.colorSpace = THREE.SRGBColorSpace;
  return _starSprite;
}

/** A billboarded lunar disc whose terminator follows the real phase. */
function makeMoon(THREE, color) {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(S, S);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture, color, transparent: true, opacity: 0,
    depthWrite: false, depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(7, 7, 1);
  sprite.userData = { targetOpacity: 0, phase: null };
  sprite.frustumCulled = false;

  sprite.userData.drawPhase = ({ phase }) => {
    // Light vector: away from us at new moon, toward us at full moon.
    const lightX = Math.sin(phase * Math.PI * 2);
    const lightZ = -Math.cos(phase * Math.PI * 2);
    const px = image.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const nx = (x + 0.5 - S / 2) / (S * 0.44);
        const ny = (S / 2 - y - 0.5) / (S * 0.44);
        const rr = nx * nx + ny * ny;
        const i = (y * S + x) * 4;
        if (rr > 1) { px[i + 3] = 0; continue; }
        const nz = Math.sqrt(1 - rr);
        const lit = Math.max(0, nx * lightX + nz * lightZ);
        const limb = Math.max(0.38, nz);
        const v = Math.round((18 + 228 * lit) * limb);
        px[i] = v; px[i + 1] = Math.min(255, v + 5); px[i + 2] = Math.min(255, v + 12);
        px[i + 3] = Math.round(255 * Math.min(1, (1 - rr) * 12));
      }
    }
    ctx.putImageData(image, 0, 0);
    texture.needsUpdate = true;
  };
  return sprite;
}

/** Visibility gates shared by the rendered bodies and deterministic tests. */
export function visibilityFor(sunAlt, moonAlt, illumination) {
  const stars = Math.max(0, Math.min(1, (-sunAlt - 4) / 8));
  return {
    stars,
    sun: sunAlt > -1 ? 0.92 : 0,
    moon: moonAlt > -1 && illumination > 0.01
      ? (0.28 + 0.72 * stars) * (0.34 + illumination * 0.66)
      : 0,
  };
}

export async function buildSky(themeColor = 0xf5f5f0, amber = 0xf59e0b) {
  // The catalogue is 5,022 stars in 29 KB. It is fetched the first time
  // somebody looks up, so the room boots without waiting on a star chart.
  if (!CATALOG) {
    const { decodeCatalog } = await import('./starcat.js');
    CATALOG = decodeCatalog();
  }
  const { RA, DEC, MAG, NAME, count } = CATALOG;
  const { pairs: FIG_PAIRS, index: NAME_INDEX } = resolveFigures(CATALOG);

  const group = new THREE.Group();
  group.name = 'sky';

  const binOf = (mag) => BINS.findIndex(b => mag <= b.max);
  const members = BINS.map(() => []);
  for (let i = 0; i < count; i++) members[binOf(MAG[i])].push(i);

  const points = members.map((idx, b) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(idx.length * 3), 3));
    const mat = new THREE.PointsMaterial({
      fog: false,   // the dome is 400 units out; room fog would erase it
      color: themeColor, size: BINS[b].size * 3.2,
      map: starSprite(THREE), alphaTest: 0.01,
      blending: THREE.AdditiveBlending,   // overlapping stars pool light
      sizeAttenuation: false, transparent: true,
      opacity: 0, depthWrite: false,
    });
    const p = new THREE.Points(geo, mat);
    p.userData = { indices: idx, targetOpacity: BINS[b].opacity };
    p.frustumCulled = false;
    group.add(p);
    return p;
  });

  // Constellation figures — one LineSegments for all of them.
  const figIdx = Object.values(FIG_PAIRS).flat();
  const figGeo = new THREE.BufferGeometry();
  figGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(figIdx.length * 3), 3));
  const figures = new THREE.LineSegments(figGeo, new THREE.LineBasicMaterial({
      fog: false,   // the dome is 400 units out; room fog would erase it
    color: themeColor, transparent: true, opacity: 0, depthWrite: false,
  }));
  figures.userData = { indices: figIdx, targetOpacity: 0.18 };
  figures.frustumCulled = false;
  group.add(figures);

  // The Sun is a glow. The Moon is a real phased disc rather than the
  // same full white dot every night.
  const disc = (color, size, target) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({
      fog: false,   // the dome is 400 units out; room fog would erase it
      color, size: size * 3.2,
      map: starSprite(THREE), alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false,
    }));
    p.userData = { targetOpacity: target };
    p.frustumCulled = false;
    group.add(p);
    return p;
  };
  const sun = disc(amber, 16, 0.9);
  const moon = makeMoon(THREE, themeColor);
  group.add(moon);

  // The folly ring — a hairline circle around the one marked star.
  const ringGeo = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 49 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 14, Math.sin(a) * 14, 0);
    }));
  const follyRing = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({
      fog: false,   // the dome is 400 units out; room fog would erase it
    color: amber, transparent: true, opacity: 0, depthWrite: false,
  }));
  follyRing.userData = { targetOpacity: 0.85 };
  follyRing.frustumCulled = false;
  group.add(follyRing);

  // The horizon ring and its four letters live in scene space too, so
  // they turn with the compass exactly as the sky does.
  const horizonGeo = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.sin(a) * R, 0, -Math.cos(a) * R);
    }));
  const horizon = new THREE.Line(horizonGeo, new THREE.LineBasicMaterial({
      fog: false,   // the dome is 400 units out; room fog would erase it
    color: themeColor, transparent: true, opacity: 0, depthWrite: false,
  }));
  horizon.userData = { targetOpacity: 0.22 };
  horizon.frustumCulled = false;
  group.add(horizon);

  const follyIndex = NAME_INDEX.has(FOLLY.name) ? NAME_INDEX.get(FOLLY.name) : -1;

  // Recompute every position for a given place and instant. Cheap enough
  // to call on a timer; pointless to call per frame, since the sky turns
  // a quarter of a degree per minute.
  function update(date, site) {
    const write = (obj, list) => {
      const arr = obj.geometry.attributes.position.array;
      for (let n = 0; n < list.length; n++) {
        const si = list[n];
        const { alt, az } = altAz(RA[si], DEC[si], site.lat, site.lon, date);
        const altR = alt * D2R, azR = az * D2R;
        const cosAlt = Math.cos(altR);
        arr[n * 3] = R * cosAlt * Math.sin(azR);
        arr[n * 3 + 1] = R * Math.sin(altR);
        arr[n * 3 + 2] = -R * cosAlt * Math.cos(azR);
      }
      obj.geometry.attributes.position.needsUpdate = true;
      obj.geometry.computeBoundingSphere();
    };
    points.forEach(p => write(p, p.userData.indices));
    write(figures, figures.userData.indices);

    const place = (obj, body) => {
      const { alt, az } = altAz(body.raHours, body.decDeg, site.lat, site.lon, date);
      const v = altAzToVec(alt, az, R * 0.98);
      if (obj.isSprite) {
        obj.position.copy(v);
      } else {
        const a = obj.geometry.attributes.position.array;
        a[0] = v.x; a[1] = v.y; a[2] = v.z;
        obj.geometry.attributes.position.needsUpdate = true;
        obj.geometry.computeBoundingSphere();
      }
      return alt;
    };
    const sunAlt = place(sun, sunPosition(date));
    const moonAlt = place(moon, moonPosition(date));
    const phase = moonPhase(date);
    if (moon.userData.phase == null || Math.abs(moon.userData.phase - phase.phase) > 0.001) {
      moon.userData.phase = phase.phase;
      moon.userData.drawPhase(phase);
    }

    // Civil twilight erases the stars continuously. The old instrument
    // showed every constellation at noon; the world now shows the sky a
    // person at this location and instant can actually see.
    const visibility = visibilityFor(sunAlt, moonAlt, phase.illumination);
    const starVisibility = visibility.stars;
    points.forEach((p, i) => {
      p.userData.targetOpacity = BINS[i].opacity * starVisibility;
    });
    figures.userData.targetOpacity = 0.18 * starVisibility;
    sun.userData.targetOpacity = visibility.sun;
    moon.userData.targetOpacity = visibility.moon;

    if (follyIndex >= 0) {
      const { alt, az } = altAz(RA[follyIndex], DEC[follyIndex], site.lat, site.lon, date);
      follyRing.position.copy(altAzToVec(alt, az, R * 0.99));
      follyRing.lookAt(0, 0, 0);
      // Below the horizon it is still there, just not visible from here.
      follyRing.userData.targetOpacity = alt > 0 ? 0.85 * starVisibility : 0;
    }
  }

  return { group, update, points, figures, sun, moon, follyRing, horizon, R };
}

// Every fadeable piece, for the room's existing fade machinery.
export const fadeTargets = (sky) =>
  [...sky.points, sky.figures, sky.sun, sky.moon, sky.follyRing, sky.horizon];

// Which figure a star belongs to, if any. Built from the resolved lines
// so it cannot drift from what is actually drawn on the dome.
let _figureOfStar = null;
export function figureOfStar(name) {
  if (!_figureOfStar) {
    _figureOfStar = new Map();
    if (CATALOG) {
      const { pairs, index } = resolveFigures(CATALOG);
      for (const [fig, idxPairs] of Object.entries(pairs)) {
        for (const i of idxPairs) {
          const n = CATALOG.NAME[i];
          if (n && !_figureOfStar.has(n)) _figureOfStar.set(n, fig);
        }
      }
      void index;
    }
  }
  return _figureOfStar.get(name) || null;
}

// Which star is nearest a given direction — for tapping a star.
// Five thousand candidates, so the arithmetic is done without allocating
// anything: a tap must not make five thousand vectors.
export function nearestStar(dir, site, date, maxDeg = 4) {
  if (!CATALOG) return null;
  const { RA, DEC, MAG, NAME, count } = CATALOG;
  let best = -1, bestDot = Math.cos(maxDeg * D2R);
  for (let i = 0; i < count; i++) {
    const { alt, az } = altAz(RA[i], DEC[i], site.lat, site.lon, date);
    if (alt < 0) continue;
    const altR = alt * D2R, azR = az * D2R;
    const cosAlt = Math.cos(altR);
    const d = cosAlt * Math.sin(azR) * dir.x
            + Math.sin(altR) * dir.y
            - cosAlt * Math.cos(azR) * dir.z;
    if (d > bestDot) { bestDot = d; best = i; }
  }
  if (best < 0) return null;
  return { index: best, name: NAME[best], mag: MAG[best] };
}
