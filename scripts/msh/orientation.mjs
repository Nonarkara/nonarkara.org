#!/usr/bin/env node
/**
 * GROUND ORIENTATION — is the plate the right way round?
 *
 * The old suite claimed to catch "a north/south sign flip, which produces a
 * map that looks perfectly plausible and is mirrored" — and then only tested
 * tileXY's arithmetic, which is not where a mirror can hide. The mirror
 * hides in the last mile: the plane's rotation, the texture's flipY, and the
 * tile's placement. All three can be right while the picture is upside down.
 *
 * So this test renders the real thing. It loads the app, lets the real tiles
 * arrive, renders one tile's quad from straight above with north up and east
 * right, and compares the pixels against the source tile fetched from the
 * same edge.
 *
 * If the render matches the tile, the map is the map. If it matches the
 * mirror, the map is a plausible-looking lie — and the test says so.
 *
 * Usage: node scripts/msh/orientation.mjs [--url http://127.0.0.1:8784/index.html]
 */

import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';
import { writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i === -1 ? d : argv[i + 1];
};
const URL_ = arg('url', 'http://127.0.0.1:8784/index.html');

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

await page.goto(URL_, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.evaluate(() => document.getElementById('door-guest')?.click());
await page.waitForTimeout(2500);
// Look down, so the ground loads its tiles.
await page.evaluate(() => document.getElementById('ground-hint')?.click());
await page.waitForTimeout(7000);

const result = await page.evaluate(async () => {
  const group = window.__groundGroup;
  if (!group) return { ok: false, why: 'no ground group' };

  // The tile quads: the meshes that carry a texture.
  const quads = group.children.filter((c) => /\/\d+\/\d+\/\d+\.png$/.test(c.material?.map?.image?.src || ''));
  if (!quads.length) return { ok: false, why: 'no tile textures loaded' };

  const THREE = await import('three');
  const scene = group.parent;
  const TILE = 256;

  // The middle of the grid is the tile the visitor is standing on — the one
  // with the most detail on it.
  const q = quads[Math.floor(quads.length / 2)];
  const src = q.material.map.image.src;
  const tileUrl = src.replace(/^https?:\/\/[^/]+\//, 'https://tile.openstreetmap.org/');
  const span = q.scale.x;
  const cx = group.position.x + q.position.x;
  const cz = group.position.z + q.position.z;

  // Render just that quad, from straight above: north up, east right.
  const saved = scene.children.map((c) => c.visible);
  scene.children.forEach((c) => { c.visible = (c === group); });
  const savedBg = scene.background;
  scene.background = null;
  const savedOpacity = quads.map((x) => x.material.opacity);

  const canvas = document.createElement('canvas');
  canvas.width = TILE; canvas.height = TILE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(TILE, TILE, false);
  renderer.setClearColor(0x000000, 0);

  const cam = new THREE.OrthographicCamera(-span / 2, span / 2, span / 2, -span / 2, 1, 10000);
  cam.position.set(cx, group.position.y + 2000, cz);
  cam.rotation.set(-Math.PI / 2, 0, 0);   // straight down; up vector = −z = north
  cam.updateMatrixWorld();

  quads.forEach((x) => { x.material.opacity = 1; });
  renderer.render(scene, cam);

  const gl = renderer.getContext();
  const diag = {
    bufferW: gl.drawingBufferWidth, bufferH: gl.drawingBufferHeight,
    canvasW: canvas.width, canvasH: canvas.height, span,
  };
  const raw = new Uint8Array(TILE * TILE * 4);
  gl.readPixels(0, 0, TILE, TILE, gl.RGBA, gl.UNSIGNED_BYTE, raw);
  // WebGL hands back rows bottom-up; the world is top-down.
  const render = new Uint8ClampedArray(TILE * TILE * 4);
  for (let y = 0; y < TILE; y++) {
    const s = (TILE - 1 - y) * TILE * 4, d = y * TILE * 4;
    for (let x = 0; x < TILE * 4; x++) render[d + x] = raw[s + x];
  }

  scene.children.forEach((c, i) => { c.visible = saved[i]; });
  scene.background = savedBg;
  quads.forEach((x, i) => { x.material.opacity = savedOpacity[i]; });
  renderer.dispose();

  // The source tile, fetched from the same edge the map used.
  const res = await fetch(tileUrl, { mode: 'cors' });
  if (!res.ok) return { ok: false, why: 'tile fetch ' + res.status };
  const bmp = await createImageBitmap(await res.blob());
  const c2 = document.createElement('canvas');
  c2.width = TILE; c2.height = TILE;
  const ctx = c2.getContext('2d');
  ctx.drawImage(bmp, 0, 0, TILE, TILE);
  const truth = ctx.getImageData(0, 0, TILE, TILE).data;

  const ncc = (a, b, t) => {
    const pa = [], pb = [];
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        // The transform applies to the SOURCE tile only. Applying it to
        // both arrays compares the tile with itself and proves nothing.
        const s = t ? t(x, y) : { x, y };
        pa.push(a[(y * TILE + x) * 4]);
        pb.push(b[(s.y * TILE + s.x) * 4]);
      }
    }
    const ma = pa.reduce((x, y) => x + y, 0) / pa.length;
    const mb = pb.reduce((x, y) => x + y, 0) / pb.length;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < pa.length; i++) {
      const x = pa[i] - ma, y = pb[i] - mb;
      num += x * y; da += x * x; db += y * y;
    }
    const d = Math.sqrt(da * db);
    return d > 0 ? num / d : 0;
  };

  const scores = {
    plain: ncc(render, truth),
    mirroredEW: ncc(render, truth, (x, y) => ({ x: TILE - 1 - x, y })),
    mirroredNS: ncc(render, truth, (x, y) => ({ x, y: TILE - 1 - y })),
    rot180: ncc(render, truth, (x, y) => ({ x: TILE - 1 - x, y: TILE - 1 - y })),
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  const dump = (arr) => {
    let s = '';
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const i = (y * TILE + x) * 4;
        s += String.fromCharCode(arr[i], arr[i + 1], arr[i + 2]);
      }
    }
    return btoa(s);
  };
  return {
    ok: true, tile: tileUrl.split('/').slice(-3).join('/'), diag, scores, best: best[0],
    renderB64: dump(render), truthB64: dump(truth),
  };
});

await browser.close();

if (process.env.DUMP && result.renderB64) {
  for (const [name, b64] of [['render', result.renderB64], ['truth', result.truthB64]]) {
    writeFileSync(`/tmp/orient-${name}.rgb`, Buffer.from(b64, 'base64'));
  }
  console.log('dumped /tmp/orient-*.rgb');
}
console.log(JSON.stringify({ ...result, renderB64: undefined, truthB64: undefined, errors }, null, 2));

const fail = (m) => { console.error('FAIL: ' + m); process.exit(1); };
if (!result.ok) fail(result.why);
if (result.scores.plain < 0.90) {
  fail(`the plate does not match the tile it claims to be (plain NCC ${result.scores.plain.toFixed(3)}; ` +
       `closest alternative ${result.best}). The map is drawn the wrong way round.`);
}
if (result.best !== 'plain') {
  fail(`the plate matches "${result.best}" rather than the tile itself — the map is mirrored or flipped.`);
}
console.log(`OK: the plate renders ${result.tile} the right way round (NCC ${result.scores.plain.toFixed(3)}).`);
