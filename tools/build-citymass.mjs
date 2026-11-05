#!/usr/bin/env node
/**
 * BUILD THE CITY MASSING — Bangkok, from the real map, baked.
 *
 * The estate floats above a map plate. What is under that plate should
 * not be a picture of the city; it should be the city. This script
 * takes the real building footprints and heights from OpenStreetMap
 * and writes them down, once, so the site can carry the massing
 * without asking anyone's server for it every time somebody looks down.
 *
 *   node tools/build-citymass.mjs [--cache /tmp/citymass-cache]
 *
 * WHY IT IS BAKED, NOT FETCHED
 *
 * The OpenStreetMap API is a courtesy, not a CDN. Asking it for a
 * city every time a visitor tilts their phone down would be rude, slow,
 * and unreliable — and it would put a third party's uptime between a
 * reader and the ground they are standing on. So the data is fetched
 * ONCE, here, at build time, and shipped as a file. The same reason
 * the star catalogue is a file.
 *
 * WHAT IS KEPT
 *
 * A city is not a set of buildings; a city is its massing. Six thousand
 * small shophouses make a texture, not a model, and a texture is not
 * what you want when you are looking down through a floor at the place
 * you live. So the buildings are ranked by MASSING — footprint area
 * times height — and the largest 4,000 are kept, plus every building
 * over a hundred metres, which are the towers that define a skyline.
 *
 * The heights are real where OpenStreetMap knows them, and estimated
 * where it does not — which is most of them. The estimates are stated
 * in the report below and in the generated file, because a height that
 * was guessed must not be printed as one that was measured.
 *
 * THE LICENCE
 *
 * The data is © OpenStreetMap contributors, available under the ODbL.
 * That travels with the file and is printed on the site.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const CENTER = { lat: 13.7563, lon: 100.5018 };
const RADIUS_M = 1500;
const BOX = 6000;                    // metres, square
const TILE_M = 500;                  // the API's comfortable box
const MAX_BUILDINGS = 3500;
const OWN_BLOCK_M = 500;          // and every building on your own block
const TALL_KEEP_M = 100;             // every tower over this height is kept
const SIMPLIFY_M = 2.0;
const MIN_H = 2.5;
const MAX_H = 330;
const PAUSE_MS = 1200;

const CACHE = (() => {
  const i = process.argv.indexOf('--cache');
  const dir = i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : '/tmp/citymass-cache';
  return dir;
})();

const OUT = new URL('../citymass.js', import.meta.url);
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LON = 111320;

// ── The heights nobody measured ──────────────────────────────────
//
// OpenStreetMap knows the height of a few hundred buildings in Bangkok
// and the levels of rather more. The rest are guesses — so the
// guesses are made once, here, from the building's own type, and are
// counted in the report.
const TYPE_HEIGHT = {
  house: 6, detached: 6, semidetached_house: 6, terrace: 8, residential: 12,
  apartment: 18, dormitory: 12, hotel: 22, retail: 7, commercial: 12,
  office: 20, industrial: 9, warehouse: 9, manufacture: 10, factory: 9,
  hospital: 20, school: 9, kindergarten: 6, university: 14, college: 12,
  church: 12, cathedral: 20, temple: 8, mosque: 12, shrine: 5, civic: 10,
  government: 12, public: 10, garage: 4, garages: 4, shed: 4, hut: 3,
  roof: 3, carport: 3, canopy: 4, greenhouse: 4, static_caravan: 3,
  kiosk: 3, yes: 8,
};
const DEFAULT_HEIGHT = 8;
const LEVELS_M = 3.2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── The grid ─────────────────────────────────────────────────────
const latSpan = BOX / 2 / M_PER_DEG_LAT;
const lonSpan = BOX / 2 / (M_PER_DEG_LON * Math.cos((CENTER.lat * Math.PI) / 180));
const MIN_LAT = CENTER.lat - latSpan;
const MAX_LAT = CENTER.lat + latSpan;
const MIN_LON = CENTER.lon - lonSpan;
const MAX_LON = CENTER.lon + lonSpan;
const rows = Math.ceil(BOX / TILE_M);
const cols = rows;

const tileKey = (i, j) => `${i}_${j}`;

// ── Fetching ─────────────────────────────────────────────────────
async function fetchTile(i, j) {
  const file = path.join(CACHE, `${tileKey(i, j)}.xml`);
  if (existsSync(file)) return { file, cached: true };
  const lon0 = MIN_LON + (i * TILE_M) / (M_PER_DEG_LON * Math.cos((CENTER.lat * Math.PI) / 180));
  const lon1 = MIN_LON + ((i + 1) * TILE_M) / (M_PER_DEG_LON * Math.cos((CENTER.lat * Math.PI) / 180));
  const lat0 = MIN_LAT + (j * TILE_M) / M_PER_DEG_LAT;
  const lat1 = MIN_LAT + ((j + 1) * TILE_M) / M_PER_DEG_LAT;
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${lon0.toFixed(7)},${lat0.toFixed(7)},${lon1.toFixed(7)},${lat1.toFixed(7)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'nonarkara.org build (city massing model)' },
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(file, body);
      return { file, cached: false };
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(2000 * attempt);
    }
  }
}

// ── Parsing ──────────────────────────────────────────────────────
//
// The OSM API's XML is machine-written and perfectly regular, so a
// careful tag reader is enough — and it keeps this file free of
// dependencies, which matters because CI runs it.
function parseOsm(xml) {
  // The API's nodes carry a long tail of attributes before lat/lon —
  // version, changeset, timestamp, user — and a node with tags is an
  // opening tag rather than a self-closing one. So the attributes are
  // read as attributes, in whatever order they come.
  const attr = (s, name) => {
    const m = s.match(new RegExp(`\\b${name}="([^"]*)"`));
    return m ? m[1] : null;
  };
  const nodes = new Map();
  for (const m of xml.matchAll(/<node\b([^>]*?)\/?>/g)) {
    const a = m[1];
    const id = attr(a, 'id');
    const lat = attr(a, 'lat');
    const lon = attr(a, 'lon');
    if (id === null || lat === null || lon === null) continue;
    nodes.set(Number(id), [+lat, +lon]);
  }
  const ways = [];
  for (const m of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
    const body = m[2];
    const id = attr(m[1], 'id');
    if (id === null) continue;
    const refs = [...body.matchAll(/<nd\b[^>]*\bref="(\d+)"[^>]*\/?>/g)].map((x) => Number(x[1]));
    const tags = {};
    for (const t of body.matchAll(/<tag\b[^>]*\bk="([^"]*)"[^>]*\bv="([^"]*)"[^>]*\/?>/g)) tags[t[1]] = t[2];
    ways.push({ id: Number(id), refs, tags });
  }
  const relations = [];
  for (const m of xml.matchAll(/<relation\b([^>]*)>([\s\S]*?)<\/relation>/g)) {
    const body = m[2];
    const id = attr(m[1], 'id');
    if (id === null) continue;
    const members = [...body.matchAll(/<member\b([^>]*)\/?>/g)].map((x) => ({
      type: attr(x[1], 'type'),
      ref: Number(attr(x[1], 'ref')),
      role: attr(x[1], 'role'),
    })).filter((x) => Number.isFinite(x.ref));
    const tags = {};
    for (const t of body.matchAll(/<tag\b[^>]*\bk="([^"]*)"[^>]*\bv="([^"]*)"[^>]*\/?>/g)) tags[t[1]] = t[2];
    relations.push({ id: Number(id), members, tags });
  }
  return { nodes, ways, relations };
}

// ── Geometry, in metres about the centre ────────────────────────
const toXY = (lat, lon) => [
  (lon - CENTER.lon) * M_PER_DEG_LON * Math.cos((CENTER.lat * Math.PI) / 180),
  -(lat - CENTER.lat) * M_PER_DEG_LAT,     // -z is north
];

function shoelace(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j][0] * pts[i][1]) - (pts[i][0] * pts[j][1]);
  }
  return Math.abs(a) / 2;
}

/** Douglas–Peucker on an open chain: the ends always survive. */
function simplifyOpen(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxD = 0;
    let index = -1;
    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-9;
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > maxD) { maxD = d; index = i; }
    }
    if (maxD > tol && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/**
 * Douglas–Peucker on a CLOSED ring.
 *
 * A building's outline is a loop, and the loop's first and last points
 * are the same point. Running the open-chain algorithm on that treats
 * the whole ring as one degenerate segment from a point to itself, and
 * every point of every building collapses to two — which is how a bake
 * of eleven thousand buildings once produced nine.
 *
 * So the ring is cut at the point furthest from its first point and
 * simplified as two chains, each of which runs the long way round.
 */
function simplify(points, tol) {
  let pts = points;
  if (pts.length > 1
    && Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 1e-6
    && Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 1e-6) {
    pts = pts.slice(0, -1);
  }
  if (pts.length < 4) return points;
  let anchor = 0;
  let far = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (d > far) { far = d; anchor = i; }
  }
  const chainA = pts.slice(0, anchor + 1);
  const chainB = pts.slice(anchor).concat([pts[0]]);
  const out = simplifyOpen(chainA, tol).concat(simplifyOpen(chainB, tol).slice(1));
  return out.length >= 3 ? out : points;
}

