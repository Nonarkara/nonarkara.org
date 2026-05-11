import * as THREE from 'three';

// ════════════════════════════════════════════════════════
// WebGL fallback — detect support before building scene
// ════════════════════════════════════════════════════════
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (_) { return false; }
}
function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch (_) { return false; }
}
const WEBGL_OK = hasWebGL();
const WEBGL2_OK = hasWebGL2();
// If no WebGL, the boot screen will redirect to plan view after showing
// a brief message. The scene setup below will be skipped.


// ════════════════════════════════════════════════════════
// i18n
// ════════════════════════════════════════════════════════
const I18N = {
  en: {
    palace:  'a window to the mind',
    hint:    'tap any screen or object · drag to look around',
    contact: 'contact',
    cv_eyebrow:      'CV',
    cv_title:        'Curriculum Vitae',
    cv_cap:          'scan to download · or tap to open',
    cv_meta:         'cv.pdf · 3 pages · march 2026',
    li_eyebrow:      'LINKEDIN',
    li_title:        'Professional Network',
    li_cap:          'scan to view · or tap to open',
    contact_eyebrow: 'CONTACT',
    contact_title:   'Dr Non Arkara',
    contact_cap:     'scan to add to your contacts',
    contact_role:    'Senior Expert · Smart City Promotion',
    contact_org:     'Digital Economy Promotion Agency',
    password:        'password',
    music_eyebrow:   'NONSUNO · MUSIC',
    music_title:     'made on suno.ai',
    music_now:       'NOW PLAYING',
    music_count:     '10 tracks · made with suno',
    plan_status:     'fleet status',
    plan_projects:   'projects',
    plan_personal:   'personal',
    plan_world:      'world · time',
    plan_room:       '▦  enter room',
    plan_theme:      'theme',
    cv_title_short:  'curriculum vitae',
    li_title_short:  'professional network',
    co_title_short:  'contact · vCard',
    music_short:     'suno music · 10 tracks',
    pomo_short:      'pomodoro · 25 / 5',
    sabai_short:     'sabai sabai · easter egg',
    role:            'architect · anthropologist · smart cities',
    palace_sub:      'tap for contact · a window to the mind',
    philo_label:     'how this works',
    philo_p1:        'Most of the dashboards above refresh on a five-minute cron. To a person looking at one, that is indistinguishable from real-time, and it costs roughly nothing to run.',
    philo_p2_html:   'The ones that <span class="accent">charge for true real-time</span> charge for what real-time costs — cloud CPU, instrumented pipelines, on-call engineering. The space between the two tiers is where most engineering wastes itself.',
    philo_p3:        'If you want to talk about a city, a region, or a question, the contact card is in the personal section above. Tap it.',
  },
  th: {
    palace:  'หน้าต่างสู่ความคิด',
    hint:    'แตะจอหรือสิ่งของใดก็ได้ · ลากเพื่อมองรอบ',
    contact: 'ติดต่อ',
    cv_eyebrow:      'ประวัติ',
    cv_title:        'ประวัติย่อ',
    cv_cap:          'สแกนเพื่อดาวน์โหลด · หรือแตะเพื่อเปิด',
    cv_meta:         'cv.pdf · 3 หน้า · มีนาคม 2569',
    li_eyebrow:      'ลิงก์อิน',
    li_title:        'เครือข่ายวิชาชีพ',
    li_cap:          'สแกนเพื่อดูโปรไฟล์',
    contact_eyebrow: 'ติดต่อ',
    contact_title:   'ดร.นน อัครประเสริฐกุล',
    contact_cap:     'สแกนเพื่อเพิ่มในรายชื่อ',
    contact_role:    'ผู้เชี่ยวชาญอาวุโส · การส่งเสริมเมืองอัจฉริยะ',
    contact_org:     'สำนักงานส่งเสริมเศรษฐกิจดิจิทัล',
    password:        'รหัสผ่าน',
    music_eyebrow:   'นนซูโน่ · เพลง',
    music_title:     'แต่งบน suno.ai',
    music_now:       'กำลังเล่น',
    music_count:     '10 เพลง · แต่งด้วย suno',
    plan_status:     'สถานะระบบ',
    plan_projects:   'โครงการ',
    plan_personal:   'ส่วนตัว',
    plan_world:      'เวลาโลก',
    plan_room:       '▦  เข้าห้อง',
    plan_theme:      'ธีม',
    cv_title_short:  'ประวัติย่อ',
    li_title_short:  'เครือข่ายวิชาชีพ',
    co_title_short:  'นามบัตร',
    music_short:     'เพลง suno · 10 เพลง',
    pomo_short:      'โพโมโดโร · 25 / 5',
    sabai_short:     'สบายๆ · อีสเตอร์เอ้ก',
    role:            'สถาปนิก · นักมานุษยวิทยา · เมืองอัจฉริยะ',
    palace_sub:      'แตะเพื่อติดต่อ · หน้าต่างสู่ความคิด',
    philo_label:     'แนวคิดเบื้องหลัง',
    philo_p1:        'แดชบอร์ดส่วนใหญ่ข้างต้นอัปเดตทุกห้านาทีผ่าน cron ในมุมมองของผู้ใช้ มันแยกไม่ออกจากระบบเรียลไทม์ และต้นทุนแทบเป็นศูนย์',
    philo_p2_html:   'ผมเรียกค่าใช้จ่ายเฉพาะกับ <span class="accent">งานเรียลไทม์จริง</span> เพราะต้องจ่ายค่า cloud CPU, ระบบ pipeline, และทีมวิศวกร ช่องว่างระหว่างสองระดับนี้คือจุดที่งานวิศวกรรมส่วนใหญ่สูญเปล่า',
    philo_p3:        'หากต้องการคุยเรื่องเมือง พื้นที่ หรือคำถามใด ๆ นามบัตรของผมอยู่ในส่วน "ส่วนตัว" ด้านบน แตะได้เลย',
  },
  zh: {
    palace:  '思维之窗',
    hint:    '点按屏幕或物件 · 拖动环视',
    contact: '联系',
    cv_eyebrow:      '简历',
    cv_title:        '个人履历',
    cv_cap:          '扫码下载 · 或点击打开',
    cv_meta:         'cv.pdf · 三页 · 2026年三月',
    li_eyebrow:      '领英',
    li_title:        '职业网络',
    li_cap:          '扫码查看 · 或点击打开',
    contact_eyebrow: '联系方式',
    contact_title:   '阿卡拉博士',
    contact_cap:     '扫码添加到通讯录',
    contact_role:    '高级专家 · 智慧城市推广',
    contact_org:     '数字经济促进局',
    password:        '密码',
    music_eyebrow:   '诺·音乐',
    music_title:     'suno.ai 作品',
    music_now:       '正在播放',
    music_count:     '10 首 · suno 作曲',
    plan_status:     '系统状态',
    plan_projects:   '项目',
    plan_personal:   '个人',
    plan_world:      '世界时间',
    plan_room:       '▦  进入房间',
    plan_theme:      '主题',
    cv_title_short:  '个人履历',
    li_title_short:  '职业网络',
    co_title_short:  '联系方式',
    music_short:     'suno 音乐 · 10 首',
    pomo_short:      '番茄钟 · 25 / 5',
    sabai_short:     'sabai · 彩蛋',
    role:            '建筑师 · 人类学者 · 智慧城市',
    palace_sub:      '点按联系 · 思维之窗',
    philo_label:     '运作原理',
    philo_p1:        '上方的仪表盘大多每五分钟通过 cron 刷新一次。对人眼而言，这与实时无异，运行成本几乎为零。',
    philo_p2_html:   '只有<span class="accent">真正实时</span>的项目才按实时成本计费——云 CPU、可观测管道、值班工程。两档之间的空间，正是大多数工程浪费自身的地方。',
    philo_p3:        '若希望就城市、区域或某个问题展开对话，名片就在上方"个人"栏里。点开即可。',
  },
};

let LANG = localStorage.getItem('nonarkara.lang') || 'en';
if (!I18N[LANG]) LANG = 'en';
const t = (k) => (I18N[LANG][k] || I18N.en[k] || k);

// ── Theme-redraw hook registry (hoisted) ────────────────
// Several scene-setup blocks below push canvas-redraw functions onto
// this list at module-load time. The const must be declared above
// all of those blocks or each push hits the temporal-dead-zone and
// halts the whole module — black screen, no scene, no canvas.
const _themeRedrawHooks = [];
function registerThemedRedraw(fn) { _themeRedrawHooks.push(fn); fn(); }

function applyLang() {
  document.body.dataset.lang = LANG;
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    // Keys with an `_html` companion get rendered as HTML so inline
    // <span class="accent"> and similar markup survive translation.
    const htmlVal = I18N[LANG][k + '_html'] || I18N.en[k + '_html'];
    if (htmlVal) el.innerHTML = htmlVal;
    else el.textContent = t(k);
  });
  document.querySelectorAll('#lang button').forEach(b => {
    b.classList.toggle('on', b.dataset.l === LANG);
  });
  // Mirror the highlight on the plan-view lang switcher
  document.querySelectorAll('#plan-lang button').forEach(b => {
    b.classList.toggle('on', b.dataset.l === LANG);
  });
  // If plan view has been initialised, re-render so dynamic strings
  // update too. Guarded by a window flag because the plan block runs
  // far below this — applyLang is called once at boot before the plan
  // consts exist (TDZ).
  if (window.__planReady) {
    try { renderPlan(); } catch (_) {}
  }
}
document.querySelectorAll('#lang button').forEach(b => {
  b.addEventListener('click', () => {
    LANG = b.dataset.l;
    localStorage.setItem('nonarkara.lang', LANG);
    applyLang();
  });
});
applyLang();

// ════════════════════════════════════════════════════════
// Project + city + furniture data
// ════════════════════════════════════════════════════════
const PROJECTS = [
  { code: 'NINJA',    title: 'Ninja Innovation',                  url: 'https://ninja.nonarkara.org',                       img: 'screenshots/ninja.jpg',     dom: 'ninja.nonarkara.org' },
  { code: 'AXIOM',    title: 'Axiom Consultancy',                 url: 'https://axiom.nonarkara.org',                       img: 'screenshots/axiom.jpg',     dom: 'axiom.nonarkara.org' },
  { code: 'SLIC',     title: 'SLIC Index v3',                     url: 'https://slic.nonarkara.org',                        img: 'screenshots/slic.jpg',      dom: 'slic.nonarkara.org' },
  { code: 'SCITI',    title: 'Smart City Thailand Index',         url: 'https://sciti.nonarkara.org',                       img: 'screenshots/sciti.jpg',     dom: 'sciti.nonarkara.org' },
  { code: 'TOMASITY', title: 'Muang Thong Thani · MTT view',      url: 'https://monitor.nonarkara.org',                     img: 'screenshots/monitor.jpg',   dom: 'monitor.nonarkara.org' },
  { code: 'BANGKOK',  title: 'Bangkok IOC · BKK view',             url: 'https://bangkok-ioc.pages.dev/',                    img: 'screenshots/monitor.jpg',   dom: 'bangkok-ioc.pages.dev' },
  { code: 'CDP v2',   title: 'CD Data Platform',                  url: 'https://cdp.nonarkara.org',                         img: 'screenshots/cdp.jpg',       dom: 'cdp.nonarkara.org' },
  { code: 'CONFLICT', title: 'Global Political Monitor',          url: 'https://conflict.nonarkara.org',                    img: 'screenshots/conflict.jpg',  dom: 'conflict.nonarkara.org' },
  { code: 'MEM',      title: 'Middle Eastern Monitor',            url: 'https://mem.nonarkara.org',                         img: 'screenshots/mem.jpg',       dom: 'mem.nonarkara.org' },
  { code: 'GEO',      title: 'Thailand Geopolitical Watch',       url: 'https://geo.nonarkara.org',                         img: 'screenshots/geo.jpg',       dom: 'geo.nonarkara.org' },
  { code: 'PHUKET',   title: 'Phuket Dashboard',                  url: 'https://phuket.nonarkara.org',                      img: 'screenshots/phuket.jpg',    dom: 'phuket.nonarkara.org' },
  { code: 'WAR ROOM', title: 'Phuket · War Room',                 url: 'https://phuket-dashboard.nonarkara.org/war-room',     img: 'screenshots/phuket.jpg',  dom: 'phuket-dashboard.nonarkara.org/war-room' },
  { code: 'BUS',      title: 'Phuket Smart Bus',                  url: 'https://bus.nonarkara.org',                         img: 'screenshots/bus.jpg',       dom: 'bus.nonarkara.org' },
  { code: 'VIABUS',   title: 'Tech Hunt · Mobility · Viabus',     url: 'https://nonarkara.github.io/techhuntthailand/?id=mobility-cohort-001-viabus', img: 'screenshots/bus.jpg' },
  { code: 'MEAN',     title: 'MEAN · Smart Money',                url: 'https://mean.nonarkara.org',                        img: 'screenshots/cdp.jpg',       dom: 'mean.nonarkara.org' },
  { code: 'ATLAS',    title: 'City Tech Atlas',                   url: 'https://citytechatlas.lovable.app/',                img: 'screenshots/cdp.jpg' },
  { code: 'AGENTIC',  title: 'Agentic AI Research · @peterthien', url: 'https://github.com/agentic-ai-research',            img: 'screenshots/academic.jpg' },
  { code: 'COUNCIL',  title: 'AI Council · v1 · 3 siblings',     url: 'https://github.com/Nonarkara/second-brain-os',      img: 'screenshots/academic.jpg' },
  { code: 'COUNCIL+', title: 'AI Council · v2 · 9-bot taskforce', url: 'https://github.com/Nonarkara/dr-non-agentic-ai-council', img: 'screenshots/academic.jpg' },
  { code: 'KUCHING',  title: 'Greater Kuching IOC',               url: 'https://kuching.nonarkara.org',                     img: 'screenshots/kuching.jpg',   dom: 'kuching.nonarkara.org' },
  { code: 'SOLOMON',  title: 'Solomon Islands · UN DESA',         url: 'https://solomon.nonarkara.org',                     img: 'screenshots/solomon.jpg',   dom: 'solomon.nonarkara.org' },
  { code: 'ASCN',     title: 'ASEAN Smart Cities Network',        url: 'https://ascn.nonarkara.org',                        img: 'screenshots/ascn.jpg',      dom: 'ascn.nonarkara.org' },
  { code: 'SLOWDOWN', title: 'The Things You Can See',            url: 'https://slowdown.nonarkara.org',                    img: 'screenshots/slowdown.jpg', dom: 'slowdown.nonarkara.org' },
  { code: 'NOVELS',   title: 'Substack · Novels',                 url: 'https://substack.com/@nonarkara',                   img: 'screenshots/substack.jpg' },
  { code: 'ESSAYS',   title: 'Medium · Essays',                   url: 'https://nonsmartcity.medium.com/',                  img: 'screenshots/medium.jpg' },
  { code: 'SOLITUDE', title: '100 Days of Solitude',              url: 'https://solitude.nonarkara.org',                    img: 'screenshots/solitude.jpg',  dom: 'solitude.nonarkara.org' },
  { code: 'YOUTUBE',  title: 'YouTube · @nonarkara',              url: 'https://www.youtube.com/@nonarkara',                img: 'screenshots/youtube.jpg' },
  { code: 'ACADEMIC', title: 'Academic Profile',                  url: 'https://arkaraprasertkul.socialpsychology.org/',    img: 'screenshots/academic.jpg' },
  { code: 'DAO',      title: 'Dao De Jing · 道德經',                url: 'https://dao.nonarkara.org/',                        img: 'screenshots/academic.jpg',  dom: 'dao.nonarkara.org' },
  { code: 'RESEARCH', title: 'ResearchGate · Profile',             url: 'https://www.researchgate.net/profile/Non-Arkaraprasertkul', img: 'screenshots/academic.jpg' },
  // (LINKEDIN dropped from PROJECTS — it's identity, not project
  //  work; the row in PERSONAL already covers it. Norman mapping:
  //  one label, one action.)
];

// Cities for the world map table — places that mean something to him
const CITIES = [
  // SE Asia home base
  { name: 'Bangkok',      lat: 13.75,  lon: 100.50, tz: 'Asia/Bangkok',         home: true,  memory: 'home base · ผม' },
  { name: 'Chiang Mai',   lat: 18.79,  lon:  98.98, tz: 'Asia/Bangkok',                      memory: 'good coffee · slower pace' },
  { name: 'Phuket',       lat:  7.88,  lon:  98.39, tz: 'Asia/Bangkok',                      memory: 'governor demo' },
  { name: 'Singapore',    lat:  1.35,  lon: 103.81, tz: 'Asia/Singapore',                    memory: 'tunnel to ASEAN' },
  { name: 'Kuching',      lat:  1.55,  lon: 110.36, tz: 'Asia/Kuching',                      memory: 'Greater Kuching IOC' },
  { name: 'Manila',       lat: 14.60,  lon: 120.98, tz: 'Asia/Manila',                       memory: 'Philippines · ASEAN corridor' },
  // East Asia
  { name: 'Seoul',        lat: 37.57,  lon: 126.98, tz: 'Asia/Seoul',                        memory: 'Korea · smart city benchmark' },
  { name: 'Tokyo',        lat: 35.68,  lon: 139.69, tz: 'Asia/Tokyo',                        memory: 'east' },
  { name: 'Shanghai',     lat: 31.23,  lon: 121.47, tz: 'Asia/Shanghai',                     memory: 'NYU · Yangpu · IDEO' },
  { name: 'Honiara',      lat: -9.43,  lon: 159.95, tz: 'Pacific/Guadalcanal',               memory: 'UN DESA · Solomon Islands' },
  { name: 'Sydney',       lat: -33.87, lon: 151.21, tz: 'Australia/Sydney',                  memory: 'Sydney Uni · honorary lecturer' },
  // Middle East
  { name: 'Dubai',        lat: 25.20,  lon:  55.27, tz: 'Asia/Dubai',                        memory: 'GITEX' },
  // Europe
  { name: 'Moscow',       lat: 55.75,  lon:  37.62, tz: 'Europe/Moscow',                     memory: 'GMT+3' },
  { name: 'Istanbul',     lat: 41.01,  lon:  28.97, tz: 'Europe/Istanbul',                   memory: 'bridge city' },
  { name: 'Amsterdam',    lat: 52.37,  lon:   4.90, tz: 'Europe/Amsterdam',                  memory: 'IABR · architecture' },
  { name: 'Paris',        lat: 48.86,  lon:   2.35, tz: 'Europe/Paris',                      memory: 'good coffee · good question' },
  { name: 'Krakow',       lat: 50.06,  lon:  19.93, tz: 'Europe/Warsaw',                     memory: 'Jagiellonian · visiting professor' },
  { name: 'Oxford',       lat: 51.75,  lon:  -1.25, tz: 'Europe/London',                     memory: 'PhD years' },
  { name: 'London',       lat: 51.51,  lon:  -0.13, tz: 'Europe/London',                     memory: 'global hub' },
  // Americas
  { name: 'New York',     lat: 40.71,  lon: -74.00, tz: 'America/New_York',                  memory: 'NYU global postdoc' },
  { name: 'Boston',       lat: 42.36,  lon: -71.06, tz: 'America/New_York',                  memory: 'Harvard · MIT' },
  { name: 'Chicago',      lat: 41.88,  lon: -87.63, tz: 'America/Chicago',                   memory: 'US Central · architecture' },
  { name: 'Los Angeles',  lat: 34.05,  lon: -118.24, tz: 'America/Los_Angeles',              memory: 'US West Coast' },
];

const VCARD = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:Arkara;Non;;Dr.;PhD',
  'FN:Dr. Non Arkara',
  'TITLE:Senior Expert in Smart City Promotion',
  'ORG:Digital Economy Promotion Agency',
  'EMAIL;type=WORK:non.ar@depa.or.th',
  'EMAIL;type=PERSONAL:nonsmartcity@gmail.com',
  'TEL;type=CELL:+66657095258',
  'TEL;type=WORK,VOICE:+6620262333',
  'URL:https://nonarkara.org',
  'URL:https://www.linkedin.com/in/drnon/',
  'ADR;type=WORK:;;234/431 Building A\\, Ladprao Lane.10\\, Lat Phrao Rd;Chom Phon\\, Chatuchak;Bangkok;10900;Thailand',
  'END:VCARD'
].join('\n');

// ════════════════════════════════════════════════════════
// Three.js scene
// ════════════════════════════════════════════════════════
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 9, 36);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 7.5);
camera.lookAt(0, 2.6, -10);
let baseRotX = camera.rotation.x;
let baseRotY = camera.rotation.y;

// Camera framing adapts to portrait phones — pull back, widen FOV,
// tilt slightly down so the TV grid centers in the screen.
function applyCameraFraming() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  if (aspect < 0.85) {
    camera.fov = 70;
    camera.position.set(0, 1.95, 5.5);
    camera.lookAt(0, 2.4, -10);
  } else {
    camera.fov = 58;
    camera.position.set(0, 1.7, 7.5);
    camera.lookAt(0, 2.6, -10);
  }
  baseRotX = camera.rotation.x;
  baseRotY = camera.rotation.y;
  camera.updateProjectionMatrix();
}
applyCameraFraming();

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-root').appendChild(renderer.domElement);

// ════════════════════════════════════════════════════════
// Ambient particles — dust motes drifting in the light shafts
// ════════════════════════════════════════════════════════
const PARTICLE_COUNT = 120;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const particleVelocities = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 18;
  particlePositions[i * 3 + 1] = Math.random() * 5 + 0.2;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 14;
  particleVelocities.push({
    x: (Math.random() - 0.5) * 0.003,
    y: (Math.random() - 0.5) * 0.001 + 0.0005,
    z: (Math.random() - 0.5) * 0.003,
  });
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0xf5f5f0,
  size: 0.025,
  transparent: true,
  opacity: 0.35,
  sizeAttenuation: true,
});
const particles = new THREE.Points(particleGeo, particleMat);
particles.visible = false; // shown after fade-in
scene.add(particles);

// ── Data pulse particles (traveling along wireframe edges) ──
const PULSE_COUNT = 8;
const pulseMats = [];
const pulseAnims = [];
for (let i = 0; i < PULSE_COUNT; i++) {
  const pMat = new THREE.PointsMaterial({
    color: 0xf59e0b,
    size: 0.04,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
  });
  pulseMats.push(pMat);
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pPts = new THREE.Points(pGeo, pMat);
  pPts.visible = false;
  scene.add(pPts);
  pulseAnims.push({
    mesh: pPts,
    progress: Math.random(),
    speed: 0.005 + Math.random() * 0.01,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    axis: new THREE.Vector3((Math.random()-0.5)*2, 0, (Math.random()-0.5)*2).normalize(),
    active: false,
    delay: Math.random() * 200,
  });
}
// Activate pulses along map grid lines
function activatePulses() {
  pulseAnims.forEach((p, i) => {
    p.from.set(MAP_X - MAP_W/2 + Math.random()*MAP_W, MAP_Y + 0.02, MAP_Z - MAP_D/2 + Math.random()*MAP_D);
    p.to.set(p.from.x + (Math.random()-0.5)*3, p.from.y, p.from.z + (Math.random()-0.5)*3);
    p.active = true;
    p.progress = 0;
  });
}


// ── Theme system ─────────────────────────────────────────
let CURRENT_THEME = localStorage.getItem('nonarkara.theme') || 'dark';
const THEMES = {
  dark:  { bg: 0x000000, line: 0xf5f5f0, accent: 0xf59e0b, bgCss: '#000000', fgCss: '#f5f5f0', accentCss: '#f59e0b' },
  light: { bg: 0xf5f5f0, line: 0x1a1a1a, accent: 0xb85c28, bgCss: '#f5f5f0', fgCss: '#1a1a1a', accentCss: '#b85c28' },
};
const themeColors = () => THEMES[CURRENT_THEME];

