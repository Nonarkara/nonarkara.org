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
