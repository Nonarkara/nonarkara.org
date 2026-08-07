// ════════════════════════════════════════════════════════
// THE SKY — a real planetarium over wherever you are standing
//
// Look up and the room fades to a memory underfoot. What you see is not
// a texture: it is the actual sky, computed from your latitude, your
// longitude, the current instant, and — on a phone — the direction the
// device is physically pointing. Turn around and the stars stay put,
// because they are the fixed thing and you are the one moving.
//
// No dependency, no API, no network. The catalogue is here in the file,
// the arithmetic is forty lines, and the whole thing works in airplane
// mode over the Andaman Sea. That is the point.
//
// Catalogue: the naked-eye sky, brightest first (J2000). Bangkok's own
// sky rarely gives up more than magnitude 3 or 4, so a deeper catalogue
// would be drawing stars nobody standing here could ever see.
// ════════════════════════════════════════════════════════

import * as THREE from 'three';

// [ RA in hours, Dec in degrees, visual magnitude, name ]
export const STARS = [
  [6.7525, -16.716, -1.46, 'Sirius'],
  [6.3992, -52.696, -0.72, 'Canopus'],
  [14.6600, -60.834, -0.27, 'Rigil Kentaurus'],
  [14.2610, 19.182, -0.05, 'Arcturus'],
  [18.6156, 38.784, 0.03, 'Vega'],
  [5.2782, 45.998, 0.08, 'Capella'],
  [5.2423, -8.202, 0.12, 'Rigel'],
  [7.6550, 5.225, 0.34, 'Procyon'],
  [1.6286, -57.237, 0.46, 'Achernar'],
  [5.9195, 7.407, 0.50, 'Betelgeuse'],
  [14.0637, -60.373, 0.61, 'Hadar'],
  [19.8464, 8.868, 0.77, 'Altair'],
  [12.4433, -63.099, 0.77, 'Acrux'],
  [4.5987, 16.509, 0.85, 'Aldebaran'],
  [16.4901, -26.432, 0.96, 'Antares'],
  [13.4199, -11.161, 0.98, 'Spica'],
  [7.7553, 28.026, 1.14, 'Pollux'],
  [22.9608, -29.622, 1.16, 'Fomalhaut'],
  [20.6905, 45.280, 1.25, 'Deneb'],
  [12.7953, -59.689, 1.25, 'Mimosa'],
  [10.1395, 11.967, 1.35, 'Regulus'],
  [6.9770, -28.972, 1.50, 'Adhara'],
  [7.5766, 31.888, 1.57, 'Castor'],
  [12.5194, -57.113, 1.63, 'Gacrux'],
  [17.5601, -37.104, 1.62, 'Shaula'],
  [5.4185, 6.350, 1.64, 'Bellatrix'],
  [5.4382, 28.608, 1.65, 'Elnath'],
  [9.2200, -69.717, 1.67, 'Miaplacidus'],
  [5.6036, -1.202, 1.69, 'Alnilam'],
  [22.1372, -46.961, 1.74, 'Alnair'],
  [5.6793, -1.943, 1.74, 'Alnitak'],
  [12.9005, 55.960, 1.77, 'Alioth'],
  [11.0621, 61.751, 1.79, 'Dubhe'],
  [3.4054, 49.861, 1.79, 'Mirfak'],
  [7.1399, -26.393, 1.84, 'Wezen'],
  [17.6220, -42.998, 1.86, 'Sargas'],
  [18.4029, -34.385, 1.85, 'Kaus Australis'],
  [8.3752, -59.510, 1.86, 'Avior'],
  [13.7923, 49.313, 1.86, 'Alkaid'],
  [5.9921, 44.947, 1.90, 'Menkalinan'],
  [16.8110, -69.028, 1.91, 'Atria'],
  [6.6285, 16.399, 1.93, 'Alhena'],
  [20.4275, -56.735, 1.94, 'Peacock'],
  [2.5303, 89.264, 1.98, 'Polaris'],
  [6.3783, -17.956, 1.98, 'Mirzam'],
  [9.4597, -8.659, 1.99, 'Alphard'],
  [10.3328, 19.841, 2.01, 'Algieba'],
  [2.1195, 23.462, 2.00, 'Hamal'],
  [0.7265, -17.987, 2.04, 'Diphda'],
  [18.9211, -26.297, 2.05, 'Nunki'],
  [14.1114, -36.370, 2.06, 'Menkent'],
  [0.1398, 29.090, 2.06, 'Alpheratz'],
  [1.1622, 35.620, 2.06, 'Mirach'],
  [5.7959, -9.670, 2.06, 'Saiph'],
  [14.8451, 74.155, 2.08, 'Kochab'],
  [17.5822, 12.560, 2.08, 'Rasalhague'],
  [3.1361, 40.956, 2.09, 'Algol'],
  [2.0650, 42.330, 2.10, 'Almach'],
  [11.8177, 14.572, 2.14, 'Denebola'],
  [8.0597, -40.003, 2.21, 'Naos'],
  [9.2850, -59.275, 2.21, 'Aspidiske'],
  [15.5781, 26.715, 2.22, 'Alphecca'],
  [9.1332, -43.433, 2.23, 'Suhail'],
  [13.3987, 54.925, 2.23, 'Mizar'],
  [20.3705, 40.257, 2.23, 'Sadr'],
  [0.6751, 56.537, 2.24, 'Schedar'],
  [17.9434, 51.489, 2.23, 'Eltanin'],
  [5.5334, -0.299, 2.23, 'Mintaka'],
  [0.1530, 59.150, 2.28, 'Caph'],
  [16.0056, -22.622, 2.29, 'Dschubba'],
  [16.8360, -34.293, 2.29, 'Larawag'],
  [11.0307, 56.382, 2.37, 'Merak'],
  [0.4381, -42.306, 2.39, 'Ankaa'],
  [17.7082, -39.030, 2.41, 'Girtab'],
  [21.7364, 9.875, 2.40, 'Enif'],
  [23.0629, 28.083, 2.42, 'Scheat'],
  [17.1729, -15.725, 2.43, 'Sabik'],
  [11.8972, 53.695, 2.44, 'Phecda'],
  [7.4016, -29.303, 2.45, 'Aludra'],
  [23.0793, 15.205, 2.49, 'Markab'],
  [0.9451, 60.717, 2.47, 'Navi'],
  [21.3096, 62.586, 2.45, 'Alderamin'],
  [3.0379, 4.090, 2.53, 'Menkar'],
  [15.2833, -9.383, 2.61, 'Zubeneschamali'],
  [15.7379, 6.426, 2.63, 'Unukalhai'],
  [3.7914, 24.105, 2.87, 'Alcyone'],
  [13.0362, 10.959, 2.83, 'Vindemiatrix'],
  [14.7498, 27.074, 2.35, 'Izar'],
  [17.7244, 4.567, 2.76, 'Cebalrai'],
  [17.5072, 52.301, 2.79, 'Rastaban'],
  [5.4705, -20.759, 2.81, 'Nihal'],
  [5.5455, -17.822, 2.58, 'Arneb'],
  [11.2351, 20.524, 2.56, 'Zosma'],
  [11.2372, 15.430, 3.32, 'Chertan'],
  [12.6943, -1.449, 2.74, 'Porrima'],
  [12.2634, -17.542, 2.59, 'Gienah'],
  [12.5734, -23.397, 2.65, 'Kraz'],
  [12.4979, -16.515, 2.95, 'Algorab'],
  [12.1683, -22.620, 3.02, 'Minkar'],
  [21.5265, -5.571, 2.90, 'Sadalsuud'],
  [22.0964, -0.320, 2.95, 'Sadalmelik'],
  [2.9711, -40.305, 2.88, 'Acamar'],
  [3.9670, -13.509, 2.95, 'Zaurak'],
  [5.1305, -5.086, 2.79, 'Cursa'],
  [19.7710, 10.613, 2.72, 'Tarazed'],
  [19.5121, 27.960, 3.05, 'Albireo'],
  [20.7702, 33.970, 2.48, 'Aljanah'],
  [21.7838, -16.127, 2.85, 'Deneb Algedi'],
  [1.4303, 60.235, 2.68, 'Ruchbah'],
  [1.9067, 63.670, 3.35, 'Segin'],
  [1.8847, 29.579, 3.41, 'Mothallah'],
  [1.9105, 20.808, 2.64, 'Sheratan'],
  [6.3823, 22.514, 2.87, 'Tejat'],
  [6.7323, 25.131, 2.98, 'Mebsuta'],
  [6.2482, 22.506, 3.28, 'Propus'],
  [7.3353, 21.982, 3.53, 'Wasat'],
  [6.7547, 12.896, 3.36, 'Alzirr'],
  [13.9114, 18.398, 2.68, 'Muphrid'],
  [14.5351, 38.308, 3.03, 'Seginus'],
  [15.0319, 40.390, 3.49, 'Nekkar'],
  [14.0732, 64.376, 3.65, 'Thuban'],
  [15.4155, 58.966, 3.29, 'Edasich'],
  [19.2093, 67.661, 3.07, 'Altais'],
  [16.2391, -3.694, 2.74, 'Yed Prior'],
  [16.3048, -4.693, 3.23, 'Yed Posterior'],
  [16.6194, -10.567, 2.56, 'Han'],
  [16.0906, -19.805, 2.56, 'Acrab'],
  [17.5127, -37.296, 2.69, 'Lesath'],
  [18.3499, -29.828, 2.70, 'Kaus Media'],
  [18.4665, -25.422, 2.81, 'Kaus Borealis'],
  [19.0435, -29.880, 2.60, 'Ascella'],
  [18.0966, -30.424, 2.99, 'Alnasl'],
  [18.7620, -26.990, 3.17, 'Phi Sagittarii'],
  [19.1156, -27.670, 3.32, 'Tau Sagittarii'],
  [23.6555, 77.632, 3.21, 'Errai'],
  [0.2207, 15.184, 2.83, 'Algenib'],
  [10.2787, -61.685, 2.74, 'Turais'],
  [8.7590, -47.097, 3.13, 'Markeb'],
  [10.7791, -49.420, 3.85, 'Alsephina'],
  [22.7109, -46.885, 3.00, 'Tiaki'],
  [3.7602, 24.113, 3.62, 'Atlas'],
  [4.4767, 15.871, 3.53, 'Ain'],
  [4.3820, 17.542, 3.40, 'Prima Hyadum'],
  [9.7597, 23.774, 3.44, 'Subra'],
  [9.8790, 26.007, 3.52, 'Rasalas'],
  [10.2782, 23.417, 3.85, 'Adhafera'],
  [11.2352, -14.779, 3.11, 'Gamma Hydrae'],
  [13.3153, -23.172, 3.25, 'Iota Centauri'],
  [12.1392, -50.723, 2.58, 'Delta Centauri'],
  [13.6647, -53.466, 2.29, 'Epsilon Centauri'],
  [14.5919, -42.158, 2.33, 'Eta Centauri'],
  [13.9257, -47.288, 2.55, 'Zeta Centauri'],
];

