/**
 * Small, fast, seedable random numbers (mulberry32).
 *
 * It lives on its own because both the perception engine and the props
 * need it, and the props are imported by the world. A cycle between them
 * would work by accident today and break the day either file grows an
 * import at the top.
 */

/** A generator of floats in [0, 1). Same seed, same sequence, every run. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