// ── Wireframe materials (start at opacity 0, fade in) ────
const _initLineHex = THEMES[CURRENT_THEME].line;
const _initAccentHex = THEMES[CURRENT_THEME].accent;
const matBright = new THREE.LineBasicMaterial({ color: _initLineHex, transparent: true, opacity: 0 });
const matDim    = new THREE.LineBasicMaterial({ color: _initLineHex, transparent: true, opacity: 0 });
const matFurni  = new THREE.LineBasicMaterial({ color: _initLineHex, transparent: true, opacity: 0 });
const matHover  = new THREE.LineBasicMaterial({ color: _initAccentHex, transparent: true, opacity: 1 });
const matMap    = new THREE.LineBasicMaterial({ color: _initLineHex, transparent: true, opacity: 0 });
const matCity   = new THREE.LineBasicMaterial({ color: _initLineHex, transparent: true, opacity: 0 });
const matCityHome = new THREE.LineBasicMaterial({ color: _initAccentHex, transparent: true, opacity: 0 });
const matEquator = new THREE.LineBasicMaterial({ color: _initAccentHex, transparent: true, opacity: 0 });
const FADE_TARGETS = [
  { mat: matBright,   target: 0.55 },
  { mat: matDim,      target: 0.18 },
  { mat: matFurni,    target: 0.50 },
  { mat: matMap,      target: 0.40 },
  { mat: matCity,     target: 0.85 },
  { mat: matCityHome, target: 1.0  },
  { mat: matEquator,  target: 0.85 },
];

const wirebox = (w, h, d, mat = matFurni) =>
  new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), mat);
const placeAt = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };

// ── Floor / ceiling / walls ──────────────────────────────
{
  const grid = new THREE.GridHelper(140, 70, 0xf5f5f0, 0xf5f5f0);
  grid.material = matDim;
  scene.add(grid);
}
{
  const ceiling = new THREE.GridHelper(140, 35, 0xf5f5f0, 0xf5f5f0);
  ceiling.material = matDim;
  ceiling.position.y = 6.0;
  scene.add(ceiling);
}
[-9.5, 9.5].forEach(x => {
  const geom = new THREE.PlaneGeometry(60, 6.0, 30, 7);
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geom), matDim);
  wire.position.set(x, 3.0, -10);
  wire.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
  scene.add(wire);
});

// ── Interactables registry ───────────────────────────────
const INTERACTABLES = [];
function register(group, ud) {
  group.userData = { ...ud };
  INTERACTABLES.push(group);
}
function makeClickableGroup(kind, key, hitW, hitH, hitD, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const lines = [];
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(hitW, hitH, hitD),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  group.add(hit);
  group.userData = { kind, key, lines, hit, baseMaterial: matFurni };
  scene.add(group);
  INTERACTABLES.push(group);
  return { group, lines };
}

// ── Furniture: coffee table → CONTACT ────────────────────
{
  // Hit volume sits BELOW the cup's hit volume — table top at y=0.42, hit y range 0.0–0.45
  const { group, lines } = makeClickableGroup('furniture', 'coffee', 2.0, 0.45, 1.0, 0, 0.225, 1.5);
  const top = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.0, 0.05, 1.0)), matFurni);
  top.position.set(0, 0.02, 0); group.add(top); lines.push(top);
  [-0.9, 0.9].forEach(dx => [-0.4, 0.4].forEach(dz => {
    const leg = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.04, 0.4, 0.04)), matFurni);
    leg.position.set(dx, -0.21, dz);
    group.add(leg); lines.push(leg);
  }));
  // Cup is a SEPARATE clickable group — easter egg
}
{
  const { group: cupGrp, lines: cupLines } = makeClickableGroup(
    'furniture', 'cup', 0.32, 0.42, 0.32,
    0.4, 0.51, 1.5  // group origin sits where the visible cup is
  );
  // Raise the invisible hit cube above the table-top so it intercepts clicks
  cupGrp.userData.hit.position.y = 0.15;  // → world y from 0.45 to 0.87 (table tops out at 0.625)
  const cylG = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12);
  const cyl = new THREE.LineSegments(new THREE.WireframeGeometry(cylG), matFurni);
  cupGrp.add(cyl); cupLines.push(cyl);
  // tiny saucer below
  const saucer = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.CylinderGeometry(0.10, 0.10, 0.012, 16)),
    matFurni
  );
  saucer.position.y = -0.06; cupGrp.add(saucer); cupLines.push(saucer);
}

// ── Furniture: chair (decoration, moved to back-left) ────
{
  const x0 = -5.2, z0 = -3.0;
  scene.add(placeAt(wirebox(0.55, 0.05, 0.55), x0, 0.5, z0));
  scene.add(placeAt(wirebox(0.55, 0.7, 0.05),  x0, 0.85, z0 + 0.25));
  [-0.22, 0.22].forEach(dx => [-0.22, 0.22].forEach(dz => {
    scene.add(placeAt(wirebox(0.04, 0.5, 0.04), x0 + dx, 0.25, z0 + dz));
  }));
}

// ── Furniture: pedestal + globe → LINKEDIN ───────────────
{
  const { group, lines } = makeClickableGroup('furniture', 'pedestal', 0.9, 2.5, 0.9, 4.0, 1.0, -2);
  const box = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.4, 1.5, 0.4)), matFurni);
  box.position.set(0, -0.25, 0); group.add(box); lines.push(box);
  const sph = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(0.32, 18, 12)), matFurni);
  sph.position.set(0, 0.82, 0); group.add(sph); lines.push(sph);
}

// ── Furniture: bookshelf → CV ────────────────────────────
{
  const { group, lines } = makeClickableGroup('furniture', 'bookshelf', 0.8, 3.4, 1.8, -7.0, 1.6, -2.2);
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.45, 3.2, 1.6)), matFurni);
  group.add(shell); lines.push(shell);
  for (let i = 1; i < 5; i++) {
    const sh = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.43, 0.02, 1.55)), matFurni);
    sh.position.y = i * 0.6 - 1.5;
    group.add(sh); lines.push(sh);
  }
  for (let i = 0; i < 4; i++) {
    const w = 0.12 + Math.random() * 0.06;
    const h = 0.32 + Math.random() * 0.06;
    const book = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, 0.18)), matFurni);
    book.position.set(0.05, -0.7, -0.5 + i * 0.18);
    group.add(book); lines.push(book);
  }
}

// ── Record player (Suno music collection) ────────────────
// Wireframe console table + a turntable disc on top + a tonearm.
// Click → opens the music player modal with all tracks.
const SONGS = [
  { file: 'music/track-01.mp3', title: 'Texts Across The Line',           alt: '' },
  { file: 'music/track-02.mp3', title: 'กระจายความรัก',                     alt: 'Spread the Love' },
  { file: 'music/track-03.mp3', title: 'ของเล่นของคุณผู้หญิง',                 alt: '' },
  { file: 'music/track-04.mp3', title: 'ของเล่นชั้นล่าง',                     alt: '' },
  { file: 'music/track-05.mp3', title: 'ของเล่นไฮโซ',                       alt: '' },
  { file: 'music/track-06.mp3', title: 'คืนเดียวที่สิงคโปร์',                  alt: 'One Night in Singapore' },
  { file: 'music/track-07.mp3', title: 'ทำไมเราไม่รักให้สุด',                  alt: '' },
  { file: 'music/track-08.mp3', title: 'หมาคาบไปแดก (alt)',                 alt: '' },
  { file: 'music/track-09.mp3', title: 'หมาคาบไปแดก',                       alt: '' },
  { file: 'music/track-10.mp3', title: 'เราไม่รู้เหี้ยอะไรเลย',                alt: '' },
];

let RECORD_DISC = null;  // exposed for spin animation
{
  // Console table — left-mid-room, mirroring the pedestal (4, ..., -2).
  // Earlier (4.6, 0.78, 4.0) sat outside the camera frustum.
  const X = -3.4, Y = 0.78, Z = -1.6;
  const consoleTop = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.4, 0.04, 0.7)), matFurni);
  consoleTop.position.set(X, Y, Z); scene.add(consoleTop);
  [[-0.65, -0.30], [0.65, -0.30], [-0.65, 0.30], [0.65, 0.30]].forEach(([dx, dz]) => {
    const leg = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.04, 0.78, 0.04)), matFurni);
    leg.position.set(X + dx, Y - 0.39, Z + dz);
    scene.add(leg);
  });

  // Group for the player itself (clickable)
  const group = new THREE.Group();
  group.position.set(X, Y + 0.04, Z);

  // Turntable plinth
  const plinth = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.0, 0.08, 0.6)), matFurni);
  plinth.position.set(0, 0.04, 0); group.add(plinth);

  // Vinyl disc — wireframe ring (torus thin tube)
  const discOuter = new THREE.TorusGeometry(0.30, 0.005, 4, 64);
  const disc = new THREE.LineSegments(new THREE.WireframeGeometry(discOuter), matBright);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, 0.10, 0);
  group.add(disc);
  // Inner spindle ring + label ring
  const spindle = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.TorusGeometry(0.06, 0.004, 3, 24)),
    matBright);
  spindle.rotation.x = Math.PI / 2; spindle.position.set(0, 0.10, 0);
  group.add(spindle);
  const labelRing = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.TorusGeometry(0.13, 0.003, 3, 32)),
    matFurni);
  labelRing.rotation.x = Math.PI / 2; labelRing.position.set(0, 0.10, 0);
  group.add(labelRing);

  // Tonearm — a small line from upper-right corner of plinth angled across
  const armPts = [
    new THREE.Vector3( 0.42, 0.10, -0.22),  // pivot
    new THREE.Vector3( 0.20, 0.10, -0.05),  // mid
    new THREE.Vector3( 0.05, 0.10,  0.15),  // tip on disc
  ];
  const armGeom = new THREE.BufferGeometry().setFromPoints(armPts);
  const arm = new THREE.Line(armGeom, matBright);
  group.add(arm);
  // Tonearm pivot dot
  const pivot = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.06, 0.05, 0.06)), matFurni);
  pivot.position.set(0.42, 0.10, -0.22);
  group.add(pivot);

  // Hit volume — bigger than visible so it's tap-able
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.45, 0.78),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.set(0, 0.15, 0);
  group.add(hit);

  group.userData = {
    kind: 'record',
    lines: [plinth, disc, spindle, labelRing, arm, pivot],
    hit,
    baseMaterial: matFurni,
  };
  scene.add(group);
  INTERACTABLES.push(group);
  RECORD_DISC = disc;
}

// ── Cubical chandelier (theme toggle) ────────────────────
// A wireframe cube hanging from the ceiling. Slowly rotates on
// its Y axis. Click/tap → toggles dark ↔ light theme.
let CHAND_GROUP = null;
{
  const X = 0, Y = 4.7, Z = 3.6;
  const outer = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.42, 0.42, 0.42)), matBright);
  const inner = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.20, 0.20, 0.20)), matBright);

  const group = new THREE.Group();
  group.position.set(X, Y, Z);
  group.add(outer);
  group.add(inner);

  // Rod from cube top up to the ceiling at y=6.0
  const rodG = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(X, Y + 0.21, Z),
    new THREE.Vector3(X, 6.0,      Z),
  ]);
  scene.add(new THREE.Line(rodG, matDim));

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  group.add(hit);

  group.userData = {
    kind: 'chandelier',
    lines: [outer, inner],
    hit,
    baseMaterial: matBright,
  };
  scene.add(group);
  INTERACTABLES.push(group);
  CHAND_GROUP = group;
}

// ── Lamp (decoration) ────────────────────────────────────
{
  const x0 = 6.0, z0 = 0.5;
  const poleG = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x0, 2.4, z0)
  ]);
  scene.add(new THREE.Line(poleG, matFurni));
  const cone = new THREE.ConeGeometry(0.3, 0.35, 12, 1, true);
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(cone), matFurni);
  wire.position.set(x0, 2.55, z0);
  scene.add(wire);
}

// ── Light switch panel (right side, in line of sight) ────
// Two switches; each one routes to a private TKC URL.
// The right wall is at x=9.5 but the camera FOV doesn't reach it
// until z<-2.7. So we mount the panel on the right wall near the
// back-right corner where it's actually visible.
// TKC removed from public surfaces. URLs are protected by Cloudflare
// login but the dashboard previously displayed the shared password as
// a label, which leaks the secret to anyone reading the page. Per
// Dr Non's directive — protect properly or remove. Removing for now.
const TKC_LINKS = [];
// The wall-mounted switch panel that previously held the TKC switches
// is gone too. The label canvas it drew rendered the shared password
// as a wall texture in the 3D room — same NDA leak as the plan-view
// label. If this comes back, gate it behind real auth, not a label.

// ════════════════════════════════════════════════════════
// Operations panel (left wall, mid-back) — live health board
// Renders aggregate status from /status JSON every minute.
// ════════════════════════════════════════════════════════
const OPS = {
  canvas: null, ctx: null, tex: null, plane: null,
  data: null, lastUpdate: null,
};
{
  const PX = -9.4, PY = 2.7, PZ = -5.0;
  const PW = 0.55, PH_ = 0.85;

  // Wireframe frame around it
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.04, PH_ * 1.06, PW * 1.06)),
    matFurni
  );
  frame.position.set(PX, PY, PZ);
  scene.add(frame);

  // Canvas
  const c = document.createElement('canvas');
  c.width = 384; c.height = 600;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0,
    side: THREE.FrontSide, depthWrite: false
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH_), mat);
  plane.position.set(PX + 0.025, PY, PZ);
  plane.rotation.y = -Math.PI / 2;  // facing +X (toward room interior)
  scene.add(plane);

  OPS.canvas = c; OPS.ctx = ctx; OPS.tex = tex; OPS.plane = plane;
}

function drawOpsPanel() {
  const { ctx, canvas, tex, data } = OPS;
  const c = themeColors();
  const fgRgb = CURRENT_THEME === 'dark' ? '245,245,240' : '26,26,26';
  ctx.fillStyle = c.bgCss;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const total = data ? Object.keys(data.sites || {}).length : 0;
  const ok = data
    ? Object.values(data.sites).filter(v => v.code === 200 || v.code === 301 || v.code === 302).length
    : 0;
  const down = total - ok;

  ctx.fillStyle = c.accentCss;
  ctx.font = '300 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('OPERATIONS', canvas.width / 2, 50);

  ctx.strokeStyle = `rgba(${fgRgb}, 0.25)`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40, 76); ctx.lineTo(canvas.width - 40, 76); ctx.stroke();

  ctx.fillStyle = c.fgCss;
  ctx.font = '300 110px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${ok}/${total || '—'}`, canvas.width / 2, 200);

  ctx.fillStyle = `rgba(${fgRgb}, 0.45)`;
  ctx.font = '300 14px "JetBrains Mono", monospace';
  ctx.fillText('LIVE  ·  ENDPOINTS', canvas.width / 2, 240);

  const barX = 40, barY = 290, barW = canvas.width - 80, barH = 4;
  ctx.fillStyle = `rgba(${fgRgb}, 0.15)`;
  ctx.fillRect(barX, barY, barW, barH);
  if (total) {
    ctx.fillStyle = down ? c.accentCss : c.fgCss;
    ctx.fillRect(barX, barY, barW * (ok / total), barH);
  }

  if (down > 0 && data) {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '300 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    let y = 340;
    ctx.fillText('▼ DOWN', 40, y); y += 22;
    ctx.fillStyle = `rgba(${fgRgb}, 0.55)`;
    ctx.font = '300 11px "JetBrains Mono", monospace';
    for (const [d, v] of Object.entries(data.sites)) {
      if (v.code === 200 || v.code === 301 || v.code === 302) continue;
      ctx.fillText(`${d}  (${v.code})`.slice(0, 38), 40, y);
      y += 18;
      if (y > 480) break;
    }
  } else if (data) {
    ctx.fillStyle = `rgba(${fgRgb}, 0.5)`;
    ctx.font = '300 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('all systems nominal', canvas.width / 2, 360);
  } else {
    ctx.fillStyle = `rgba(${fgRgb}, 0.4)`;
    ctx.font = '300 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('. . . loading', canvas.width / 2, 360);
  }

  ctx.strokeStyle = `rgba(${fgRgb}, 0.18)`;
  ctx.beginPath(); ctx.moveTo(40, canvas.height - 70); ctx.lineTo(canvas.width - 40, canvas.height - 70); ctx.stroke();
  ctx.fillStyle = `rgba(${fgRgb}, 0.5)`;
  ctx.font = '300 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  const ts = data ? new Date(data.ts).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false }) : '——:——:——';
  ctx.fillText('LAST CHECK', canvas.width / 2, canvas.height - 44);
  ctx.fillStyle = c.fgCss;
  ctx.font = '300 14px "JetBrains Mono", monospace';
  ctx.fillText(`${ts}  BKK`, canvas.width / 2, canvas.height - 22);

  tex.needsUpdate = true;
}

// ════════════════════════════════════════════════════════
// World map TABLE (front-left) — clickable cities
// ════════════════════════════════════════════════════════
const MAP_W = 3.6, MAP_D = 1.8;
const MAP_X = -2.5, MAP_Y = 0.78, MAP_Z = 4.2;

// Table frame + legs
{
  const top = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(MAP_W, 0.04, MAP_D)), matFurni);
  top.position.set(MAP_X, MAP_Y, MAP_Z); scene.add(top);
  [[-MAP_W/2+0.1, -MAP_D/2+0.1], [MAP_W/2-0.1, -MAP_D/2+0.1], [-MAP_W/2+0.1, MAP_D/2-0.1], [MAP_W/2-0.1, MAP_D/2-0.1]]
    .forEach(([dx, dz]) => {
      const leg = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.05, 0.78, 0.05)), matFurni);
      leg.position.set(MAP_X + dx, MAP_Y - 0.39, MAP_Z + dz);
      scene.add(leg);
    });
}

// Lat/lon graticule on the table top (lines drawn flat)
{
  // Longitude lines (vertical on the map = X axis, at fixed lon every 30°)
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = (lon / 180) * (MAP_W / 2);
    const pts = [
      new THREE.Vector3(MAP_X + x, MAP_Y + 0.001, MAP_Z - MAP_D/2),
      new THREE.Vector3(MAP_X + x, MAP_Y + 0.001, MAP_Z + MAP_D/2)
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matMap));
  }
  // Latitude lines (the equator gets the amber accent — visible color in both themes)
  for (let lat = -90; lat <= 90; lat += 30) {
    const z = -(lat / 90) * (MAP_D / 2);
    const pts = [
      new THREE.Vector3(MAP_X - MAP_W/2, MAP_Y + 0.001, MAP_Z + z),
      new THREE.Vector3(MAP_X + MAP_W/2, MAP_Y + 0.001, MAP_Z + z)
    ];
    const equatorMat = lat === 0 ? matEquator : matMap;
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), equatorMat));
  }
}

// City markers
function projectCity(lat, lon) {
  return {
    x: MAP_X + (lon / 180) * (MAP_W / 2),
    z: MAP_Z + -(lat / 90) * (MAP_D / 2),
  };
}

CITIES.forEach((c, i) => {
  const { x, z } = projectCity(c.lat, c.lon);
  const cy = MAP_Y + 0.04;

  const group = new THREE.Group();
  group.position.set(x, cy, z);

  // Tiny wireframe pyramid (octahedron) for each city
  const sz = c.home ? 0.10 : 0.06;
  const oct = new THREE.OctahedronGeometry(sz, 0);
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(oct),
    c.home ? matCityHome : matCity
  );
  group.add(wire);

  // Hit volume
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.18),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  group.add(hit);

  group.userData = {
    kind: 'city',
    city: c,
    lines: [wire],
    hit,
    baseMaterial: c.home ? matCityHome : matCity,
  };
  scene.add(group);
  INTERACTABLES.push(group);
});

// ════════════════════════════════════════════════════════
// Atomic Bangkok clock (above the TV grid, on the back wall)
// ════════════════════════════════════════════════════════
const CLOCK_W = 5.0, CLOCK_H = 0.85;
const CLOCK_TEX_SIZE = { w: 1024, h: 176 };
const clockCanvas = document.createElement('canvas');
clockCanvas.width = CLOCK_TEX_SIZE.w;
clockCanvas.height = CLOCK_TEX_SIZE.h;
const clockCtx = clockCanvas.getContext('2d');
const clockTex = new THREE.CanvasTexture(clockCanvas);
clockTex.colorSpace = THREE.SRGBColorSpace;
const clockMat = new THREE.MeshBasicMaterial({
  map: clockTex, transparent: true, opacity: 0,
  side: THREE.DoubleSide, depthWrite: false
});
const clockPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(CLOCK_W, CLOCK_H), clockMat
);
clockPlane.position.set(0, 5.3, -10);
scene.add(clockPlane);

// Clock frame (subtle wireframe around it)
{
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(CLOCK_W * 1.02, CLOCK_H * 1.05, 0.04)),
    matFurni
  );
  frame.position.set(0, 5.3, -10);
  scene.add(frame);
}

function pad(n, w = 2) { return String(n).padStart(w, '0'); }

function drawClock() {
  const ctx = clockCtx;
  const { w, h } = CLOCK_TEX_SIZE;
  const c = themeColors();
  const fgRgb = CURRENT_THEME === 'dark' ? '245,245,240' : '26,26,26';
  ctx.fillStyle = c.bgCss;
  ctx.fillRect(0, 0, w, h);

  const now = new Date();
  const fmtParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(now);
  const get = (type) => (fmtParts.find(p => p.type === type) || {}).value || '';
  const HH = get('hour'); const MM = get('minute'); const SS = get('second');
  const ms = pad(now.getMilliseconds(), 3);
  const dow = get('weekday').toUpperCase();
  const day = get('day'); const mon = get('month').toUpperCase();
  const yr  = get('year');

  ctx.fillStyle = c.fgCss;
  ctx.font = '500 110px "JetBrains Mono", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const big = `${HH}:${MM}:${SS}`;
  ctx.fillText(big, w/2 - 80, 78);
  ctx.fillStyle = `rgba(${fgRgb},0.55)`;
  ctx.font = '400 60px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('.' + ms, w/2 - 80 + ctx.measureText(big).width / 2 + 4, 92);
  ctx.fillStyle = `rgba(${fgRgb},0.55)`;
  ctx.font = '300 26px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  const bottom = `${dow} ${day} ${mon} ${yr}  ·  BANGKOK  ·  GMT+7`;
  ctx.fillText(bottom, w/2, 152);

  clockTex.needsUpdate = true;
}

// ── Pomodoro button — small wireframe tile under the clock ──
{
  const BTN_W = 0.95, BTN_H = 0.20;
  const BTN_X = 0, BTN_Y = 4.66, BTN_Z = -10;

  const btnCanvas = document.createElement('canvas');
  btnCanvas.width = 384; btnCanvas.height = 80;
  const btnCtx2 = btnCanvas.getContext('2d');

  // Texture must exist before the initial paint — otherwise the
  // `if (btnTex)` truthiness check inside the redraw fn hits TDZ.
  const btnTex = new THREE.CanvasTexture(btnCanvas);
  btnTex.colorSpace = THREE.SRGBColorSpace;
  function drawPomoBtnTexture() {
    const tc = themeColors();
    btnCtx2.fillStyle = tc.bgCss;
    btnCtx2.fillRect(0, 0, 384, 80);
    btnCtx2.fillStyle = tc.fgCss;
    btnCtx2.font = '300 24px "JetBrains Mono", monospace';
    btnCtx2.textAlign = 'center';
    btnCtx2.textBaseline = 'middle';
    btnCtx2.letterSpacing = '0.32em';
    btnCtx2.fillText('▷  POMODORO', 192, 44);
    btnTex.needsUpdate = true;
  }
  drawPomoBtnTexture();
  _themeRedrawHooks.push(drawPomoBtnTexture);

  const btnPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(BTN_W, BTN_H),
    new THREE.MeshBasicMaterial({ map: btnTex, transparent: true, opacity: 0, side: THREE.FrontSide })
  );
  btnPlane.position.set(BTN_X, BTN_Y, BTN_Z + 0.001);
  const btnFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(BTN_W, BTN_H, 0.04)),
    matBright
  );
  btnFrame.position.set(BTN_X, BTN_Y, BTN_Z);

  const btnHit = new THREE.Mesh(
    new THREE.BoxGeometry(BTN_W * 1.05, BTN_H * 1.5, 0.1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  btnHit.position.set(BTN_X, BTN_Y, BTN_Z);

  const btnGroup = new THREE.Group();
  btnGroup.add(btnPlane); btnGroup.add(btnFrame); btnGroup.add(btnHit);
  btnGroup.userData = {
    kind: 'pomoBtn',
    lines: [btnFrame],
    screen: btnPlane,
    hit: btnHit,
    baseMaterial: matBright,
  };
  scene.add(btnGroup);
  INTERACTABLES.push(btnGroup);
  // store ref so we can fade in the canvas plane
  window.__pomoBtnPlane = btnPlane;
}

// ════════════════════════════════════════════════════════
// Matrix rain — sits behind the TV grid, very faint, trilingual
// (Latin · Katakana · Thai · CJK — a memory palace can dream)
// ════════════════════════════════════════════════════════
const RAIN_W = 18, RAIN_H = 6;
const rainCanvasTex = document.createElement('canvas');
rainCanvasTex.width = 1024;
rainCanvasTex.height = 384;
const rainCtx = rainCanvasTex.getContext('2d');
const rainTex = new THREE.CanvasTexture(rainCanvasTex);
rainTex.colorSpace = THREE.SRGBColorSpace;
const rainMat = new THREE.MeshBasicMaterial({
  map: rainTex, transparent: true, opacity: 0,
  side: THREE.FrontSide, depthWrite: false
});
const rainPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(RAIN_W, RAIN_H), rainMat
);
rainPlane.position.set(0, 3.0, -10.4);  // slightly behind TV grid (TVs at z=-10)
scene.add(rainPlane);

