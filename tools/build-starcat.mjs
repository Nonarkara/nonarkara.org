#!/usr/bin/env node
/**
 * BUILD THE STAR CATALOGUE — from the real sky, not a hand-typed list.
 *
 * The catalogue used to be 152 stars typed out by hand in sky.js, with
 * magnitudes rounded to two decimals and the faintest entry at 3.85. A real
 * naked-eye sky over a dark site holds about five thousand stars to
 * magnitude 6. The difference is the whole reason the sky looked like a
 * planetarium with the lights on: not a wrong sky, but a nearly empty one.
 *
 * This script reads the HYG v41 catalogue — Hipparcos, Yale Bright Star and
 * Gliese, merged, with real magnitudes — keeps every star a person can see
 * without a telescope, merges the hand-written display names (so every
 * constellation line and every line of lore still resolves), and writes
 * starcat.js as a packed table.
 *
 *   node tools/build-starcat.mjs /path/to/hygdata_v41.csv
 *
 * The CSV is not in this repository: it is 34 MB and it is someone else's
 * work. Fetch it from
 *   https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv
 *
 * WHY IT IS PACKED
 * Five thousand stars as readable arrays is 140 KB of text. Packed into six
 * bytes each — right ascension, declination, magnitude and a name index —
 * it is 30 KB, and the whole table arrives as one string the browser
 * decodes in a millisecond. The sky is the last thing to load and the first
 * thing anyone looks at; it should not cost the room a tenth of a second.
 *
 * THE PACKING, in six bytes per star, big-endian, most significant field
 * first:
 *
 *   bits 47..35   right ascension × 200   (0.005 h  = 0.075°)
 *   bits 34..20   declination + 90, × 100 (0.01°)
 *   bits 19..12   magnitude + 2, × 20      (0.05 mag)
 *   bits 11..0    name index, 0 = unnamed
 */

import { readFileSync, writeFileSync } from 'node:fs';

const CSV = process.argv[2] || '/tmp/hyg_full.csv';
const MAG_LIMIT = 6.0;          // the naked-eye limit
const OUT = new URL('../starcat.js', import.meta.url);

// ── The names the rest of the site already depends on ──────────
// The site's own vocabulary, kept in tools/legacy-star-names.mjs so it can
// be edited in one place and never ships. The constellation lines in
// sky.js are checked against it below: if a figure names a star, that star
// has to exist in the catalogue.
const { LEGACY_NAMES } = await import('./legacy-star-names.mjs');
const skySource = readFileSync(new URL('../sky.js', import.meta.url), 'utf8');
const legacy = LEGACY_NAMES.map(([ra, dec, name]) => ({ ra, dec, name }));

if (legacy.length < 100) {
  console.error(`FAIL: could not read the existing star names (found ${legacy.length}).`);
  process.exit(1);
}

// ── Read HYG ────────────────────────────────────────────────────
const text = readFileSync(CSV, 'utf8');
const lines = text.split('\n');
const header = lines[0].split(',');
const COL = {
  proper: header.indexOf('"proper"'),
  ra: header.indexOf('"ra"'),
  dec: header.indexOf('"dec"'),
  mag: header.indexOf('"mag"'),
};

const hyg = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;
  // The file is quoted CSV; the columns we need are simple, but a quoted
  // field may contain commas, so split on commas outside quotes.
  const f = splitCsvLine(line);
  const mag = parseFloat(f[COL.mag]);
  if (!Number.isFinite(mag) || mag > MAG_LIMIT) continue;
  // The Sun and the Moon are in the catalogue, at magnitudes −26.7 and
  // −12.7. They are not stars, and the dome draws both of them properly
  // — with a real disc, a real phase and a real position. Leaving them
  // in here would put a second, wrong Sun in the sky.
  if (mag < -2) continue;
  const ra = parseFloat(f[COL.ra]);
  const dec = parseFloat(f[COL.dec]);
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;
  hyg.push({ ra, dec, mag, name: (f[COL.proper] || '').trim() });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// ── Deduplicate: one physical star, one row ────────────────────
