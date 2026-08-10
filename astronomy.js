/**
 * ASTRONOMY — one clock for the whole estate.
 *
 * No API is involved: the Sun, Moon, sunrise and sunset are deterministic
 * consequences of an instant and a position on Earth. Keeping the maths in
 * one dependency-free module prevents the room palette, planetarium and HUD
 * from quietly disagreeing about where or when the visitor is.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
const NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14, 0);
const SYNODIC_MONTH = 29.530588853;

const wrap = (n, period) => ((n % period) + period) % period;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const daysSinceJ2000 = (date) => (date.getTime() - J2000) / 86400000;

/** Greenwich mean sidereal time, degrees. */
export function gmst(date) {
  const d = daysSinceJ2000(date);
  return wrap(280.46061837 + 360.98564736629 * d, 360);
}

/** Local sidereal time, degrees. East longitude is positive. */
export const lst = (date, lonDeg) => wrap(gmst(date) + lonDeg, 360);

/**
 * Equatorial coordinates to horizontal coordinates. Azimuth is true north
 * through east, matching both the device compass and the world convention.
 */
export function altAz(raHours, decDeg, latDeg, lonDeg, date) {
  const H = (lst(date, lonDeg) - raHours * 15) * D2R;
  const dec = decDeg * D2R;
  const lat = clamp(latDeg, -90, 90) * D2R;
  const sinAlt = Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const az = Math.atan2(
    -Math.sin(H) * Math.cos(dec),
    Math.sin(dec) * Math.cos(lat) -
      Math.cos(dec) * Math.sin(lat) * Math.cos(H),
  );
  return { alt: alt * R2D, az: wrap(az * R2D, 360) };
}

/** Low-precision Astronomical Almanac Sun; sub-pixel accurate here. */
export function sunPosition(date) {
  const d = daysSinceJ2000(date);
  const L = (280.460 + 0.9856474 * d) * D2R;
  const g = (357.528 + 0.9856003 * d) * D2R;
  const lambda = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R;
  const eps = (23.439 - 0.0000004 * d) * D2R;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  return { raHours: wrap(ra * R2D, 360) / 15, decDeg: dec * R2D };
}

/** Truncated Meeus Moon, accurate to roughly one degree. */
export function moonPosition(date) {
  const d = daysSinceJ2000(date);
  const L = (218.316 + 13.176396 * d) * D2R;
  const M = (134.963 + 13.064993 * d) * D2R;
  const F = (93.272 + 13.229350 * d) * D2R;
  const lambda = L + 6.289 * D2R * Math.sin(M);
  const beta = 5.128 * D2R * Math.sin(F);
  const eps = 23.439 * D2R;
  const ra = Math.atan2(
    Math.sin(lambda) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps),
    Math.cos(lambda),
  );
  const dec = Math.asin(
    Math.sin(beta) * Math.cos(eps) +
    Math.cos(beta) * Math.sin(eps) * Math.sin(lambda),
  );
  return { raHours: wrap(ra * R2D, 360) / 15, decDeg: dec * R2D };
}

export const sunHorizontal = (date, lat, lon) => {
  const p = sunPosition(date);
  return altAz(p.raHours, p.decDeg, lat, lon, date);
};

export const moonHorizontal = (date, lat, lon) => {
  const p = moonPosition(date);
  return altAz(p.raHours, p.decDeg, lat, lon, date);
};

/**
 * Lunar age and illuminated fraction. Phase is 0 at new, 0.5 at full;
 * illumination is 0..1. Location changes where the Moon appears, not its
 * geocentric phase, so the same phase is correct for every visitor.
 */
export function moonPhase(date) {
  const days = (date.getTime() - NEW_MOON_2000) / 86400000;
  const phase = wrap(days / SYNODIC_MONTH, 1);
  const illumination = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  const eighth = Math.round(phase * 8) % 8;
  const names = [
    'NEW MOON', 'WAXING CRESCENT', 'FIRST QUARTER', 'WAXING GIBBOUS',
    'FULL MOON', 'WANING GIBBOUS', 'LAST QUARTER', 'WANING CRESCENT',
  ];
  return {
    phase,
    illumination,
    waxing: phase < 0.5,
    ageDays: phase * SYNODIC_MONTH,
    label: names[eighth],
  };
}

/**
 * Sunrise and sunset for the visitor's local calendar day. A numerical
 * crossing is slower than a closed-form equation by microseconds and more
 * robust near the polar circles. -0.833° includes refraction and solar radius.
 */
export function solarEvents(date, lat, lon) {
  const start = new Date(
    date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0,
  ).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  const threshold = -0.833;
  const valueAt = (ms) => sunHorizontal(new Date(ms), lat, lon).alt - threshold;
  const events = [];
  const step = 5 * 60 * 1000;
  let aTime = start;
  let aValue = valueAt(aTime);

  for (let bTime = start + step; bTime <= end; bTime += step) {
    const bValue = valueAt(bTime);
    if ((aValue <= 0 && bValue > 0) || (aValue >= 0 && bValue < 0)) {
      let lo = aTime;
      let hi = bTime;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const mv = valueAt(mid);
        if ((aValue <= 0 && mv <= 0) || (aValue >= 0 && mv >= 0)) lo = mid;
        else hi = mid;
      }
      const instant = new Date((lo + hi) / 2);
      const horizontal = sunHorizontal(instant, lat, lon);
      events.push({
        kind: bValue > aValue ? 'sunrise' : 'sunset',
        date: instant,
        az: horizontal.az,
      });
    }
    aTime = bTime;
    aValue = bValue;
  }

  return {
    sunrise: events.find((e) => e.kind === 'sunrise') || null,
    sunset: events.find((e) => e.kind === 'sunset') || null,
    polarDay: events.length === 0 && valueAt(start + 12 * 60 * 60 * 1000) > 0,
    polarNight: events.length === 0 && valueAt(start + 12 * 60 * 60 * 1000) <= 0,
  };
}

export const cardinal = (deg) =>
  ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(wrap(deg, 360) / 45) % 8];