const RAIN_COLS = Math.floor(rainCanvasTex.width / 16);
const rainDrops = new Array(RAIN_COLS).fill(0).map(() => Math.random() * 30);
const RAIN_CHARS =
  'アァカサタナハマヤラワガザダバパイィキシチニヒミリヰギジヂビピウヴクスツヌフムユルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨロヲゴゾドボポヴッン' +
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ' +
  '中道智慧记忆宫殿东京上海曼谷火光';

function drawRain() {
  // Trail fade — color matches the theme bg so older glyphs dissolve into it
  const trailRgb = CURRENT_THEME === 'dark' ? '0,0,0' : '245,245,240';
  const headRgb  = CURRENT_THEME === 'dark' ? '245,245,240' : '26,26,26';
  rainCtx.fillStyle = `rgba(${trailRgb}, 0.06)`;
  rainCtx.fillRect(0, 0, rainCanvasTex.width, rainCanvasTex.height);
  rainCtx.font = '14px "JetBrains Mono", "IBM Plex Sans Thai", monospace';
  for (let i = 0; i < rainDrops.length; i++) {
    const ch = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
    const x = i * 16, y = rainDrops[i] * 16;
    rainCtx.fillStyle = `rgba(${headRgb}, 0.9)`;
    rainCtx.fillText(ch, x, y);
    if (y > rainCanvasTex.height && Math.random() > 0.97) rainDrops[i] = 0;
    rainDrops[i] += 0.4 + Math.random() * 0.3;
  }
  rainTex.needsUpdate = true;
}

// ════════════════════════════════════════════════════════
// Command-room ticker walls (live data, perspective-projected)
//   LEFT  wall — financial: crypto · FX · weather
//   RIGHT wall — intel:     news · git activity · ops stats
// Each ticker is a long thin canvas-textured plane mounted on
// the side wall facing the room interior. The texture wraps
// horizontally and we animate offset.x so it scrolls forever.
// ════════════════════════════════════════════════════════
const TICKERS = [];

function createTicker(side, y, scrollSpeed) {
  const cv = document.createElement('canvas');
  cv.width = 2048; cv.height = 64;
  const ctx = cv.getContext('2d');
  // Fill black so transparency works cleanly
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0,
    side: THREE.FrontSide, depthWrite: false
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.34), mat);
  plane.position.set(side === 'left' ? -9.45 : 9.45, y, -1);
  plane.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  scene.add(plane);

  const tckr = { plane, mat, tex, ctx, cv, scrollSpeed, side };
  TICKERS.push(tckr);
  return tckr;
}

function setTickerText(t, text) {
  const { ctx, cv } = t;
  const c = themeColors();
  const fgRgb = CURRENT_THEME === 'dark' ? '245,245,240' : '26,26,26';
  t.lastText = text;  // cache for redraw on theme change
  ctx.fillStyle = c.bgCss;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = `rgba(${fgRgb}, 0.92)`;
  ctx.font = '300 30px "JetBrains Mono", "IBM Plex Sans Thai", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  ctx.fillText(text, 0, cv.height / 2);
  if (tw + 80 < cv.width) ctx.fillText(text, tw + 80, cv.height / 2);
  t.tex.needsUpdate = true;
}

// Spawn six tickers — three rows per wall
const tckrFx      = createTicker('left',  1.85, 0.00018);  // FX (medium)
const tckrCrypto  = createTicker('left',  2.65, 0.00012);  // Crypto (slow, top)
const tckrWx      = createTicker('left',  1.05, 0.00024);  // Weather/local (fast)
const tckrNews    = createTicker('right', 2.65, 0.00012);  // Headlines (slow, top)
const tckrCommits = createTicker('right', 1.85, 0.00018);  // Git activity (medium)
const tckrStats   = createTicker('right', 1.05, 0.00024);  // Ops stats (fast)

// Initial placeholder text so the walls aren't blank during first fetch
setTickerText(tckrFx,      ' • • •  USD/THB  •  EUR/THB  •  GBP/THB  •  JPY/THB  • • •  ');
setTickerText(tckrCrypto,  ' • • •  BTC  •  ETH  •  SOL  • • •  ');
setTickerText(tckrWx,      ' • • •  BANGKOK WEATHER  •  AQI  •  LOCAL TIME  • • •  ');
setTickerText(tckrNews,    ' • • •  HACKER NEWS  •  RECENT HEADLINES  • • •  ');
setTickerText(tckrCommits, ' • • •  GITHUB  •  RECENT COMMITS ACROSS NONARKARA REPOS  • • •  ');
setTickerText(tckrStats,   ' • • •  OPS STATUS  •  TUNNEL  •  WORKER  • • •  ');

// ── Fetchers ────────────────────────────────────────────
// Cached raw data so the plan-view BRIEF can paint without re-fetching.
window.__brief = window.__brief || {};

async function fetchFX() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-cache' });
    const d = await r.json();
    const thb     = d.rates.THB.toFixed(2);
    const sgdThb  = (d.rates.THB / d.rates.SGD).toFixed(2);
    const eurThb  = (d.rates.THB / d.rates.EUR).toFixed(2);
    const gbpThb  = (d.rates.THB / d.rates.GBP).toFixed(2);
    const jpyPer100 = (d.rates.THB / d.rates.JPY * 100).toFixed(2);
    const ts = new Date(d.time_last_update_unix * 1000).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
    setTickerText(tckrFx,
      `USD/THB ${thb}   ▪   SGD/THB ${sgdThb}   ▪   EUR/THB ${eurThb}   ▪   GBP/THB ${gbpThb}   ▪   JPY/THB ${jpyPer100} per 100   ▪   FX rates  ${ts} BKK   ▪   `
    );
    window.__brief.fx = { thb, sgdThb, eurThb, gbpThb, jpyPer100, ts };
    if (window.paintBrief) window.paintBrief();
  } catch (_) {}
}

async function fetchCouncil() {
  try {
    const r = await fetch('https://api.nonarkara.org/council', { cache: 'no-cache' });
    const d = await r.json();
    window.__brief.council = d;
    if (window.paintCouncil) window.paintCouncil();
  } catch (_) {}
}

// Fetch Dow Jones, NASDAQ, and key stocks via the existing
// /quote/ endpoint on api.nonarkara.org (Yahoo Finance proxy).
async function fetchStocks() {
  const symbols = [
    ['%5EDJI',  'dji',    'Dow Jones'],
    ['%5EIXIC', 'nasdaq', 'NASDAQ'],
    ['NVDA',    'nvda',   'Nvidia'],
    ['TSLA',    'tsla',   'Tesla'],
    ['GOOGL',   'googl',  'Google'],
    ['GC%3DF',  'gold',   'Gold'],
    ['BZ%3DF',  'brent',  'Brent'],
    ['PTT.BK',  'ptt',    'PTT'],
  ];
  const results = {};
  await Promise.all(symbols.map(async ([enc, key]) => {
    try {
      const r = await fetch(`https://api.nonarkara.org/quote/${enc}`, { cache: 'no-cache' });
      const d = await r.json();
      if (d?.price != null) results[key] = { price: d.price, change: d.change ?? 0 };
    } catch (_) {}
  }));
  if (Object.keys(results).length) {
    window.__brief.stocks = results;
    if (window.paintBrief) window.paintBrief();
  }
}

async function fetchSET() {
  try {
    const r = await fetch('https://api.nonarkara.org/quote/%5ESET.BK', { cache: 'no-cache' });
    const d = await r.json();
    if (d?.price != null) {
      window.__brief.set = {
        price: d.price,
        change: d.change ?? 0,
      };
      if (window.paintBrief) window.paintBrief();
    }
  } catch (_) {}
}

async function fetchCrypto() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', { cache: 'no-cache' });
    const d = await r.json();
    const fmt = (k, sym) => {
      const p = d[k]; if (!p) return '';
      const price = p.usd >= 1000
        ? p.usd.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : p.usd.toFixed(2);
      const change = p.usd_24h_change ?? 0;
      const arrow = change >= 0 ? '▲' : '▼';
      return `${sym} $${price}  ${arrow} ${Math.abs(change).toFixed(2)}%`;
    };
    setTickerText(tckrCrypto,
      `${fmt('bitcoin','BTC')}   ▪   ${fmt('ethereum','ETH')}   ▪   ${fmt('solana','SOL')}   ▪   crypto live   ▪   `
    );
    const cache = (k, sym) => {
      const p = d[k]; if (!p) return null;
      return { sym, usd: p.usd, change: p.usd_24h_change ?? 0 };
    };
    window.__brief.crypto = {
      btc: cache('bitcoin', 'BTC'),
      eth: cache('ethereum', 'ETH'),
      sol: cache('solana', 'SOL'),
    };
    if (window.paintBrief) window.paintBrief();
  } catch (_) {}
}

async function fetchWx() {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=13.75&longitude=100.5&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code', { cache: 'no-cache' });
    const d = await r.json();
    const c = d.current;
    const codeMap = {0:'clear',1:'mainly clear',2:'partly cloudy',3:'overcast',45:'fog',48:'fog',51:'drizzle',53:'drizzle',55:'drizzle',61:'rain',63:'rain',65:'rain',80:'rain',81:'rain',82:'heavy rain',95:'thunderstorm',96:'thunderstorm',99:'thunderstorm'};
    const wx = codeMap[c.weather_code] || 'mild';
    const time = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setTickerText(tckrWx,
      `BANGKOK ${c.temperature_2m}°C ${wx}   ▪   humidity ${c.relative_humidity_2m}%   ▪   wind ${c.wind_speed_10m} km/h   ▪   ${time} BKK   ▪   `
    );
    window.__brief.wx = {
      temp: c.temperature_2m,
      desc: wx,
      humidity: c.relative_humidity_2m,
      wind: c.wind_speed_10m,
    };
    if (window.paintBrief) window.paintBrief();
  } catch (_) {}
}

async function fetchAQI() {
  // Open-Meteo air quality API — free, no key, CORS open.
  // Returns US AQI + PM2.5 for Bangkok. AQI categories:
  //   0–50    Good · 51–100 Moderate · 101–150 Sensitive · 151–200 Unhealthy
  //   201–300 Very Unhealthy · 301+ Hazardous
  try {
    const r = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=13.75&longitude=100.5&current=us_aqi,pm2_5', { cache: 'no-cache' });
    const d = await r.json();
    const aqi = d.current?.us_aqi;
    const pm25 = d.current?.pm2_5;
    const level = aqi == null ? '—'
      : aqi <= 50  ? 'good'
      : aqi <= 100 ? 'moderate'
      : aqi <= 150 ? 'sensitive'
      : aqi <= 200 ? 'unhealthy'
      : aqi <= 300 ? 'very unhealthy'
      :              'hazardous';
    window.__brief.aqi = { aqi, pm25, level };
    if (window.paintBrief) window.paintBrief();
  } catch (_) {}
}

async function fetchNews() {
  try {
    const idsResp = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', { cache: 'no-cache' });
    const ids = (await idsResp.json()).slice(0, 5);
    const stories = await Promise.all(ids.map(id =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
    ));
    const text = stories.filter(Boolean).map(s => `HN · ${(s.title || '').slice(0, 95)}`).join('   ▪   ') + '   ▪   ';
    setTickerText(tckrNews, text);
  } catch (_) {}
}

async function fetchCommits() {
  try {
    const r = await fetch('https://api.github.com/users/Nonarkara/events/public?per_page=20', { cache: 'no-cache' });
    const events = await r.json();
    const items = events
      .filter(e => e.type === 'PushEvent' && e.payload?.commits?.length)
      .slice(0, 6)
      .map(e => `${e.repo.name.split('/').pop()} · ${(e.payload.commits[0].message || '').split('\n')[0].slice(0, 70)}`)
      .join('   ▪   ');
    setTickerText(tckrCommits, items ? `GITHUB · ${items}   ▪   ` : 'no recent push activity');
  } catch (_) {}
}

async function fetchStats() {
  try {
    const r = await fetch('https://api.nonarkara.org/status', { cache: 'no-cache' });
    const d = await r.json();
    const total = Object.keys(d.sites || {}).length;
    const ok = Object.values(d.sites || {}).filter(v => [200, 301, 302].includes(v.code)).length;
    const ts = new Date(d.ts).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false });
    setTickerText(tckrStats,
      `OPS ${ok}/${total} OK   ▪   tunnel active   ▪   worker live   ▪   last check ${ts} BKK   ▪   `
    );
  } catch (_) {}
}

// Re-render every ticker on theme change with their cached text
_themeRedrawHooks.push(() => {
  TICKERS.forEach(t => { if (t.lastText) setTickerText(t, t.lastText); });
});

// First fetches + periodic refresh schedules
fetchFX(); fetchCrypto(); fetchWx(); fetchAQI(); fetchNews(); fetchCommits(); fetchStats(); fetchSET(); fetchStocks(); fetchCouncil();
setInterval(fetchFX,      5  * 60_000);
setInterval(fetchCrypto,  60_000);
setInterval(fetchWx,      10 * 60_000);
setInterval(fetchAQI,     15 * 60_000);   // AQI changes slowly
setInterval(fetchNews,    15 * 60_000);
setInterval(fetchCommits, 5  * 60_000);
setInterval(fetchStats,   60_000);
setInterval(fetchSET,     5  * 60_000);
setInterval(fetchStocks,  5  * 60_000);
setInterval(fetchCouncil, 60_000);    // council-watch ticks every 5m, we sample every 1m

// ════════════════════════════════════════════════════════
// TVs at far wall (5 × 4 grid = 20)
// ════════════════════════════════════════════════════════
const TV_W = 1.22, TV_H = 0.72;
const GAP_X = 0.18, GAP_Y = 0.20;
const COLS = 5;
const ROWS = Math.ceil(PROJECTS.length / COLS);
const tvLoader = new THREE.TextureLoader();
const TVs = [];

// Center any partial last row instead of left-aligning it.
// (e.g. 21 projects → 4 full rows of 5 + 1 row of 1, centered.)
const LAST_ROW_COUNT = PROJECTS.length - (ROWS - 1) * COLS;
PROJECTS.forEach((p, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const colsThisRow = (row === ROWS - 1) ? LAST_ROW_COUNT : COLS;
  const cx = (col - (colsThisRow - 1) / 2) * (TV_W + GAP_X);
  const cy = 2.4 + ((ROWS - 1) / 2 - row) * (TV_H + GAP_Y);
  const cz = -10;

  const grp = new THREE.Group();
  grp.position.set(cx, cy, cz);

  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(TV_W, TV_H, 0.06)),
    matBright
  );
  grp.add(frame);

  const tex = tvLoader.load(p.img, (t) => { t.colorSpace = THREE.SRGBColorSpace; });
  const screenMat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0,
    side: THREE.FrontSide, depthWrite: false
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(TV_W * 0.94, TV_H * 0.88), screenMat);
  screen.position.z = 0.04;
  grp.add(screen);

  // Status dot — small filled square in lower-right
  const dotGeo = new THREE.PlaneGeometry(0.04, 0.04);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0 });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.set(TV_W / 2 - 0.06, -TV_H / 2 + 0.06, 0.05);
  grp.add(dot);

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(TV_W, TV_H, 0.08),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  grp.add(hit);

  grp.userData = {
    kind: 'tv',
    project: p,
    frame, screen, dot, dotMat, hit,
    screenTargetOpacity: 0.45,
    baseMaterial: matBright,
  };
  scene.add(grp);
  INTERACTABLES.push(grp);
  TVs.push(grp);
});

// ════════════════════════════════════════════════════════
// BRIEF projection — big headline numbers above the TV grid.
// Sits on the back wall, dominating the eye-line on first look:
// USD/THB · BTC · ETH · SOL · weather. Drawn via canvas texture
// so it can repaint live without re-creating geometry.
// ════════════════════════════════════════════════════════
{
  const W = 8.5, H = 1.0;
  const briefCanvas = document.createElement('canvas');
  briefCanvas.width = 2048; briefCanvas.height = 240;
  const bctx = briefCanvas.getContext('2d');

  function drawBrief() {
    const tc = themeColors();
    bctx.clearRect(0, 0, 2048, 240);
    bctx.fillStyle = tc.bgCss;
    bctx.fillRect(0, 0, 2048, 240);

    const b = window.__brief || {};
    const cells = [];
    if (b.fx)         cells.push({ lbl: 'USD/THB', val: b.fx.thb,                           sub: '' });
    if (b.fx?.sgdThb) cells.push({ lbl: 'SGD/THB', val: b.fx.sgdThb,                        sub: '' });
    if (b.crypto?.btc) cells.push({ lbl: 'BTC',     val: '$' + Math.round(b.crypto.btc.usd).toLocaleString(), sub: (b.crypto.btc.change >= 0 ? '▲ ' : '▼ ') + Math.abs(b.crypto.btc.change).toFixed(1) + '%', up: b.crypto.btc.change >= 0 });
    if (b.set)        cells.push({ lbl: 'SET TH',  val: b.set.price.toLocaleString('en-US', { maximumFractionDigits: 0 }), sub: (b.set.change >= 0 ? '▲ ' : '▼ ') + Math.abs(b.set.change).toFixed(1) + '%', up: b.set.change >= 0 });
    if (b.wx)         cells.push({ lbl: 'BANGKOK', val: b.wx.temp + '°C',                  sub: b.wx.desc });

    // Loading skeleton
    if (cells.length === 0) {
      bctx.fillStyle = `rgba(${CURRENT_THEME === 'dark' ? '245,245,240' : '26,26,26'}, 0.25)`;
      bctx.font = '300 36px "JetBrains Mono", monospace';
      bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
      bctx.letterSpacing = '0.32em';
      bctx.fillText('LOADING DAILY BRIEF', 1024, 120);
      briefTex.needsUpdate = true;
      return;
    }

    const colW = 2048 / cells.length;
    cells.forEach((c, i) => {
      const cx = colW * i + colW / 2;
      // separator hairline
      if (i > 0) {
        bctx.strokeStyle = `rgba(${CURRENT_THEME === 'dark' ? '245,245,240' : '26,26,26'}, 0.20)`;
        bctx.lineWidth = 1;
        bctx.beginPath(); bctx.moveTo(colW * i, 50); bctx.lineTo(colW * i, 190); bctx.stroke();
      }
      // label
      bctx.fillStyle = tc.fgCss;
      bctx.globalAlpha = 0.45;
      bctx.font = '300 22px "JetBrains Mono", monospace';
      bctx.textAlign = 'center'; bctx.textBaseline = 'top';
      bctx.fillText(c.lbl, cx, 36);
      // value (big)
      bctx.globalAlpha = 1;
      bctx.font = '300 88px "JetBrains Mono", monospace';
      bctx.textBaseline = 'middle';
      bctx.fillText(c.val, cx, 130);
      // sub
      if (c.sub) {
        bctx.globalAlpha = 0.6;
        bctx.font = '300 22px "JetBrains Mono", monospace';
        bctx.textBaseline = 'top';
        bctx.fillStyle = c.up === false ? '#c44' : (c.up === true ? tc.accentCss : tc.fgCss);
        bctx.fillText(c.sub, cx, 192);
      }
    });
    bctx.globalAlpha = 1;
    briefTex.needsUpdate = true;
  }

  const briefTex = new THREE.CanvasTexture(briefCanvas);
  briefTex.colorSpace = THREE.SRGBColorSpace;
  const briefMat = new THREE.MeshBasicMaterial({
    map: briefTex, transparent: true, opacity: 0,
    side: THREE.FrontSide, depthWrite: false,
  });
  const briefPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H), briefMat
  );
  // Position: above the TV grid on the back wall (z=-10).
  // TVs span y ≈ 1.4..3.7, so the brief sits at y ≈ 4.4.
  briefPlane.position.set(0, 4.55, -9.97);
  scene.add(briefPlane);
  window.__brief.plane = briefPlane;

  drawBrief();
  _themeRedrawHooks.push(drawBrief);
  // Hook into paintBrief so room repaints alongside plan
  const _origPaintBrief = window.paintBrief;
  window.paintBrief = function () {
    try { drawBrief(); } catch (_) {}
    if (_origPaintBrief) _origPaintBrief();
  };
}

