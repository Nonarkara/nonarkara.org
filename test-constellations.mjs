// Self-check for the star catalogue's colour and the constellation sky.
//
// Two claims are made on this site about the night sky, and both are
// checked here:
//
//   1. The stars are the real ones, and they are the colour they are.
//   2. The constellations are the IAU's eighty-eight, drawn on the
//      stars they are drawn on.
//
// The second claim is the one that is easy to fake and hard to notice:
// a constellation that is a drawing of a drawing looks exactly like a
// constellation until you look for a star that is not there.
import assert from 'node:assert';
import { decodeCatalog } from './starcat.js';
import { CONSTELLATIONS } from './constellations.js';
import { FIGURES, starColour } from './sky.js';

const cat = decodeCatalog();

// ── The catalogue is still the catalogue ──────────────────────────
assert(cat.count > 5000, `the naked-eye catalogue should hold five thousand stars, has ${cat.count}`);
assert(cat.RA.length === cat.count && cat.DEC.length === cat.count);
assert(cat.COLOUR.length === cat.count, 'every star must have a colour index');

// ── The colour of a star is a measurement ────────────────────────
{
  // Betelgeuse is cool and red; Rigel is hot and blue-white. The
  // catalogue's own colour index says so, and the sky's colour must
  // agree with it rather than with a designer.
  const betelgeuse = cat.NAME.indexOf('Betelgeuse');
  const rigel = cat.NAME.indexOf('Rigel');
  assert(betelgeuse >= 0 && rigel >= 0, 'both stars must be named in the catalogue');
  assert(cat.COLOUR[betelgeuse] > 1.0, `Betelgeuse is red: B−V ${cat.COLOUR[betelgeuse]}`);
  assert(cat.COLOUR[rigel] < 0.3, `Rigel is blue-white: B−V ${cat.COLOUR[rigel]}`);

  const warm = starColour(cat.COLOUR[betelgeuse]);
  const cool = starColour(cat.COLOUR[rigel]);
  assert(warm[0] > warm[2], `a red star must be redder than it is blue: ${warm}`);
  assert(cool[2] >= cool[0], `a blue star must be bluer than it is red: ${cool}`);
  // A hint of colour, not a paint chart: the eye sees white at night.
  for (const c of [warm, cool]) {
    assert(Math.min(...c) > 0.2, 'a star must not go black in one channel');
    assert(Math.max(...c) <= 1.001, 'a star must not be brighter than white');
  }
}

// ── The constellation sky ─────────────────────────────────────────
{
  assert(CONSTELLATIONS.length >= 80,
    `the Modern sky should hold most of its eighty-eight constellations, has ${CONSTELLATIONS.length}`);

  let segments = 0;
  let stars = 0;
  for (const c of CONSTELLATIONS) {
    assert(c.id && c.name, `a constellation without a name: ${JSON.stringify(c).slice(0, 80)}`);
    assert(c.lines.length > 0, `${c.name} has no lines`);
    for (const chain of c.lines) {
      assert(chain.length >= 2, `${c.name} has a line with fewer than two stars`);
      for (const i of chain) {
        assert(i >= 0 && i < cat.count,
          `${c.name} names a star the catalogue does not have: index ${i}`);
      }
      segments++;
      stars += chain.length;
    }
  }
  assert(segments > 150, `the sky should carry a few hundred lines, has ${segments}`);
  assert(stars > 400, `the figures should touch a few hundred stars, touch ${stars}`);
}

// ── No constellation is drawn twice ───────────────────────────────
//
// The site draws fifteen of them itself, by hand, with the lore
// attached. The Modern figures fill in the rest. If a constellation
// appeared in both, its lines would be drawn on top of themselves and
// the sky would have a bright seam down the middle of it.
{
  const normalise = (n) => String(n || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const own = new Set(Object.keys(FIGURES).map(normalise));
  for (const c of CONSTELLATIONS) {
    assert(!own.has(normalise(c.name)),
      `${c.name} is drawn twice: the site draws it by hand and the Modern sky draws it too`);
  }
  // The diaeresis is the test of the matcher: the Modern scheme spells
  // it Boötes, the site spells it Bootes, and they are one constellation.
  assert(CONSTELLATIONS.some((c) => normalise(c.name) === 'bootes'),
    'Boötes must be in the sky, and must match the site\'s own Bootes');
}

console.log(`constellations: ${CONSTELLATIONS.length} Modern figures · colour index · no double-drawn sky`);