// ── Heights ─────────────────────────────────────────────────────
function heightOf(tags, stats) {
  if (tags.height) {
    const v = parseFloat(String(tags.height).replace(/[^\d.\-]/g, ''));
    if (Number.isFinite(v) && v > 0) { stats.fromHeight++; return v; }
  }
  if (tags['building:levels']) {
    const v = parseFloat(String(tags['building:levels']).replace(/[^\d.\-]/g, ''));
    if (Number.isFinite(v) && v > 0) { stats.fromLevels++; return v * LEVELS_M; }
  }
  const type = tags.building;
  const def = TYPE_HEIGHT[type];
  if (def) { stats.fromType++; return def; }
  stats.fromDefault++;
  return DEFAULT_HEIGHT;
}

// ── The build ────────────────────────────────────────────────────
const seen = new Map();          // way id → building
const failed = [];
let tiles = 0;

for (let j = 0; j < rows; j++) {
  for (let i = 0; i < cols; i++) {
    let got;
    try {
      got = await fetchTile(i, j);
    } catch (err) {
      failed.push(`${i},${j} (${err.message})`);
      console.error(`  tile ${i},${j}: ${err.message}`);
      continue;
    }
    tiles++;
    if (!got.cached) await sleep(PAUSE_MS);
    const xml = readFileSync(got.file, 'utf8');
    const { nodes, ways, relations } = parseOsm(xml);

    const stats = { fromHeight: 0, fromLevels: 0, fromType: 0, fromDefault: 0 };

    for (const way of ways) {
      const t = way.tags;
      if (!t || !t.building) continue;
      if (t.building === 'no' || t.building === 'roof' || t.building === 'part') continue;
      if (way.refs.length < 3) continue;
      const pts = [];
      for (const ref of way.refs) {
        const n = nodes.get(ref);
        if (!n) { pts.length = 0; break; }
        pts.push(toXY(n[0], n[1]));
      }
      if (pts.length < 3) continue;
      seen.set(way.id, { pts, tags: t, height: heightOf(t, stats) });
    }

    for (const rel of relations) {
      const t = rel.tags;
      if (!t || !t.building) continue;
      if (t.building === 'no' || t.building === 'roof' || t.building === 'part') continue;
      const outer = rel.members.filter((m) => m.type === 'way' && m.role === 'outer');
      if (!outer.length) continue;
      // The first outer ring of a multipolygon. A relation with several
      // outers is a building with a courtyard or a courtyard building;
      // the ring we keep is the outer wall, which is what the massing
      // shows anyway.
      const way = ways.find((w) => w.id === outer[0].ref);
      if (!way || way.refs.length < 3) continue;
      const pts = [];
      for (const ref of way.refs) {
        const n = nodes.get(ref);
        if (!n) { pts.length = 0; break; }
        pts.push(toXY(n[0], n[1]));
      }
      if (pts.length < 3) continue;
      seen.set(`r${rel.id}`, { pts, tags: t, height: heightOf(t, stats) });
    }
  }
}

