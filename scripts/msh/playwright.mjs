/**
 * Resolve Playwright without a static import of one machine's filesystem.
 *
 * test-door.mjs and scripts/msh/overlap.mjs are real gates. They used to
 * import `/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs`
 * as a module specifier. Node resolves that before any line of the test
 * runs, so the GitHub Actions runner died with ERR_MODULE_NOT_FOUND and
 * the Pages deploy never started.
 *
 * Order:
 *   1. the `playwright` package, if this checkout (or CI) installed it
 *   2. $PLAYWRIGHT_PATH, when it points at playwright/index.mjs
 *   3. the carbon checkout, only when that file is actually on disk
 *
 * The carbon path is a string, not an import. On a machine where the file
 * is absent it is skipped, which is what the runner needs.
 */

import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CARBON_PLAYWRIGHT = '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

async function fromSpecifier(specifier) {
  const pw = await import(specifier);
  if (!pw.chromium) throw new Error(`${specifier} has no chromium export`);
  return pw.chromium;
}

export async function loadChromium() {
  try {
    return await fromSpecifier('playwright');
  } catch (err) {
    if (err?.code !== 'ERR_MODULE_NOT_FOUND') throw err;
  }

  const candidates = [process.env.PLAYWRIGHT_PATH, CARBON_PLAYWRIGHT];
  for (const file of candidates) {
    if (!file || !existsSync(file)) continue;
    return await fromSpecifier(pathToFileURL(file).href);
  }

  throw new Error(
    'Playwright is not installed. From a checkout: npm i -D playwright && npx playwright install chromium. ' +
    'Or set PLAYWRIGHT_PATH to playwright/index.mjs. See ANTI-SLOP.md.',
  );
}

/**
 * A Chrome to measure with, on whatever machine this is running on.
 *
 * The gates used to name /Applications/Google Chrome.app outright — a
 * path that exists on one laptop and nowhere else. On the GitHub
 * runner the test died with "executable doesn't exist", and because
 * the deploy step runs AFTER the tests, the deploy died with it: the
 * site could not ship, and the failure read like a broken build rather
 * than a hard-coded path.
 *
 * The order:
 *   1. $CHROME_EXEC, when it is set and it is really on disk
 *   2. a system Chrome, on any platform
 *   3. nothing — and then Playwright's own Chromium, which is what the
 *      CI runner installs and what the bundled browser is for
 */
export function chromeExecutable() {
  const explicit = process.env.CHROME_EXEC;
  if (explicit && existsSync(explicit)) return explicit;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/lib/chromium/chromium',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return undefined;
}
