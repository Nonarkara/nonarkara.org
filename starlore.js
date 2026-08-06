/**
 * STARLORE — what the stars actually mean.
 *
 * The sky was already correct: real right ascension and declination,
 * real sidereal time, the compass pointing you at the real north. But
 * correct is not the same as magic. A line joining seven dots and
 * labelled "Ursa Major" teaches nobody anything.
 *
 * So each figure gets three things, in this order, because it is the
 * order a person actually wants them:
 *
 *   see   — how to find it in the sky tonight, in plain words. The
 *           thing a friend standing next to you would say first.
 *   story — why humans drew that shape. Kept short and given a culture,
 *           because "the ancients believed" is nobody; different people
 *           looked at the same dots and saw different animals.
 *   fact  — one true astronomical thing, with a number. This is the
 *           part that stops it being decoration.
 *
 * Distances are in light years, rounded, from Hipparcos/Gaia parallax.
 * They are quoted as approximate because they are: parallax has error
 * bars, and a site that prints 642.5 light years is lying about its
 * own precision.
 *
 * Thai and Chinese names are included where the culture genuinely has
 * its own asterism rather than a translation of the Latin — the Chinese
 * sky is a different sky, not the Greek one relabelled, and saying so
 * is the whole point of §12.6's "engage every frame inside its own logic".
 */

export const LORE = {
  Orion: {
    see: 'Three bright stars in a short straight row — the belt. Nothing else in the sky looks like it.',
    story: 'A hunter to the Greeks. To the ancient Egyptians the same stars were Osiris, lord of the dead, and the pyramids at Giza sit roughly beneath them.',
    fact: 'Betelgeuse, the orange shoulder, is roughly 700 times the width of the Sun — put it where the Sun is and it would swallow Jupiter. It will end as a supernova: possibly tonight, possibly in 100,000 years.',
    zh: '參宿 — the Three Stars', th: 'ดาวเต่า — the turtle',
  },
  'Ursa Major': {
    see: 'A saucepan. Four stars for the pan, three for the handle, high in the northern sky.',
    story: 'A bear in Greece, a plough in Britain, a wagon in Germany, and in China the Northern Dipper that the emperor\'s astronomers used to fix the calendar.',
    fact: 'Mizar, the middle star of the handle, is 2 stars — and if your eyes are good you can split them unaided. Roman recruits were reportedly tested on it.',
    zh: '北斗七星 — the Northern Dipper',
  },
  Cassiopeia: {
    see: 'A flattened W, opposite the Dipper across the pole star. When one is high the other is low.',
    story: 'A queen punished for vanity by being tied to her throne and spun around the pole forever — for half the year she hangs upside down.',
    fact: 'In 1572 Tycho Brahe watched a new star appear here bright enough to see in daylight. It was a supernova, and it broke the idea that the heavens never change.',
  },
  Crux: {
    see: 'Small, sharp, four stars in a kite. Only from the southern half of the world — you cannot see it from Bangkok.',
    story: 'It guided ships south for four centuries and sits on five national flags. The Māori saw it as the anchor of a great canoe.',
    fact: 'Its long axis, extended about 4.5 times, lands on the south celestial pole — which, unlike the north, has no bright star to mark it. Sailors navigated by that emptiness.',
  },
  Scorpius: {
    see: 'A real curve of stars ending in a hook — one of the few constellations that looks like the thing it is named after.',
    story: 'The scorpion that killed Orion. They were placed at opposite ends of the sky so that one always sets as the other rises; they never meet again.',
    fact: 'Antares means "rival of Mars" — a red supergiant of almost the same colour, some 700 times the Sun\'s width. Put it where the Sun is and its surface would reach past the orbit of Mars.',
    th: 'ดาวแมงป่อง — the scorpion',
  },
  Sagittarius: {
    see: 'A teapot, complete with spout and handle, low in the south. Steam rises from the spout: that is the Milky Way.',
    story: 'A centaur archer to the Greeks. The arrow points at the scorpion\'s heart.',
    fact: 'You are looking straight at the centre of our galaxy — 26,000 light years away, behind that steam, a black hole four million times the mass of the Sun.',
  },
  Cygnus: {
    see: 'A large cross lying along the Milky Way, flying south. Deneb is its tail.',
    story: 'A swan. In one telling, Zeus in disguise; in another, a friend who dived so many times looking for a drowned companion that the gods made him a bird.',
    fact: 'Deneb is one of the most luminous stars we can see — roughly 2,600 light years away, yet still among the brightest in the sky. Its light left before the Roman Empire.',
  },
  Leo: {
    see: 'A backwards question mark for the head and mane, with a triangle behind it for the hindquarters.',
    story: 'The lion Hercules killed with his hands because its hide could not be pierced.',
    fact: 'Every November the Leonid meteors stream out of here — debris from comet Tempel-Tuttle, which returns every 33 years. In 1833 the rate reached roughly 100,000 an hour.',
  },
  Gemini: {
    see: 'Two bright stars side by side, Castor and Pollux, with two rough parallel lines of fainter stars trailing away.',
    story: 'Twin brothers, one mortal and one not. When the mortal died, the other asked to share his immortality rather than outlive him.',
    fact: 'Pollux has a planet — a gas giant larger than Jupiter, confirmed in 2006. It is one of the nearest known exoplanets to Earth at 34 light years.',
  },
  Corvus: {
    see: 'A small lopsided rectangle, southwest of the bright star Spica. Easy to miss, hard to forget.',
    story: 'A crow sent to fetch water who dawdled eating figs, then lied about why. It was thrown into the sky still thirsty.',
    fact: 'Just off its edge lie the Antennae — two galaxies in the middle of colliding. The collision started roughly 600 million years ago and is still going.',
  },
  Bootes: {
    see: 'A kite, or an ice-cream cone, with orange Arcturus at the point. Follow the curve of the Dipper\'s handle and you arrive at it.',
    story: 'A herdsman driving the bear around the pole. Also read as the inventor of the plough, placed in the sky as thanks.',
    fact: 'Arcturus crosses our sky at about 122 km per second — a visitor from the galaxy\'s older halo population, just passing through the disc we live in.',
  },
  Pegasus: {
    see: 'A large empty square. What you notice is not the stars but how little is inside it.',
    story: 'The winged horse, drawn upside down. The square is his body; the legs run off toward Andromeda.',
    fact: 'In 1995 the first planet ever found around a normal star was discovered here, 51 Pegasi b. It changed the estimate of how common planets are from "unknown" to "most stars".',
  },
  Andromeda: {
    see: 'A chain of stars running off one corner of the Square of Pegasus.',
    story: 'A princess chained to a rock as a sacrifice, rescued by Perseus, who is the next constellation along.',
    fact: 'The faint smudge beside her is the Andromeda Galaxy — a trillion stars, 2.5 million light years away, and the furthest thing a human eye can see unaided. It is heading toward us.',
  },
  'Canis Major': {
    see: 'Find Orion\'s belt and follow it down and left. The brightest star in the entire night sky is right there.',
    story: 'Orion\'s hunting dog. In Egypt, the rising of Sirius just before dawn announced the Nile flood, and so began the year.',
    fact: 'Sirius is bright mostly because it is close — 8.6 light years. It has a white dwarf companion the size of Earth with the mass of the Sun; a teaspoon of it would weigh a tonne.',
    zh: '天狼星 — the Celestial Wolf',
  },
  Centaurus: {
    see: 'Large and southern, beneath the Southern Cross. Two very bright stars close together point at the Cross.',
    story: 'A centaur — the wise one, Chiron, teacher of physicians, as opposed to the archer.',
    fact: 'Rigil Kentaurus is the closest star system to the Sun, 4.4 light years away. Travelling at the speed of the fastest spacecraft ever launched, you would arrive in about six thousand years.',
  },
};