const all = [...seen.values()];
console.log(`\ntiles: ${tiles} fetched${failed.length ? `, ${failed.length} FAILED` : ''}`);
console.log(`buildings seen: ${all.length}`);

// ── Keep the massing ────────────────────────────────────────────
for (const b of all) {
  b.h = Math.max(MIN_H, Math.min(MAX_H, b.height));
  b.simplified = simplify(b.pts, SIMPLIFY_M);
  b.area = shoelace(b.simplified);
}
const usable = all.filter((b) => b.simplified.length >= 3 && b.area > 0);
usable.sort((a, b) => (b.area * b.h) - (a.area * a.h) || b.h - a.h || b.area - a.area);

// The massing, AND your own block.
//
// The ranking keeps the city's bones — the towers and the big blocks.
// But the block you are standing on has to be there too, at every zoom:
// from the top of the estate you are looking at a metre of shophouse,
// and a model that has quietly dropped it is a model of a different
// place.
const kept = [];
const taken = new Set();
for (const b of usable) {
  if (taken.has(b)) continue;
  if (kept.length >= MAX_BUILDINGS && b.h < TALL_KEEP_M) continue;
  kept.push(b);
  taken.add(b);
}
for (const b of usable) {
  if (taken.has(b)) continue;
  const near = Math.hypot(b.simplified[0][0], b.simplified[0][1]);
  if (near <= OWN_BLOCK_M) { kept.push(b); taken.add(b); }
}
// Deterministic order: by height, then by position.
kept.sort((a, b) => b.h - a.h
  || (a.simplified[0][1] - b.simplified[0][1])
  || (a.simplified[0][0] - b.simplified[0][0]));