// HYG lists Alpha Centauri twice — once as Rigil Kentaurus, once as
// Toliman — and a handful of other stars under two names. Two rows for
// one star means two points of light in the sky where there is one.
function dedupe(rows) {
  const groups = [];
  for (const s of rows) {
    let g = null;
    for (const cand of groups) {
      const dra = Math.abs(cand.ra - s.ra);
      const dh = Math.min(dra, 24 - dra) * 15;
      if (dh < 0.03 && Math.abs(cand.dec - s.dec) < 0.03) { g = cand; break; }
    }
    if (!g) {
      groups.push({ ra: s.ra, dec: s.dec, mag: s.mag, names: s.name ? [s.name] : [] });
    } else {
      if (s.name && !g.names.includes(s.name)) g.names.push(s.name);
      if (s.mag < g.mag) { g.mag = s.mag; }
    }
  }
  return groups;
}
const groups = dedupe(hyg);

// ── Merge: keep the site's display names where they already exist ──
// The hand-written list is the site's vocabulary — "Navi" for Gamma
// Cassiopeiae, "Rigil Kentaurus" for Alpha Centauri. The catalogue's own
// names are used for every star that list never mentioned.
//
// Matching is by NAME first, position second. Name-first matters: the hand
// list had Markeb at RA 8h45m, which is not Markeb — Markeb is Kappa
// Velorum at RA 9h22m. Position-matching would have kept the wrong star
// and given the site a false position for a name it prints.
const used = new Set();
const dropped = [];
for (const l of legacy) {
  let hit = groups.find((g) => g.names.includes(l.name) && !used.has(g));
  if (!hit) {
    hit = groups.find((g) => {
      if (used.has(g)) return false;
      const dra = Math.abs(g.ra - l.ra);
      const dh = Math.min(dra, 24 - dra) * 15;
      return dh < 0.35 && Math.abs(g.dec - l.dec) < 0.35;
    });
  }
  if (hit) {
    used.add(hit);
    hit.display = l.name;        // the site's spelling wins
  } else {
    dropped.push(l.name);
  }
}
for (const g of groups) if (!g.display) g.display = g.names[0] || '';

// Every constellation line must still resolve. If one does not, the sky
// would silently lose an edge.
const figBlock = skySource.slice(skySource.indexOf('export const FIGURES = {'));
const figNames = [...figBlock.matchAll(/seg\(([^)]*)\)/g)]
  .flatMap((m) => m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean));
const catalogueNames = new Set(groups.map((g) => g.display));
const missingFig = [...new Set(figNames)].filter((n) => !catalogueNames.has(n));
if (missingFig.length) {
  console.error(`FAIL: constellation line(s) name stars that are not in the catalogue: ${missingFig.join(', ')}`);
  process.exit(1);
}
if (dropped.length) {
  console.log(`note: dropped ${dropped.length} hand-typed name(s) with no catalogue match: ${dropped.join(', ')}`);
  console.log('      (none of them is used by a constellation line — the check above passed)');
}

// ── Sort brightest first, and pack ──────────────────────────────
groups.sort((a, b) => a.mag - b.mag);

const names = [''];
const nameIndex = new Map();
const idxOf = (n) => {
  if (!n) return 0;
  if (!nameIndex.has(n)) { nameIndex.set(n, names.length); names.push(n); }
  return nameIndex.get(n);
};

