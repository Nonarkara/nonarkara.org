/**
 * Two snapshots, one question: did anything move?
 *
 *   node scripts/msh/geometry-diff.mjs <beforeDir> <afterDir>
 *
 * A tag change is supposed to be invisible. This says whether it was.
 *
 * The key is the element's IDENTITY — its class, its id, and which
 * element of that kind it is — and deliberately NOT its tag and NOT its
 * text. That is what makes this instrument useful: a heading that
 * replaced a div is the same element wearing a different hat, so it
 * shows up as "div → h1, and it did not move", instead of a deletion
 * and an addition that cancel out. The live clock is the same story:
 * it says a different number every second, and that is not a change in
 * the page.
 *
 * Exit code 0 = the two snapshots are the same page.
 * Exit code 1 = something moved, or appeared, or vanished.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const beforeDir = process.argv[2];
const afterDir = process.argv[3];
if (!beforeDir || !afterDir) {
  console.error('usage: geometry-diff.mjs <beforeDir> <afterDir>');
  process.exit(2);
}

/** The identity of an element: its class, its id, and the words it
 *  carries — with the digits taken out, because the clock says a
 *  different number every second and that is not a change in the page.
 *  Its order among its own kind settles the rest. */
function index(elements) {
  const seen = new Map();
  const out = new Map();
  for (const e of elements) {
    const words = (e.own || '').replace(/\d+/g, '#');
    const base = `${e.cls || '-'}|${e.id || '-'}|${words}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    out.set(`${base}#${n}`, e);
  }
  return out;
}

const files = readdirSync(beforeDir).filter((f) => f.endsWith('.json'));
if (!files.length) {
  console.error(`no snapshots in ${beforeDir}`);
  process.exit(2);
}

let moved = 0;
let added = 0;
let removed = 0;
let retagged = 0;

for (const f of files) {
  const before = JSON.parse(readFileSync(join(beforeDir, f), 'utf8'));
  let after;
  try {
    after = JSON.parse(readFileSync(join(afterDir, f), 'utf8'));
  } catch {
    console.log(`\n── ${before.route}: no "after" snapshot`);
    moved++;
    continue;
  }

  // Two snapshots are only comparable if they are of the SAME state. A
  // page whose sign is up and a page whose sign has been answered are
  // different screens; comparing them would report the difference
  // between two screens as a change in one.
  const sb = JSON.stringify(before.state || {});
  const sa = JSON.stringify(after.state || {});
  if (sb !== sa) {
    console.log(`\n── ${before.route}`);
    console.log(`  ⚠ THE PAGE WAS NOT IN THE SAME STATE`);
    console.log(`    before: ${sb}`);
    console.log(`    after:  ${sa}`);
    console.log('    not compared — these are two different screens.');
    continue;
  }

  const b = index(before.elements);
  const a = index(after.elements);
  const lines = [];

  for (const [key, be] of b) {
    const ae = a.get(key);
    if (!ae) {
      lines.push(`  REMOVED  ${key}  "${be.own.slice(0, 30)}"`);
      removed++;
      continue;
    }
    const dr = ['x', 'y', 'w', 'h']
      .map((k) => (Math.abs(be.rect[k] - ae.rect[k]) > 0.5 ? `${k} ${be.rect[k]}→${ae.rect[k]}` : null))
      .filter(Boolean);
    const dt = Object.keys(be.type)
      .filter((k) => be.type[k] !== ae.type[k])
      .map((k) => `${k} ${be.type[k]}→${ae.type[k]}`);
    const was = be.tag !== ae.tag;
    if (was) {
      lines.push(`  RETAGGED ${key}  ${be.tag} → ${ae.tag}  "${ae.own.slice(0, 30)}"`);
      retagged++;
    }
    if (dr.length || dt.length) {
      lines.push(`  MOVED    ${key}  "${ae.own.slice(0, 30)}"`);
      if (dr.length) lines.push(`             rect: ${dr.join(', ')}`);
      if (dt.length) lines.push(`             type: ${dt.join(', ')}`);
      moved++;
    }
  }
  for (const [key, ae] of a) {
    if (!b.has(key)) {
      lines.push(`  ADDED    ${key}  "${ae.own.slice(0, 30)}"`);
      added++;
    }
  }

  console.log(`\n── ${before.route}`);
  if (!lines.length) console.log('  identical');
  else for (const l of lines) console.log(l);
}

console.log(
  `\n${moved} moved · ${added} added · ${removed} removed · ${retagged} retagged` +
    (moved || added || removed ? '' : ' — the page is the same page.'),
);
process.exit(moved || added || removed ? 1 : 0);
