// Guest first paint + host fleet luggage tag. v4.42.
// Also locks the tilt-to-zoom and deferred phone boot this face sits on.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

assert(html.includes('builds city systems that run'), 'guest first paint states the civic line');
assert(html.includes('https://flood.nonarkara.org'), 'FloodDash public door');
assert(html.includes('https://slic.nonarkara.org'), 'SLIC public door');
assert(html.includes('https://axiom.nonarkara.org'), 'Axiom public door');
assert(!html.includes('53 projects'), 'stale project-count meta is gone');
assert(!/business card/i.test(html), 'stale business-card meta is gone');
assert(html.includes('class="route-stamp"'), 'BKK route stamp is on the guest overlay');

assert(app.includes("const WALL_ORDER = ['FLOOD', 'SLIC', 'AXIOM', 'BKKX', 'ATLAS', 'DAYTRADERS', 'NOVELS', 'FLOOD BP']"),
  'wall scan order leads with the 2026 systems');
assert(app.includes("mark: 'watch'") && app.includes('not an official warning'),
  'FloodDash is labeled a citizen watch, not an official warning');
assert(app.includes("mark: 'blueprint'"), 'blueprint is an honest mark');
assert(app.includes("mark: 'writing'"), 'novels are labeled writing');
assert(app.includes('class="fleet-dest"') && app.includes('class="fleet-code"'),
  'fleet station has a destination and a mono id');
assert(app.indexOf('class="fleet-dest"') < app.indexOf('class="fleet-code"'),
  'system name comes before the mono id');
assert(app.includes('data-state="pipeline"') && !app.includes('fleet-dot'),
  'pipeline rows carry no status dot; the rail is the only colour');
assert(css.includes('.fleet-stn[data-state="pipeline"]') && css.includes('border-left-color: transparent'),
  'no probe means no coloured rail');
assert(css.includes('.fleet-stn[data-state="down"] { border-left-color: var(--amber); }'),
  'down is the loud rail');
assert(css.includes('.fleet-stn[data-state="up"] { border-left-color: var(--fg); }'),
  'up keeps a quiet rail');

assert(app.includes("if (params.has('guest')) return 'room'"), '?guest opens the pavilion');
assert(app.includes("if (params.has('host')) return 'plan'"), '?host opens NON OS');
assert(app.includes('function pitchFromBeta'), 'Pokémon GO tilt mapping stays');
assert(app.includes('setAutoZoomForPitch'), 'ground tilt-to-zoom stays');
assert(app.includes('requestAnimationFrame(animate)'), 'phone boot stays deferred');
assert(app.includes("const NON_VERSION = '4.42'"), 'civic face is stamped 4.42');

console.log('civic 2026: guest line · luggage-tag fleet · tilt and boot still present');