// Constellation lines, by star index into STARS. Only the figures a
// person can actually pick out of an urban sky — a full 88-constellation
// atlas at this magnitude limit would be drawing lines between stars
// that are not there.
const NAMED = Object.fromEntries(STARS.map((s, i) => [s[3], i]));
const seg = (...names) => {
  const out = [];
  for (let i = 0; i < names.length - 1; i++) {
    const a = NAMED[names[i]], b = NAMED[names[i + 1]];
    if (a != null && b != null) out.push(a, b);
  }
  return out;
};

export const FIGURES = {
  Orion: [
    ...seg('Betelgeuse', 'Alnitak', 'Alnilam', 'Mintaka', 'Bellatrix', 'Betelgeuse'),
    ...seg('Alnitak', 'Saiph'), ...seg('Mintaka', 'Rigel'),
  ],
  'Ursa Major': seg('Alkaid', 'Mizar', 'Alioth', 'Phecda', 'Merak', 'Dubhe', 'Alioth'),
  Cassiopeia: seg('Segin', 'Ruchbah', 'Navi', 'Schedar', 'Caph'),
  Crux: [...seg('Acrux', 'Gacrux'), ...seg('Mimosa', 'Acrux')],
  Scorpius: [
    ...seg('Dschubba', 'Acrab'), ...seg('Dschubba', 'Antares', 'Larawag', 'Sargas', 'Girtab', 'Shaula', 'Lesath'),
  ],
  Sagittarius: seg('Alnasl', 'Kaus Media', 'Kaus Australis', 'Ascella', 'Nunki', 'Kaus Borealis', 'Kaus Media'),
  Cygnus: [...seg('Deneb', 'Sadr', 'Albireo'), ...seg('Aljanah', 'Sadr')],
  Leo: seg('Regulus', 'Algieba', 'Zosma', 'Denebola', 'Chertan', 'Regulus'),
  Gemini: [...seg('Castor', 'Pollux'), ...seg('Pollux', 'Wasat', 'Alhena'), ...seg('Castor', 'Mebsuta', 'Tejat', 'Propus')],
  Corvus: seg('Minkar', 'Gienah', 'Algorab', 'Kraz', 'Minkar'),
  Bootes: seg('Arcturus', 'Izar', 'Seginus', 'Nekkar'),
  Pegasus: [...seg('Markab', 'Scheat', 'Alpheratz', 'Algenib', 'Markab'), ...seg('Markab', 'Enif')],
  Andromeda: seg('Alpheratz', 'Mirach', 'Almach'),
  'Canis Major': [...seg('Mirzam', 'Sirius', 'Wezen', 'Adhara', 'Sirius'), ...seg('Wezen', 'Aludra')],
  Centaurus: seg('Rigil Kentaurus', 'Hadar', 'Epsilon Centauri', 'Zeta Centauri'),
};