const bytes = new Uint8Array(groups.length * 6);
groups.forEach((s, i) => {
  // RA wraps: 24h is 0h, and a star at 23.9996h is the same place as one
  // at 0.0000h. Without the wrap it would decode to 24.0000 — outside the
  // sky.
  const raQ = Math.max(0, Math.min(4799, Math.round(s.ra * 200) % 4800));
  const decQ = Math.max(0, Math.min(32767, Math.round((s.dec + 90) * 100)));
  const magQ = Math.max(0, Math.min(255, Math.round((s.mag + 2) * 20)));
  const nIdx = idxOf(s.display);
  if (nIdx > 4095) throw new Error('too many star names');
  const o = i * 6;
  bytes[o]     = (raQ >>> 5) & 0xFF;
  bytes[o + 1] = ((raQ & 0x1F) << 3) | ((decQ >>> 12) & 0x07);
  bytes[o + 2] = (decQ >>> 4) & 0xFF;
  bytes[o + 3] = ((decQ & 0x0F) << 4) | ((magQ >>> 4) & 0x0F);
  bytes[o + 4] = ((magQ & 0x0F) << 4) | ((nIdx >>> 8) & 0x0F);
  bytes[o + 5] = nIdx & 0xFF;
});

const b64 = Buffer.from(bytes).toString('base64');

// Wrap the base64 so the file stays readable in an editor.
const wrapped = b64.match(/.{1,110}/g).map((l) => `  '${l}'`).join(' +\n');

const out = `// ═══════════════════════════════════════════════════════════════════════════
// THE STAR CATALOGUE — every star a person can see without a telescope.
//
// GENERATED FILE — do not edit by hand.
//   node tools/build-starcat.mjs /path/to/hygdata_v41.csv
//
// Source: HYG v41 (Hipparcos + Yale Bright Star + Gliese), stars to
// magnitude ${MAG_LIMIT}. ${groups.length} stars, ${names.length - 1} of them named.
//
// Packed, six bytes each: right ascension, declination, magnitude, name
// index. The whole table is ${(bytes.length / 1024).toFixed(0)} KB of base64 —
// about a fifth of what the same data costs as plain arrays — and decodes
// in a millisecond.
//
// The point of this file is that the sky is the sky. A hand-typed list of
// 152 stars is a planetarium; five thousand is a place.
// ═══════════════════════════════════════════════════════════════════════════

/** Star names, index 0 is "unnamed". */
export const NAMES = [
${names.map((n) => `  ${JSON.stringify(n)},`).join('\n')}
];

/** The packed table: ${hyg.length} stars, six bytes each. */
export const PACKED =
${wrapped};

/**
 * Decode the table into parallel arrays. Flat typed arrays, not 5,000
 * little arrays: the renderer walks them every ten seconds and the tap
 * handler walks all of them on every tap.
 */
export function decodeCatalog() {
  const bin = atob(PACKED);
  const n = bin.length / 6;
  const RA = new Float32Array(n);
  const DEC = new Float32Array(n);
  const MAG = new Float32Array(n);
  const NAME = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    const b0 = bin.charCodeAt(o), b1 = bin.charCodeAt(o + 1), b2 = bin.charCodeAt(o + 2);
    const b3 = bin.charCodeAt(o + 3), b4 = bin.charCodeAt(o + 4), b5 = bin.charCodeAt(o + 5);
    const raQ = (b0 << 5) | (b1 >>> 3);
    const decQ = ((b1 & 0x07) << 12) | (b2 << 4) | (b3 >>> 4);
    const magQ = ((b3 & 0x0F) << 4) | (b4 >>> 4);
    const nIdx = ((b4 & 0x0F) << 8) | b5;
    RA[i] = raQ / 200;
    DEC[i] = decQ / 100 - 90;
    MAG[i] = magQ / 20 - 2;
    NAME[i] = NAMES[nIdx] || '';
  }
  return { RA, DEC, MAG, NAME, count: n };
}
`;

writeFileSync(OUT, out);
console.log(`wrote starcat.js — ${groups.length} stars to magnitude ${MAG_LIMIT}, ` +
  `${names.length - 1} names, ${(bytes.length / 1024).toFixed(1)} KB packed, ` +
  `${(out.length / 1024).toFixed(1)} KB as a file.`);
console.log(`names kept from the old list: ${used.size}/${legacy.length}`);