/** Notable individual stars — shown when you tap one directly. */
export const STARLORE = {
  Sirius:     { d: 8.6,   note: 'The brightest star in the night sky, and one of the nearest.' },
  Betelgeuse: { d: 550,   note: 'A red supergiant near the end of its life. It will go supernova.' },
  Rigel:      { d: 860,   note: 'A blue supergiant, 120,000 times more luminous than the Sun.' },
  Vega:       { d: 25,    note: 'Was the pole star 14,000 years ago, and will be again in 12,000.' },
  Arcturus:   { d: 37,    note: 'Racing through our galactic neighbourhood from the older halo.' },
  Antares:    { d: 550,   note: 'Rival of Mars. Big enough to swallow the orbit of Mars itself.' },
  Polaris:    { d: 430,   note: 'Within one degree of true north — but only for now.' },
  Deneb:      { d: 2600,  note: 'Its light left around the time the Iron Age began.' },
  Altair:     { d: 17,    note: 'Spins so fast it is visibly flattened — a day lasts nine hours.' },
  Aldebaran:  { d: 65,    note: 'The eye of the bull. A Pioneer probe will pass it in two million years.' },
  Spica:      { d: 250,   note: 'Two stars so close they orbit each other in four days.' },
  Pollux:     { d: 34,    note: 'Has a confirmed planet — one of the nearest exoplanets we know.' },
  Regulus:    { d: 79,    note: 'Sits almost exactly on the ecliptic, so the Moon regularly covers it.' },
  Canopus:    { d: 310,   note: 'Spacecraft use it to orient themselves; it is bright and far from the ecliptic.' },
  Acrux:      { d: 320,   note: 'The foot of the Southern Cross, and the southernmost first-magnitude star.' },
  Alphard:    { d: 177,   note: 'Its name means "the solitary one" — nothing bright lies near it.' },
};

/** One-line summary for the tooltip; the panel gets the full entry. */
export function briefFor(figureName) {
  const l = LORE[figureName];
  return l ? l.see : null;
}

export function loreFor(figureName) {
  return LORE[figureName] || null;
}

export function starNote(name) {
  const s = STARLORE[name];
  if (!s) return null;
  return { distance: s.d, note: s.note };
}