// ════════════════════════════════════════════════════════
// The OTHER side — when you spin 180° from the TV grid, you face
// a wireframe front wall with a locked door and a big projection
// of rotating aphorisms from Dr Non's nonharvard blog. Sharp words
// in his voice, fading every 25 seconds.
// ════════════════════════════════════════════════════════
{
  const FRONT_Z = 9.5;            // front wall sits beyond camera (camera at z=5.5..7.5)
  const FW_W = 19, FW_H = 5;      // wall outline frame width × height

  // Wireframe wall outline
  const wallFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(FW_W, FW_H, 0.04)),
    matFurni
  );
  wallFrame.position.set(0, 2.5, FRONT_Z);
  scene.add(wallFrame);

  // Locked door — wireframe rectangle on the right of the wall
  const DOOR_W = 1.4, DOOR_H = 3.2, DOOR_X = 5.5;
  const doorFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.06)),
    matFurni
  );
  doorFrame.position.set(DOOR_X, DOOR_H / 2 + 0.05, FRONT_Z - 0.03);
  scene.add(doorFrame);
  // Door handle — a small cube
  const doorHandle = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.06, 0.06, 0.06)),
    matBright
  );
  doorHandle.position.set(DOOR_X - DOOR_W * 0.4, DOOR_H * 0.5, FRONT_Z - 0.05);
  scene.add(doorHandle);
  // 🔒 label texture beside the door
  {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const cx = c.getContext('2d');
    function drawLockLabel() {
      const tc = themeColors();
      cx.clearRect(0, 0, 256, 96);
      cx.fillStyle = tc.fgCss;
      cx.font = '300 32px "JetBrains Mono", monospace';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.globalAlpha = 0.55;
      cx.fillText('🔒  LOCKED', 128, 48);
      cx.globalAlpha = 1;
      lockTex.needsUpdate = true;
    }
    const lockTex = new THREE.CanvasTexture(c);
    lockTex.colorSpace = THREE.SRGBColorSpace;
    const lockMat = new THREE.MeshBasicMaterial({
      map: lockTex, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const lockPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.4), lockMat);
    lockPlane.position.set(DOOR_X, 0.4, FRONT_Z - 0.04);
    // Face the camera (camera looks at +Z when rotated 180°, so plane normal toward -Z works)
    lockPlane.rotation.y = Math.PI;
    scene.add(lockPlane);
    window.__frontDoorLockPlane = lockPlane;
    drawLockLabel();
    _themeRedrawHooks.push(drawLockLabel);
  }

  // ── Aphorism projection on the front wall ─────────────────
  // 30+ short aphorisms in Dr Non's voice, drawn from his
  // nonharvard.wordpress.com corpus + Soul/Voice-Anchor.
  // Rotates every 25s. Sharp words. No fluff.
  const APHORISMS = [
    'Harvard: a for-profit company in Massachusetts authorized by law to act as a single entity that thinks of itself as an educational institution.',
    'It would be okay if I die today.',
    'The wheel hasn’t arrived yet — the data isn’t in.',
    'Boredom is the floor of creativity. Stay on it.',
    'Reality may be a simulation. Work the symbols anyway.',
    'Most engineering wastes itself in the gap between cron and real-time.',
    'A dashboard refreshing every five minutes is, to a human eye, indistinguishable from real-time.',
    'You might be right at this point.',
    'Time is the only asset you cannot print more of.',
    'The most expensive thing you spend today is attention.',
    'Subtract before you add.',
    'Every UI element must earn its pixels.',
    'What you keep choosing not to do becomes who you are.',
    'Help others first. Help yourself second. The work is help.',
    'It is all happening. It will all be okay.',
    'Confidence is built by failing in public.',
    'No money buys back a wasted twenty-five minutes.',
    'The simplest move is the next move.',
    'Tedium is the tax. Pay it once and move on.',
    'A city is legible to the people who live in it, or it is not a city.',
    'If the world ends in twenty-five minutes, this still mattered.',
    'Eight tabs open. The work is in this one.',
    'Possession is the disease this whole worldview diagnoses.',
    'Build your portfolio for yourself first. Then everyone else.',
    'Live to the end. The fun is in the flow.',
  ];

  // 100-inch projection screen — bigger than the in-room TVs put
  // together. Sits centered on the front wall.
  const APH_W = 14, APH_H = 2.8;
  const aphCanvas = document.createElement('canvas');
  aphCanvas.width = 2400; aphCanvas.height = 380;
  const actx = aphCanvas.getContext('2d');
  let aphIndex = -1;
  let aphFade = 0;             // 0..1 fade-in progress
  let aphFadeDir = 1;          // +1 fading in, -1 fading out
  let aphLastSwap = performance.now();
  let aphCurrent = '';
  let aphNext = '';

  function pickAphorism() {
    let i;
    do { i = Math.floor(Math.random() * APHORISMS.length); } while (i === aphIndex && APHORISMS.length > 1);
    aphIndex = i;
    return APHORISMS[i];
  }

  function drawAphorism() {
    const tc = themeColors();
    actx.clearRect(0, 0, 2400, 380);
    // text
    actx.fillStyle = tc.fgCss;
    actx.globalAlpha = aphFade;
    actx.font = '300 italic 56px "Josefin Sans", system-ui, sans-serif';
    actx.textAlign = 'center'; actx.textBaseline = 'middle';
    // Word-wrap if too long
    const txt = aphCurrent;
    const words = txt.split(' ');
    const maxW = 2200;
    let lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (actx.measureText(test).width > maxW) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    const lh = 70;
    const y0 = 380 / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => actx.fillText(l, 1200, y0 + i * lh));
    // small attribution
    actx.font = '300 22px "JetBrains Mono", monospace';
    actx.globalAlpha = aphFade * 0.4;
    actx.fillText('— nonharvard', 1200, 360);
    actx.globalAlpha = 1;
    aphTex.needsUpdate = true;
  }

  const aphTex = new THREE.CanvasTexture(aphCanvas);
  aphTex.colorSpace = THREE.SRGBColorSpace;
  const aphMat = new THREE.MeshBasicMaterial({
    map: aphTex, transparent: true, opacity: 0,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const aphPlane = new THREE.Mesh(new THREE.PlaneGeometry(APH_W, APH_H), aphMat);
  aphPlane.position.set(-1.5, 2.8, FRONT_Z - 0.03);   // centered on the wall, just left of the door
  aphPlane.rotation.y = Math.PI;        // face camera when rotated 180°
  scene.add(aphPlane);
  window.__aphPlane = aphPlane;
  window.__aphMat = aphMat;
  _themeRedrawHooks.push(drawAphorism);

  // ── Wireframe screen frame around the projection ──────────
  const screenFrame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(APH_W + 0.4, APH_H + 0.4, 0.04)),
    matFurni
  );
  screenFrame.position.set(-1.5, 2.8, FRONT_Z - 0.04);
  scene.add(screenFrame);

  // ── Translucent Dr Non photo rotator ──────────────────────
  // Photos sit BEHIND the aphorism plane (further from the camera by
  // 0.06 units) at low opacity, so the room feels like a projection
  // booth — words foreground, image ghosted behind.
  const PORTRAIT_FILES = [
    'portraits/01-speaker.jpg',
    'portraits/02-depa.jpg',
    'portraits/03-asean.jpg',
    'portraits/04-roundtable.jpg',
  ];
  const portraitLoader = new THREE.TextureLoader();
  const portraitMats = PORTRAIT_FILES.map(src => {
    const tex = portraitLoader.load(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
  });
  // Same geometry size as aphorism plane so words sit on top of the photo.
  const portraitPlane = new THREE.Mesh(new THREE.PlaneGeometry(APH_W, APH_H), portraitMats[0]);
  portraitPlane.position.set(-1.5, 2.8, FRONT_Z - 0.06);
  portraitPlane.rotation.y = Math.PI;
  scene.add(portraitPlane);
  window.__portraitPlane = portraitPlane;
  window.__portraitMats = portraitMats;
  window.__portraitIdx = 0;
  window.__portraitLastSwap = performance.now();
  window.__portraitFade = 0;       // 0..1 cross-fade progress
  window.__portraitFadeDir = 1;

  // tick — call from animate()
  window.__tickAphorism = function (now) {
    const elapsedSinceSwap = now - aphLastSwap;
    // First-time bootstrap
    if (!aphCurrent) {
      aphCurrent = pickAphorism();
      aphFade = 0; aphFadeDir = 1;
      aphLastSwap = now;
      drawAphorism();
    }
    // Fade animation
    if (aphFadeDir === 1) {
      aphFade = Math.min(1, aphFade + 0.016);
      if (aphFade >= 1 && elapsedSinceSwap > 23000) aphFadeDir = -1;
      drawAphorism();
    } else {
      aphFade = Math.max(0, aphFade - 0.016);
      if (aphFade <= 0) {
        aphCurrent = pickAphorism();
        aphFadeDir = 1;
        aphLastSwap = now;
      }
      drawAphorism();
    }
  };
}

// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// Side-wall posters
//   RIGHT WALL  — Total Domination (x=+9.3, facing left).
//                 Click → opens the FRAME gallery (25-min museum).
//   LEFT WALL   — Portrait gallery (x=-9.3, facing right).
//                 Click → opens the portrait picker / share sheet.
// ════════════════════════════════════════════════════════
{
  const texLoader2 = new THREE.TextureLoader();

  // ── 1. Total Domination poster ──────────────────────────
  const tdTex = texLoader2.load('portraits/total-domination.jpg');
  tdTex.colorSpace = THREE.SRGBColorSpace;
  const tdMat = new THREE.MeshBasicMaterial({
    map: tdTex, transparent: true, opacity: 0,
    side: THREE.FrontSide, depthWrite: false,
  });
  const TD_W = 2.2, TD_H = 2.8;
  const tdPlane = new THREE.Mesh(new THREE.PlaneGeometry(TD_W, TD_H), tdMat);
  tdPlane.position.set(9.25, 2.5, -1.5);
  tdPlane.rotation.y = -Math.PI / 2;          // face into room
  scene.add(tdPlane);

  // Wireframe poster border
  const tdBorder = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(TD_W + 0.06, TD_H + 0.06, 0.04)),
    matBright
  );
  tdBorder.position.copy(tdPlane.position);
  tdBorder.rotation.copy(tdPlane.rotation);
  scene.add(tdBorder);

  // Hit volume
  const tdHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, TD_H + 0.2, TD_W + 0.2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  tdHit.position.copy(tdPlane.position);
  const tdGroup = new THREE.Group();
  tdGroup.position.set(0, 0, 0);
  scene.add(tdGroup);
  // Use a flat group at the plane's world pos — simpler approach:
  const tdObj = new THREE.Group();
  tdObj.position.copy(tdPlane.position);
  scene.add(tdObj);
  const tdHitLocal = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, TD_H + 0.4, TD_W + 0.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  tdObj.add(tdHitLocal);
  tdObj.userData = {
    kind: 'poster',
    action: 'frame',
    lines: [tdBorder],
    hit: tdHitLocal,
    baseMaterial: matFurni,
  };
  INTERACTABLES.push(tdObj);
  window.__tdMat = tdMat;
  FADE_TARGETS.push({ mat: tdMat, target: 0.95 });

  // ── 2. Portrait gallery frame ───────────────────────────
  // Shows portrait-01 (the pink-background formal) as a preview.
  const p1Tex = texLoader2.load('portraits/p-01-formal-2024.jpg');
  p1Tex.colorSpace = THREE.SRGBColorSpace;
  const pgMat = new THREE.MeshBasicMaterial({
    map: p1Tex, transparent: true, opacity: 0,
    side: THREE.FrontSide, depthWrite: false,
  });
  const PG_W = 1.5, PG_H = 2.0;
  const pgPlane = new THREE.Mesh(new THREE.PlaneGeometry(PG_W, PG_H), pgMat);
  pgPlane.position.set(-9.25, 2.6, 0.8);
  pgPlane.rotation.y = Math.PI / 2;           // face into room
  scene.add(pgPlane);

  // Frame border — slightly amber to read as "portrait gallery"
  const pgBorder = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(PG_W + 0.08, PG_H + 0.08, 0.04)),
    matHover
  );
  pgBorder.position.copy(pgPlane.position);
  pgBorder.rotation.copy(pgPlane.rotation);
  scene.add(pgBorder);

  const pgObj = new THREE.Group();
  pgObj.position.copy(pgPlane.position);
  scene.add(pgObj);
  const pgHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, PG_H + 0.4, PG_W + 0.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  pgObj.add(pgHit);
  pgObj.userData = {
    kind: 'poster',
    action: 'portraits',
    lines: [pgBorder],
    hit: pgHit,
    baseMaterial: matHover,
  };
  INTERACTABLES.push(pgObj);
  FADE_TARGETS.push({ mat: pgMat, target: 0.95 });

  // Small "PORTRAITS" label below the frame
  const pgLabelC = document.createElement('canvas');
  pgLabelC.width = 512; pgLabelC.height = 80;
  const pgLCtx = pgLabelC.getContext('2d');
  pgLCtx.fillStyle = 'rgba(0,0,0,0)';
  pgLCtx.fillRect(0, 0, 512, 80);
  pgLCtx.fillStyle = '#f5f5f0';
  pgLCtx.font = '300 28px "JetBrains Mono", monospace';
  pgLCtx.textAlign = 'center';
  pgLCtx.letterSpacing = '0.28em';
  pgLCtx.fillText('DR NON · PORTRAITS', 256, 50);
  const pgLabelTex = new THREE.CanvasTexture(pgLabelC);
  const pgLabelMat = new THREE.MeshBasicMaterial({
    map: pgLabelTex, transparent: true, opacity: 0,
    side: THREE.FrontSide, depthWrite: false,
  });
  const pgLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.22), pgLabelMat);
  pgLabel.position.set(-9.22, pgPlane.position.y - PG_H / 2 - 0.2, pgPlane.position.z);
  pgLabel.rotation.y = Math.PI / 2;
  scene.add(pgLabel);
  FADE_TARGETS.push({ mat: pgLabelMat, target: 0.85 });
}

// CEILING — wireframe grid that mirrors the floor. Cyberpunk.
// Real specular reflection is heavy on phones, so we draw the
// mirror visually: a grid above with the same spacing + amber
// equator like the floor. Looking up = seeing the room reflected.
// ════════════════════════════════════════════════════════
{
  const CEIL_Y = 5.0;
  const CEIL_SIZE = 22;
  const ceilGrid = new THREE.GridHelper(CEIL_SIZE, 22, 0x666666, 0x666666);
  ceilGrid.material = matFurni;
  ceilGrid.position.y = CEIL_Y;
  scene.add(ceilGrid);
  // Inverted-perspective amber equator — a single line across the ceiling
  // matching the floor's amber stripe. Adds the "reflected" feel.
  const equatorGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-CEIL_SIZE / 2, CEIL_Y - 0.001, 0),
    new THREE.Vector3( CEIL_SIZE / 2, CEIL_Y - 0.001, 0),
  ]);
  const equatorMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 });
  const equator = new THREE.Line(equatorGeom, equatorMat);
  scene.add(equator);
  window.__ceilingEquator = equatorMat;
}

// ════════════════════════════════════════════════════════
// University badges — three wireframe crests hanging from the
// ceiling, each linked to Dr Non's profile at that institution.
// Click → URL modal (auto-flips to crimson via isPersonalUrl).
// Hexagonal wireframe (signals "crest" without copying a literal
// shield), labeled below with university name + degree year.
// ════════════════════════════════════════════════════════
{
  const BADGES = [
    { code: 'HARVARD', label: 'HARVARD', sub: 'YENCHING · 2014',
      url: 'https://www.harvard-yenching.org/person/non-arkaraprasertkul/', x: -3.0 },
    { code: 'MIT',     label: 'MIT',     sub: 'M.ARCH · 2007',
      url: 'https://www.researchgate.net/profile/Non-Arkaraprasertkul', x: 0 },
    { code: 'OXFORD',  label: 'OXFORD',  sub: 'D.PHIL · 2014',
      url: 'https://scholar.google.com/citations?user=cKPauPQAAAAJ', x: 3.0 },
  ];

  const BADGE_R = 0.55, BADGE_Y = 4.4, BADGE_Z = 1.5;

  BADGES.forEach((b) => {
    const group = new THREE.Group();
    group.position.set(b.x, BADGE_Y, BADGE_Z);
    // Tilt slightly toward the room center (so they read clearly when
    // you tilt your head/phone up from the middle of the room).
    group.rotation.x = -Math.PI * 0.18;

    const lines = [];

    // Hexagonal crest outline — wireframe ring + inner ring.
    const hex = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.CircleGeometry(BADGE_R, 6)),
      matBright
    );
    group.add(hex); lines.push(hex);
    const hexInner = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.CircleGeometry(BADGE_R * 0.7, 6)),
      matFurni
    );
    group.add(hexInner); lines.push(hexInner);

    // Suspension line from ceiling to badge top
    const chainGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,  BADGE_R + 0.02, 0),
      new THREE.Vector3(0,  5.0 - BADGE_Y, 0),
    ]);
    const chain = new THREE.Line(chainGeom, matFurni);
    group.add(chain); lines.push(chain);

    // Label canvas — name + sub. Repaints on theme change.
    const c = document.createElement('canvas');
    c.width = 768; c.height = 256;
    const cx = c.getContext('2d');
    function drawLabel() {
      const tc = themeColors();
      cx.clearRect(0, 0, 768, 256);
      cx.fillStyle = tc.fgCss;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.font = '300 92px "Josefin Sans", system-ui, sans-serif';
      cx.fillText(b.label, 384, 100);
      cx.globalAlpha = 0.55;
      cx.font = '300 36px "JetBrains Mono", monospace';
      cx.fillText(b.sub, 384, 192);
      cx.globalAlpha = 1;
      tex.needsUpdate = true;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const labelPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), mat);
    labelPlane.position.set(0, -BADGE_R - 0.25, 0);
    group.add(labelPlane);
    window.__badgeMats = window.__badgeMats || [];
    window.__badgeMats.push(mat);
    drawLabel();
    _themeRedrawHooks.push(drawLabel);

    // Hit volume — generous, includes the chain
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, BADGE_R * 2 + 0.45, 0.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.set(0, -0.1, 0);
    group.add(hit);

    group.userData = {
      kind: 'badge',
      badge: b,
      lines,
      hit,
      baseMaterial: matBright,
    };
    scene.add(group);
    INTERACTABLES.push(group);
  });
}

// ════════════════════════════════════════════════════════
// The mind layer — what makes the room read as a mind, not a
// showroom. Three pieces:
//   1. Synaptic graph: hairline curves between thematically-related
//      objects (badge → project, project → project) so you can see
//      the lineage of his thinking, not just the artifacts.
//   2. Thought pulse: a tiny bright dot travels one connection at a
//      time on a ~6s loop. Reads like a synapse firing.
//   3. Drifting cognition: ~600 ambient particles slowly falling
//      through the room volume. The air becomes alive.
// ════════════════════════════════════════════════════════
{
  // Find world position for a TV by code (TVs share back-wall z=-10)
  const tvByCode = new Map();
  TVs.forEach(g => tvByCode.set(g.userData.project.code, g.position.clone()));

  // Badges are at y=4.4, z=1.5 — index in scene by their crest hexagon
  // (we walk INTERACTABLES instead of keeping a global registry).
  const badgePos = {};
  INTERACTABLES.forEach(g => {
    if (g.userData?.kind === 'badge') {
      badgePos[g.userData.badge.code] = g.position.clone();
    }
  });

  // Furniture references
  const aphPos     = new THREE.Vector3(-1.5, 2.8, 9.5);    // aphorism wall
  const bookshelf  = new THREE.Vector3(-7.0, 1.6, -2.2);
  const pedestal   = new THREE.Vector3( 4.0, 1.0, -2.0);
  const recordPos  = new THREE.Vector3(-3.4, 0.78, -1.6);

  // Connections — pairs that read as intellectual lineage. Each
  // connection is one curved line. Endpoints are world positions.
  const linksRaw = [
    // Harvard ↔ anthropology / cities ↔ conflict
    ['HARVARD',  tvByCode.get('CONFLICT')],
    ['HARVARD',  tvByCode.get('MEM')],
    ['HARVARD',  tvByCode.get('GEO')],
    // MIT ↔ smart-city work
    ['MIT',      tvByCode.get('SCITI')],
    ['MIT',      tvByCode.get('SLIC')],
    ['MIT',      tvByCode.get('KUCHING')],
    ['MIT',      tvByCode.get('SOLOMON')],
    // Oxford ↔ research / academic
    ['OXFORD',   tvByCode.get('ACADEMIC')],
    ['OXFORD',   tvByCode.get('RESEARCH')],
    // Project clusters (smart-city family across SE Asia)
    [tvByCode.get('SCITI'),  tvByCode.get('SLIC')],
    [tvByCode.get('SLIC'),   tvByCode.get('KUCHING')],
    [tvByCode.get('PHUKET'), tvByCode.get('BUS')],
    [tvByCode.get('PHUKET'), tvByCode.get('WAR ROOM')],
    // Conflict / geopolitics cluster
    [tvByCode.get('CONFLICT'), tvByCode.get('MEM')],
    [tvByCode.get('CONFLICT'), tvByCode.get('GEO')],
    // Identity ↔ writing
    [bookshelf, tvByCode.get('NOVELS')],
    [bookshelf, tvByCode.get('ESSAYS')],
    // Music ↔ aphorism wall (the soundtrack to the thinking)
    [recordPos, aphPos],
  ];

  // Resolve string references
  const links = linksRaw
    .map(([a, b]) => [
      typeof a === 'string' ? badgePos[a] : a,
      typeof b === 'string' ? badgePos[b] : b,
    ])
    .filter(([a, b]) => a && b);

  // Build curved geometry for each link — bezier through a midpoint
  // raised in Y, so connections arc gently rather than cutting through
  // the floor. 24 sample points per arc.
  const SAMPLES = 24;
  const linkLineMat = new THREE.LineBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.0,
  });
  const linkArcs = [];
  links.forEach(([a, b]) => {
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 1.2 + Math.random() * 0.8;       // arc up
    const pts = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      // Quadratic bezier
      const p = a.clone().multiplyScalar((1 - t) * (1 - t))
        .add(mid.clone().multiplyScalar(2 * (1 - t) * t))
        .add(b.clone().multiplyScalar(t * t));
      pts.push(p);
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geom, linkLineMat);
    scene.add(line);
    linkArcs.push({ line, pts, length: pts.length });
  });
  window.__linkLineMat = linkLineMat;

  // Thought pulse — small amber sphere that travels one arc at a
  // time. Picks the next arc when it reaches the end.
  const pulseGeom = new THREE.SphereGeometry(0.07, 8, 6);
  const pulseMat  = new THREE.MeshBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0.0,
  });
  const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
  pulseMesh.visible = false;
  scene.add(pulseMesh);
  let pulseArcIdx = 0;
  let pulseT = 0;          // 0..1 along current arc
  let pulseDwell = 0;      // post-arc dwell counter
  window.__tickPulse = function () {
    if (!linkArcs.length) return;
    if (pulseDwell > 0) { pulseDwell--; return; }
    const arc = linkArcs[pulseArcIdx];
    pulseT += 0.012;       // ~80 frames per arc, ~1.3s at 60fps
    if (pulseT >= 1) {
      pulseT = 0;
      pulseArcIdx = (pulseArcIdx + 1) % linkArcs.length;
      pulseDwell = 240 + Math.floor(Math.random() * 240);   // 4-8s pause
      pulseMat.opacity = 0;
      pulseMesh.visible = false;
      return;
    }
    const i = Math.floor(pulseT * arc.length);
    pulseMesh.position.copy(arc.pts[Math.min(i, arc.length - 1)]);
    // Fade in over first 20%, hold, fade out last 20%
    const op = pulseT < 0.2 ? pulseT / 0.2 : (pulseT > 0.8 ? (1 - pulseT) / 0.2 : 1);
    pulseMat.opacity = op * 0.85;
    pulseMesh.visible = true;
  };

  // Drifting cognition particles — Three.js Points geometry,
  // ~600 motes, slowly falling through the room volume.
  const PARTICLE_COUNT = 600;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const speeds = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 18;       // x: ±9
    positions[i * 3 + 1] = Math.random() * 5;                // y: 0..5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18;       // z: ±9
    speeds[i] = 0.0008 + Math.random() * 0.0014;
  }
  const partGeom = new THREE.BufferGeometry();
  partGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const partMat = new THREE.PointsMaterial({
    color: 0xf5f5f0,
    size: 0.04,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.0,
  });
  const particles = new THREE.Points(partGeom, partMat);
  scene.add(particles);
  window.__partMat = partMat;
  window.__tickParticles = function () {
    const p = partGeom.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      p[i * 3 + 1] -= speeds[i];
      if (p[i * 3 + 1] < 0) {
        // recycle to top with new horizontal position — a thought
        // returning to the source
        p[i * 3 + 0] = (Math.random() - 0.5) * 18;
        p[i * 3 + 1] = 5.0;
        p[i * 3 + 2] = (Math.random() - 0.5) * 18;
      }
    }
    partGeom.attributes.position.needsUpdate = true;
  };
}

// ════════════════════════════════════════════════════════
// Status dots — fetch /.health/latest.json and color dots
// ════════════════════════════════════════════════════════
async function refreshStatus() {
  // Prefer the Cloudflare Worker (fresher: 5-min cron) — fall back to GH Actions JSON.
  const sources = [
    'https://api.nonarkara.org/status',
    'health/latest.json?t=' + Date.now(),
  ];
  let data = null;
  for (const src of sources) {
    try {
      const r = await fetch(src, { cache: 'no-store' });
      if (r.ok) { data = await r.json(); break; }
    } catch (_) { /* try next */ }
  }
  if (!data) return;
  window.__lastStatusData = data;
  // Cache the snapshot so the next page-load can paint dots instantly,
  // before the network round-trip resolves. Stale data > grey dots.
  try { localStorage.setItem('nonarkara.status.snapshot', JSON.stringify(data)); }
  catch (_) {}
  TVs.forEach(grp => {
    const dom = grp.userData.project.dom;
    const entry = dom && data.sites && data.sites[dom];
    if (!entry) {
      grp.userData.dotMat.color.setHex(0x666666); // unknown grey
      return;
    }
    const ok = entry.code === 200 || entry.code === 301 || entry.code === 302;
    grp.userData.dotMat.color.setHex(ok ? 0x33ff66 : 0xff3344);
  });
  // Feed the operations panel
  OPS.data = data;
  OPS.lastUpdate = Date.now();
  drawOpsPanel();
  // Feed the plan view, if the plan-status painter is wired up yet
  if (typeof paintPlanStatus === 'function') {
    try { paintPlanStatus(data); } catch (_) {}
  }
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// ════════════════════════════════════════════════════════
// Mouse / touch
// ════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const target = { x: 0, y: 0 };
let hovered = null;

// ─── Gyroscope tilt control ──────────────────────────────
// On a phone, holding the device in front of your face and
// tilting it should tilt the room. Saves the thumb. iOS 13+
// requires explicit permission via a user-gesture handler;
// Android Chrome works without permission.
//
// We low-pass filter the raw orientation so a hand tremor
// doesn't shake the camera. Output goes into target.x/.y the
// same channel as mouse parallax and touch drag, so all three
// input modes blend naturally.
let gyroEnabled = false;
let gyroAvailable = (typeof DeviceOrientationEvent !== 'undefined');
let gyroNeedsPermission = gyroAvailable && typeof DeviceOrientationEvent.requestPermission === 'function';
let gyroSmoothX = 0, gyroSmoothY = 0;        // -1..1 normalised, smoothed
let gyroBetaZero = null;                     // the user's natural hold pitch
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function onDeviceOrientation(e) {
  if (!gyroEnabled) return;
  // gamma: left-right tilt, -90..90
  // beta:  front-back tilt, -180..180 (with portrait device, ~70 = held in front of face)
  const gamma = e.gamma || 0;
  const beta  = e.beta  || 0;
  // Calibrate the "neutral" beta on first sample so wherever the
  // user is holding the phone becomes 0.
  if (gyroBetaZero === null) gyroBetaZero = beta;
  const betaRel = beta - gyroBetaZero;
  const rawX = clamp(gamma / 35, -1, 1);     // ±35° fills the range
  const rawY = clamp(betaRel / 30, -0.7, 0.7);
  // Exponential moving average — kills hand tremor.
  gyroSmoothX += (rawX - gyroSmoothX) * 0.18;
  gyroSmoothY += (rawY - gyroSmoothY) * 0.18;
}
async function enableGyro() {
  if (!gyroAvailable) return;
  if (gyroEnabled) { gyroBetaZero = null; return; }    // recalibrate on re-entry
  if (gyroNeedsPermission) {
    try {
      const p = await DeviceOrientationEvent.requestPermission();
      if (p !== 'granted') return;
    } catch (_) { return; }
  }
  window.addEventListener('deviceorientation', onDeviceOrientation, true);
  gyroEnabled = true;
  gyroBetaZero = null;     // recalibrate on next sample
}
function disableGyro() {
  if (!gyroEnabled) return;
  window.removeEventListener('deviceorientation', onDeviceOrientation, true);
  gyroEnabled = false;
  gyroSmoothX = 0; gyroSmoothY = 0;
}

// ── Mouse: position-based parallax (subtle, hover camera) ──
function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  target.y = -mouse.x * 0.06;
  target.x =  mouse.y * 0.04;
  const tip = document.getElementById('tip');
  if (hovered) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
}
window.addEventListener('mousemove', onMouseMove, { passive: true });