// The tallest building, QUANTISED the way the pack quantises it — so
// the number the site reads back is the number the site prints.
const MAXH = Math.round(kept.reduce((m, b) => Math.max(m, b.h), 0) * 4) / 4;

// The model's true extent.
//
// A building whose outline crosses the edge of the baked box is NOT
// clipped: the API returns the whole way, so the footprint is whole,
// and the city reaches past the box it was fetched in. The radius the
// site publishes is therefore the distance to the farthest building
// that is really there — not the half-width of the query.
const extent = kept.reduce((m, b) => {
  let cx = 0, cz = 0;
  for (const p of b.simplified) { cx += p[0]; cz += p[1]; }
  cx /= b.simplified.length; cz /= b.simplified.length;
  return Math.max(m, Math.hypot(cx, cz));
}, 0);
const RADIUS = Math.ceil(extent / 100) * 100;

// ── Pack ─────────────────────────────────────────────────────────
//
// Per building: uint16 point count, uint16 height x4, then the ring's
// points as int16 pairs in quarter-metres about the centre.
const records = [];
for (const b of kept) {
  const n = b.simplified.length;
  const bytes = Buffer.alloc(4 + n * 4);
  bytes.writeUInt16LE(n, 0);
  bytes.writeUInt16LE(Math.round(b.h * 4), 2);
  b.simplified.forEach((p, i) => {
    const o = 4 + i * 4;
    bytes.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(p[0] / 0.25))), o);
    bytes.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(p[1] / 0.25))), o + 2);
  });
  records.push(bytes);
}
const packed = Buffer.concat(records);

