import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

// Public project destinations presented on axiom.nonarkara.org as of
// 2026-10-07. This catches the quiet failure where the portfolio site
// grows but the personal site's all-projects screen does not.
const AXIOM_LINKS = [
  'https://flood-ami.pages.dev/',
  'https://sikhio.nonarkara.org/',
  'https://lcbcity.pages.dev/dashboard',
  'https://phuket.nonarkara.org/war-room',
  'https://hcmc.nonarkara.org',
  'https://mtt-super-dashboard-v2.pages.dev/',
  'https://kuching.nonarkara.org',
  'https://chula.nonarkara.org/',
  'https://chonburi-control-tower.pages.dev',
  'https://kmitl-control-tower.pages.dev/',
  'https://yala-control-tower.pages.dev/',
  'https://city-hub.pages.dev/',
  'https://air.nonarkara.org/',
  'https://atlas.nonarkara.org/',
  'https://slic.nonarkara.org',
  'https://global.nonarkara.org/',
  'https://conflict.nonarkara.org/',
  'https://siam-markets.pages.dev/',
  'https://sciti.nonarkara.org',
  'https://bus.nonarkara.org',
  'https://cdp.nonarkara.org',
  'https://nsp.nonarkara.org/',
  'https://github.com/agentic-ai-research/dr-non-diy-ai-council',
  'https://github.com/agentic-ai-research/second-brain-os',
  'https://horizon-field-lab.pages.dev/',
  'https://ascn-smart-cities-network.pages.dev/',
  'https://dao.nonarkara.org/',
  'https://github.com/nonarkara/ikigai-finance-engine',
  'https://github.com/Nonarkara/FloodDash-Blueprint',
  'https://ekkasarn-ai.pages.dev/',
  'https://nonwriter.nonarkara.org/',
  'https://news.nonarkara.org/',
  'https://nonscrape.nonarkara.org/',
  'https://watch-1de.pages.dev/',
  'https://luma-house.pages.dev/',
  'https://solomon.nonarkara.org',
  'https://scl.nonarkara.org/',
  'https://depa-usdot.nonarkara.org/',
  'https://bit.ly/flooddashthai',
  'https://nst.nonarkara.org/',
  'https://lopburi.nonarkara.org/lopburi',
  'https://malaysia.nonarkara.org/',
  'https://bkk.nonarkara.org/',
  'https://globalmonitor.nonarkara.org/',
  'https://asia.nonarkara.org/',
  'https://mem.nonarkara.org/',
  'https://day2.nonarkara.org/',
  'https://carbon.nonarkara.org/?lang=th',
  'https://open.spotify.com/show/0342w6de0LJk5wXCSNCqa3?si=jGar41OPTHak-43L2ltq9w',
  'https://games.nonarkara.org/',
  'https://github.com/Nonarkara/dr-non-openclaw-setup',
  'https://shophouses.nonarkara.org/',
  'https://shanghai.nonarkara.org/',
  'https://rag.nonarkara.org/',
  'https://champion.nonarkara.org/',
  'https://soccer.nonarkara.org/',
  'https://vision.nonarkara.org/',
  'https://each.nonarkara.org/',
  'https://colors.nonarkara.org/',
  'https://github.com/Nonarkara/Axiom-Design-Core',
  'https://github.com/Nonarkara/Rams-NYCTA-Design-Core',
  'https://github.com/Nonarkara/dr-non-luggage-tag-aesthetic',
  'https://github.com/Nonarkara/moma-rules',
  'https://otop.pages.dev/',
  'https://superleague-xxd.pages.dev/#/lobby',
];

for (const url of AXIOM_LINKS) assert(app.includes(url), `missing Axiom project: ${url}`);
assert(app.includes('<span class="title">${p.title}</span>'), 'plan must show project titles');
assert(app.includes("url: 'https://blog.nonarkara.org/'"), 'canonical Dr Non archive belongs in the work index');
assert(app.includes("url: 'https://sabaisabai-airdnd.pages.dev/'"), 'Sabai Sabai belongs in the all-projects index');
const projectBlock = app.match(/const PROJECTS = \[([\s\S]*?)\n\];/)?.[1] || '';
assert.equal((projectBlock.match(/\{ code:/g) || []).length, 82,
  'the complete project registry stays intact');
assert.equal((app.match(/makeSabaiCup\(/g) || []).length, 4,
  'Sabai Sabai should be discoverable in Pavilion, Glass House and Farnsworth House');

console.log(`project links: ${AXIOM_LINKS.length} Axiom destinations · 82 total · Sabai Sabai in 3 houses`);