// ── The arithmetic ──────────────────────────────────────
// Everything below is standard spherical astronomy. Nothing here is
// approximate enough to matter at the scale of a phone screen: the
// dominant error is the compass, by two orders of magnitude.

const D2R = Math.PI / 180;
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

// Days since the J2000 epoch.
export const daysSinceJ2000 = (date) => (date.getTime() - J2000) / 86400000;

// Greenwich mean sidereal time, in degrees.
export function gmst(date) {
  const d = daysSinceJ2000(date);
  return ((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360;
}

// Local sidereal time, in degrees. East longitude positive.
export const lst = (date, lonDeg) => ((gmst(date) + lonDeg) % 360 + 360) % 360;

// Equatorial (RA hours, Dec degrees) → horizontal (altitude, azimuth),
// both in degrees. Azimuth is measured from true north, through east.
export function altAz(raHours, decDeg, latDeg, lonDeg, date) {
  const H = (lst(date, lonDeg) - raHours * 15) * D2R;   // hour angle
  const dec = decDeg * D2R, lat = latDeg * D2R;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(-Math.sin(H) * Math.cos(dec),
                        Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(H));
  return { alt: alt / D2R, az: ((az / D2R) % 360 + 360) % 360 };
}

// Horizontal → three.js direction on a dome of radius r.
// Scene convention: +Y is up, north is −Z, east is +X.
export function altAzToVec(altDeg, azDeg, r = 1) {
  const alt = altDeg * D2R, az = azDeg * D2R;
  const cosAlt = Math.cos(alt);
  return new THREE.Vector3(r * cosAlt * Math.sin(az), r * Math.sin(alt), -r * cosAlt * Math.cos(az));
}

// The Sun, from the low-precision series in the Astronomical Almanac.
// Good to about a minute of arc — far finer than a dot on a phone.
export function sunPosition(date) {
  const d = daysSinceJ2000(date);
  const L = (280.460 + 0.9856474 * d) * D2R;            // mean longitude
  const g = (357.528 + 0.9856003 * d) * D2R;            // mean anomaly
  const lambda = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R;
  const eps = (23.439 - 0.0000004 * d) * D2R;           // obliquity
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  return { raHours: ((ra / D2R) % 360 + 360) % 360 / 15, decDeg: dec / D2R };
}

// The Moon, truncated Meeus. A degree or so of error, which is about
// one moon-width — visible if you measure, invisible if you look.
export function moonPosition(date) {
  const d = daysSinceJ2000(date);
  const L = (218.316 + 13.176396 * d) * D2R;            // mean longitude
  const M = (134.963 + 13.064993 * d) * D2R;            // mean anomaly
  const F = (93.272 + 13.229350 * d) * D2R;             // argument of latitude
  const lambda = L + 6.289 * D2R * Math.sin(M);
  const beta = 5.128 * D2R * Math.sin(F);
  const eps = 23.439 * D2R;
  const ra = Math.atan2(
    Math.sin(lambda) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps),
    Math.cos(lambda));
  const dec = Math.asin(Math.sin(beta) * Math.cos(eps) +
                        Math.cos(beta) * Math.sin(eps) * Math.sin(lambda));
  return { raHours: ((ra / D2R) % 360 + 360) % 360 / 15, decDeg: dec / D2R };
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

// Magnitude bins. One Points object each — five draw calls for the whole
// sky, and each bin gets the size and opacity that magnitude deserves.
const BINS = [
  { max: 1.0, size: 7.0, opacity: 1.00 },
  { max: 2.0, size: 5.0, opacity: 0.92 },
  { max: 2.6, size: 3.6, opacity: 0.78 },
  { max: 3.2, size: 2.6, opacity: 0.62 },
  { max: 99,  size: 1.9, opacity: 0.46 },
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

export function buildSky(themeColor = 0xf5f5f0, amber = 0xf59e0b) {
  const group = new THREE.Group();
  group.name = 'sky';

  const binOf = (mag) => BINS.findIndex(b => mag <= b.max);
  const members = BINS.map(() => []);
  STARS.forEach((s, i) => members[binOf(s[2])].push(i));

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
  const figIdx = Object.values(FIGURES).flat();
  const figGeo = new THREE.BufferGeometry();
  figGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(figIdx.length * 3), 3));
  const figures = new THREE.LineSegments(figGeo, new THREE.LineBasicMaterial({
      fog: false,   // the dome is 400 units out; room fog would erase it
    color: themeColor, transparent: true, opacity: 0, depthWrite: false,
  }));
  figures.userData = { indices: figIdx, targetOpacity: 0.18 };
  figures.frustumCulled = false;
  group.add(figures);

  // Sun and Moon get their own single-point objects.
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
  const moon = disc(themeColor, 13, 0.9);

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

  const follyIndex = STARS.findIndex(s => s[3] === FOLLY.name);

  // Recompute every position for a given place and instant. Cheap enough
  // to call on a timer; pointless to call per frame, since the sky turns
  // a quarter of a degree per minute.
  function update(date, site) {
    const write = (obj, list) => {
      const arr = obj.geometry.attributes.position.array;
      list.forEach((si, n) => {
        const [ra, dec] = STARS[si];
        const { alt, az } = altAz(ra, dec, site.lat, site.lon, date);
        const v = altAzToVec(alt, az, R);
        arr[n * 3] = v.x; arr[n * 3 + 1] = v.y; arr[n * 3 + 2] = v.z;
      });
      obj.geometry.attributes.position.needsUpdate = true;
      obj.geometry.computeBoundingSphere();
    };
    points.forEach(p => write(p, p.userData.indices));
    write(figures, figures.userData.indices);

    const place = (obj, body) => {
      const { alt, az } = altAz(body.raHours, body.decDeg, site.lat, site.lon, date);
      const v = altAzToVec(alt, az, R * 0.98);
      const a = obj.geometry.attributes.position.array;
      a[0] = v.x; a[1] = v.y; a[2] = v.z;
      obj.geometry.attributes.position.needsUpdate = true;
      obj.geometry.computeBoundingSphere();
      return alt;
    };
    place(sun, sunPosition(date));
    place(moon, moonPosition(date));

    if (follyIndex >= 0) {
      const [ra, dec] = STARS[follyIndex];
      const { alt, az } = altAz(ra, dec, site.lat, site.lon, date);
      follyRing.position.copy(altAzToVec(alt, az, R * 0.99));
      follyRing.lookAt(0, 0, 0);
      // Below the horizon it is still there, just not visible from here.
      follyRing.userData.targetOpacity = alt > 0 ? 0.85 : 0;
    }
  }

  // Note: the stars are not dimmed for daylight. This is an instrument,
  // not a simulation — the question it answers is "what is over there
  // right now", and that question has an answer at two in the afternoon
  // too. The sun and moon are drawn where they actually are, so you can
  // see for yourself whether it is day.
  return { group, update, points, figures, sun, moon, follyRing, horizon, R };
}

// Every fadeable piece, for the room's existing fade machinery.
export const fadeTargets = (sky) =>
  [...sky.points, sky.figures, sky.sun, sky.moon, sky.follyRing, sky.horizon];

// Which figure a star belongs to, if any. Built once from FIGURES so it
// cannot drift from the lines actually drawn on the dome.
let _figureOfStar = null;
export function figureOfStar(name) {
  if (!_figureOfStar) {
    _figureOfStar = new Map();
    for (const [fig, idxPairs] of Object.entries(FIGURES)) {
      for (const i of idxPairs) {
        const s = STARS[i];
        if (s && !_figureOfStar.has(s[3])) _figureOfStar.set(s[3], fig);
      }
    }
  }
  return _figureOfStar.get(name) || null;
}

// Which star is nearest a given direction — for tapping a star.
export function nearestStar(dir, site, date, maxDeg = 4) {
  let best = null, bestDot = Math.cos(maxDeg * D2R);
  STARS.forEach((s, i) => {
    const { alt, az } = altAz(s[0], s[1], site.lat, site.lon, date);
    if (alt < 0) return;
    const d = altAzToVec(alt, az, 1).dot(dir);
    if (d > bestDot) { bestDot = d; best = i; }
  });
  return best == null ? null : { index: best, name: STARS[best][3], mag: STARS[best][2] };
}