// ── The file ─────────────────────────────────────────────────────
const day = new Date().toISOString().slice(0, 10);
const body = `// ═══════════════════════════════════════════════════════════════════════════
// THE CITY MASSING — Bangkok, as it actually stands.
//
// GENERATED FILE — do not edit by hand.
//   node tools/build-citymass.mjs
//
// The real building footprints and heights of central Bangkok, taken
// from OpenStreetMap and baked down to the massing: the largest
// ${kept.length} buildings by footprint-times-height, plus every building over
// ${TALL_KEEP_M} metres, which are the towers that make a skyline.
//
//   Building footprints, heights and positions: © OpenStreetMap
//   contributors, available under the Open Database Licence (ODbL) —
//   https://www.opdb.org/
//   Retrieved from https://api.openstreetmap.org/api/0.6/map on ${day}.
//
// The heights are NOT all measured. OpenStreetMap knows the height of
// some of these buildings and the number of floors of rather more; the
// rest are estimated from the building's type (${DEFAULT_HEIGHT} m for an
// unknown type, ${LEVELS_M} m per floor where floors are known). The
// site says so, where it shows the model.
//
// Packed, little-endian: per building a uint16 point count, a uint16
// height in quarter-metres, then the ring's points as int16 pairs in
// quarter-metres about the centre. ${(packed.length / 1024).toFixed(1)} KB of base64
// for the whole model.
//
// The point of this file is that the ground you stand on is the real
// city, and it does not need anybody's server to be standing there.
// ═══════════════════════════════════════════════════════════════════════════

/** Where the model is centred — the estate's own site. */
export const MODEL_CENTER = { lat: ${CENTER.lat}, lon: ${CENTER.lon} };

/** The model's radius, in metres. */
export const MODEL_RADIUS_M = ${RADIUS};

/** The tallest building in the model, in real metres. */
export const MODEL_MAX_H = ${MAXH.toFixed(2)};

/** The packed model. */
export const PACKED =
${(packed.toString('base64').match(/.{1,110}/g) || []).map((l) => `  '${l}'`).join(' +\n')};

/**
 * Decode the model into the three arrays the renderer walks once:
 * the ring of every building, the ring's offsets, and its height.
 */
export function decodeCityModel() {
  const bin = atob(PACKED);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const offsets = [0];
  const heights = [];
  const points = [];
  let o = 0;
  while (o + 4 <= bytes.length) {
    const n = view.getUint16(o, true);
    const h = view.getUint16(o + 2, true) / 4;
    o += 4;
    for (let i = 0; i < n; i++) {
      points.push(view.getInt16(o, true) / 4, view.getInt16(o + 2, true) / 4);
      o += 4;
    }
    heights.push(h);
    offsets.push(points.length / 2);
  }
  return {
    count: heights.length,
    offsets: new Uint32Array(offsets),
    points: new Float32Array(points),
    heights: new Float32Array(heights),
  };
}
`;
writeFileSync(OUT, body);

// ── The report ───────────────────────────────────────────────────
console.log(`kept: ${kept.length} buildings (tallest ${MAXH.toFixed(1)} m)`);
console.log(`packed: ${(packed.length / 1024).toFixed(1)} KB → ${(body.length / 1024).toFixed(1)} KB as a file`);
console.log(`file: ${OUT.pathname}`);

// ── The proof: are these Bangkok's towers? ───────────────────────
const top = kept.slice().sort((a, b) => b.h - a.h).slice(0, 20);
console.log('\nthe twenty tallest in the model:');
for (const b of top) {
  const [x, z] = b.simplified[0];
  const lon = CENTER.lon + x / (M_PER_DEG_LON * Math.cos((CENTER.lat * Math.PI) / 180));
  const lat = CENTER.lat - z / M_PER_DEG_LAT;
  console.log(`  ${b.h.toFixed(1).padStart(6)} m  ${lat.toFixed(4)}, ${lon.toFixed(4)}  ${Math.round(b.area)} m²`);
}
if (failed.length) {
  console.log(`\nWARNING — ${failed.length} tile(s) could not be fetched: ${failed.join(', ')}`);
  console.log('The model has holes where those tiles are. Re-run to fill them.');
}