// ── Touch: drag-to-rotate camera + tap detection
// (a "tap" is a touchend with very little drag, handled by onClick)
let touchAnchor = null;       // {x, y, targetX, targetY}
let touchMoved = false;
let touchStartTs = 0;
function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  touchAnchor = {
    x: t.clientX, y: t.clientY,
    targetX: target.x, targetY: target.y,
  };
  touchMoved = false;
  touchStartTs = Date.now();
  // Update mouse for any potential immediate raycast
  mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
}
function onTouchMove(e) {
  if (!touchAnchor || e.touches.length !== 1) return;
  const t = e.touches[0];
  const dx = (t.clientX - touchAnchor.x) / window.innerWidth;
  const dy = (t.clientY - touchAnchor.y) / window.innerHeight;
  if (Math.abs(dx) > 0.015 || Math.abs(dy) > 0.015) touchMoved = true;
  // Drag-to-rotate: 360° on the horizontal (you can spin all the way
  // around to see the aphorism wall behind you), gentle pitch clamp
  // on the vertical so you don't end up looking at your own feet.
  target.y = touchAnchor.targetY - dx * Math.PI;     // full screen drag = ~180°
  target.x = touchAnchor.targetX + dy * 0.65;
  target.x = Math.max(-0.55, Math.min(0.55, target.x));
  // Update mouse for ongoing raycast (so the city/tv they're sliding over highlights)
  mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
}
function onTouchEnd() {
  touchAnchor = null;
}
window.addEventListener('touchstart', onTouchStart, { passive: true });
window.addEventListener('touchmove',  onTouchMove,  { passive: true });
window.addEventListener('touchend',   onTouchEnd,   { passive: true });
window.addEventListener('touchcancel',onTouchEnd,   { passive: true });

function onClick(e) {
  // If this came from a touchend that involved a drag, treat as rotate-only
  if (e && e.type === 'touchend' && touchMoved) return;
  if (document.getElementById('modal').classList.contains('in')) return;
  if (document.getElementById('drawer').classList.contains('in')) return;
  if (document.getElementById('pomodoro').classList.contains('in')) return;
  if (document.getElementById('konami').classList.contains('in')) return;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(INTERACTABLES.map(o => o.userData.hit));
  if (!hits.length) return;
  const grp = hits[0].object.parent;
  const ud = grp.userData;
  if (ud.kind === 'tv') {
    const p = ud.project;
    if (p?.url) openUrlModal(p.code, p.title, p.url);
  } else if (ud.kind === 'furniture') {
    openFurnitureModal(ud.key);
  } else if (ud.kind === 'city') {
    openCityModal(ud.city);
  } else if (ud.kind === 'pomoBtn') {
    openPomodoro();
  } else if (ud.kind === 'chandelier') {
    toggleTheme();
  } else if (ud.kind === 'record') {
    openMusicModal();
  } else if (ud.kind === 'badge') {
    const b = ud.badge;
    if (b?.url) openUrlModal(b.label, b.label + ' · ' + b.sub, b.url);
  } else if (ud.kind === 'poster') {
    if (ud.action === 'frame')     { try { openFrame(); }          catch (_) {} }
    if (ud.action === 'portraits') { try { openPortraitGallery(); } catch (_) {} }
  }
}
window.addEventListener('click', onClick);
window.addEventListener('touchend', onClick);

window.addEventListener('resize', () => {
  applyCameraFraming();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => { applyCameraFraming(); renderer.setSize(window.innerWidth, window.innerHeight); }, 100);
});

// ════════════════════════════════════════════════════════
// Modals
// ════════════════════════════════════════════════════════
function buildQR(data, level = 'M') {
  const qr = window.qrcode(0, level);
  qr.addData(data);
  qr.make();
  return qr.createDataURL(8, 0);
}

const modal = document.getElementById('modal');
const modalCard = document.getElementById('modal-card');
const modalEyebrow = document.getElementById('modal-eyebrow');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

function showModal(eyebrow, title, bodyHTML, klass = '') {
  modalEyebrow.textContent = eyebrow;
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalCard.className = 'modal-card' + (klass ? ' ' + klass : '');
  modal.classList.add('in');
}
function closeModal() { modal.classList.remove('in'); }
document.getElementById('modal-close').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target.dataset.close === '1') closeModal(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function openFurnitureModal(key) {
  if (key === 'bookshelf') {
    const url = 'https://nonarkara.org/cv.pdf';
    const html = `
      <div class="modal-qr"><img src="${buildQR(url, 'M')}" alt="QR"></div>
      <div class="modal-cap">${t('cv_cap')}</div>
      <div class="modal-meta"><a class="row" href="cv.pdf" target="_blank" rel="noopener">${t('cv_meta')}</a></div>`;
    showModal(t('cv_eyebrow'), t('cv_title'), html, 'personal');
  } else if (key === 'pedestal') {
    const url = 'https://www.linkedin.com/in/drnon/';
    const html = `
      <div class="modal-qr"><img src="${buildQR(url, 'M')}" alt="QR"></div>
      <div class="modal-cap">${t('li_cap')}</div>
      <div class="modal-meta"><a class="row" href="${url}" target="_blank" rel="noopener">linkedin.com/in/drnon</a></div>`;
    showModal(t('li_eyebrow'), t('li_title'), html, 'personal');
  } else if (key === 'coffee') {
    const html = `
      <div class="modal-qr"><img src="${buildQR(VCARD, 'L')}" alt="QR"></div>
      <div class="modal-cap">${t('contact_cap')}</div>
      <div class="modal-meta">
        <span class="row">${t('contact_role')}</span>
        <span class="row">${t('contact_org')}</span>
        <span class="row">non.ar@depa.or.th · nonsmartcity@gmail.com</span>
        <span class="row">+66 65 709 5258 · +66 2 026 2333</span>
        <span class="row">234/431 Bldg A · Ladprao Lane 10 · Bangkok 10900</span>
      </div>`;
    showModal(t('contact_eyebrow'), t('contact_title'), html, 'personal');
  } else if (key === 'cup') {
    // Easter egg — sabai sabai (left here for the curious)
    const url = 'https://sabaisabai-airdnd.pages.dev/';
    const html = `
      <div class="modal-qr"><img src="${buildQR(url, 'M')}" alt="QR"></div>
      <div class="modal-cap">สบายๆ · take a break</div>
      <div class="modal-meta">
        <span class="row">Thailand Massage &amp; Spa Directory</span>
        <a class="row" href="${url}" target="_blank" rel="noopener">sabaisabai-airdnd.pages.dev</a>
      </div>`;
    showModal('☕ ·', 'Sabai Sabai', html);
  }
}

// Universal URL modal — every clickable URL routes through this.
// Big QR (others scan it), Visit button (you tap to go), always an X.
// Dr Non's personal profile / identity surfaces — when a QR opens
// any of these, the modal flips to a crimson + B&W high-contrast
// theme (same Harvard crimson as the in-room "personal furniture").
//
// Strict allow-list: only IDENTITY surfaces (profiles + author
// channels), NOT project repos or partner work. Notably:
//   github.com/Nonarkara/<project>   → project, not personal → no crimson
//   github.com/agentic-ai-research   → Peter Thien's, not Dr Non → no crimson
function isPersonalUrl(url) {
  if (!url) return false;
  return (
    /linkedin\.com\/in\/drnon/i.test(url)                  ||
    /researchgate\.net\/profile\/Non-/i.test(url)          ||
    /arkaraprasertkul\.socialpsychology\.org/i.test(url)   ||
    /youtube\.com\/@nonarkara/i.test(url)                  ||
    /substack\.com\/@nonarkara/i.test(url)                 ||
    /nonsmartcity\.medium/i.test(url)                      ||
    /\/cv\.pdf$/i.test(url)                                ||
    /harvard-yenching\.org\/person\/non/i.test(url)        ||
    /scholar\.google\.com\/citations\?user=cKPauPQAAAAJ/i.test(url)
  );
}

function openUrlModal(eyebrow, title, url, opts = {}) {
  const passwordRow = opts.password
    ? `<div class="modal-pwd">🔒 ${t('password')}: ${opts.password}</div>`
    : '';
  const html = `
    <div class="modal-qr"><img src="${buildQR(url, 'M')}" alt="QR for ${title}"></div>
    <div class="modal-cap">scan or tap visit</div>
    <div class="modal-visit-row">
      <a class="modal-visit" href="${url}" target="_blank" rel="noopener">VISIT&nbsp;&nbsp;→</a>
    </div>
    ${passwordRow}
    <div class="modal-domain"><a href="${url}" target="_blank" rel="noopener">${url.replace(/^https?:\/\//, '')}</a></div>
  `;
  const klass = isPersonalUrl(url) ? 'personal' : '';
  showModal(eyebrow, title, html, klass);
}

// ────────── Music player ──────────
// Single shared <audio>; the modal just rebinds UI to it.
const audio = new Audio();
audio.preload = 'metadata';
let musicIdx = 0;
let musicPaintRAF = 0;

function fmtTime(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function buildMusicHTML() {
  const cur = SONGS[musicIdx];
  const rows = SONGS.map((s, i) => `
    <button class="music-row${i === musicIdx ? ' active' : ''}${i === musicIdx && !audio.paused ? ' playing' : ''}" data-idx="${i}">
      <span class="num">${String(i + 1).padStart(2, '0')}</span>
      <span class="name">${s.title}</span>
      ${s.alt ? `<span class="alt">${s.alt}</span>` : ''}
    </button>
  `).join('');
  return `
    <div class="music-now">${t('music_now')}</div>
    <div class="music-title-cur" id="music-title-cur">${cur.title}</div>
    <div class="music-title-alt" id="music-title-alt">${cur.alt || '·'}</div>
    <div class="music-progress" id="music-progress" role="slider" aria-label="seek">
      <div class="music-progress-bar" id="music-bar"></div>
    </div>
    <div class="music-time">
      <span id="music-elapsed">00:00</span>
      <span id="music-duration">00:00</span>
    </div>
    <div class="music-controls">
      <button id="music-prev" aria-label="previous">⏮</button>
      <button id="music-play" class="play${!audio.paused ? ' playing' : ''}" aria-label="play / pause">${audio.paused ? '▶' : '⏸'}</button>
      <button id="music-next" aria-label="next">⏭</button>
    </div>
    <div class="music-tracks" id="music-tracks">${rows}</div>
  `;
}

function paintMusicUI() {
  if (!modal.classList.contains('in')) { cancelAnimationFrame(musicPaintRAF); musicPaintRAF = 0; return; }
  const bar = document.getElementById('music-bar');
  const el  = document.getElementById('music-elapsed');
  const du  = document.getElementById('music-duration');
  if (bar && audio.duration) bar.style.width = ((audio.currentTime / audio.duration) * 100).toFixed(2) + '%';
  if (el) el.textContent = fmtTime(audio.currentTime);
  if (du) du.textContent = fmtTime(audio.duration);
  musicPaintRAF = requestAnimationFrame(paintMusicUI);
}

function refreshMusicHeader() {
  const cur = SONGS[musicIdx];
  const tEl = document.getElementById('music-title-cur');
  const aEl = document.getElementById('music-title-alt');
  const pl  = document.getElementById('music-play');
  if (tEl) tEl.textContent = cur.title;
  if (aEl) aEl.textContent = cur.alt || '·';
  if (pl) {
    pl.textContent = audio.paused ? '▶' : '⏸';
    pl.classList.toggle('playing', !audio.paused);
  }
  // active/playing row state
  document.querySelectorAll('#music-tracks .music-row').forEach((r, i) => {
    r.classList.toggle('active', i === musicIdx);
    r.classList.toggle('playing', i === musicIdx && !audio.paused);
  });
}

function loadTrack(idx, autoplay = true) {
  musicIdx = (idx + SONGS.length) % SONGS.length;
  audio.src = SONGS[musicIdx].file;
  if (autoplay) audio.play().catch(() => {});
  refreshMusicHeader();
}

audio.addEventListener('ended', () => loadTrack(musicIdx + 1, true));
audio.addEventListener('play',  refreshMusicHeader);
audio.addEventListener('pause', refreshMusicHeader);

function openMusicModal() {
  // Lazy-load the first track on first open without auto-playing
  if (!audio.src) audio.src = SONGS[musicIdx].file;
  showModal(t('music_eyebrow'), t('music_title'), buildMusicHTML(), 'music');

  // Wire controls
  document.getElementById('music-play').addEventListener('click', () => {
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  });
  document.getElementById('music-prev').addEventListener('click', () => loadTrack(musicIdx - 1, true));
  document.getElementById('music-next').addEventListener('click', () => loadTrack(musicIdx + 1, true));
  document.getElementById('music-progress').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - r.left) / r.width;
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });
  document.querySelectorAll('#music-tracks .music-row').forEach(row => {
    row.addEventListener('click', () => loadTrack(parseInt(row.dataset.idx, 10), true));
  });

  cancelAnimationFrame(musicPaintRAF);
  musicPaintRAF = requestAnimationFrame(paintMusicUI);
}

// City photo slot — optional hero image rendered above the time.
// Photos must be CC-licensed (CC0 / public domain / CC-BY) with
// attribution rendered below the image. Drop a file in
// /city-photos/<slug>.jpg and add a CITY_PHOTOS entry.
//
// Anti-regression: this is ADDITIVE. The city's memory note + the
// tickable clock remain the primary content; the photo gives the
// place a face. Cities without a photo render exactly as before.
const CITY_PHOTOS = {
  // slug → { src, credit }
  // Curated, not stock-filler. Every entry is a recognisable view
  // of the actual city, sourced from Wikipedia / Wikimedia Commons
  // (CC BY-SA) or another truly-license-free origin. Attribution
  // rendered on the image.
  bangkok:    { src: 'city-photos/bangkok.jpg',  credit: 'Bangkok montage · CC BY-SA · wikipedia' },
  london:     { src: 'city-photos/london.jpg',   credit: 'London · Tower Bridge · CC BY-SA · wikipedia' },
  tokyo:      { src: 'city-photos/tokyo.jpg',    credit: 'Tokyo · Morio · CC BY-SA 3.0 · wikipedia' },
  'new-york': { src: 'city-photos/new-york.jpg', credit: 'Manhattan · Dllu · CC BY-SA 4.0 · wikipedia' },
  sydney:     { src: 'city-photos/sydney.jpg',   credit: 'Sydney · CC BY-SA · wikipedia' },
};
function citySlug(name) { return name.toLowerCase().replace(/\s+/g, '-'); }

function openCityModal(city) {
  const photo = CITY_PHOTOS[citySlug(city.name)];
  const photoHTML = photo ? `
    <div class="city-photo">
      <img src="${photo.src}" alt="${city.name}" loading="lazy">
      <div class="city-photo-credit">${photo.credit}</div>
    </div>` : '';
  const html = `
    ${photoHTML}
    <div class="city-time" id="city-time"></div>
    <div class="city-tz">${city.tz} · ${city.name}</div>
    <div class="city-mem">${city.memory || ''}</div>`;
  showModal(city.name.toUpperCase(), city.name, html, 'city');
  // tick the time every 250ms while modal is open
  const elT = document.getElementById('city-time');
  function tick() {
    if (!modal.classList.contains('in')) return;
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: city.tz, hour12: false,
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date());
    if (elT) elT.textContent = fmt;
    setTimeout(tick, 250);
  }
  tick();
}

// ════════════════════════════════════════════════════════
// Pomodoro mode — full-screen timer with hold-to-exit
// ════════════════════════════════════════════════════════
const POMO = {
  durations: { work: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 },
  phase: 'work',          // 'work' | 'shortBreak' | 'longBreak'
  remaining: 25 * 60,     // seconds
  running: false,
  cycle: 1,               // 1..4 work cycles before long break
  tickInt: null,
};
const PHASE_LABEL = { work: 'FOCUS', shortBreak: 'BREAK', longBreak: 'LONG BREAK' };

function pomoFmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad(m)}:${pad(sec)}`;
}
function pomoUpdate() {
  const el = (id) => document.getElementById(id);
  el('pomo-time').textContent = pomoFmt(Math.max(0, Math.floor(POMO.remaining)));
  el('pomo-phase').textContent = PHASE_LABEL[POMO.phase];
  el('pomo-cycle').textContent = POMO.phase === 'work'
    ? `round ${POMO.cycle} of 4`
    : (POMO.phase === 'longBreak' ? 'long rest' : `after round ${POMO.cycle}`);
  el('pomo-toggle').textContent = POMO.running ? 'PAUSE' : 'START';
  el('pomo-toggle').classList.toggle('primary', !POMO.running);
  const root = document.getElementById('pomodoro');
  root.classList.toggle('break', POMO.phase !== 'work');
  root.classList.toggle('work', POMO.phase === 'work');
  el('pomo-time').classList.toggle('pomo-pulse', POMO.running);
}
function pomoNextPhase() {
  if (POMO.phase === 'work') {
    POMO.phase = (POMO.cycle >= 4) ? 'longBreak' : 'shortBreak';
  } else {
    if (POMO.phase === 'shortBreak') POMO.cycle++;
    else POMO.cycle = 1;  // long break ended → reset cycle counter
    POMO.phase = 'work';
  }
  POMO.remaining = POMO.durations[POMO.phase];
}
function pomoStart() {
  if (POMO.tickInt) clearInterval(POMO.tickInt);
  POMO.running = true;
  POMO.tickInt = setInterval(() => {
    POMO.remaining -= 1;
    if (POMO.remaining <= 0) pomoNextPhase();
    pomoUpdate();
  }, 1000);
  pomoUpdate();
}
function pomoPause() {
  POMO.running = false;
  if (POMO.tickInt) { clearInterval(POMO.tickInt); POMO.tickInt = null; }
  pomoUpdate();
}
function pomoToggle() { POMO.running ? pomoPause() : pomoStart(); }
function pomoReset() {
  pomoPause();
  POMO.remaining = POMO.durations[POMO.phase];
  pomoUpdate();
}
function pomoSkip() { pomoNextPhase(); pomoUpdate(); }

function openPomodoro() {
  pomoUpdate();
  document.getElementById('pomodoro').classList.add('in');
  pomoQuoteStart();
}
function closePomodoro() {
  document.getElementById('pomodoro').classList.remove('in');
  pomoQuoteStop();
  // Timer keeps running in the background — re-entering shows continued state.
}

// ─── Pomodoro quote rotator ────────────────────────────────
// Aphorisms in Dr Non's voice — short, dry, philosophical. The
// point is to give the eye somewhere quiet to land that isn't a
// phone. Rotates every 40s, randomly, no repeat in a window of 5.
// Drawn from §12.1 (Six Mantras), §12.4 (Forbidden Phrases — what
// these are NOT) and the Soul/Voice-Anchor + Working-Philosophy
// notes. Voice rules: mundane → philosophy, no conclusion, dry
// humour permitted, no business-school clichés.
const POMO_QUOTES = [
  // Attention / time
  ['The most expensive thing you spend today is attention. Spend it here.', 'attention'],
  ['Twenty-five minutes is a lot of time. Use this one.', 'time'],
  ['The clock will not pause if you check your phone. You will just be behind.', 'time'],
  ['The phone holds what is on it. The work does not.', 'attention'],
  ['Time is the only asset you cannot print more of.', 'time'],

  // Boredom / discomfort as the floor of work
  ['Boredom is the floor of creativity. Stay on it.', 'boredom'],
  ['If you can sit through the urge to check, you can do almost anything.', 'discipline'],
  ['Tedium is the tax. Pay it once and move on.', 'discipline'],
  ['Your brain is asking for a hit of novelty. Tell it later.', 'attention'],

  // Nonism / Stoic / Buddhist substrate
  ['It is all happening. It will all be okay.', 'nonism'],
  ['Suspend the verdict. The wheel has not arrived yet.', 'nonism'],
  ['Reality may be a simulation. Work the symbols anyway.', 'nonism'],
  ['Help others first. Help yourself second. The work is help.', 'nonism'],
  ['It would be okay if I die today. So I might as well finish this.', 'mantra'],

  // Subtraction / focus
  ['Whatever else you could be doing, this is the one you chose. Do it.', 'choice'],
  ['What you keep choosing not to do becomes who you are.', 'choice'],
  ['Subtract distraction first, then add focus.', 'subtract'],
  ['The simplest move is the next move.', 'subtract'],

  // Dry / self-deprecating
  ['Eight tabs open. The work is in this one.', 'dry'],
  ['You will check Twitter again. Just not now.', 'dry'],
  ['If the world ends in twenty-five minutes, this still mattered.', 'dry'],
];
let pomoQuoteTimer = null;
let pomoQuoteRecent = []; // avoid immediate repeats

function pomoPickQuote() {
  let i, tries = 0;
  do {
    i = Math.floor(Math.random() * POMO_QUOTES.length);
    tries++;
  } while (pomoQuoteRecent.includes(i) && tries < 8);
  pomoQuoteRecent.push(i);
  if (pomoQuoteRecent.length > 5) pomoQuoteRecent.shift();
  return POMO_QUOTES[i];
}

function pomoShowQuote() {
  const el = document.getElementById('pomo-quote');
  if (!el) return;
  const [text, src] = pomoPickQuote();
  // No fade. The CSS transition AND the Web Animations API path
  // both get stuck at currentTime=0 in some Chrome states when the
  // parent .pomodoro flipped from display:none to flex (the
  // animation registered against a paused timeline somehow). The
  // pragmatic fix: render the quote directly. The overlay itself
  // already fades in via its own .pomodoro.in mechanism.
  el.style.opacity = '1';
  el.innerHTML = `${text}<span class="src">— ${src}</span>`;
}

function pomoQuoteStart() {
  pomoShowQuote();                          // immediate
  clearInterval(pomoQuoteTimer);
  pomoQuoteTimer = setInterval(pomoShowQuote, 40_000);
}
function pomoQuoteStop() {
  clearInterval(pomoQuoteTimer);
  pomoQuoteTimer = null;
  const el = document.getElementById('pomo-quote');
  if (el) {
    el.innerHTML = '';
    el.style.opacity = '0';
  }
}

// Hold-to-exit (3 seconds)
const HOLD_MS = 3000;
let holdStart = null, holdRAF = null;
const holdRoot = () => document.querySelector('.pomo-exit-bar');
const holdLabel = () => document.getElementById('pomo-exit-label');
function holdTick() {
  if (holdStart === null) return;
  const pct = Math.min(100, ((Date.now() - holdStart) / HOLD_MS) * 100);
  holdRoot().style.setProperty('--hold', pct + '%');
  if (pct >= 100) { closePomodoro(); holdEnd(); return; }
  holdRAF = requestAnimationFrame(holdTick);
}
function holdBegin(e) {
  e?.preventDefault?.();
  holdStart = Date.now();
  holdLabel().classList.add('in');
  holdRAF = requestAnimationFrame(holdTick);
}
function holdEnd() {
  holdStart = null;
  if (holdRAF) cancelAnimationFrame(holdRAF);
  holdRAF = null;
  holdRoot().style.setProperty('--hold', '0%');
  holdLabel().classList.remove('in');
}

document.getElementById('pomo-toggle').addEventListener('click', pomoToggle);
document.getElementById('pomo-skip').addEventListener('click', pomoSkip);
document.getElementById('pomo-reset').addEventListener('click', pomoReset);
const exitBtn = document.getElementById('pomo-exit');
exitBtn.addEventListener('mousedown', holdBegin);
exitBtn.addEventListener('mouseup', holdEnd);
exitBtn.addEventListener('mouseleave', holdEnd);
exitBtn.addEventListener('touchstart', holdBegin, { passive: false });
exitBtn.addEventListener('touchend', holdEnd);
exitBtn.addEventListener('touchcancel', holdEnd);
// Click alone shouldn't close — but show feedback hint
exitBtn.addEventListener('click', () => {
  // If user just clicks (no hold), nothing happens — that's the point.
  // Visual feedback: briefly flash the label.
  holdLabel().classList.add('in');
  setTimeout(() => holdLabel().classList.remove('in'), 1500);
});

// ════════════════════════════════════════════════════════
// Surprise — drifting whispers
// Random philosophy fragments rise and fade. Trilingual mix.
// ════════════════════════════════════════════════════════
const WHISPERS = [
  // existing
  'the wheel hasn’t arrived yet',
  'subtract before adding',
  'questions over answers',
  'the lens matters more than the frame',
  'live to the end',
  'the fun is in the flow',
  'help others first',
  'reality may be a simulation',
  'wabi-sabi · kodawari',
  'good coffee · good question',
  'ผม',
  'สบายๆ',
  'อยู่กับปัจจุบัน',
  '安静地工作',
  '记忆宫殿',
  '中道',
  'twenty years · still asking why',
  'every photo unique',
  'every number sourced',
  'mundane · then philosophy',
  'ikigai',
  '· · ·',
  // mind-layer additions — half-finished thoughts, observations,
  // notes-to-self that drift through the room like idle cognition
  'a city legible to the people who live in it',
  'or it is not a city',
  'eight tabs open · the work is in this one',
  'antifragility is the only fragility worth seeking',
  'the gap between cron and real-time is where waste lives',
  'every UI element earns its pixels',
  'the question above the engineering',
  'don’t resolve · hold the tension',
  'wheel hasn’t arrived',
  'data isn’t in',
  'who decides what the data means',
  'หัวไม่มีลูป',
  'ความเป็นไทยที่ไม่ต้องประกาศ',
  'rousseauian · stoic · existentialist',
  'four noble truths as a design brief',
  'plan A is a fallback',
  'plan B is the product',
  '何もしないこと',
  '形 follows 機能',
  'no shadow without something blocking the light',
  'the cassette of TKC',
  'the four templated cliches',
  'banned: roboto · inter · poppins',
  'banned: gradients · drop shadows',
  'never replace earned content',
  'protect properly · or remove',
  'photograph aging · do not fake it',
  'craft within the chosen scope',
  'the Codex Incident',
  'append · do not rewrite',
  'show the diff first',
  'chiang mai · cooler air · slower pace',
  'shanghai · yangpu district · three years',
  'oxford · doctorate of philosophy',
  'depa · senior expert · smart city',
  '0% rounded · 100% intentional',
  'three text sizes · hard rule',
  'the smartphone is the first impression',
  'the desktop is the second',
  'a phone-broken page · not made by Thais',
  'bake it into cadence and patience',
  'never directly · always metaphorically',
  'the central tension stays',
];

function spawnWhisper() {
  // Don't spawn while a modal/Pomodoro is open
  if (document.getElementById('modal').classList.contains('in')) return;
  if (document.getElementById('pomodoro').classList.contains('in')) return;
  if (document.getElementById('konami').classList.contains('in')) return;

  const text = WHISPERS[Math.floor(Math.random() * WHISPERS.length)];
  const el = document.createElement('div');
  el.className = 'whisper';
  el.textContent = text;
  // Place between 8% and 78% from left, starting near the bottom 20%
  el.style.left = (8 + Math.random() * 70) + '%';
  el.style.bottom = '14%';
  document.body.appendChild(el);

  // Sequence: fade in → drift up → fade out → remove
  requestAnimationFrame(() => {
    el.classList.add('in');
    // Start drifting on next frame so the transitions register
    requestAnimationFrame(() => el.classList.add('drift'));
  });
  setTimeout(() => el.classList.add('out'), 9500);
  setTimeout(() => el.remove(), 13500);
}
// First whisper a bit early; then every ~80–100s with jitter
setTimeout(spawnWhisper, 25_000);
setInterval(() => {
  if (Math.random() < 0.85) spawnWhisper();
}, 60_000 + Math.random() * 40_000);

// ════════════════════════════════════════════════════════
// Surprise — Konami code → haiku reveal
// ↑↑↓↓←→←→ B A
// ════════════════════════════════════════════════════════
const HAIKUS = [
  { lines: ['twenty years', 'one city after another', 'still asking why'], tag: 'EN · 5–7–5' },
  { lines: ['ผม ทำงาน', 'กับเมือง  กับข้อมูล', 'อย่างเงียบ ๆ'],          tag: 'TH · ผม' },
  { lines: ['subtract first', 'before you add anything', 'it always works'], tag: 'EN · 4–6–4' },
  { lines: ['the wheel', 'has not arrived yet', 'sit with it'],             tag: 'EN · stoic' },
  { lines: ['城市  数据', '安静地  思考', '二十年'],                         tag: 'ZH · 三行' },
  { lines: ['good coffee', 'good question', 'good morning'],                tag: 'EN · ritual' },
  { lines: ['records of a life', 'made in three languages', 'and good coffee'], tag: 'EN · self' },
];
function showHaiku() {
  const k = HAIKUS[Math.floor(Math.random() * HAIKUS.length)];
  const html = k.lines.map((l) => `<div>${l}</div>`).join('') +
    `<span class="haiku-source">— ${k.tag}</span>`;
  const overlay = document.getElementById('konami');
  const stage = document.getElementById('haiku');
  stage.innerHTML = html;
  overlay.classList.add('in');
  setTimeout(() => overlay.classList.remove('in'), 6500);
}

// ════════════════════════════════════════════════════════
// Theme toggle (chandelier click) — dark ↔ light
// (Hooks array + helper hoisted to the top of the module — see
//  the early `const _themeRedrawHooks` near the I18N block. Multiple
//  scene-setup blocks push to this list at module-load time, so the
//  declaration must live above them, not down here.)
// ════════════════════════════════════════════════════════
function applyTheme(t) {
  CURRENT_THEME = t;
  const c = THEMES[t];
  // Three.js scene
  scene.background = new THREE.Color(c.bg);
  scene.fog.color  = new THREE.Color(c.bg);
  // Line materials (excluding hover which always pops)
  matBright.color.setHex(c.line);
  matDim.color.setHex(c.line);
  matFurni.color.setHex(c.line);
  matMap.color.setHex(c.line);
  matCity.color.setHex(c.line);
  matCityHome.color.setHex(c.accent);
  matEquator.color.setHex(c.accent);
  matHover.color.setHex(c.accent);
  // HTML overlays via CSS variables
  document.body.dataset.theme = t;
  // Status-bar paint follows the chandelier — when added to the home
  // screen and launched as a PWA, the iOS status bar tints with the room.
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#000000' : '#f5f5f0');
  // Repaint all themed canvases (clock, rain, ops, tickers, switch label, pomo button)
  _themeRedrawHooks.forEach(fn => { try { fn(); } catch (_) {} });
}
function toggleTheme() {
  applyTheme(CURRENT_THEME === 'dark' ? 'light' : 'dark');
  localStorage.setItem('nonarkara.theme', CURRENT_THEME);
}
// Apply persisted theme on first render — runs after all materials and
// hook registrations are complete, so canvas redraws pick up the right colors.
setTimeout(() => applyTheme(CURRENT_THEME), 0);

// ════════════════════════════════════════════════════════
// Drawer — thumb-friendly index of everything clickable
// Same destinations as the 3D scene, just listed for fingers.
// ════════════════════════════════════════════════════════
const drawerEl = document.getElementById('drawer');
const drawerBody = document.getElementById('drawer-body');
const menuBtnEl = document.getElementById('menu-btn');

function buildDrawer() {
  const sections = [];

  // Projects
  const projItems = PROJECTS.map(p => {
    return `<button class="drawer-item" data-kind="tv" data-code="${p.code}">
      <span class="code">${p.code}</span>
      <span class="title">${p.title}</span>
    </button>`;
  }).join('');
  sections.push(`<div class="drawer-label">PROJECTS · ${PROJECTS.length}</div>${projItems}`);

  // (PRIVATE/TKC drawer entries removed — see TKC_LINKS comment.)

  // People (furniture modals)
  sections.push(`<div class="drawer-label">PEOPLE</div>
    <button class="drawer-item" data-kind="furniture" data-key="bookshelf">
      <span class="code">CV</span><span class="title">Curriculum Vitae</span>
    </button>
    <button class="drawer-item" data-kind="furniture" data-key="pedestal">
      <span class="code">LINKEDIN</span><span class="title">Professional Network</span>
    </button>
    <button class="drawer-item" data-kind="furniture" data-key="coffee">
      <span class="code">CONTACT</span><span class="title">Dr Non Arkara · vCard</span>
    </button>
  `);

  // Cities (world map)
  const cityItems = CITIES.map(c => {
    const home = c.home ? '<span class="lock">●</span>' : '';
    return `<button class="drawer-item" data-kind="city" data-name="${c.name}">
      <span class="code">${c.tz.split('/')[1].slice(0, 6).toUpperCase()}</span>
      <span class="title">${c.name}</span>${home}
    </button>`;
  }).join('');
  sections.push(`<div class="drawer-label">TIME · WORLD</div>${cityItems}`);

  // Tools
  sections.push(`<div class="drawer-label">TOOLS</div>
    <button class="drawer-item" data-kind="pomodoro">
      <span class="code">▷</span><span class="title">Pomodoro · 25 / 5</span>
    </button>
    <button class="drawer-item" data-kind="record">
      <span class="code">◯</span><span class="title">Music · ${SONGS.length} suno tracks</span>
    </button>
    <button class="drawer-item" data-kind="furniture" data-key="cup">
      <span class="code">☕</span><span class="title">· · ·</span>
    </button>
  `);

  drawerBody.innerHTML = sections.join('');

  // Wire item clicks
  drawerBody.querySelectorAll('.drawer-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.kind;
      closeDrawer();
      // Slight delay so drawer fade-out animation reads cleanly before modal fade-in
      setTimeout(() => {
        if (kind === 'tv') {
          const p = PROJECTS.find(x => x.code === btn.dataset.code);
          if (p) openUrlModal(p.code, p.title, p.url);
        } else if (kind === 'furniture') {
          openFurnitureModal(btn.dataset.key);
        } else if (kind === 'city') {
          const c = CITIES.find(x => x.name === btn.dataset.name);
          if (c) openCityModal(c);
        } else if (kind === 'pomodoro') {
          openPomodoro();
        } else if (kind === 'record') {
          openMusicModal();
        }
      }, 180);
    });
  });
}

function openDrawer() { buildDrawer(); drawerEl.classList.add('in'); drawerEl.setAttribute('aria-hidden', 'false'); }
function closeDrawer() { drawerEl.classList.remove('in'); drawerEl.setAttribute('aria-hidden', 'true'); }

menuBtnEl.addEventListener('click', openDrawer);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);
drawerEl.addEventListener('click', (e) => { if (e.target.dataset.close === '1') closeDrawer(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawerEl.classList.contains('in')) closeDrawer(); });

// ════════════════════════════════════════════════════════
// PLAN view — 2D dashboard. Same data as the room, no Three.js
// rendering, designed for one-thumb navigation on a phone.
// The 3D room is opt-in via the "ENTER ROOM" button.
//
// Every step below is wrapped: a single bug in plan code must not
// cascade into a black screen for the whole site. iOS private mode
// throws on localStorage; matchMedia is fine in modern WebKit but
// we still guard.
// ════════════════════════════════════════════════════════
const planEl  = document.getElementById('plan');
const planProjEl = document.getElementById('plan-projects');
const planPersEl = document.getElementById('plan-personal');
const planPrivEl = document.getElementById('plan-private');
const planCityEl = document.getElementById('plan-cities');
const planTimeEl = document.getElementById('plan-time');
const planDateEl = document.getElementById('plan-date');
const planStatEl = document.getElementById('plan-stat-summary');

function lsGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
function lsSet(key, v) { try { localStorage.setItem(key, v); } catch (_) {} }

function chooseDefaultView() {
  const saved = lsGet('nonarkara.view');
  if (saved === 'plan' || saved === 'room') return saved;
  try { return matchMedia('(max-width: 768px)').matches ? 'plan' : 'room'; }
  catch (_) { return 'room'; }
}
function setView(v) {
  try {
    document.body.dataset.view = v;
    lsSet('nonarkara.view', v);
    if (planEl) planEl.setAttribute('aria-hidden', v === 'plan' ? 'false' : 'true');
    if (v === 'plan') { renderPlan(); refreshStatus(); }
  } catch (_) {}
}
try {
  document.body.dataset.view = chooseDefaultView();
  if (planEl) planEl.setAttribute('aria-hidden', document.body.dataset.view === 'plan' ? 'false' : 'true');
} catch (_) {
  document.body.dataset.view = 'room';
}

function renderPlan() { try { _renderPlanBody(); } catch (e) { /* don't cascade */ } }
function _renderPlanBody() {
  if (!planProjEl || !planPersEl) return;

  // Append live counts to section labels — only on render, so language
  // toggles refresh them too.
  const labelWithCount = (sel, key, n) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.textContent = `${t(key)} · ${n}`;
  };
  labelWithCount('[data-i18n="plan_projects"]', 'plan_projects', PROJECTS.length);
  labelWithCount('[data-i18n="plan_world"]',    'plan_world',    CITIES.length);

  // Projects → tap target grid
  planProjEl.innerHTML = PROJECTS.map(p => `
    <button class="plan-cell" data-code="${p.code}" aria-label="Open ${p.code} · ${p.title}">
      <span class="dot"></span>
      <span class="code">${p.code}</span>
    </button>
  `).join('');
  planProjEl.querySelectorAll('.plan-cell').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PROJECTS.find(x => x.code === btn.dataset.code);
      if (p) openUrlModal(p.code, p.title, p.url);
    });
  });

  // Personal — identity surfaces + portrait gallery.
  const personal = [
    { glyph: '▢',  key: 'bookshelf',  title: t('cv_title_short'),  meta: 'CV',         click: () => openFurnitureModal('bookshelf') },
    { glyph: '◯',  key: 'pedestal',   title: t('li_title_short'),  meta: 'LINKEDIN',   click: () => openFurnitureModal('pedestal') },
    { glyph: '☕', key: 'coffee',     title: t('co_title_short'),  meta: 'CONTACT',    click: () => openFurnitureModal('coffee') },
    { glyph: '◈',  key: 'portraits',  title: 'portraits · share hi-res', meta: 'PHOTOS', click: () => { try { openPortraitGallery(); } catch (_) {} } },
    { glyph: '·',  key: 'cup',        title: t('sabai_short'),     meta: '· · ·',      click: () => openFurnitureModal('cup') },
  ];
  planPersEl.innerHTML = personal.map((row, i) => `
    <button class="plan-row" data-i="${i}">
      <span class="glyph">${row.glyph}</span>
      <span class="title">${row.title}</span>
      <span class="meta">${row.meta}</span>
    </button>
  `).join('');
  planPersEl.querySelectorAll('.plan-row').forEach((btn, i) => {
    btn.addEventListener('click', personal[i].click);
  });

  // (PRIVATE/TKC section removed — was leaking the password publicly.)
  // (WORLD · TIME list replaced by SVG world map — see renderWorldMap)

  // Status dots (paint from cached data if present, else dim)
  paintPlanStatus(window.__lastStatusData || null);
}

// Live clock — always running, painted on both views
function tickPlanClock() { try { _tickPlanClockBody(); } catch (_) {} }
function _tickPlanClockBody() {
  if (!planTimeEl) return;
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(now);
  const dfmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  }).format(now).toUpperCase();
  if (planTimeEl) planTimeEl.textContent = fmt;
  if (planDateEl) planDateEl.textContent = `${dfmt} · BANGKOK · GMT+7`;
  // World map labeled cities — refresh local time text below each
  // labeled dot once a minute (the SVG label text content swap is
  // cheap, runs every tick).
  const svg = document.getElementById('plan-worldmap');
  if (svg) {
    svg.querySelectorAll('text.city-time').forEach(t => {
      const tz = t.dataset.tz;
      if (!tz) return;
      try {
        t.textContent = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit',
        }).format(now);
      } catch { /* bad tz */ }
    });
  }
}
setInterval(tickPlanClock, 1000);

// Daily brief — pulls from window.__brief, set by the room's
// existing fetchers. Painted here whenever new data lands or the
// language flips. Cells: USD/THB · SGD/THB · BTC · SET · weather.
function paintBrief() {
  try {
    const b = window.__brief || {};
    if (b.fx) {
      const fx = b.fx;
      const fxV = document.getElementById('brief-fx-val');
      const fxS = document.getElementById('brief-fx-sub');
      if (fxV) fxV.textContent = fx.thb;
      if (fxS) fxS.textContent = `sgd ${fx.sgdThb || '—'}`;
      const sgV = document.getElementById('brief-sgd-val');
      const sgS = document.getElementById('brief-sgd-sub');
      if (sgV) sgV.textContent = fx.sgdThb || '—';
      if (sgS) sgS.textContent = `eur ${fx.eurThb} · gbp ${fx.gbpThb}`;
    }
    const c = b.crypto && b.crypto.btc;
    if (c) {
      const v = document.getElementById('brief-btc-val');
      const s = document.getElementById('brief-btc-sub');
      if (v) v.textContent = c.usd >= 1000
        ? c.usd.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : c.usd.toFixed(2);
      if (s) {
        const up = c.change >= 0;
        s.innerHTML = `<span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(c.change).toFixed(2)} %</span>`;
      }
    }
    if (b.set) {
      const v = document.getElementById('brief-set-val');
      const s = document.getElementById('brief-set-sub');
      if (v) v.textContent = b.set.price.toLocaleString('en-US', { maximumFractionDigits: 2 });
      if (s) {
        const up = b.set.change >= 0;
        s.innerHTML = `<span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(b.set.change).toFixed(2)} %</span>`;
      }
    }
    if (b.wx) {
      const w = b.wx;
      const v = document.getElementById('brief-wx-temp');
      const s = document.getElementById('brief-wx-sub');
      if (v) v.textContent = `${w.temp} °C`;
      if (s) s.textContent = `${w.desc} · humidity ${w.humidity} % · wind ${w.wind} km/h`;
    }
    // Stock market cells — Dow, NASDAQ, NVDA, TSLA, GOOGL
    if (b.stocks) {
      const fmtStock = (key, valId, subId) => {
        const s = b.stocks[key];
        if (!s) return;
        const v = document.getElementById(valId);
        const sub = document.getElementById(subId);
        const price = s.price >= 1000
          ? s.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
          : s.price.toFixed(2);
        if (v) v.textContent = price;
        if (sub) {
          const up = s.change >= 0;
          sub.innerHTML = `<span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(s.change).toFixed(2)} %</span>`;
        }
      };
      fmtStock('dji',    'brief-dji-val',    'brief-dji-sub');
      fmtStock('nasdaq', 'brief-nasdaq-val',  'brief-nasdaq-sub');
      fmtStock('nvda',   'brief-nvda-val',    'brief-nvda-sub');
      fmtStock('tsla',   'brief-tsla-val',    'brief-tsla-sub');
      fmtStock('googl',  'brief-googl-val',   'brief-googl-sub');
      fmtStock('gold',   'brief-gold-val',    'brief-gold-sub');
      fmtStock('brent',  'brief-brent-val',   'brief-brent-sub');
      fmtStock('ptt',    'brief-ptt-val',     'brief-ptt-sub');
    }
    if (b.aqi) {
      const a = b.aqi;
      const v = document.getElementById('brief-aqi-val');
      const s = document.getElementById('brief-aqi-sub');
      const cell = document.getElementById('brief-aqi-cell');
      if (v) v.textContent = a.aqi ?? '—';
      if (s) s.textContent = a.pm25 != null ? `${a.level} · pm2.5 ${a.pm25} µg/m³` : a.level;
      // Colour-code the AQI value by level — uses CSS custom property
      // so it respects light/dark theme automatically.
      if (v && cell) {
        const color = a.aqi == null ? ''
          : a.aqi <= 50  ? 'var(--fg)'           // good — neutral
          : a.aqi <= 100 ? 'var(--amber)'         // moderate — amber
          : a.aqi <= 150 ? 'var(--amber)'         // sensitive
          : '#c44';                               // unhealthy+
        v.style.color = color;
        if (a.aqi > 150) cell.style.borderColor = 'rgba(204,68,68,0.4)';
        else cell.style.borderColor = '';
      }
    }
  } catch (_) {}
}
window.paintBrief = paintBrief;        // expose so room fetchers can call

// ─── AI COUNCIL paint ─────────────────────────────────────
// Status semantics — count is consecutive 5-min ping failures
// against Dr Non's M3 (the council host):
//   0      → HEALTHY  (live amber pulse)
//   1-2    → DEGRADED (one or two strikes; recoverable)
//   3+     → DOWN     (Telegram alert threshold; M3 likely off)
function paintCouncil() {
  try {
    const data = (window.__brief && window.__brief.council) || null;
    const row = document.getElementById('plan-council');
    if (!row) return;
    if (!data) {
      row.dataset.status = 'unknown';
      document.getElementById('council-status').textContent = '— ';
      document.getElementById('council-meta').textContent = 'checking';
      return;
    }
    const s = data.status || 'unknown';
    row.dataset.status = s;
    const statusEl = document.getElementById('council-status');
    const metaEl = document.getElementById('council-meta');
    statusEl.textContent =
      s === 'healthy'  ? 'HEALTHY' :
      s === 'degraded' ? `DEGRADED · ${data.count}` :
      s === 'down'     ? `DOWN · ${data.count} STRIKES` :
                         '—';
    if (data.ts) {
      const age = Math.max(0, Math.floor((Date.now() - new Date(data.ts).getTime()) / 60000));
      const ago = age < 1 ? 'just now'
                : age < 60 ? age + 'm ago'
                : Math.floor(age / 60) + 'h ago';
      metaEl.textContent = 'last check ' + ago;
    } else {
      metaEl.textContent = '';
    }
  } catch (_) {}
}
window.paintCouncil = paintCouncil;

// ─── NOTE pad — Second Brain quick capture ─────────────────
// localStorage-backed for now. Future: POST to a Cloudflare Worker
// endpoint that forwards to the obsidian-capture-bot on his Mac.
// ─── PORTRAIT GALLERY ──────────────────────────────────────
// Dr Non's headshots. Full-screen viewer, prev/next, native share.
// Drop any new portrait as portraits/p-05-*.jpg — it auto-appears.
const PORTRAITS = [
  { file: 'portraits/p-05-blue-suit-window.jpg', name: 'Blue Suit · Window' },
  { file: 'portraits/p-01-formal-2024.jpg',      name: 'Formal · Pink · 2024' },
  { file: 'portraits/p-02-formal-2026.jpg',      name: 'Formal · 2026' },
  { file: 'portraits/p-07-civil-service.jpg',    name: 'Thai Civil Service · Uniform' },
  { file: 'portraits/p-03-formal-alt.jpg',       name: 'Formal · White' },
  { file: 'portraits/p-04-john-wick.jpg',        name: 'John Wick Style' },
  { file: 'portraits/p-06-leap-east-2026.jpg',   name: 'LEAP East · Hong Kong · 2026' },
];
let pgaIdx = 0;

function pgaShow(idx) {
  pgaIdx = ((idx % PORTRAITS.length) + PORTRAITS.length) % PORTRAITS.length;
  const p = PORTRAITS[pgaIdx];
  const img = document.getElementById('pga-img');
  const nameEl = document.getElementById('pga-name');
  const countEl = document.getElementById('pga-count');
  if (img) {
    img.style.opacity = '0';
    const next = new Image();
    next.onload = () => { img.src = next.src; requestAnimationFrame(() => { img.style.opacity = '1'; }); };
    next.onerror = () => { img.src = p.file; img.style.opacity = '1'; };
    next.src = p.file;
  }
  if (nameEl) nameEl.textContent = p.name;
  if (countEl) countEl.textContent = `${pgaIdx + 1} / ${PORTRAITS.length}`;
}

function openPortraitGallery() {
  const el = document.getElementById('pga');
  if (!el) return;
  el.classList.add('in');
  pgaShow(0);
}
function closePortraitGallery() {
  document.getElementById('pga')?.classList.remove('in');
}

document.getElementById('pga-close')?.addEventListener('click', closePortraitGallery);
document.getElementById('pga-prev')?.addEventListener('click', () => pgaShow(pgaIdx - 1));
document.getElementById('pga-next')?.addEventListener('click', () => pgaShow(pgaIdx + 1));
document.getElementById('pga-share')?.addEventListener('click', async () => {
  const p = PORTRAITS[pgaIdx];
  try {
    // Fetch the current portrait as a Blob and share via native sheet.
    // iOS: opens AirDrop / Messages / WhatsApp / etc.
    // Android: same native share tray.
    // Desktop fallback: <a download> trigger.
    const r = await fetch(p.file);
    const blob = await r.blob();
    // Clean filename — e.g. "dr-non-blue-suit-window.jpg"
    const fname = 'dr-non-' + p.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '') + '.jpg';
    const file = new File([blob], fname, { type: 'image/jpeg' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Dr Non Arkaraprasertkul',
        text: 'Dr Non Arkaraprasertkul · architect, anthropologist, smart city · depa Thailand · nonarkara.org',
      });
    } else {
      // Fallback: direct download link
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob), download: fname,
      });
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 500);
    }
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('share failed', e);
  }
});
// Swipe left/right to navigate
(() => {
  const el = document.getElementById('pga');
  if (!el) return;
  let sx = 0;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 48) pgaShow(dx < 0 ? pgaIdx + 1 : pgaIdx - 1);
  }, { passive: true });
})();

// ─── FRAME — museum-art focus session ─────────────────────
// Tap FRAME → full-screen black, famous public-domain artwork
// fades in, 20s rotation, 25-min countdown in the corner. Hold ✕
// for 3s to exit. Caption auto-hides after 5s, comes back on tap.
// Manifest = /art-manifest.json (Met + Art Institute Chicago, CC0).
const FRAME = {
  duration: 25 * 60,        // 25 minutes
  perImage: 20,             // seconds per artwork
  remaining: 25 * 60,
  tickHandle: null,
  slideHandle: null,
  capHideHandle: null,
  manifest: null,
  idx: 0,
  shuffled: [],
  holdRAF: null,
  holdStart: 0,
};
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
async function loadFrameManifest() {
  if (FRAME.manifest) return FRAME.manifest;
  try {
    const r = await fetch('/art-manifest.json', { cache: 'force-cache' });
    FRAME.manifest = await r.json();
  } catch (_) { FRAME.manifest = []; }
  return FRAME.manifest;
}
function fmtFrame(secs) {
  const m = Math.max(0, Math.floor(secs / 60));
  const s = Math.max(0, secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function showFrameMeta() {
  const meta = document.querySelector('.frame-meta');
  const frameEl = document.getElementById('frame');
  if (meta) meta.classList.remove('hidden');
  if (frameEl) frameEl.classList.remove('captionless');
  clearTimeout(FRAME.capHideHandle);
  FRAME.capHideHandle = setTimeout(() => {
    if (meta) meta.classList.add('hidden');
    if (frameEl) frameEl.classList.add('captionless');
  }, 5000);
}
function nextFrameImage() {
  if (!FRAME.shuffled.length) return;
  const w = FRAME.shuffled[FRAME.idx % FRAME.shuffled.length];
  FRAME.idx++;
  const img = document.getElementById('frame-img');
  const cap = document.getElementById('frame-caption');
  if (!img) return;
  // Crossfade: fade out, swap src, fade in on load
  img.style.opacity = '0';
  const next = new Image();
  next.onload = () => {
    img.src = next.src;
    img.alt = w.title + ' — ' + w.artist;
    // give the DOM a tick before fading in
    requestAnimationFrame(() => { img.style.opacity = '1'; });
  };
  // Fall back if the high-res fails — try the thumb
  next.onerror = () => {
    if (next.src !== w.thumb) { next.src = w.thumb; }
    else { /* skip — try next */ nextFrameImage(); }
  };
  next.src = w.image;
  if (cap) {
    cap.querySelector('.title').textContent  = w.title;
    cap.querySelector('.artist').textContent = w.artist + (w.year ? ' · ' + w.year : '');
    const noteEl = cap.querySelector('.note');
    if (noteEl) noteEl.textContent = w.note || '';
    cap.querySelector('.museum').textContent = w.museum;
  }
  showFrameMeta();
}
async function openFrame() {
  const manifest = await loadFrameManifest();
  if (!manifest.length) return;
  FRAME.shuffled = shuffle(manifest);
  FRAME.idx = 0;
  FRAME.remaining = FRAME.duration;
  const el = document.getElementById('frame');
  el.classList.add('in');
  document.getElementById('frame-time').textContent = fmtFrame(FRAME.remaining);
  nextFrameImage();
  clearInterval(FRAME.tickHandle);
  FRAME.tickHandle = setInterval(() => {
    FRAME.remaining--;
    document.getElementById('frame-time').textContent = fmtFrame(FRAME.remaining);
    if (FRAME.remaining <= 0) closeFrame();
  }, 1000);
  clearInterval(FRAME.slideHandle);
  FRAME.slideHandle = setInterval(nextFrameImage, FRAME.perImage * 1000);
}
function closeFrame() {
  const el = document.getElementById('frame');
  el.classList.remove('in');
  clearInterval(FRAME.tickHandle); FRAME.tickHandle = null;
  clearInterval(FRAME.slideHandle); FRAME.slideHandle = null;
  clearTimeout(FRAME.capHideHandle); FRAME.capHideHandle = null;
}
// Tap anywhere on the frame (except the exit X) → show caption again
document.getElementById('frame')?.addEventListener('click', (e) => {
  if (e.target.id === 'frame-exit' || e.target.classList?.contains('frame-exit-bar')) return;
  showFrameMeta();
});
// Hold-to-exit (3s)
(function wireFrameExit() {
  const btn = document.getElementById('frame-exit');
  const bar = document.querySelector('.frame-exit-bar');
  const lbl = document.getElementById('frame-exit-label');
  if (!btn || !bar) return;
  const HOLD_MS = 3000;
  let pressing = false, t0 = 0;
  function frame() {
    if (!pressing) { bar.style.background = 'rgba(245,158,11,0)'; return; }
    const elapsed = performance.now() - t0;
    const pct = Math.min(1, elapsed / HOLD_MS);
    bar.style.background = `rgba(245,158,11,${0.55 * pct})`;
    if (lbl) lbl.textContent = pct >= 1 ? 'OK' : 'HOLD ' + Math.ceil((HOLD_MS - elapsed) / 1000);
    if (pct >= 1) { pressing = false; closeFrame(); return; }
    FRAME.holdRAF = requestAnimationFrame(frame);
  }
  function down(e) { e.preventDefault(); pressing = true; t0 = performance.now(); FRAME.holdRAF = requestAnimationFrame(frame); }
  function up() {
    pressing = false;
    cancelAnimationFrame(FRAME.holdRAF);
    bar.style.background = 'rgba(245,158,11,0)';
    if (lbl) lbl.textContent = 'HOLD';
  }
  btn.addEventListener('pointerdown',  down);
  btn.addEventListener('pointerup',    up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('pointerleave', up);
})();

const NOTE_STORAGE_KEY = 'nonarkara.notes';
function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTE_STORAGE_KEY) || '[]'); }
  catch (_) { return []; }
}
function saveNotes(arr) {
  try { localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(arr)); } catch (_) {}
}
function renderNoteList() {
  const el = document.getElementById('note-list');
  if (!el) return;
  const notes = loadNotes();
  if (!notes.length) {
    el.innerHTML = '<div class="note-row empty">no notes yet — capture one above</div>';
    return;
  }
  el.innerHTML = notes.slice().reverse().map(n => `
    <div class="note-row" data-ts="${n.ts}">
      <span class="ts">${new Date(n.ts).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · BKK</span>
      <span class="body">${(n.text || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</span>
    </div>
  `).join('');
}
function openNoteModal() {
  const m = document.getElementById('note-modal');
  if (!m) return;
  renderNoteList();
  m.classList.add('in');
  m.setAttribute('aria-hidden', 'false');
  const ta = document.getElementById('note-input');
  if (ta) setTimeout(() => ta.focus(), 50);
}
function closeNoteModal() {
  const m = document.getElementById('note-modal');
  if (!m) return;
  m.classList.remove('in');
  m.setAttribute('aria-hidden', 'true');
}
document.getElementById('note-close')?.addEventListener('click', closeNoteModal);
document.getElementById('note-modal')?.addEventListener('click', (e) => {
  if (e.target.dataset.closeNote === '1') closeNoteModal();
});
document.getElementById('note-save')?.addEventListener('click', async () => {
  const ta = document.getElementById('note-input');
  const text = (ta?.value || '').trim();
  if (!text) return;

  // Save locally immediately (offline-first)
  const note = { ts: Date.now(), text };
  const notes = loadNotes();
  notes.push(note);
  saveNotes(notes);
  ta.value = '';
  renderNoteList();

  // Show "saving…" then result
  const meta = document.getElementById('note-meta');
  if (meta) meta.textContent = 'saving to second brain…';

  // Fire-and-forget to the pipeline (Supabase + Google Sheets + embedding)
  try {
    const r = await fetch('https://api.nonarkara.org/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source: 'note', ts: new Date(note.ts).toISOString() }),
    });
    const d = await r.json();
    if (meta) {
      meta.textContent = d.ok
        ? '✓ saved · sheet · supabase · embedded'
        : '✓ saved locally (sync later)';
      setTimeout(() => { meta.textContent = 'stored on this device + second brain'; }, 3000);
    }
  } catch (_) {
    if (meta) {
      meta.textContent = '✓ saved locally — will sync when online';
      setTimeout(() => { meta.textContent = 'stored on this device'; }, 3000);
    }
  }
});
document.getElementById('note-clear')?.addEventListener('click', () => {
  const ta = document.getElementById('note-input');
  if (ta) ta.value = '';
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('note-modal')?.classList.contains('in')) {
    closeNoteModal();
  }
});

// ─── Casio-graphic wireframe world map ─────────────────────
// Continents drawn as simplified polylines (purposely abstract,
// not literal — Casio data-bank watch aesthetic). City dots
// populated from CITIES, Bangkok highlighted in amber.
function renderWorldMap() {
  const svg = document.getElementById('plan-worldmap');
  if (!svg) return;
  // Braun "GMT WELTZEIT" travel-clock face, after Dieter Rams.
  // No continent decoration — pure timezone grid: 24 hairline
  // meridians at 15° each, equator + tropic references, hour
  // offsets across the top, cities placed by lat/lon as small
  // dots with their abbreviated names. Bangkok = home in amber.

  // 25 vertical lines (-12h … +12h), every 15° of longitude
  const meridians = [];
  for (let h = -12; h <= 12; h++) {
    const x = h * 15;
    const cls = (h === 0) ? 'meridian prime' : 'meridian';
    meridians.push(`<line class="${cls}" x1="${x}" y1="-72" x2="${x}" y2="72"/>`);
  }

  // Equator + soft tropic reference lines
  const guides = `
    <line class="equator"   x1="-180" y1="0"   x2="180" y2="0"/>
    <line class="reference" x1="-180" y1="-23" x2="180" y2="-23"/>
    <line class="reference" x1="-180" y1="23"  x2="180" y2="23"/>
  `;

  // Hour offset numbers across the top edge — every 3h, plus the meridian
  const hourLabels = [];
  for (let h = -12; h <= 12; h += 3) {
    if (h === 0) { hourLabels.push(`<text class="tz-label gmt" x="0" y="-78" text-anchor="middle">GMT</text>`); continue; }
    const x = h * 15;
    const lbl = h > 0 ? `+${h}` : `${h}`;
    hourLabels.push(`<text class="tz-label" x="${x}" y="-78" text-anchor="middle">${lbl}</text>`);
  }

  // Cities — dot + label + live time. Per-city offsets nudge labels
  // out of overlap zones (Tokyo/Shanghai/Bangkok/Sydney/Honiara all
  // crowd the eastern hemisphere; offsets give each one breathing
  // room without lying about their actual lat/lon dot positions).
  const labeled = ['Bangkok','London','Tokyo','New York','Sydney','Honiara','Shanghai','Dubai'];
  const offsets = {
    // name → { dx, dy, anchor }   in viewBox units
    'Bangkok':  { dx:  3, dy:  2, anchor: 'start' },     // east-down so it doesn't crash into Shanghai
    'London':   { dx:  0, dy: -4, anchor: 'middle' },    // straight up at GMT
    'Tokyo':    { dx:  3, dy: -4, anchor: 'start' },     // up-east
    'Shanghai': { dx: -3, dy: -4, anchor: 'end' },       // up-west of dot
    'New York': { dx:  3, dy: -4, anchor: 'start' },     // up-east
    'Sydney':   { dx:  3, dy:  9, anchor: 'start' },     // below
    'Honiara':  { dx: -3, dy:  9, anchor: 'end' },       // below-west
    'Dubai':    { dx: -3, dy: -4, anchor: 'end' },       // up-west
  };
  const dotSvg = CITIES.map(c => {
    const x = c.lon, y = -c.lat;
    const home = c.home ? ' home' : '';
    const r = c.home ? 2.2 : 1.4;
    const showLabel = c.home || labeled.includes(c.name);
    const o = offsets[c.name] || { dx: 3, dy: -4, anchor: 'start' };
    const labelEls = showLabel ? `
      <text class="city-label${home}" x="${x + o.dx}" y="${y + o.dy}" text-anchor="${o.anchor}">${c.name.toLowerCase()}</text>
      <text class="city-label city-time" data-tz="${c.tz}" x="${x + o.dx}" y="${y + o.dy + 7}" text-anchor="${o.anchor}">--:--</text>
    ` : '';
    return `
      <g class="city-grp" data-name="${c.name}">
        <circle class="city${home}" cx="${x}" cy="${y}" r="${r}"/>
        ${labelEls}
      </g>
    `;
  }).join('');

  // Bottom strip — Braun homage caption
  const homage = `<text class="tz-label gmt" x="-178" y="83" text-anchor="start">GMT · WELTZEIT</text>
                  <text class="tz-label" x="178" y="83" text-anchor="end">15° per hour</text>`;

  svg.innerHTML = guides + meridians.join('') + hourLabels.join('') + dotSvg + homage;

  svg.querySelectorAll('.city-grp').forEach(g => {
    g.style.cursor = 'pointer';
    g.addEventListener('click', () => {
      const c = CITIES.find(x => x.name === g.dataset.name);
      if (c) openCityModal(c);
    });
  });
}

function paintPlanStatus(data) { try { _paintPlanStatusBody(data); } catch (_) {} }
function _paintPlanStatusBody(data) {
  if (!planProjEl) return;
  // Telemetry ribbon stats — derived from the snapshot.
  const ribLast   = document.getElementById('ribbon-last');
  const ribMs     = document.getElementById('ribbon-ms');
  const ribUptime = document.getElementById('ribbon-uptime');
  if (data?.ts && ribLast) {
    const age = Math.max(0, Math.floor((Date.now() - new Date(data.ts).getTime()) / 1000));
    ribLast.textContent = age < 60 ? age + 's' : Math.floor(age / 60) + 'm';
  }
  if (data?.sites && ribMs) {
    const ms = Object.values(data.sites).map(s => s.ms).filter(Number.isFinite).sort((a, b) => a - b);
    const median = ms.length ? ms[Math.floor(ms.length / 2)] : 0;
    ribMs.textContent = `${median} ms`;
  }
  let okCount = 0, total = 0;
  planProjEl.querySelectorAll('.plan-cell').forEach(cell => {
    const code = cell.dataset.code;
    const p = PROJECTS.find(x => x.code === code);
    if (!p) return;
    const entry = data?.sites?.[p.dom];
    if (!entry) {
      cell.removeAttribute('data-status');
      return;
    }
    total++;
    const ok = entry.code === 200 || entry.code === 301 || entry.code === 302;
    cell.dataset.status = ok ? 'ok' : 'fail';
    if (ok) okCount++;
  });
  // Summary across all monitored sites (not just TVs)
  if (data?.sites) {
    const all = Object.values(data.sites);
    const ok2 = all.filter(s => s.code === 200 || s.code === 301 || s.code === 302).length;
    if (planStatEl) {
      const newText = `${ok2} / ${all.length}`;
      if (planStatEl.textContent !== newText) {
        planStatEl.textContent = newText;
        planStatEl.classList.remove('flash');
        void planStatEl.offsetWidth;        // force reflow so flash re-runs
        planStatEl.classList.add('flash');
      }
    }
    if (ribUptime) {
      const pct = all.length ? Math.round((ok2 / all.length) * 100) : 0;
      ribUptime.textContent = `${pct} %`;
    }
  } else if (planStatEl) {
    planStatEl.textContent = '— / —';
  }
}

// Hydrate from the cached snapshot so the dots paint INSTANTLY on
// first load, before the network round-trip lands. Stale data beats
// a wall of grey "unknown" dots, and the next refreshStatus tick
// overwrites with fresh data anyway.
try {
  const cached = localStorage.getItem('nonarkara.status.snapshot');
  if (cached) {
    const data = JSON.parse(cached);
    if (data && data.sites) {
      window.__lastStatusData = data;
      paintPlanStatus(data);
    }
  }
} catch (_) {}
if (window.__lastStatusData) paintPlanStatus(window.__lastStatusData);

// Wire toggle buttons — defensive: missing DOM nodes must not crash init
const viewToggleBtn = document.getElementById('view-toggle');
const planRoomBtn   = document.getElementById('plan-room');
const planThemeBtn  = document.getElementById('plan-theme');
if (planRoomBtn)   planRoomBtn.addEventListener('click', () => {
  // iOS needs the gyro permission request inside a user gesture.
  // Chain the tilt hint after permission lands — only show on phones
  // that actually granted gyro access (skip silently on desktop).
  enableGyro()
    .then(() => { if (gyroEnabled) showTiltHint(); })
    .catch(() => {});
  setView('room');
});
if (viewToggleBtn) viewToggleBtn.addEventListener('click', () => setView('plan'));
if (planThemeBtn)  planThemeBtn.addEventListener('click', toggleTheme);

// HUD buttons at the top of plan view — the always-visible quad
const hudFocusEl = document.getElementById('hud-focus');
const hudMusicEl = document.getElementById('hud-music');
const hudNoteEl  = document.getElementById('hud-note');
const hudThemeEl = document.getElementById('hud-theme');
if (hudFocusEl) hudFocusEl.addEventListener('click', () => { try { openPomodoro(); } catch (_) {} });
if (hudMusicEl) hudMusicEl.addEventListener('click', () => { try { openMusicModal(); } catch (_) {} });
if (hudNoteEl)  hudNoteEl.addEventListener('click', () => { try { openNoteModal(); } catch (_) {} });
if (hudThemeEl) hudThemeEl.addEventListener('click', toggleTheme);
const hudFrameEl = document.getElementById('hud-frame');
if (hudFrameEl) hudFrameEl.addEventListener('click', () => { try { openFrame(); } catch (_) {} });

// ── Room HUD: live --:--:-- clock + FOCUS chip + one-shot tilt hint ──
// Channeling the monitoring-console vibe of nonarkara.github.io/dr-non-operating-systems.
const hudClockEl = document.getElementById('hud-clock');
function tickHudClock() {
  if (!hudClockEl) return;
  const d = new Date();
  hudClockEl.textContent = d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}
tickHudClock();
setInterval(tickHudClock, 1000);

const roomHudFocusBtn = document.getElementById('room-hud-focus');
if (roomHudFocusBtn) roomHudFocusBtn.addEventListener('click', () => { try { openPomodoro(); } catch (_) {} });

// Tilt hint: fires once per page load, ~1s in, fades out ~4s later.
let tiltHintShown = false;
function showTiltHint() {
  if (tiltHintShown) return;
  tiltHintShown = true;
  const el = document.getElementById('tilt-hint');
  if (!el) return;
  setTimeout(() => el.classList.add('show'), 800);
  setTimeout(() => el.classList.remove('show'), 4800);
}

// ── Deep-work OS layer: intent + focus-minutes-today + keyboard shortcuts ──
const _pad2 = (n) => (n < 10 ? '0' + n : '' + n);
function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`;
}

// Intent: editable string, persists per day. New day → cleared so you
// commit to a fresh intent each morning instead of inheriting yesterday's.
const INTENT_KEY = 'nonarkara.intent';
const INTENT_DATE_KEY = 'nonarkara.intent.date';
function loadIntent() {
  const date = lsGet(INTENT_DATE_KEY);
  const intent = lsGet(INTENT_KEY);
  if (!intent || date !== _todayKey()) return null;
  return intent;
}
function saveIntent(s) {
  lsSet(INTENT_KEY, s);
  lsSet(INTENT_DATE_KEY, _todayKey());
}
function renderIntent() {
  const el = document.getElementById('intent-text');
  if (!el) return;
  const cur = loadIntent();
  if (cur) {
    el.textContent = cur;
    el.classList.remove('placeholder');
  } else {
    el.textContent = 'SET YOUR INTENT';
    el.classList.add('placeholder');
  }
}
renderIntent();
const intentBtn = document.getElementById('intent-line');
if (intentBtn) intentBtn.addEventListener('click', () => {
  const cur = loadIntent() || '';
  const next = window.prompt('What are you working on today?', cur);
  if (next === null) return;
  saveIntent(next.trim().slice(0, 80));
  renderIntent();
});

// Focus minutes today — accumulator hooked into Pomodoro phase transitions.
// Counts ACTUAL elapsed work-phase seconds (not the full 25min preset),
// so skipping a session 5 minutes in adds 5 minutes, not 25.
const FOCUS_MIN_KEY  = 'nonarkara.focusMinutes';
const FOCUS_DATE_KEY = 'nonarkara.focusMinutes.date';
function loadFocusMinutes() {
  if (lsGet(FOCUS_DATE_KEY) !== _todayKey()) {
    lsSet(FOCUS_DATE_KEY, _todayKey());
    lsSet(FOCUS_MIN_KEY, '0');
    return 0;
  }
  return parseInt(lsGet(FOCUS_MIN_KEY) || '0', 10) || 0;
}
function addFocusMinutes(m) {
  if (m <= 0) return;
  lsSet(FOCUS_MIN_KEY, String(loadFocusMinutes() + m));
  lsSet(FOCUS_DATE_KEY, _todayKey());
  renderFocusToday();
}
function renderFocusToday() {
  let el = document.getElementById('hud-today');
  if (!el) {
    const cluster = document.querySelector('.room-hud-cluster.top-left');
    if (!cluster) return;
    const sep = document.createElement('span');
    sep.className = 'hud-sep';
    sep.textContent = '·';
    sep.id = 'hud-today-sep';
    el = document.createElement('span');
    el.id = 'hud-today';
    el.className = 'hud-today empty';
    cluster.appendChild(sep);
    cluster.appendChild(el);
  }
  const m = loadFocusMinutes();
  if (m <= 0) {
    el.classList.add('empty');
    el.textContent = '';
    const sepEl = document.getElementById('hud-today-sep');
    if (sepEl) sepEl.style.display = 'none';
  } else {
    el.classList.remove('empty');
    const sepEl = document.getElementById('hud-today-sep');
    if (sepEl) sepEl.style.display = '';
    const hh = Math.floor(m / 60), mm = m % 60;
    el.textContent = hh > 0 ? `+${hh}H${_pad2(mm)}M FOCUS` : `+${mm}M FOCUS`;
  }
}
renderFocusToday();

// Wrap pomoNextPhase to credit elapsed work time on every work→break transition
// (both natural completion and skip). The wrap counts what was actually spent.
if (typeof pomoNextPhase === 'function') {
  const _origPomoNextPhase = pomoNextPhase;
  pomoNextPhase = function() {
    const wasWork = POMO.phase === 'work';
    const fullDuration = POMO.durations.work;
    const remaining = Math.max(0, POMO.remaining);
    const elapsed = Math.max(0, fullDuration - remaining);
    _origPomoNextPhase.apply(this, arguments);
    if (wasWork && elapsed >= 60) {
      addFocusMinutes(Math.round(elapsed / 60));
    }
  };
}

// ── Keyboard shortcuts: F focus, M music, P toggle plan/room, Esc close ──
document.addEventListener('keydown', (e) => {
  const t = (e.target && e.target.tagName) || '';
  if (t === 'INPUT' || t === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return; // don't intercept modifier combos
  const k = e.key.toLowerCase();
  if (k === 'f') {
    e.preventDefault();
    try { openPomodoro(); } catch (_) {}
  } else if (k === 'm') {
    e.preventDefault();
    try { openMusicModal(); } catch (_) {}
  } else if (k === 'p') {
    e.preventDefault();
    const inRoom = document.body.dataset.view === 'room';
    if (inRoom) {
      setView('plan');
    } else {
      enableGyro().then(() => { if (gyroEnabled) showTiltHint(); }).catch(() => {});
      setView('room');
    }
  } else if (k === 'escape') {
    const pomo = document.getElementById('pomodoro');
    if (pomo && pomo.classList.contains('in')) {
      try { closePomodoro(); } catch (_) {}
    }
    const pal = document.getElementById('cmd-palette');
    if (pal && pal.classList.contains('in')) {
      try { window.__closeCommandPalette(); } catch (_) {}
    }
  } else if ((e.metaKey || e.ctrlKey) && k === 'k') {
    e.preventDefault();
    try { window.__openCommandPalette(); } catch (_) {}
  } else if (k === 't' && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    try { toggleTheme(); } catch (_) {}
  }
  // Plan view: number keys trigger HUD buttons
  if (document.body.dataset.view === 'plan') {
    const hudBtns = document.querySelectorAll('.hud-btn');
    if (k === '1' && hudBtns[0]) { e.preventDefault(); hudBtns[0].click(); }
    else if (k === '2' && hudBtns[1]) { e.preventDefault(); hudBtns[1].click(); }
    else if (k === '3' && hudBtns[2]) { e.preventDefault(); hudBtns[2].click(); }
    else if (k === '4' && hudBtns[3]) { e.preventDefault(); hudBtns[3].click(); }
    else if (k === '5' && hudBtns[4]) { e.preventDefault(); hudBtns[4].click(); }
  }
});

// Brand block in plan-head → opens contact modal (the business card)
const planBrandBtn = document.getElementById('plan-brand-blk');
if (planBrandBtn) planBrandBtn.addEventListener('click', () => {
  try { openFurnitureModal('coffee'); } catch (_) {}
});

document.querySelectorAll('#plan-lang button').forEach(b => {
  b.addEventListener('click', () => {
    LANG = b.dataset.l;
    lsSet('nonarkara.lang', LANG);
    try { applyLang(); } catch (_) {}
    renderPlan();
  });
});

// Initial paint + reveal-in pulse for the floating ROOM/PLAN toggle
try { renderPlan(); } catch (_) {}
try { tickPlanClock(); } catch (_) {}
try { paintBrief(); } catch (_) {}
try { renderWorldMap(); } catch (_) {}
try { paintCouncil(); } catch (_) {}

// ── Daily steps ─────────────────────────────────────────────
const STEPS_KEY = 'nonarkara.steps';
function todayKey() { return new Date().toISOString().slice(0, 10); }
function loadSteps() {
  try { return (JSON.parse(localStorage.getItem(STEPS_KEY) || '{}'))[todayKey()] ?? null; }
  catch (_) { return null; }
}
function saveStepsLocal(n) {
  try {
    const d = JSON.parse(localStorage.getItem(STEPS_KEY) || '{}');
    d[todayKey()] = n;
    const pruned = {};
    Object.keys(d).sort().slice(-30).forEach(k => { pruned[k] = d[k]; });
    localStorage.setItem(STEPS_KEY, JSON.stringify(pruned));
  } catch (_) {}
}
function paintSteps() {
  const v = document.getElementById('steps-val');
  const s = document.getElementById('steps-sub');
  const n = loadSteps();
  if (v) v.textContent = n != null ? Number(n).toLocaleString() : '—';
  if (s) s.textContent = n != null ? `${todayKey()} · tap to update` : 'tap to log today';
}
document.getElementById('steps-val')?.addEventListener('click', () => {
  const cur = loadSteps();
  const input = window.prompt('Steps today?', cur != null ? String(cur) : '');
  if (input === null) return;
  const n = parseInt(input, 10);
  if (!isNaN(n) && n >= 0) {
    saveStepsLocal(n);
    paintSteps();
    fetch('https://api.nonarkara.org/capture', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Steps ${todayKey()}: ${n.toLocaleString()}`, source: 'steps', metadata: { steps: n, date: todayKey() } }),
    }).catch(() => {});
  }
});
paintSteps();

window.__planReady = true;
if (viewToggleBtn) setTimeout(() => viewToggleBtn.classList.add('in'), 200);

// Tap "NON" three times quickly to summon a haiku.
// Works the same on mouse, keyboard, and thumbs.
let brandTaps = 0;
let brandResetTimer = null;
const brandEl = document.querySelector('.brand');
brandEl.addEventListener('click', () => {
  brandTaps++;
  brandEl.classList.add('tap');
  setTimeout(() => brandEl.classList.remove('tap'), 140);
  clearTimeout(brandResetTimer);
  brandResetTimer = setTimeout(() => { brandTaps = 0; }, 1800);
  if (brandTaps >= 3) {
    brandTaps = 0;
    clearTimeout(brandResetTimer);
    showHaiku();
  }
});

// Keep the classic Konami sequence for desktop power users.
const KONAMI_SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiBuf = [];
window.addEventListener('keydown', (e) => {
  const k = (e.key || '').length === 1 ? e.key.toLowerCase() : e.key;
  konamiBuf.push(k);
  if (konamiBuf.length > KONAMI_SEQ.length) konamiBuf = konamiBuf.slice(-KONAMI_SEQ.length);
  if (konamiBuf.length === KONAMI_SEQ.length && konamiBuf.every((v, i) => v === KONAMI_SEQ[i])) {
    konamiBuf = [];
    showHaiku();
  }
});

// ════════════════════════════════════════════════════════
// Reveal + render loop
// ════════════════════════════════════════════════════════
// ── Boot screen ─────────────────────────────────────────────
// Fade out after 1.2s (the CSS transition handles the 0.8s fade).
const bootEl = document.getElementById('boot');
if (bootEl) {
  setTimeout(() => {
    bootEl.classList.add('gone');
    setTimeout(() => { bootEl.style.display = 'none'; }, 900);
  }, 1200);
}

// ── Plan ↔ Room smooth transition ───────────────────────────
// Wrap setView so it crossfades instead of snapping.
const _origSetView = setView;
window.setView = function(v) {
  const planEl = document.getElementById('plan');
  if (v === 'room' && planEl && document.body.dataset.view === 'plan') {
    planEl.classList.add('view-leaving');
    setTimeout(() => { _origSetView(v); planEl.classList.remove('view-leaving'); }, 280);
  } else {
    _origSetView(v);
  }
};
// Re-wire buttons to the wrapped version
document.getElementById('plan-room')?.addEventListener('click', null);
document.getElementById('plan-room')?.addEventListener('click', () => {
  enableGyro().then(() => { if (gyroEnabled) showTiltHint(); }).catch(() => {});
  window.setView('room');
});

const startTime = performance.now();
document.querySelector('.veil').classList.add('gone');
setTimeout(() => {
  document.querySelector('.brand').classList.add('in');
  document.querySelector('.caption').classList.add('in');
  document.querySelector('.hint').classList.add('in');
  document.querySelector('.meta').classList.add('in');
  document.querySelector('.lang').classList.add('in');
  if (typeof particles !== 'undefined') particles.visible = true;
  if (typeof activatePulses === 'function') activatePulses();
  document.getElementById('menu-btn').classList.add('in');
}, 200);


// ════════════════════════════════════════════════════════
// Camera dolly — smooth zoom toward clicked objects
// ════════════════════════════════════════════════════════
let dollyTarget = null;
let dollyOriginPos = new THREE.Vector3();
let dollyOriginRot = new THREE.Euler();
let dollyProgress = 0;
let dollySpeed = 0.03;
const DOLLY_DURATION = 45; // frames (~0.75s at 60fps)

function startDollyTo(targetPoint) {
  dollyOriginPos.copy(camera.position);
  dollyOriginRot.copy(camera.rotation);
  dollyTarget = targetPoint.clone();
  dollyProgress = 0;
  document.body.classList.add('camera-dollying');
}
function endDolly() {
  dollyTarget = null;
  dollyProgress = 0;
  document.body.classList.remove('camera-dollying');
}
function updateDolly() {
  if (!dollyTarget) return false;
  dollyProgress++;
  const t = Math.min(1, dollyProgress / DOLLY_DURATION);
  // Ease in-out cubic
  const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  // Move camera closer to target
  camera.position.lerpVectors(dollyOriginPos, dollyTarget, ease * 0.4);
  // Look at target
  const lookTarget = dollyTarget.clone();
  lookTarget.y += 0.5;
  camera.lookAt(lookTarget);
  if (t >= 1) {
    endDolly();
    return true;
  }
  return false;
}


// ════════════════════════════════════════════════════════
// Command Palette — Cmd+K to search projects, cities, music, art
// ════════════════════════════════════════════════════════
(function() {
  const PALETTE_ITEMS = [];
  // Projects
  PROJECTS.forEach((p, idx) => {
    PALETTE_ITEMS.push({ type: 'project', title: p.title, code: p.code, url: p.url, icon: '◈' });
  });
  // Cities
  CITIES.forEach(c => {
    PALETTE_ITEMS.push({ type: 'city', title: c.name, code: c.tz.split('/').pop().replace(/_/g,' '), tz: c.tz, icon: '●' });
  });
  // Music
  SONGS.forEach((s, idx) => {
    PALETTE_ITEMS.push({ type: 'music', title: s.name, alt: s.alt, idx: idx, icon: '♪' });
  });
  // Functional actions
  PALETTE_ITEMS.push(
    { type: 'action', title: 'Toggle Focus (Pomodoro)', action: () => { try{openPomodoro();}catch(_){} }, icon: '◷', keys: 'F' },
    { type: 'action', title: 'Play Music', action: () => { try{openMusicModal();}catch(_){} }, icon: '♫', keys: 'M' },
    { type: 'action', title: 'Toggle Theme', action: () => { try{toggleTheme();}catch(_){} }, icon: '◐', keys: 'T' },
    { type: 'action', title: 'Open Gallery (FRAME)', action: () => { try{openFrame();}catch(_){} }, icon: '▣' },
    { type: 'action', title: 'Open Portrait Gallery', action: () => { try{openPortraitGallery();}catch(_){} }, icon: '◉' },
    { type: 'action', title: 'View Plan', action: () => { setView('plan'); }, icon: '☰' },
    { type: 'action', title: 'Enter Room', action: () => { setView('room'); }, icon: '◈' },
    { type: 'action', title: 'Take Note', action: () => { try{openNoteModal();}catch(_){} }, icon: '✎' },
  );

  // Build DOM
  const palette = document.createElement('div');
  palette.className = 'cmd-palette';
  palette.id = 'cmd-palette';
  palette.innerHTML = `
    <div class="cmd-palette-bg" id="cmd-palette-bg"></div>
    <div class="cmd-palette-card">
      <div class="cmd-input-wrap">
        <span class="prompt">›</span>
        <input type="text" class="cmd-input" id="cmd-input" placeholder="Search projects, cities, music..." autocomplete="off" spellcheck="false" />
        <span class="cmd-shortcut-hint">ESC</span>
      </div>
      <div class="cmd-results" id="cmd-results"></div>
    </div>
  `;
  document.body.appendChild(palette);

  const input = document.getElementById('cmd-input');
  const results = document.getElementById('cmd-results');
  const bg = document.getElementById('cmd-palette-bg');
  let selectedIdx = -1;
  let filtered = [];

  function openPalette() {
    palette.classList.add('in');
    input.value = '';
    input.focus();
    filterItems('');
    selectedIdx = -1;
  }
  function closePalette() {
    palette.classList.remove('in');
    selectedIdx = -1;
  }

  function filterItems(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Show recent actions + all by type
      filtered = [...PALETTE_ITEMS];
    } else {
      filtered = PALETTE_ITEMS.filter(item => {
        const text = (item.title + ' ' + (item.code||'') + ' ' + (item.alt||'')).toLowerCase();
        return text.includes(q);
      });
    }
    renderResults();
  }

  function renderResults() {
    if (filtered.length === 0) {
      results.innerHTML = '<div class="cmd-empty">No results</div>';
      return;
    }
    // Group by type
    const groups = {};
    filtered.forEach(item => {
      const g = item.type === 'project' ? 'Projects' :
                item.type === 'city' ? 'Cities' :
                item.type === 'music' ? 'Music' : 'Actions';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    let html = '';
    let globalIdx = 0;
    for (const [gName, items] of Object.entries(groups)) {
      html += `<div class="cmd-group-label">${gName}</div>`;
      items.forEach(item => {
        const sel = globalIdx === selectedIdx ? 'selected' : '';
        const meta = item.keys ? `⌘ ${item.keys}` : (item.code || item.type);
        html += `<button class="cmd-item ${sel}" data-idx="${globalIdx}">
          <span class="g">${item.icon}</span>
          <span class="title">${escapeHtml(item.title)}</span>
          <span class="meta">${meta}</span>
        </button>`;
        globalIdx++;
      });
    }
    results.innerHTML = html;
    // Attach click handlers
    results.querySelectorAll('.cmd-item').forEach(btn => {
      btn.addEventListener('click', () => executeItem(filtered[parseInt(btn.dataset.idx)]));
    });
  }

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function executeItem(item) {
    closePalette();
    if (item.action) { item.action(); return; }
    if (item.type === 'project' && item.url) {
      if (isPersonalUrl(item.url)) openUrlModal(item.url, item.title, item.code);
      else window.open(item.url, '_blank');
    }
    if (item.type === 'city' && item.tz) openCityModal(item.tz);
    if (item.type === 'music' && item.idx !== undefined) {
      openMusicModal();
      setTimeout(() => { document.querySelectorAll('.music-row')[item.idx]?.click(); }, 100);
    }
  }

  input.addEventListener('input', (e) => {
    filterItems(e.target.value);
    selectedIdx = -1;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx+1, filtered.length-1); renderResults(); scrollToSelected(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx-1, 0); renderResults(); scrollToSelected(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (selectedIdx >= 0 && filtered[selectedIdx]) executeItem(filtered[selectedIdx]); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  });
  function scrollToSelected() {
    const sel = results.querySelector('.cmd-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  bg.addEventListener('click', closePalette);

  // Global keyboard shortcut
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    // Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
    }
    // Also / key (vim-style)
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      openPalette();
    }
  });

  window.__openCommandPalette = openPalette;
  window.__closeCommandPalette = closePalette;
})();

function animate() {
  requestAnimationFrame(animate);
  const t = (performance.now() - startTime) / 1000;
  const fadeT = Math.min(t / 3.5, 1);
  const ease = 1 - Math.pow(1 - fadeT, 3);
  FADE_TARGETS.forEach(({ mat, target }) => mat.opacity = target * ease);
  clockMat.opacity = ease * 1;

  // Status dot opacity rises with the rest
  TVs.forEach(grp => {
    if (grp.userData.dotMat) grp.userData.dotMat.opacity = ease * 0.85;
  });

  drawClock();
  drawRain();
  // Rain stays subtle — much dimmer than the clock face
  rainMat.opacity = ease * 0.18;

  // Tickers — scroll their textures, fade in to a calm dim
  TICKERS.forEach(tk => {
    tk.tex.offset.x += tk.scrollSpeed;
    tk.mat.opacity = ease * 0.55;
  });

  // Chandelier — slow Y rotation; click to toggle theme
  if (CHAND_GROUP) CHAND_GROUP.rotation.y += 0.0035;
  // Vinyl disc — spins only while music is playing (33⅓ rpm in spirit)
  if (RECORD_DISC && !audio.paused) RECORD_DISC.rotation.z -= 0.04;
  // Pomodoro button plane fades in alongside everything else
  if (window.__pomoBtnPlane) window.__pomoBtnPlane.material.opacity = ease * 0.7;
  // Switch panel label plate fades in alongside everything else
  if (window.__pomoLabelPlanes) {
    window.__pomoLabelPlanes.forEach(p => p.material.opacity = ease * 0.85);
  }
  // Operations panel
  if (OPS.plane) OPS.plane.material.opacity = ease * 0.85;
  // BRIEF projection above the TV grid — fades in alongside everything else
  if (window.__brief?.plane) window.__brief.plane.material.opacity = ease * 0.95;
  // Aphorism wall + door label fade in alongside everything else
  if (window.__aphMat) window.__aphMat.opacity = ease * 0.9;
  if (window.__frontDoorLockPlane) window.__frontDoorLockPlane.material.opacity = ease * 0.6;
  if (window.__ceilingEquator) window.__ceilingEquator.opacity = ease * 0.5;
  if (window.__badgeMats) window.__badgeMats.forEach(m => m.opacity = ease * 0.95);
  // Mind-layer fades + ticks
  if (window.__linkLineMat) window.__linkLineMat.opacity = ease * 0.18;
  if (window.__partMat)     window.__partMat.opacity     = ease * 0.18;
  if (typeof window.__tickPulse === 'function')     window.__tickPulse();
  if (typeof window.__tickParticles === 'function') window.__tickParticles();
  if (typeof window.__tickAphorism === 'function') window.__tickAphorism(performance.now());
  // Translucent portrait rotator — cycles every ~30s, cross-fades 1.5s.
  // Max opacity 0.32 so the aphorism text stays the dominant read.
  if (window.__portraitPlane && window.__portraitMats) {
    const now = performance.now();
    const sinceSwap = now - window.__portraitLastSwap;
    const TARGET_OP = 0.32;
    if (window.__portraitFadeDir === 1) {
      window.__portraitFade = Math.min(TARGET_OP, window.__portraitFade + 0.004);
      if (sinceSwap > 28000) window.__portraitFadeDir = -1;
    } else {
      window.__portraitFade = Math.max(0, window.__portraitFade - 0.004);
      if (window.__portraitFade <= 0) {
        window.__portraitIdx = (window.__portraitIdx + 1) % window.__portraitMats.length;
        window.__portraitPlane.material = window.__portraitMats[window.__portraitIdx];
        window.__portraitFadeDir = 1;
        window.__portraitLastSwap = now;
      }
    }
    // Apply (only once material is ready)
    const m = window.__portraitPlane.material;
    if (m && m.map && m.map.image) m.opacity = window.__portraitFade * ease;
  }
  // Initial paint of OPS (loading state) once during fade
  if (ease > 0.5 && !OPS._painted) { drawOpsPanel(); OPS._painted = true; }

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(INTERACTABLES.map(o => o.userData.hit));
  const hit = hits[0]?.object?.parent || null;

  if (hit !== hovered) {
    if (hovered) {
      const ud = hovered.userData;
      if (ud.kind === 'tv') {
        ud.frame.material = matBright;
        ud.screenTargetOpacity = 0.45;
      } else {
        ud.lines.forEach(l => l.material = ud.baseMaterial);
      }
    }
    hovered = hit;
    const tip = document.getElementById('tip');
    if (hovered) {
      const ud = hovered.userData;
      if (ud.kind === 'tv') {
        ud.frame.material = matHover;
        ud.screenTargetOpacity = 0.85;
        tip.innerHTML = `${ud.project.code}<span class="url">${ud.project.title.toLowerCase()}</span>`;
      } else if (ud.kind === 'furniture') {
        ud.lines.forEach(l => l.material = matHover);
        if (ud.key === 'cup') {
          // The easter egg whispers, doesn't announce.
          tip.innerHTML = `· · ·<span class="url">click</span>`;
        } else {
          const eyebrowKey = { bookshelf: 'cv_eyebrow', pedestal: 'li_eyebrow', coffee: 'contact_eyebrow' }[ud.key];
          const titleKey   = { bookshelf: 'cv_title',   pedestal: 'li_title',   coffee: 'contact_title'   }[ud.key];
          tip.innerHTML = `${t(eyebrowKey)}<span class="url">${t(titleKey).toLowerCase()}</span>`;
        }
      } else if (ud.kind === 'city') {
        ud.lines.forEach(l => l.material = matHover);
        tip.innerHTML = `${ud.city.name.toUpperCase()}<span class="url">${ud.city.tz}</span>`;
      } else if (ud.kind === 'pomoBtn') {
        ud.lines.forEach(l => l.material = matHover);
        tip.innerHTML = `▷  POMODORO<span class="url">25 min focus · 5 min break</span>`;
      } else if (ud.kind === 'chandelier') {
        ud.lines.forEach(l => l.material = matHover);
        tip.innerHTML = `${CURRENT_THEME === 'dark' ? '☼' : '☾'}  CHANDELIER<span class="url">tap to switch theme · ${CURRENT_THEME === 'dark' ? 'dark' : 'light'}</span>`;
      } else if (ud.kind === 'record') {
        ud.lines.forEach(l => l.material = matHover);
        tip.innerHTML = `◯ MUSIC<span class="url">${t('music_count')}</span>`;
      } else if (ud.kind === 'badge') {
        ud.lines.forEach(l => l.material = matHover);
        tip.innerHTML = `${ud.badge.label}<span class="url">${ud.badge.sub.toLowerCase()}</span>`;
      } else if (ud.kind === 'poster') {
        ud.lines.forEach(l => l.material = matHover);
        if (ud.action === 'frame')
          tip.innerHTML = `TOTAL DOMINATION<span class="url">tap · gallery focus · 25 min</span>`;
        else
          tip.innerHTML = `DR NON · PORTRAITS<span class="url">tap · view + share hi-res</span>`;
      }
      tip.classList.add('in');
      document.body.style.cursor = 'pointer';
    } else {
      tip.classList.remove('in');
      document.body.style.cursor = 'crosshair';
    }
  }

  // smooth screen opacity
  TVs.forEach(grp => {
    const m = grp.userData.screen.material;
    const tgt = grp.userData.screenTargetOpacity * ease;
    m.opacity += (tgt - m.opacity) * 0.12;
  });

  // Camera control: finger drag is the primary input, gyro adds a
  // gentle offset on top. While actively dragging, gyro fades to 0
  // so it doesn't fight the finger; on release, gyro eases back in.
  const gyroTarget = touchAnchor ? 0 : 1;
  window.__gyroBlend = (window.__gyroBlend ?? 0) + ((gyroTarget - (window.__gyroBlend ?? 0)) * 0.06);
  const gyroY = gyroEnabled ? -gyroSmoothX * 0.45 * window.__gyroBlend : 0;
  const gyroX = gyroEnabled ? -gyroSmoothY * 0.30 * window.__gyroBlend : 0;
  const drivenY = target.y + gyroY;
  const drivenX = target.x + gyroX;
  camera.rotation.y += (drivenY + baseRotY - camera.rotation.y) * 0.05;
  camera.rotation.x += (drivenX + baseRotX - camera.rotation.x) * 0.05;
  camera.position.y = 1.7 + Math.sin(t * 0.4) * 0.015;

  // Ambient particles
  if (particles.visible) {
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const v = particleVelocities[i];
      positions[i*3] += v.x + Math.sin(t * 0.3 + i) * 0.0005;
      positions[i*3+1] += v.y;
      positions[i*3+2] += v.z + Math.cos(t * 0.2 + i) * 0.0005;
      if (positions[i*3+1] > 5.5) positions[i*3+1] = 0.2;
      if (positions[i*3] > 9) positions[i*3] = -9;
      if (positions[i*3] < -9) positions[i*3] = 9;
      if (positions[i*3+2] > 7) positions[i*3+2] = -7;
      if (positions[i*3+2] < -7) positions[i*3+2] = 7;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.material.opacity = Math.min(0.35, particles.material.opacity + 0.002);
  }
  // Data pulse particles
  pulseAnims.forEach(p => {
    if (!p.active) { p.delay--; if (p.delay <= 0) { p.active = true; p.progress = 0; } return; }
    p.progress += p.speed;
    if (p.progress >= 1) { p.progress = 0; p.active = false; p.delay = 60+Math.random()*120; p.mesh.visible = false; return; }
    p.mesh.visible = true;
    const pos = p.mesh.geometry.attributes.position.array;
    pos[0] = p.from.x + (p.to.x-p.from.x)*p.progress;
    pos[1] = p.from.y + Math.sin(p.progress*Math.PI)*0.3;
    pos[2] = p.from.z + (p.to.z-p.from.z)*p.progress;
    p.mesh.geometry.attributes.position.needsUpdate = true;
    p.mesh.material.opacity = Math.sin(p.progress*Math.PI)*0.6;
  });
  // Camera dolly
  updateDolly();

  renderer.render(scene, camera);
}
animate();
