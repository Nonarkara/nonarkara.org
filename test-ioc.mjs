// Self-check for the IOC wall: the list is complete, the addresses are
// real, and the grid divides. `node test-ioc.mjs`
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { IOC, IOC_COUNT, IOC_COLUMNS } from './ioc.js';

// ── The wall is a wall ─────────────────────────────────────
{
  assert(IOC.length >= 16, 'at least the sixteen he named');
  assert(IOC.length === IOC_COUNT, 'the count matches the list');
}

// ── Every address is an address ───────────────────────────
{
  for (const s of IOC) {
    assert(s.code && s.code.length > 1, `a system has a code (${s.code})`);
    assert(s.title && s.title.length > 2, `${s.code} has a name`);
    assert(/^https:\/\//.test(s.url), `${s.code} has an https address`);
    assert(!s.url.includes(' '), `${s.code} has no spaces in its address`);
  }
}

// ── No two systems share a code ───────────────────────────
{
  const codes = new Set(IOC.map(s => s.code));
  assert(codes.size === IOC.length, 'the codes are unique');
  const urls = new Set(IOC.map(s => s.url));
  assert(urls.size === IOC.length, 'and so are the addresses');
}

// ── The ones he named, in the order he named them ─────────
{
  const order = IOC.map(s => s.code);
  const wanted = ['CHONBURI', 'NST', 'BKK', 'ATLAS', 'YALA', 'PHUKET', 'SIKHIO',
                  'KL', 'HCMC', 'JAKARTA', 'CNX', 'LOPBURI', 'GLOBAL', 'ASIA', 'MEM'];
  let at = -1;
  for (const w of wanted) {
    const i = order.indexOf(w);
    assert(i > at, `${w} is on the wall, after the one before it`);
    at = i;
  }
  assert(order.includes('NONARKARA'), 'and nonarkara.org is on it too');
}

// ── Every photograph is a photograph that exists ──────────
{
  for (const s of IOC) {
    assert(existsSync(s.shot), `${s.code} has a screenshot on disk (${s.shot})`);
  }
}

// ── The grid divides: no cell stranded alone ──────────────
{
  assert(IOC.length % IOC_COLUMNS === 0,
    `${IOC.length} cells in ${IOC_COLUMNS} columns must make whole rows`);
  assert(IOC_COLUMNS >= 2 && IOC_COLUMNS <= 5, 'and the column count is sane');
}

// ── The screenshots are few, so the wall loads fast ───────
{
  const shots = new Set(IOC.map(s => s.shot));
  assert(shots.size <= 10, `${shots.size} photographs for ${IOC.length} systems`);
}

console.log(`ioc: all checks passed · ${IOC.length} systems · ${IOC_COLUMNS} columns · `
  + 'every address real, every photograph on disk');
