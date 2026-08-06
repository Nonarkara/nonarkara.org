/**
 * DAYLIGHT — the room knows what time it is and what the weather is
 * doing, where you actually are.
 *
 * The Barcelona Pavilion has a roof over part of its podium and nothing
 * over the rest. That is not a detail; it is why the building has
 * weather in it. When it rains in Barcelona, it rains on the pool and
 * the open travertine and not on you if you are standing under the
 * slab. So: if it is raining where the visitor is, it rains in here,
 * on the open half only.
 *
 * Light follows the sun, not the clock, because 18:30 is dusk in
 * Bangkok and full night in Helsinki. Sun altitude is computed from the
 * visitor's latitude and longitude, and the palette is interpolated
 * between four states:
 *
 *   night   (sun below -6°)   near-black, cold
 *   dawn    (-6° to +8°)      cream — warm, low contrast, easy at 5am
 *   day     (above +8°)       bright, travertine actually looks like stone
 *   dusk    (+8° down to -6°) the same cream, arrived at from the other side
 *
 * Dawn and dusk share a palette but not a mood; the difference is which
 * way it is heading, which the caption says out loud.
 *
 * Weather comes from Open-Meteo: no key, no account, generous free tier,
 * and it answers "is it raining right now" directly. If the fetch fails
 * the room simply stays dry — weather is a grace note, never a
 * dependency.
 */

const BANGKOK = { lat: 13.7563, lon: 100.5018, name: 'BANGKOK' };

const PALETTES = {
  night: {
    bg: 0x05070a, travertine: 0x2a2b28, green: 0x14201a, chrome: 0x8e9aa6,
    water: 0x080d12, podium: 0x1c1e1c, roof: 0x121413, line: 0x8b98a6,
    lineOpacity: 0.55, label: 'NIGHT',
  },
  dawn: {
    // Cream. Warm, low contrast, and deliberately the gentlest of the
    // four — this is the palette for someone awake before they meant to be.
    bg: 0x2a2118, travertine: 0x9c8f78, green: 0x4a5c4a, chrome: 0xc3b9a8,
    water: 0x3c342a, podium: 0x6f6555, roof: 0x4a4238, line: 0xe8dcc4,
    lineOpacity: 0.42, label: 'DAWN',
  },
  day: {
    bg: 0x9fb0bd, travertine: 0xd8d2c4, green: 0x5d7a68, chrome: 0xaab4bd,
    water: 0xa8bcc8, podium: 0xe6e1d5, roof: 0xc9c4b8, line: 0x3a4048,
    lineOpacity: 0.5, label: 'DAY',
  },
  dusk: {
    bg: 0x2a1e18, travertine: 0x9a8874, green: 0x46554a, chrome: 0xc0b4a4,
    water: 0x3a2f28, podium: 0x6c6152, roof: 0x483e34, line: 0xe8d4bc,
    lineOpacity: 0.42, label: 'DUSK',
  },
};

/** Sun altitude in degrees. Same NOAA approximation the sky uses. */
export function sunAltitude(date, lat, lon) {
  const rad = Math.PI / 180;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;              // mean longitude
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;      // mean anomaly
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
  const eps = (23.439 - 0.0000004 * n) * rad;             // obliquity
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = ((gmst * 15 + lon) % 360) * rad;
  const H = lst - ra;
  const phi = lat * rad;
  const alt = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  );
  return alt / rad;
}

/** Which palette, and how far between it and the next one. */
export function phaseFor(altDeg, rising) {
  if (altDeg > 8) return { key: 'day', t: 1 };
  if (altDeg < -6) return { key: 'night', t: 1 };
  // The twilight band. Same colours; the name depends on direction.
  const t = (altDeg + 6) / 14;                 // 0 at -6°, 1 at +8°
  return { key: rising ? 'dawn' : 'dusk', t };
}

const lerpHex = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const m = (x, y) => Math.round(x + (y - x) * t);
  return (m(ar, br) << 16) | (m(ag, bg) << 8) | m(ab, bb);
};

/** Blend between the twilight palette and its neighbour by altitude. */
export function paletteFor(altDeg, rising) {
  const { key, t } = phaseFor(altDeg, rising);
  if (key === 'day' || key === 'night') return { ...PALETTES[key], phase: key };
  const twilight = PALETTES[key];
  const toward = altDeg >= 0 ? PALETTES.day : PALETTES.night;
  // Ease toward the neighbour only in the outer half of the band, so the
  // cream actually gets seen instead of being a two-minute transition.
  const k = altDeg >= 0 ? Math.max(0, (t - 0.5) * 2) : Math.max(0, (0.5 - t) * 2);
  const out = { phase: key, label: twilight.label, lineOpacity: twilight.lineOpacity };
  for (const c of ['bg', 'travertine', 'green', 'chrome', 'water', 'podium', 'roof', 'line']) {
    out[c] = lerpHex(twilight[c], toward[c], k * 0.75);
  }
  return out;
}

/** Open-Meteo. No key. Returns {raining, code, temp} or null. */
export async function fetchWeather(lat, lon) {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}` +
      `&longitude=${lon.toFixed(3)}&current=precipitation,weather_code,temperature_2m`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    const c = d.current || {};
    // WMO codes: 51-67 drizzle/rain, 80-82 showers, 95-99 thunderstorm.
    const code = c.weather_code ?? 0;
    const raining = (c.precipitation ?? 0) > 0 ||
      (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    return { raining, code, temp: c.temperature_2m ?? null };
  } catch { return null; }
}

/**
 * Rain that falls only where there is no roof.
 *
 * One THREE.Points cloud over the whole podium, with the roofed
 * rectangle punched out at spawn time — drops are only ever created
 * outside it. That is cheaper than testing every drop every frame, and
 * it is also literally how the building works: you stand under the slab
 * and you stay dry.
 */
export function makeRain(THREE, plan, count = 900) {
  const pos = new Float32Array(count * 3);
  const spd = new Float32Array(count);
  const hw = plan.podium.w / 2, hd = plan.podium.d / 2;
  const r = plan.roof;

  const place = (i) => {
    let x, z, guard = 0;
    do {
      x = (Math.random() * 2 - 1) * hw;
      z = (Math.random() * 2 - 1) * hd;
      guard++;
    } while (guard < 12 && x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
    pos[i * 3] = x;
    pos[i * 3 + 1] = Math.random() * 12 + 1;
    pos[i * 3 + 2] = z;
    spd[i] = 9 + Math.random() * 7;
  };
  for (let i = 0; i < count; i++) place(i);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xbcc8d2, size: 0.045, transparent: true, opacity: 0,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.visible = false;

  return {
    points, material: mat,
    /** @param dt seconds @param on whether it is currently raining */
    tick(dt, on) {
      const targetOpacity = on ? 0.5 : 0;
      mat.opacity += (targetOpacity - mat.opacity) * 0.04;
      points.visible = mat.opacity > 0.01;
      if (!points.visible) return;
      const a = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        a[i * 3 + 1] -= spd[i] * dt;
        if (a[i * 3 + 1] < 0) place(i);          // hits the travertine, respawns
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
