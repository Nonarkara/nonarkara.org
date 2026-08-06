// Every drawn constellation must be able to teach.
import assert from 'node:assert';
import { LORE, STARLORE, loreFor, starNote } from './starlore.js';
import { FIGURES, STARS, figureOfStar } from './sky.js';

// ── No figure is drawn on the dome without something to say ───
for (const fig of Object.keys(FIGURES)) {
  const l = loreFor(fig);
  assert(l, `${fig} is drawn in the sky but has no lore — a labelled line teaches nobody`);
  for (const k of ['see', 'story', 'fact']) {
    assert(l[k] && l[k].length > 30, `${fig}.${k} is missing or too thin`);
  }
  // The fact is the part that stops it being decoration, so it must
  // actually contain a quantity.
  assert(/\d/.test(l.fact), `${fig}.fact has no number in it`);
}

// ── No lore for a figure that is not drawn ────────────────────
for (const fig of Object.keys(LORE)) {
  assert(FIGURES[fig], `lore exists for ${fig} but it is never drawn`);
}

// ── Star notes point at stars that exist in the catalogue ─────
const names = new Set(STARS.map(s => s[3]));
for (const n of Object.keys(STARLORE)) {
  assert(names.has(n), `${n} has a note but is not in the star catalogue`);
  const s = starNote(n);
  assert(typeof s.distance === 'number' && s.distance > 0, `${n}: bad distance`);
  assert(s.note.length > 20, `${n}: note too thin`);
}

// ── The star → figure lookup actually resolves ────────────────
for (const [star, fig] of [['Sirius', 'Canis Major'], ['Betelgeuse', 'Orion'],
                           ['Antares', 'Scorpius'], ['Deneb', 'Cygnus']]) {
  assert.equal(figureOfStar(star), fig, `${star} should belong to ${fig}`);
}

// ── Tone: this is a teaching panel, not a brochure ────────────
const banned = /\b(amazing|breathtaking|stunning|journey|magical|awe.?inspiring|unlock)\b/i;
for (const [fig, l] of Object.entries(LORE)) {
  for (const k of ['see', 'story', 'fact']) {
    assert(!banned.test(l[k]), `${fig}.${k} reaches for adjectives instead of facts`);
  }
}

console.log(`starlore: all checks passed · ${Object.keys(LORE).length} figures · ${Object.keys(STARLORE).length} star notes`);
