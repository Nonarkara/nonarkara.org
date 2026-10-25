#!/usr/bin/env node
/**
 * OWN A PORT — start the measurement server on a port this run actually owns.
 *
 * Why this exists: the gates used to hard-code a port (8791, 8792). Other
 * projects on this machine held those ports with a Python http.server, so the
 * gate fetched *their* site, the assertions failed on someone else's HTML,
 * and the failure read like a defect in this repo. It was never a defect.
 *
 * Two guards, both mandatory:
 *
 *   1. The port must be free. We ask the OS for an ephemeral port by
 *      binding to 0, closing it, and using that number — then we race for
 *      it. If the server cannot bind, we try the next candidate.
 *   2. The served bytes must be OURS. We fetch /index.html and look for a
 *      marker string that exists in this repository and nowhere else on
 *      this machine. A port that answers with someone else's page is a
 *      failed port, not a passing test.
 *
 *   import { ownPort } from './scripts/msh/own-port.mjs';
 *   const site = await ownPort();           // { base, stop() }
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

/**
 * A string that appears in this repo's index.html and in no other project
 * on this machine. It is the receipt that the bytes we measured are ours.
 */
const MARKER = 'NON — Dr Non Arkaraprasertkul';

/** Ask the OS for a port nobody is using. */
function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/** Does this port answer with our page? */
async function servesOurs(base) {
  try {
    const res = await fetch(`${base}/index.html`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return false;
    const body = await res.text();
    return body.includes(MARKER);
  } catch (_) {
    return false;
  }
}

/**
 * Start the server on a port we own and confirm it is serving this repo.
 *
 * @param {object} [opts]
 * @param {number[]} [opts.candidates] ports to try first, in order
 * @param {number} [opts.tries] how many ephemeral ports to try
 * @returns {Promise<{base: string, port: number, stop: () => void}>}
 */
export async function ownPort(opts = {}) {
  const candidates = opts.candidates ? [...opts.candidates] : [];
  const tries = opts.tries ?? 6;

  for (let i = 0; i < tries; i++) candidates.push(await freePort());

  for (const port of candidates) {
    const child = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), String(port), ROOT], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let died = false;
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('exit', () => { died = true; });

    // Give the listener a moment, then prove the bytes are ours.
    const base = `http://127.0.0.1:${port}`;
    for (let t = 0; t < 50; t++) {
      await sleep(120);
      if (died) break;
      if (await servesOurs(base)) {
        return {
          base,
          port,
          stop() { child.kill(); },
        };
      }
    }

    // Not ours, or it never bound. Either way: this port is not available.
    if (process.env.OWN_PORT_DEBUG) {
      console.error(`  port ${port}: ${died ? 'server exited — ' + err.trim() : 'did not serve our page'}`);
    }
    child.kill();
    await sleep(80);
  }

  throw new Error(
    `could not own a port: none of ${candidates.join(', ')} served ${JSON.stringify(MARKER)}`,
  );
}

// Run directly: print the base URL and hold the port open.
if (import.meta.url === `file://${process.argv[1]}`) {
  const site = await ownPort();
  console.log(site.base);
  process.on('SIGINT', () => { site.stop(); process.exit(0); });
  await new Promise(() => {});
}
