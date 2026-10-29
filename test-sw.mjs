// Self-check for the service worker's two lists.
//
// THE CLASS OF BUG THIS GUARDS
//
// The service worker fetches the app's own code network-first and
// everything else cache-first. A module that is missing from the CODE
// list is therefore cache-first: the first visit fetches it and the
// runtime cache keeps it, and from then on a change to that file is
// invisible for as long as the cache entry lives — hours, sometimes.
//
// It looks like "none of my work was committed" while curl shows the
// new build live. That is the failure this list exists to prevent, and
// it cannot be prevented by a list nobody checks.
//
// So: every module the site can load is in CODE, every path in CODE
// is a file that exists, and the cache version carries the app's own
// version number so a stale cache cannot outlive a release.
import assert from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// A leading slash in a file: URL means the FILESYSTEM ROOT, not this
// directory. Every path here is site-relative, so it is joined, not
// resolved.
const onDisk = (p) => existsSync(path.join(ROOT, p));

const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

const listOf = (name) => {
  // CODE is a Set([...]), SHELL is a plain [...]. Find whichever form
  // the file uses, then read to the closing bracket of that list.
  const at = sw.indexOf(`const ${name} = `);
  assert(at >= 0, `sw.js has no ${name}`);
  const open = sw.indexOf('[', at);
  const end = sw.indexOf(']', open);
  // Strip the comments first. A line's comment is everything after the
  // first //, and the comments in this file contain apostrophes — the
  // door's own type — which a naive quote-matching reads as the start
  // of a string and then swallows half the list.
  const code = sw.slice(open, end)
    .split('\n')
    .map((line) => line.split('//')[0])
    .join('\n');
  return [...code.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

const CODE = new Set(listOf('CODE'));
const SHELL = listOf('SHELL');

// ── Every module the site can load is network-first ──────────────
{
  const modules = readdirSync(ROOT)
    .filter((f) => f.endsWith('.js') && f !== 'sw.js');
  const missing = modules.map((m) => `/${m}`).filter((p) => !CODE.has(p));
  assert.equal(missing.length, 0,
    `these modules are cache-first, so a change to them will not reach a returning visitor: ${missing.join(', ')}`);
}

// ── Every module in CODE is a file that exists ───────────────────
//
// A path in CODE that no longer exists is a 404 the worker will
// revalidate on every load, forever, for a file nobody asked for.
{
  const ghosts = [...CODE].filter((p) => p.endsWith('.js') && !onDisk(p));
  assert.equal(ghosts.length, 0, `the worker will look for files that do not exist: ${ghosts.join(', ')}`);
}

// ── The shell's files exist too ──────────────────────────────────
{
  const ghosts = SHELL.filter((p) => p.endsWith('.js') && !onDisk(p));
  assert.equal(ghosts.length, 0, `the shell precaches files that do not exist: ${ghosts.join(', ')}`);
}

// ── The cache version carries the app's version ───────────────────
//
// The worker and the app must agree on which release this is. When
// they disagree, a visitor keeps the old app while the page says it
// is new — which is the exact confusion the version stamp exists to
// prevent, and it cannot be fixed by a comment.
{
  const version = (app.match(/const NON_VERSION = '([^']+)'/) || [])[1];
  assert(version, 'app.js must declare a NON_VERSION');
  const cacheVersion = (sw.match(/const CACHE_VERSION = '([^']+)'/) || [])[1];
  assert(cacheVersion, 'sw.js must declare a CACHE_VERSION');
  assert(cacheVersion.includes(version),
    `the worker caches "${cacheVersion}" but the app is "${version}" — one of them is a release behind`);
}

// ── The worker is not the only place the version is written ───────
{
  // The service worker file itself is edge-cached for hours, so a
  // stale worker is a stale app. It is fetched with a cache-busting
  // query by the page, and that must still be true.
  const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert(/sw\.js\?v=/.test(index) || /serviceWorker\.register\([^)]*sw\.js/.test(index),
    'the page must register the worker with a version, or a stale worker outlives the release');
}

console.log(`service worker: ${CODE.size} code paths · ${SHELL.length} shell paths · version in step`);
