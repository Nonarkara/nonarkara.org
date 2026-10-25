#!/usr/bin/env node
/**
 * A PICTURE OF ONE ELEMENT — the fleet board, on screen, at a width.
 *
 * The receipt said the fleet board's station row breaks and strands one
 * station alone on the last line. Then the receipt stopped saying it. Both
 * of those are numbers; this is the thing itself.
 *
 *   node scripts/msh/shot-element.mjs --url ... --sel ".fleet-lines" --w 480 --out .msh6
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html?view=plan');
const SEL = arg('sel', '.fleet-lines');
const W = Number(arg('w', 1440));
const H = Number(arg('h', 1000));
const OUT = path.resolve(arg('out', '.msh6'));
const WAIT = Number(arg('wait', 6000));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(URL_, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(WAIT);

const el = await page.$(SEL);
if (!el) { console.error(`no element for ${SEL}`); process.exit(1); }
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const file = path.join(OUT, `fleet-${W}.png`);
await el.screenshot({ path: file });
console.log(file);
await browser.close();
