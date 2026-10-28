// Does the vendored probe see the falsifier's fixture?
// Runs the probe straight in the page — no harness, no settle deadline — so
// the answer is about the probe, not about the clock.
import { loadChromium } from './playwright.mjs';
const chromium = await loadChromium();
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import path from 'node:path';

const REPO = process.cwd();
const BASE = process.argv[2] || 'http://127.0.0.1:8786';
const WORK = path.join(REPO, '.msh-fixture');
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
for (const f of ['index.html', 'app.js', 'styles.css', 'sw.js']) {
  cpSync(path.join(REPO, f), path.join(WORK, f));
}

const FIXTURES = {
  dead: `<div class="sl-dead" style="display:flex;flex-direction:column">
<div class="sl-dead-a" style="height:24px;background:#d8d8d8"></div>
<div class="sl-dead-b" style="height:24px;background:#d8d8d8;margin-top:260px"></div>
</div>`,
  wrap: `<nav class="sl-wrap" style="display:flex;flex-wrap:wrap;gap:10px;width:170px">
<a class="sl-wrap-a" href="#sl" style="flex:0 0 70px">One</a>
<a class="sl-wrap-b" href="#sl" style="flex:0 0 70px">Two</a>
<a class="sl-wrap-c" href="#sl" style="flex:0 0 70px">Three</a>
</nav>`,
};

const MOUNTER = `<script id="__sl_mounter__">
(function () {
  var HTML = __HTML__;
  function mount() {
    var m = document.querySelector("main#content") || document.querySelector("main") || document.body;
    if (!m) return;
    var existing = document.getElementById("__sl_fixture__");
    if (existing && existing.parentElement === m) return;
    if (existing) existing.remove();
    var t = document.createElement("template");
    t.innerHTML = HTML;
    var wrap = document.createElement("div");
    wrap.id = "__sl_fixture__";
    wrap.style.display = "contents";
    while (t.content.firstChild) wrap.appendChild(t.content.firstChild);
    m.appendChild(wrap);
  }
  function start() { mount(); setTimeout(mount, 60); setTimeout(mount, 140); setTimeout(mount, 200); }
  if (document.readyState === "complete") setTimeout(start, 0);
  else addEventListener("load", function () { setTimeout(start, 0); });
})();
</script>`;

const which = process.argv[3] || 'dead';
const PAGE = path.join(WORK, 'index.html');
const ORIGINAL = readFileSync(PAGE, 'utf8');
const mounter = MOUNTER.replace('__HTML__', JSON.stringify(FIXTURES[which]));
const m3 = /<\/body\s*>/i.exec(ORIGINAL);
writeFileSync(PAGE, m3 ? ORIGINAL.slice(0, m3.index) + '\n' + mounter + '\n' + ORIGINAL.slice(m3.index) : ORIGINAL + mounter);

const PROBE = readFileSync(path.join(REPO, 'scripts/spatial/spatial-probe.js'), 'utf8');

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
         '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(BASE + '/.msh-fixture/', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(3500);

const state = await page.evaluate(() => {
  const w = document.getElementById('__sl_fixture__');
  const d = document.querySelector('.sl-dead');
  const a = document.querySelector('.sl-dead-a');
  const b = document.querySelector('.sl-dead-b');
  const r = el => { if (!el) return null; const x = el.getBoundingClientRect(); return { t: Math.round(x.top), b: Math.round(x.bottom), h: Math.round(x.height), w: Math.round(x.width) }; };
  return {
    mounted: !!w, parent: w ? w.parentElement.tagName : null,
    dead: !!d, deadRect: r(d), aRect: r(a), bRect: r(b),
    bodyKids: document.body.children.length,
    bodyH: Math.round(document.body.getBoundingClientRect().height),
    docH: document.documentElement.scrollHeight,
    view: document.body.dataset.view || null,
  };
});
console.log('state:', JSON.stringify(state));
console.log('errors:', errs.slice(0, 4));

await page.evaluate(PROBE);
const rec = await page.evaluate(() => {
  const r = window.__SPATIAL_MEASURE__('/', 1440, document);
  return { findings: r.findings.map(f => f.kind + ' ' + f.sel + ' :: ' + f.detail), chars: r.chars };
});
console.log('chars:', rec.chars);
console.log('findings:');
for (const f of rec.findings) console.log('  ·', f);

await browser.close();
