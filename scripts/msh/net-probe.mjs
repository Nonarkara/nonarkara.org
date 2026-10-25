import { chromium } from '/Users/nonarkara/Projects/carbon/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:8784/index.html', { waitUntil: 'domcontentloaded' });

const test = async (label, url, init, budgetMs = 45000) => {
  const t0 = Date.now();
  try {
    const res = await Promise.race([
      fetch(url, init).then(async (r) => ({ status: r.status, body: (await r.text()).slice(0, 140) })),
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), budgetMs)),
    ]);
    console.log(`${label}: ${res.status} ${Date.now() - t0}ms :: ${res.body.slice(0, 120)}`);
  } catch (e) {
    console.log(`${label}: FAIL ${Date.now() - t0}ms :: ${e.message}`);
  }
};

await test('overpass-de', 'https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=[out:json][timeout:20];way(13.750,100.495,13.760,100.510)["highway"="primary"];out geom;',
});

await test('overpass-kumi', 'https://overpass.kumi.systems/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=[out:json][timeout:20];way(13.750,100.495,13.760,100.510)["highway"="primary"];out geom;',
});

await test('nominatim', 'https://nominatim.openstreetmap.org/search?q=Chiang+Main&format=json&limit=1', {});

await test('hyg-raw', 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/v3/hyg_v41.csv', {});

await browser.close();
