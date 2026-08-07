import * as THREE from 'three';
import { createDiscovery } from './discover.js';
import { buildPavilion, PLAN } from './pavilion.js';
import { buildGlassHouse, PLAN as GLASS_PLAN, paint as paintGlass } from './glasshouse.js';
import { buildSavoye, PLAN as SAVOYE_PLAN, paint as paintSavoye } from './savoye.js';
import { buildFarnsworth, PLAN as FARN_PLAN, paint as paintFarn } from './farnsworth.js';
import { Walk, attachStick } from './walk.js';
import { Look, overheadBlend, underfootBlend } from './look.js';
import { sunAltitude, paletteFor, fetchWeather, makeRain } from './daylight.js';
import { poemForDate } from './poems.js';
import * as STARLORE_MOD from './starlore.js';

// ── Visitor tracker — fire-and-forget, one ping per session ──────────────────
(function () {
  if (sessionStorage.getItem('non_v')) return;
  sessionStorage.setItem('non_v', '1');
  const SH = 'https://script.google.com/macros/s/AKfycbwzTwBNOseKkvkkjD-LH6B3GWrsFcwS6MTDbn7W5eb3zHxA-swtlHYuwJ3w5PAVXDhU7Q/exec';
  const b = { dashboard: 'NON', hostname: location.hostname, page: location.href,
    referrer: document.referrer || 'Direct', userAgent: navigator.userAgent,
    language: navigator.language, screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  const send = p => fetch(SH, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(p) }).catch(() => {});
  fetch('https://ipapi.co/json/').then(r => r.json())
    .then(d => { b.ip = d.ip; b.country = d.country_name; b.region = d.region; b.city = d.city; send(b); })
    .catch(() => send(b));
})();

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

// Version stamp — single source of truth. Bump on every meaningful push.
// History (most recent first):
//   4.11 (2026-08-07) fifth cache layer — _headers no-cache works on
//                    *.pages.dev; the custom domain's zone Browser Cache
//                    TTL rewrites JS/CSS to max-age=14400. Self-heal and
//                    ?reset now hit /heal (Clear-Site-Data) so a stale
//                    disk cache cannot outlive the hash mismatch.
//   4.10 (2026-08-07) Villa Savoye promenade — Traction Avant parked
//                     under the pilotis, walkable central ramp lifts
//                     the eye to the living terrace and roof garden so
//                     you can look at the sky from the second floor.
//                     walk.js gains floor patches + height-scoped
//                     colliders (living walls no longer fence the grass).
//   4.9 (2026-08-07) Farnsworth House joins the estate — Mies's glass
//                    tray south of the Pavilion, facing Johnson's Glass
//                    House across the plain. Procedural plan at real
//                    scale (not a SketchUp Warehouse mesh): white steel,
//                    primavera core as the one amber, porch end, well
//                    under the tray so it reads as floating while the
//                    walk datum stays at y≈0.
//   4.8 (2026-08-07) the rewrite you could not see — two sessions both
//                    shipped as '4.7', so the self-heal thought the old
//                    build was current. Versions now carry the git hash;
//                    the healer compares hashes, which cannot collide.
//   4.7 (2026-08-07) navigation rebuilt on the Doom model — look.js is
//                    the single owner of the camera; inputs ADD, nothing
//                    SETS. 1:1 same-frame response, mouse parallax gone,
//                    sky and ground are pitch-driven places, not modes.
//                    The inverted tilt gesture that sent an upward look
//                    to the ground is deleted along with the gesture.
//   4.7 (2026-08-07) fix: camera rotation order YXZ & angle normalization —
//                    prevents gimbal lock roll inversion (buildings upside down)
//                    and normalizes yaw lerps across PI boundary (no 360° flip glitches).
//   4.6 (2026-08-06) keyboard walk + sky/ground — sustained movement
//                    builds into a jog so 120m between buildings is not
//                    forty seconds of holding a button, and the compass
//                    chip says out loud that tapping it takes you there.
//   4.5 (2026-08-06) keyboard that behaves — S no longer toggles the sky
//                    while you walk backwards (U/J look up/down instead);
//                    WASD calls setWalk so desktop gets pointer-lock and
//                    mouse-look; arrow turns apply to baseRotY (no more
//                    boat-rudder lag); pitching the view far enough enters
//                    sky/ground the way the phone tilt already did.
//   4.4 (2026-08-06) mobile, actually usable — pinch no longer collapses
//                    into a one-way universe, drag is slow enough to aim,
//                    the pitch clamp lets you look up at all, and the
//                    room asks for motion access so holding the phone up
//                    finally does something.
//   4.3 (2026-08-06) the sky is where the sky is — phone pitch drives the
//                    view instead of a fixed 76°, so holding the phone
//                    normally no longer feels like lying on the floor.
//                    LOOK UP / LOOK DOWN moved to the right rail, full
//                    opacity, full label: they were off-screen at x=-97.
//   4.2 (2026-08-06) the keyboard actually works — arrows turn instead of
//                    strafing, any movement key starts the walk, and
//                    turning is time-based so it is the same speed on a
//                    120Hz laptop as a 60Hz one.
//   4.0 (2026-08-06) the whole estate, at a glance — 17 systems from the
//                    Axiom page that were built and shipped but never
//                    monitored are now on the board (43 live), pipeline
//                    work with no public URL appears as its own row so
//                    Sabai Sabai is visible, and one line at the top of
//                    the OS answers the only question that matters all
//                    day: is anything broken.
//   3.9 (2026-08-06) the sky teaches — tap a star and get how to find
//                    its constellation, who drew it and why, and one true
//                    fact with a number. The ground is OpenStreetMap now:
//                    a photograph shows what is there, a street map shows
//                    where you are.
//   3.8 (2026-08-06) look up / look down stop scrambling — far plane was
//                    100 with the star dome at 400, fog was tuned for a
//                    20m box, the camera teleported to the origin on every
//                    resize, and the room HUD drew straight through the
//                    sky's. Sky and ground now follow the walker too.
//   3.7 (2026-08-06) the room knows where and when it is — sun altitude
//                    at the visitor's latitude drives night/dawn/day/dusk,
//                    rain falls only where there is no roof, and the
//                    matrix rain that was 'retired' two versions ago is
//                    actually gone. Nav pad for thumbs; a poem a day.
//   3.6 (2026-08-06) the actual Barcelona plan, at real scale — 54×24m
//                    travertine podium, 3.1m clear height, eight chrome
//                    cruciform columns, onyx dorado as the one amber,
//                    large pool east and enclosed water court west. And
//                    you can walk it: WASD + pointer lock, thumbstick on
//                    phone, per-axis collision so you slide along walls.
//   3.5 (2026-08-06) you can finally SEE which build you are running —
//                    version stamp in the room HUD (the plan view has had
//                    one for months; the room never did). Plus self-heal:
//                    the page checks version.json on load and, if it is
//                    running something older, clears every cache and
//                    reloads itself once.
//   3.4 (2026-08-06) the Pavilion for real — the enclosure is gone, the
//                    roof floats at 3.6m, five planes stand free, the
//                    work wall is 8 heroes not 21. And the service worker
//                    stops serving stale code: app.js is network-first,
//                    so a deploy is visible on the next load.
//   3.3 (2026-08-06) Pavilion that you can actually see — charcoal walls,
//                    gallery board behind the TVs, screens lit at ~80%
//                    (were ghosted at 45%), solid furniture fills, discovery
//                    chip impossible to miss. 3.2's "mass" was near-black
//                    on black: shipped, real, and invisible. Fixed.
//   3.2 (2026-08-06) dual-surface law + discovery counter + product law.
//                    Routing/host-OS kept; room look was not enough.
//   3.1 (2026-08-05) the second brain gets a body — braind pulses on the
//                    M5 every 15 min (transfer online / compute offline),
//                    BRAIN tile shows its vital signs; captures now queue
//                    in Worker KV (the old Supabase project is gone).
//   3.0 (2026-08-05) NON OS — the plan view becomes a home screen with an
//                    offline pill and stateful app tiles; fleet console as
//                    a transit board with real uptime history and Telegram
//                    alerts; the sky (152-star planetarium, compass-driven);
//                    the ground (satellite imagery of where you stand); the
//                    morning brief, written and spoken on-machine.
//   2.4 (2026-05-14) accessibility pass — skip-to-content, aria-labels on
//                    all interactive controls, aria-pressed sync on lang
//                    switchers, lang attrs on Thai/Chinese buttons
//   2.3 (2026-05-14) two-door entry (host vs guest) — localStorage mode,
//                    guest hides + vCard QR surface
//   2.2 (2026-05-14) offboarding ritual — breath + binary question after every
//                    focus block (frame timer, frame hold-exit, pomodoro
//                    work-phase end, pomodoro hold-exit during work)
//   2.1a (2026-05-14) X-button fix — frame-img locked out of touch/pointer
//                     events; contextmenu preventDefault on .frame
//   2.1 (2026-05-13) restored missing HTML, wired WebGL fallback, removed
//                    third-party SDK, added version stamp, Ma Shan Zheng font
//   2.0 (2026-05-12) v2 refactor by Kimi: split monolith → app.js + styles.css;
//                    added particles, command palette, camera dolly
//   1.x              see git log for v1 history (worktree branch)
const NON_VERSION = '4.11';
window.NON_VERSION = NON_VERSION;
// The build identity. 'dev' locally; ship.sh stamps the git short hash
// into the deployed copy. Exists because version numbers are typed by
// hand and two parallel sessions once shipped DIFFERENT builds both
// stamped '4.7' — the self-heal compared the strings, found them equal,
// and calmly kept serving the old code. Hashes cannot collide by habit.
const NON_BUILD = 'dev';
window.NON_BUILD = NON_BUILD;
// Stamp the build into the room HUD as early as possible — this element
// is the answer to "am I actually seeing the new version?".
try {
  const _hb = document.getElementById('hud-build');
  if (_hb) _hb.textContent = 'v' + NON_VERSION;
} catch (_) {}

// Discovery layer — wired once the HUD nodes exist (see boot below).
let DISCOVERY = null;
window.__discover = (id) => { try { return DISCOVERY?.mark(id); } catch (_) { return false; } };

// A host is up if it answers at all in the 2xx/3xx range. The old check
// enumerated 200/301/302 only, so every 307 (tkc, war-room) painted red.
const OK_CODE = c => c >= 200 && c < 400;

// Wire WebGL fallback — show the plan-view fallback UI and skip scene setup
// if WebGL is unavailable. Without this guard, THREE.WebGLRenderer() throws
// a silent crash that breaks the whole module.
if (!WEBGL_OK) {
  const fb = document.getElementById('webgl-fallback');
  if (fb) fb.style.display = 'flex';
  const btn = document.getElementById('fallback-btn');
  if (btn) btn.addEventListener('click', () => {
    if (fb) fb.style.display = 'none';
    try { setView('plan'); } catch (_) {
      // setView not yet defined — fall back to direct DOM manipulation
      document.body.dataset.view = 'plan';
      const p = document.getElementById('plan');
      if (p) p.setAttribute('aria-hidden', 'false');
    }
  });
  // Boot fades, then we're done — skip all Three.js setup
  const bootEl = document.getElementById('boot');
  if (bootEl) {
    setTimeout(() => {
      bootEl.classList.add('gone');
      setTimeout(() => { bootEl.style.display = 'none'; }, 900);
    }, 1200);
  }
}


// ════════════════════════════════════════════════════════
// i18n
// ════════════════════════════════════════════════════════
const I18N = {
  en: {
    palace:  'the pavilion',
    hint:    'tap to discover · drag to look around · ◎ counts what you find',
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
    os_today:        'today',
    os_focus:        'focus',
    os_music:        'music',
    os_note:         'note',
    os_gallery:      'gallery',
    os_steps:        'steps',
    os_mixtape:      'mixtape',
    os_fleet:        'fleet',
    os_theme:        'theme',
    os_signals:      'signals · markets + weather',
    ground_hint:     'look down',
    ground_exit:     'back up',
    ground_label:    'the ground',
    sky_hint:        'look up',
    sky_exit:        'back down',
    sky_over:        'sky over',
    sky_here:        'here',
    sky_mag:         'mag',
    sky_folly:       'the one overhead',
    fleet_pipeline:  'in the pipeline',
    health_systems:  'systems',
    health_allgood:  'all running',
    health_problem:  'needs you',
    health_problems: 'need you',
    health_pipeline: 'building',
    sky_ly:          'light years',
    nav_walk:        'hold',
    walk:            'walk',
    os_brain:        'brain',
    brain_asleep:    'asleep',
    os_brief:        'brief',
    brief_label:     'morning brief',
    brief_waiting:   'no episode yet',
    brief_transcript: 'transcript',
    fleet_checked:   'checked',
    fleet_pages:     'pages line',
    fleet_ext:       'external line',
    fleet_parked:    'parked · dns retained',
    fleet_incidents: 'recent incidents',
    fleet_no_incidents: 'no incidents on record',
    fleet_last_incident: 'last incident',
    fleet_resolved:  'resolved',
    fleet_ongoing:   'ongoing',
    fleet_peak:      'peak',
    os_online:       'online',
    os_offline:      'offline',
    os_offline_title: 'what still works',
    os_offline_body: 'Music, focus sessions, the gallery, notes and your step log all live on this device. Notes sync the moment you are back. Markets, weather and the fleet board need the network — everything else does not.',
    intent_placeholder: 'set your intent',
    intent_prompt:   'What are you working on today?',
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
    palace:  'ศาลา',
    hint:    'แตะเพื่อค้นพบ · ลากเพื่อมองรอบ · ◎ นับสิ่งที่เจอ',
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
    os_today:        'วันนี้',
    os_focus:        'โฟกัส',
    os_music:        'เพลง',
    os_note:         'บันทึก',
    os_gallery:      'หอศิลป์',
    os_steps:        'ก้าวเดิน',
    os_mixtape:      'มิกซ์เทป',
    os_fleet:        'ระบบ',
    os_theme:        'ธีม',
    os_signals:      'สัญญาณ · ตลาด + อากาศ',
    ground_hint:     'ก้มดูพื้น',
    ground_exit:     'กลับขึ้นมา',
    ground_label:    'พื้นดิน',
    sky_hint:        'แหงนดูฟ้า',
    sky_exit:        'กลับลงมา',
    sky_over:        'ฟ้าเหนือ',
    sky_here:        'ตรงนี้',
    sky_mag:         'ความสว่าง',
    sky_folly:       'ดวงที่อยู่เหนือหัว',
    fleet_pipeline:  'กำลังพัฒนา',
    health_systems:  'ระบบ',
    health_allgood:  'ทำงานปกติ',
    health_problem:  'ต้องดูแล',
    health_problems: 'ต้องดูแล',
    health_pipeline: 'กำลังสร้าง',
    sky_ly:          'ปีแสง',
    nav_walk:        'กดค้าง',
    walk:            'เดิน',
    os_brain:        'สมอง',
    brain_asleep:    'หลับอยู่',
    os_brief:        'สรุปเช้า',
    brief_label:     'สรุปข่าวเช้า',
    brief_waiting:   'ยังไม่มีตอน',
    brief_transcript: 'บทพูด',
    fleet_checked:   'ตรวจเมื่อ',
    fleet_pages:     'สายหลัก',
    fleet_ext:       'สายภายนอก',
    fleet_parked:    'สายพัก · คง dns ไว้',
    fleet_incidents: 'เหตุขัดข้องล่าสุด',
    fleet_no_incidents: 'ยังไม่มีเหตุขัดข้อง',
    fleet_last_incident: 'ขัดข้องครั้งล่าสุด',
    fleet_resolved:  'แก้แล้ว',
    fleet_ongoing:   'ยังขัดข้อง',
    fleet_peak:      'สูงสุด',
    os_online:       'ออนไลน์',
    os_offline:      'ออฟไลน์',
    os_offline_title: 'สิ่งที่ยังใช้ได้',
    os_offline_body: 'เพลง ช่วงโฟกัส หอศิลป์ บันทึก และจำนวนก้าวเดิน อยู่ในเครื่องนี้ทั้งหมด บันทึกจะซิงก์ทันทีที่กลับมาออนไลน์ ส่วนตลาด อากาศ และกระดานระบบ ต้องใช้เครือข่าย — นอกนั้นไม่ต้อง',
    intent_placeholder: 'ตั้งเจตนาของวันนี้',
    intent_prompt:   'วันนี้ทำอะไรอยู่',
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
    palace:  '亭',
    hint:    '点按去发现 · 拖动环视 · ◎ 计数',
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
    os_today:        '今日',
    os_focus:        '专注',
    os_music:        '音乐',
    os_note:         '笔记',
    os_gallery:      '画廊',
    os_steps:        '步数',
    os_mixtape:      '混音带',
    os_fleet:        '机群',
    os_theme:        '主题',
    os_signals:      '信号 · 市场与天气',
    ground_hint:     '低头看',
    ground_exit:     '回到室内',
    ground_label:    '地面',
    sky_hint:        '抬头看',
    sky_exit:        '回到室内',
    sky_over:        '天空 ·',
    sky_here:        '此处',
    sky_mag:         '星等',
    sky_folly:       '正上方的那一颗',
    fleet_pipeline:  '开发中',
    health_systems:  '系统',
    health_allgood:  '全部正常',
    health_problem:  '需要处理',
    health_problems: '需要处理',
    health_pipeline: '建设中',
    sky_ly:          '光年',
    nav_walk:        '按住',
    walk:            '漫步',
    os_brain:        '大脑',
    brain_asleep:    '沉睡中',
    os_brief:        '简报',
    brief_label:     '晨间简报',
    brief_waiting:   '还没有节目',
    brief_transcript: '文稿',
    fleet_checked:   '检查于',
    fleet_pages:     '主线',
    fleet_ext:       '外部线',
    fleet_parked:    '停用线 · 保留域名',
    fleet_incidents: '近期故障',
    fleet_no_incidents: '暂无故障记录',
    fleet_last_incident: '最近一次故障',
    fleet_resolved:  '已恢复',
    fleet_ongoing:   '进行中',
    fleet_peak:      '峰值',
    os_online:       '在线',
    os_offline:      '离线',
    os_offline_title: '仍然可用的部分',
    os_offline_body: '音乐、专注时段、画廊、笔记与步数记录都存在这台设备上。恢复联网后笔记会自动同步。只有市场、天气和机群面板需要网络，其余都不需要。',
    intent_placeholder: '设定今日意图',
    intent_prompt:   '今天在做什么',
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
  { code: 'CONFLICT', title: 'Global Political Monitor',          url: 'https://globalmonitor.nonarkara.org',               img: 'screenshots/conflict.jpg',  dom: 'globalmonitor.nonarkara.org' },
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
  // Canonical fallback when ascn.depa.or.th / depa.or.th is down.
  { code: 'ASCN',     title: 'ASEAN Smart Cities Network',        url: 'https://ascn.nonarkara.org',                        img: 'screenshots/ascn.jpg',      dom: 'ascn.nonarkara.org' },
  { code: 'SLOWDOWN', title: 'The Things You Can See',            url: 'https://slowdown.nonarkara.org',                    img: 'screenshots/slowdown.jpg', dom: 'slowdown.nonarkara.org' },
  { code: 'NOVELS',   title: 'Substack · Novels',                 url: 'https://substack.com/@nonarkara',                   img: 'screenshots/substack.jpg' },
  { code: 'ESSAYS',   title: 'Medium · Essays',                   url: 'https://nonsmartcity.medium.com/',                  img: 'screenshots/medium.jpg' },
  { code: 'SOLITUDE', title: '100 Days of Solitude',              url: 'https://solitude.nonarkara.org',                    img: 'screenshots/solitude.jpg',  dom: 'solitude.nonarkara.org' },
  { code: 'YOUTUBE',  title: 'YouTube · @nonarkara',              url: 'https://www.youtube.com/@nonarkara',                img: 'screenshots/youtube.jpg' },
  { code: 'ACADEMIC', title: 'Academic Profile',                  url: 'https://arkaraprasertkul.socialpsychology.org/',    img: 'screenshots/academic.jpg' },
  { code: 'DAO',      title: 'Dao De Jing · 道德經',                url: 'https://dao.nonarkara.org/',                        img: 'screenshots/academic.jpg',  dom: 'dao.nonarkara.org' },
  { code: 'RESEARCH', title: 'ResearchGate · Profile',             url: 'https://www.researchgate.net/profile/Non-Arkaraprasertkul', img: 'screenshots/academic.jpg' },
  { code: 'NSP',      title: 'NSP · National Streaming Platform',  url: 'https://nsp-thailand.netlify.app/',                     img: 'screenshots/academic.jpg' },
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
// Fog was 9–36 units, which suited the old 20m room and swallows a 54m
// podium whole. The sky opts out of fog entirely (see sky.js).
// Far went 260 → 460 when the site grew from one building to three:
// the far corners of the triangle are ~124m out, and at the old far
// they were solid fog. Near stays at 30 so the Pavilion reads exactly
// as it did.
scene.fog = new THREE.Fog(0x000000, 30, 460);

// far = 1200: the star dome is 400 units out and the podium is 54 long.
// At the old far = 100 the sky was entirely behind the far plane, which
// is most of why looking up produced nonsense rather than stars.
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.rotation.order = 'YXZ';
// THE look integrator — the only thing allowed to write camera.rotation.
// See look.js for why: four systems used to fight over it, and the
// result was a view that lagged, snapped back, and hijacked itself.
const LOOK = new Look();
window.__look = LOOK;
camera.rotation.order = 'YXZ';

// Camera framing adapts to portrait phones — pull back, widen FOV,
// tilt slightly down so the TV grid centers in the screen.
function applyCameraFraming() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  // Framing owns the lens, never the position. This used to hard-reset
  // camera.position on every call — and it is called on every resize, so
  // any layout change (including the one the sky/ground overlays cause)
  // teleported you back to the origin mid-transition and threw away
  // where you had walked to. That was the scrambling.
  camera.fov = aspect < 0.85 ? 70 : 58;
  camera.updateProjectionMatrix();
}
applyCameraFraming();
// Initial pose. The spawn point overrides this once the plan is built.
camera.rotation.order = 'YXZ';
camera.position.set(0, 1.7, 7.5);
camera.lookAt(0, 2.0, -10);
LOOK.yaw = camera.rotation.y;
LOOK.pitch = camera.rotation.x;

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

// ── THE PAVILION ─────────────────────────────────────────
// The plan now lives in pavilion.js — real Barcelona geometry at real
// scale, 54×24m podium, 3.1m clear height, eight cruciform columns,
// walls that never touch. Built from the same numbers the walk
// controller collides against, so there can be no invisible wall and no
// wall you can walk through.
let PAVILION = null;
let GLASS = null, SAVOYE = null, FARNSWORTH = null;
// Every building on the site, nearest-first lookups included. The
// Pavilion is at the origin because it was here first and everything
// else — the poem, the rain, the spawn — is measured from it.
const SITE = [];
if (WEBGL_OK) {
  // fence:false — the podium edge used to be the end of the world.
  const dark = CURRENT_THEME !== 'light';
  PAVILION = buildPavilion(THREE, scene, { dark, fence: false });
  GLASS = buildGlassHouse(THREE, scene, { dark });
  SAVOYE = buildSavoye(THREE, scene, { dark });
  FARNSWORTH = buildFarnsworth(THREE, scene, { dark });
  SITE.push(
    { name: 'PAVILION', plan: PLAN, origin: { x: 0, z: 0 }, build: PAVILION },
    { name: GLASS_PLAN.name, plan: GLASS_PLAN, origin: GLASS_PLAN.origin, build: GLASS },
    { name: SAVOYE_PLAN.name, plan: SAVOYE_PLAN, origin: SAVOYE_PLAN.origin, build: SAVOYE },
    { name: FARN_PLAN.name, plan: FARN_PLAN, origin: FARN_PLAN.origin, build: FARNSWORTH },
  );

  // ── The ground they share ─────────────────────────────
  // Four buildings on a cross need something to stand on that is not
  // each other's podium. It sits 3cm below the walking datum, so every
  // floor in the site reads as slightly proud of the plain rather than
  // sunk into it — and nothing z-fights.
  const GROUND_Y = -0.03;
  const plain = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshBasicMaterial({ color: 0x0a0d10 })
  );
  plain.rotation.x = -Math.PI / 2;
  plain.position.y = GROUND_Y;
  scene.add(plain);
  window.__plainMat = plain.material;

  // A 10m grid, barely there. Crossing 120m of nothing with no texture
  // reads as not moving; the grid is how you feel the distance close.
  const plainGrid = new THREE.GridHelper(600, 60, 0x8b98a6, 0x8b98a6);
  plainGrid.material = new THREE.LineBasicMaterial({
    color: 0x6f7d8a, transparent: true, opacity: 0.07,
  });
  plainGrid.position.y = GROUND_Y + 0.002;
  scene.add(plainGrid);
  window.__plainGridMat = plainGrid.material;

  _themeRedrawHooks.push(() => {
    // Rebuild materials in place rather than the whole building.
    const dark = CURRENT_THEME !== 'light';
    const M = PAVILION.materials;
    M.travertine.color.setHex(dark ? 0x2a2b28 : 0xd8d2c4);
    M.green.color.setHex(dark ? 0x14201a : 0x5d7a68);
    M.chrome.color.setHex(dark ? 0x8e9aa6 : 0xaab4bd);
    M.water.color.setHex(dark ? 0x080d12 : 0xc4cdd4);
    M.podium.color.setHex(dark ? 0x1c1e1c : 0xe6e1d5);
    M.roof.color.setHex(dark ? 0x121413 : 0xeae5db);
    M.glass.color.setHex(dark ? 0x223040 : 0xbcc8d2);
    // onyx stays amber in both themes — it is the one accent.

    // The other three, in their own materials. Same two-state fallback
    // the Pavilion uses; the daylight palette overrides them the
    // moment it next refreshes.
    const G = GLASS.materials, S = SAVOYE.materials, F = FARNSWORTH.materials;
    G.steel.color.setHex(dark ? 0x333c45 : 0x424951);
    G.glass.color.setHex(dark ? 0x080d12 : 0xa8bcc8);
    G.deck.color.setHex(dark ? 0x1c1e1c : 0xe6e1d5);
    G.floor.color.setHex(dark ? 0x2a2b28 : 0xd8d2c4);
    G.roof.color.setHex(dark ? 0x121413 : 0xc9c4b8);
    S.render.color.setHex(dark ? 0x484f4f : 0xc9c9c3);
    S.piloti.color.setHex(dark ? 0x8e9aa6 : 0xaab4bd);
    S.glass.color.setHex(dark ? 0x080d12 : 0xa8bcc8);
    S.base.color.setHex(dark ? 0x0d1013 : 0x8f9490);
    S.slab.color.setHex(dark ? 0x121413 : 0xc9c4b8);
    F.steel.color.setHex(dark ? 0xd4d0c6 : 0xefeee8);
    F.glass.color.setHex(dark ? 0x080d12 : 0xa8bcc8);
    F.floor.color.setHex(dark ? 0x2a2b28 : 0xd8d2c4);
    F.roof.color.setHex(dark ? 0x1a1c1b : 0xe4e0d6);
    F.well.color.setHex(dark ? 0x05070b : 0x2a2e32);
    // Brick, ramp, primavera stay warm in both themes, like the onyx.
  });
}

// You arrive on the podium, not floating in the middle of the room.
camera.position.set(PLAN.spawn.x, PLAN.spawn.y, PLAN.spawn.z);
camera.lookAt(PLAN.spawn.lookAt.x, PLAN.spawn.lookAt.y, PLAN.spawn.lookAt.z);
LOOK.yaw = camera.rotation.y;
LOOK.pitch = camera.rotation.x;

// The walk collides against the union of every building. One list,
// built from the same plans the geometry came from. Floors (Savoye's
// ramp, living terrace, roof) lift the eye when present.
const WALK = new Walk(
  camera,
  SITE.flatMap(b => b.build.colliders),
  PLAN.spawn,
  SITE.flatMap(b => b.build.floors || []),
);
WALK.attach();
window.__walk = WALK;

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
  const topFill = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.04, 1.0),
    new THREE.MeshBasicMaterial({ color: 0x1a222e })
  );
  topFill.position.set(0, 0.02, 0); group.add(topFill);
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
  const boxFill = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 1.48, 0.38),
    new THREE.MeshBasicMaterial({ color: 0x1a222e })
  );
  boxFill.position.set(0, -0.25, 0); group.add(boxFill);
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
  const shellFill = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 3.15, 1.55),
    new THREE.MeshBasicMaterial({ color: 0x151c28 })
  );
  group.add(shellFill);
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
  const X = 0, Y = 2.75, Z = 3.6;   // hangs below the 3.6m roof, not through it
  const outer = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.42, 0.42, 0.42)), matBright);
  const inner = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.20, 0.20, 0.20)), matBright);

  const group = new THREE.Group();
  group.position.set(X, Y, Z);
  group.add(outer);
  group.add(inner);

  // Rod from cube top up to the roof slab
  const rodG = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(X, Y + 0.21, Z),
    new THREE.Vector3(X, PLAN.roof.y, Z),
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
    ? Object.values(data.sites).filter(v => OK_CODE(v.code)).length
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
      if (OK_CODE(v.code)) continue;
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

// Matrix rain: removed.
//
// It was an 18×6m plane of falling katakana behind the work wall, and
// it was approved for retirement two versions ago — I said it was gone
// and it never was, which is why it is still the loudest thing on
// screen in a building whose entire argument is restraint. A wall of
// scrolling glyphs is the opposite of Mies, it repainted a large canvas
// every single frame on a phone, and it belongs to a different room.
// drawRain() is kept as a no-op so the animate loop needs no surgery.
function drawRain() {}
const rainMat = { opacity: 0 };

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
  // Out at the podium edge, flat to the long axis — a band you read on
  // the way in, not a wall wrapping the room.
  plane.position.set(side === 'left' ? -18 : 16, y, side === 'left' ? -11.6 : 11.6);
  plane.rotation.y = side === 'left' ? 0 : Math.PI;
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

// Two tickers, not six. Six 14m ribbons wrapped the walls of the old
// box; the Pavilion has no continuous wall to wrap and they read as the
// enclosure returning. All six data feeds still exist — they share the
// two surfaces via setTickerText, so nothing was lost but the clutter.
const tckrFx      = createTicker('left',  2.65, 0.00018);  // FX + crypto + weather
const tckrCrypto  = tckrFx;
const tckrWx      = tckrFx;
const tckrNews    = createTicker('right', 2.65, 0.00012);  // headlines + ops
const tckrCommits = tckrNews;
const tckrStats   = tckrNews;

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

// ONE Worker call returns all market data (replaces 10 separate /quote/ calls).
// Worker caches the result in KV for 5 min, so concurrent visitors are free.
async function fetchDailyBrief() {
  try {
    const r = await fetch('https://api.nonarkara.org/daily-brief', { cache: 'no-cache' });
    const d = await r.json();
    const p = (key) => d[key] ? { price: d[key].price, change: d[key].change ?? 0 } : null;

    // FX — supplement open.er-api with Worker values if available
    if (d.usdthb?.price) {
      const thb = d.usdthb.price.toFixed(2);
      const sgdThb = d.sgdthb?.price?.toFixed(2) ?? '—';
      window.__brief.fx = { thb, sgdThb };
      // update ticker too
      setTickerText(tckrFx,
        `USD/THB ${thb}   ▪   SGD/THB ${sgdThb}   ▪   FX live   ▪   `
      );
    }

    // SET
    if (d.set?.price) window.__brief.set = { price: d.set.price, change: d.set.change ?? 0 };

    // Stocks + commodities
    const stocks = {};
    ['dji','nasdaq','nvda','tsla','googl','gold','brent','ptt'].forEach(k => {
      if (d[k]?.price != null) stocks[k] = { price: d[k].price, change: d[k].change ?? 0 };
    });
    if (Object.keys(stocks).length) window.__brief.stocks = stocks;

    // GISTDA PM2.5 — overrides Open-Meteo AQI if available (Thai gov source, more accurate)
    if (d.pm25_bkk != null || d.pm25_phuket != null) {
      const pm25 = d.pm25_bkk;
      const pm25Level = pm25 == null ? '—'
        : pm25 <= 12   ? 'good'
        : pm25 <= 35.4 ? 'moderate'
        : pm25 <= 55.4 ? 'sensitive'
        : pm25 <= 150.4 ? 'unhealthy'
        : 'hazardous';
      // Supplement existing aqi object with GISTDA pm25 (preserves AQI number from Open-Meteo)
      window.__brief.aqi = Object.assign(window.__brief.aqi || {}, {
        pm25,
        pm25_phuket: d.pm25_phuket,
        level: pm25Level,
        source: 'gistda',
      });
    }

    if (window.paintBrief) window.paintBrief();
  } catch (_) {}
}

// Keep the old per-symbol functions as fallback but no longer call them on their own
async function fetchStocks() { return fetchDailyBrief(); }
async function fetchSET()    { return fetchDailyBrief(); }

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
    const ok = Object.values(d.sites || {}).filter(v => OK_CODE(v.code)).length;
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
// Worker calls (api.nonarkara.org):
//   /daily-brief  — replaces 10 separate /quote/ calls, KV-cached 5 min = 1 invocation
//   /status       — KV-cached by cron, browser polls every 3 min (was 1 min)
//   /council      — every 5 min (matches council-watch cron)
//   /capture      — only on explicit user action (note, steps)
// Non-Worker calls (open APIs, free, no quota):
//   open.er-api, open-meteo, ipapi, coingecko, hacker-news, github
fetchFX(); fetchCrypto(); fetchWx(); fetchAQI(); fetchDailyBrief(); fetchNews(); fetchCommits(); fetchStats(); fetchCouncil();
setInterval(fetchFX,         10 * 60_000);  // FX: every 10 min (was 5)
setInterval(fetchCrypto,      5 * 60_000);  // crypto: every 5 min (was 1 min — CoinGecko, not Worker)
setInterval(fetchWx,         10 * 60_000);  // weather: every 10 min
setInterval(fetchAQI,        15 * 60_000);  // AQI: every 15 min
setInterval(fetchDailyBrief,  5 * 60_000);  // all quotes: 1 Worker call every 5 min (was 10 calls/5 min)
setInterval(fetchNews,       15 * 60_000);  // HN: every 15 min (not Worker)
setInterval(fetchCommits,    10 * 60_000);  // GitHub: every 10 min (not Worker)
setInterval(fetchStats,       3 * 60_000);  // status: every 3 min (was 1 min, saves 66% of status calls)
setInterval(fetchCouncil,     5 * 60_000);  // council: every 5 min (matches cron)

// ════════════════════════════════════════════════════════
// TVs at far wall (5 × 4 grid = 20)
// ════════════════════════════════════════════════════════
const TV_W = 1.22, TV_H = 0.72;
const GAP_X = 0.18, GAP_Y = 0.20;
const COLS = 4;
// Eight on the wall, not twenty-one. Five rows of screens stood 4.6m
// tall, which is what forced a six-metre ceiling and made the room a
// hall instead of a pavilion. The other thirteen are one tap away in
// the drawer, which already lists every project — nothing is lost, the
// wall just stops being a spreadsheet.
const WALL_TVS = PROJECTS.slice(0, 8);
const ROWS = Math.ceil(WALL_TVS.length / COLS);
const tvLoader = new THREE.TextureLoader();
const TVs = [];

// Center any partial last row instead of left-aligning it.
// (e.g. 21 projects → 4 full rows of 5 + 1 row of 1, centered.)
const LAST_ROW_COUNT = WALL_TVS.length - (ROWS - 1) * COLS;
WALL_TVS.forEach((p, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const colsThisRow = (row === ROWS - 1) ? LAST_ROW_COUNT : COLS;
  const cx = -5.5 + (col - (colsThisRow - 1) / 2) * (TV_W + GAP_X);
  // Hung on the long travertine wall (PLAN wall 'north', z=-6.9,
  // 0.28 thick → face at -6.75). Centre of the wall run, at eye height.
  const cy = 1.60 + ((ROWS - 1) / 2 - row) * (TV_H + GAP_Y);
  const cz = -6.74;

  const grp = new THREE.Group();
  grp.position.set(cx, cy, cz);

  // Solid bezel behind the wire — screens read as objects, not empty frames.
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(TV_W, TV_H, 0.04),
    new THREE.MeshBasicMaterial({ color: 0x0a0e14 })
  );
  bezel.position.z = 0.01;
  grp.add(bezel);

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
    // v3.3: lit by default. 0.45 was a ghost wall — looked empty for years.
    screenTargetOpacity: 0.82,
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
  // Clickable door — discovery egg (still locked; the find is the point)
  {
    const { group, lines } = makeClickableGroup(
      'furniture', 'door', DOOR_W + 0.2, DOOR_H + 0.2, 0.4,
      DOOR_X, DOOR_H / 2 + 0.05, FRONT_Z - 0.08
    );
    lines.push(doorFrame, doorHandle);
    group.userData.baseMaterial = matFurni;
  }
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
  // Sized to the onyx wall it now lives on (6m run, 3.1m tall). His
  // voice on the only lit stone in the building — the reason the onyx
  // is the one amber.
  const APH_W = 5.6, APH_H = 1.5;
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
  // Tap the words — discovery egg
  {
    const { group } = makeClickableGroup(
      'furniture', 'aphorism', APH_W, APH_H, 0.3,
      -1.5, 2.8, FRONT_Z - 0.02
    );
    group.rotation.y = Math.PI;
  }

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

// CEILING — the roof plane is the ceiling now.
// This used to be a 22×22 wireframe grid mirroring the floor, which
// suited a six-metre cyberpunk hall. Under a 3.6m Pavilion roof it sat
// four inches below the slab and read as spaghetti — the single biggest
// source of visual noise in the room. The roof plane and its hairline
// edge do the job; a second amber equator up here would also break
// Law 1, since the floor seam is already the one amber line.
// __ceilingEquator is kept as a live no-op so the pulse animation that
// drives it has something to write to.
// ════════════════════════════════════════════════════════
{
  window.__ceilingEquator = new THREE.LineBasicMaterial({
    color: 0xf59e0b, transparent: true, opacity: 0,
  });
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

  const BADGE_R = 0.55, BADGE_Y = 2.85, BADGE_Z = 1.5;  // under the 3.6m roof

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
      new THREE.Vector3(0,  PLAN.roof.y - BADGE_Y, 0),
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
  // The Worker cron (every 5 min) is the only source now. The GH Actions
  // health/latest.json fallback died 2026-06-17 and only served stale data.
  let data = null;
  try {
    const r = await fetch('https://api.nonarkara.org/status', { cache: 'no-store' });
    if (r.ok) data = await r.json();
  } catch (_) { /* offline — keep the last painted state */ }
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
  // Radians, 1:1: tilt the phone up 40° and the view pitches up 40°.
  // The old ±21°-max normalised form is why holding the phone up read
  // as nothing happening.
  const rawY = clamp(betaRel * Math.PI / 180, -1.35, 1.35);
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
  // The parallax that used to live here SET the look direction on every
  // mouse move — so any turn you had made snapped back the instant the
  // mouse twitched. On a laptop that made navigation literally
  // impossible. The mouse now only feeds the raycaster; looking is
  // click-drag or pointer lock, like every viewer since Doom.
  const tip = document.getElementById('tip');
  if (hovered) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
}
window.addEventListener('mousemove', onMouseMove, { passive: true });

// Click-drag to look, desktop, no pointer lock needed. Grab-the-world
// direction (drag right, world moves right) to match touch. A drag that
// moved suppresses the click so letting go never opens a TV you were
// merely turning past.
let mouseDrag = null;
window.__mouseDragMoved = false;
window.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || document.pointerLockElement) return;
  if (document.body.dataset.view !== 'room') return;
  if (e.target.closest('button, a, input, textarea, select, .modal, .drawer, .nav-pad, .hud-chip')) return;
  mouseDrag = { x: e.clientX, y: e.clientY };
  window.__mouseDragMoved = false;
});
window.addEventListener('mousemove', (e) => {
  if (!mouseDrag || document.pointerLockElement) return;
  const dx = e.clientX - mouseDrag.x, dy = e.clientY - mouseDrag.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) window.__mouseDragMoved = true;
  LOOK.addDelta(-(dx / window.innerWidth) * 2.4, (dy / window.innerHeight) * 1.8);
  mouseDrag = { x: e.clientX, y: e.clientY };
}, { passive: true });
window.addEventListener('mouseup', () => { mouseDrag = null; });

// ── Touch: drag-to-rotate camera + tap detection
// (a "tap" is a touchend with very little drag, handled by onClick)
let touchAnchor = null;       // {x, y, targetX, targetY}
let touchMoved = false;
let touchStartTs = 0;
function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  touchAnchor = { x: t.clientX, y: t.clientY, lastX: t.clientX, lastY: t.clientY };
  touchMoved = false;
  touchStartTs = Date.now();
  // Update mouse for any potential immediate raycast
  mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
}
function onTouchMove(e) {
  if (!touchAnchor || e.touches.length !== 1) return;
  const t = e.touches[0];
  // Deltas, 1:1 with the finger, applied the same frame. The old
  // anchor-and-set form went through an easing lerp that trailed a
  // third of a second behind the finger — technically responsive,
  // physically seasick. Full-width drag ≈ 70°.
  if (Math.abs(t.clientX - touchAnchor.x) / window.innerWidth  > 0.015 ||
      Math.abs(t.clientY - touchAnchor.y) / window.innerHeight > 0.015) touchMoved = true;
  const ddx = t.clientX - touchAnchor.lastX;
  const ddy = t.clientY - touchAnchor.lastY;
  touchAnchor.lastX = t.clientX;
  touchAnchor.lastY = t.clientY;
  LOOK.addDelta(-(ddx / window.innerWidth) * 1.22, (ddy / window.innerHeight) * 1.05);
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
  if (window.__mouseDragMoved) { window.__mouseDragMoved = false; return; }
  if (document.getElementById('modal').classList.contains('in')) return;
  if (document.getElementById('drawer').classList.contains('in')) return;
  if (document.getElementById('pomodoro').classList.contains('in')) return;
  if (document.getElementById('konami').classList.contains('in')) return;
  // Up in the sky the room's objects are behind you; a tap names a star.
  if (window.__skyTap && window.__skyTap(e)) return;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(INTERACTABLES.map(o => o.userData.hit));
  if (!hits.length) return;
  const grp = hits[0].object.parent;
  const ud = grp.userData;
  if (ud.kind === 'tv') {
    const p = ud.project;
    try { window.__discover?.('tv'); } catch (_) {}
    if (p?.url) openUrlModal(p.code, p.title, p.url);
  } else if (ud.kind === 'furniture') {
    openFurnitureModal(ud.key);
  } else if (ud.kind === 'city') {
    if (ud.city?.name && /bangkok/i.test(ud.city.name)) {
      try { window.__discover?.('bangkok'); } catch (_) {}
    }
    openCityModal(ud.city);
  } else if (ud.kind === 'pomoBtn') {
    openPomodoro();
  } else if (ud.kind === 'chandelier') {
    try { window.__discover?.('chandelier'); } catch (_) {}
    toggleTheme();
  } else if (ud.kind === 'record') {
    try { window.__discover?.('vinyl'); } catch (_) {}
    openMusicModal();
  } else if (ud.kind === 'badge') {
    const b = ud.badge;
    if (b?.url) openUrlModal(b.label, b.label + ' · ' + b.sub, b.url);
  } else if (ud.kind === 'poster') {
    if (ud.action === 'frame')     { try { openFrame(); }          catch (_) {} }
    if (ud.action === 'portraits') {
      try { window.__discover?.('portraits'); } catch (_) {}
      try { openPortraitGallery(); } catch (_) {}
    }
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
  // Quiet discovery — mark on open; toast only fires the first time.
  if (key === 'cup' || key === 'bookshelf' || key === 'pedestal' || key === 'coffee' ||
      key === 'door' || key === 'aphorism') {
    try { window.__discover?.(key); } catch (_) {}
  }
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
  } else if (key === 'door') {
    showModal('LOCKED', 'not yet', `
      <div class="modal-cap">some doors stay shut on purpose</div>
      <div class="modal-meta">
        <span class="row">the pavilion keeps one room for later</span>
        <span class="row">you found the lock — that counts</span>
      </div>`);
  } else if (key === 'aphorism') {
    showModal('NONHARVARD', 'his words', `
      <div class="modal-cap">from the corpus · rotating on this wall</div>
      <div class="modal-meta">
        <span class="row">tap anything else · keep walking</span>
        <a class="row" href="https://nonharvard.wordpress.com" target="_blank" rel="noopener">nonharvard.wordpress.com</a>
      </div>`);
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

function lsGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
function lsSet(key, v) { try { localStorage.setItem(key, v); } catch (_) {} }

function chooseDefaultView() {
  // One-time v3.2 migration: host → OS, guest → Pavilion.
  // Without this, old localStorage keeps everyone on the pre-redraw view
  // and the dual-surface law never becomes visible.
  if (lsGet('nonarkara.migrated.v32') !== '1') {
    lsSet('nonarkara.migrated.v32', '1');
    const mode = lsGet('nonarkara.mode');
    if (mode === 'host') lsSet('nonarkara.view', 'plan');
    if (mode === 'guest') lsSet('nonarkara.view', 'room');
  }
  const saved = lsGet('nonarkara.view');
  if (saved === 'plan' || saved === 'room') return saved;
  // Host keeps the OS open all day. Guest walks the Pavilion.
  const mode = lsGet('nonarkara.mode');
  if (mode === 'host') return 'plan';
  if (mode === 'guest') return 'room';
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
      if (v) v.textContent = a.aqi ?? (a.pm25 != null ? a.pm25.toFixed(1) : '—');
      if (s) {
        const bkkStr = a.pm25 != null ? `bkk ${a.pm25.toFixed(1)} µg/m³` : '';
        const phuketStr = a.pm25_phuket != null ? ` · phuket ${a.pm25_phuket.toFixed(1)}` : '';
        s.textContent = a.pm25 != null
          ? `${a.level} · ${bkkStr}${phuketStr}`
          : a.level;
      }
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
// Suppress the native long-press "Copy Image / Save Image / Share" sheet
// that fires during the 3-second hold-to-exit gesture. CSS guards on
// .frame-img cover most browsers; this catches the rest (Android Chrome).
document.getElementById('frame')?.addEventListener('contextmenu', (e) => {
  e.preventDefault();
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
    const ok = OK_CODE(entry.code);
    cell.dataset.status = ok ? 'ok' : 'fail';
    if (ok) okCount++;
  });
  // The summary line and the 30-day uptime belong to the fleet console —
  // it knows which stations are parked, and counting a closed platform as
  // a failure would make the board lie.
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
// Two surfaces show the intent — the room's floating line and the OS
// TODAY row — so paint every element that claims to be one.
function renderIntent() {
  const cur = loadIntent();
  document.querySelectorAll('#intent-text, [data-intent-text]').forEach(el => {
    el.textContent = cur || t('intent_placeholder');
    el.classList.toggle('placeholder', !cur);
  });
}
renderIntent();
function promptIntent() {
  const next = window.prompt(t('intent_prompt'), loadIntent() || '');
  if (next === null) return;
  saveIntent(next.trim().slice(0, 80));
  renderIntent();
}
document.querySelectorAll('#intent-line, [data-intent-open]')
  .forEach(b => b.addEventListener('click', promptIntent));

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
    const hudBtns = document.querySelectorAll('.os-tile');
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
// The whole tile is the target — the number inside it is just a readout.
document.getElementById('os-steps')?.addEventListener('click', () => {
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

// Version stamp — populate all [data-v-stamp] and #plan-version-stamp
// with the current NON_VERSION. Runs once after plan is ready.
(() => {
  const vs = NON_VERSION ? `v${NON_VERSION}` : '';
  if (!vs) return;
  document.querySelectorAll('[data-v-stamp]').forEach(el => { el.textContent = vs; });
  const planStamp = document.getElementById('plan-version-stamp');
  if (planStamp) planStamp.textContent = vs;
})();

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
    try { window.__discover?.('konami'); } catch (_) {}
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
  // Aim through the integrator rather than lookAt-ing behind its back —
  // two rotation authorities is exactly the disease this rewrite cures.
  const d = targetPoint.clone().sub(camera.position);
  const flat = Math.hypot(d.x, d.z);
  LOOK.aimAt(Math.atan2(-d.x, -d.z), Math.atan2(d.y + 0.5, flat), 0.09);
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
  // Move camera closer to target; LOOK handles the turn via the aim
  // set in startDollyTo.
  camera.position.lerpVectors(dollyOriginPos, dollyTarget, ease * 0.4);
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
  // Every room opacity in this loop is written as `ease * k`, so folding
  // the sky's dimming factor into `ease` fades the whole room at once.
  // Wong Kar-wai, not a light switch: the room goes faint, never away.
  // window.__sky is published at the end of this module; animate() runs
  // its first frame before that line, so read it defensively rather than
  // touching the sky's own bindings while they are still in the dead zone.
  const ease = (1 - Math.pow(1 - fadeT, 3)) * (window.__sky ? window.__sky.tick() : 1);
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
        ud.screenTargetOpacity = 0.82;
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
        ud.screenTargetOpacity = 1.0;
        tip.innerHTML = `${ud.project.code}<span class="url">${ud.project.title.toLowerCase()}</span>`;
      } else if (ud.kind === 'furniture') {
        ud.lines.forEach(l => l.material = matHover);
        if (ud.key === 'cup') {
          // The easter egg whispers, doesn't announce.
          tip.innerHTML = `· · ·<span class="url">click</span>`;
        } else if (ud.key === 'door') {
          tip.innerHTML = `LOCKED<span class="url">tap anyway</span>`;
        } else if (ud.key === 'aphorism') {
          tip.innerHTML = `NONHARVARD<span class="url">his words</span>`;
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
  // Doom rule: the camera is SET from the look state, same frame, no
  // easing. The old 5%/frame lerp meant the view trailed a third of a
  // second behind every input — the "swimming". Gyro rides on top as an
  // additive offset that fades while the finger is down.
  LOOK.gyroYaw   = gyroEnabled ? -gyroSmoothX * 0.45 * window.__gyroBlend : 0;
  LOOK.gyroPitch = gyroEnabled ? -gyroSmoothY * window.__gyroBlend : 0;

  // In the sky with a compass: ease yaw toward the real heading so the
  // stars sit where the sky sits. Gentle, so a jittery compass reads
  // calm and the finger can still win an argument.
  // window.*, not the module lets: animate's first frame runs during
  // module evaluation, before those declarations exist — reading them
  // here is a TDZ ReferenceError that kills the whole module.
  if (window.__skyHasMotion && window.__skyHeading != null && (window.__skyBlend || 0) > 0.25) {
    const wantYaw = -window.__skyHeading * Math.PI / 180;
    LOOK.yaw += Math.atan2(Math.sin(wantYaw - LOOK.yaw), Math.cos(wantYaw - LOOK.yaw)) * 0.08;
  }

  const nowLook = performance.now();
  const dtLook = Math.min((nowLook - (window.__lastLookT || nowLook)) / 1000, 0.05);
  window.__lastLookT = nowLook;
  const eff = LOOK.tick(dtLook);
  camera.rotation.set(eff.pitch, eff.yaw, 0);

  // The sky and the ground are places, not modes: how much of each you
  // see comes from nothing but where you are looking. Look up — stars.
  // Look down — the map of where you stand. Look back — the room.
  window.__skyBlend = overheadBlend(eff.pitch);
  window.__groundBlend = underfootBlend(eff.pitch);

  // Walking owns the camera's position when it is on; otherwise the room
  // keeps its slow idle float. Movement is relative to where you are
  // looking, so it reads the yaw the line above just settled.
  if (window.__tickTravel && window.__tickTravel()) {
    // Travelling between buildings owns the camera outright — input is
    // ignored for the 1.6s, which is why it cannot fight the walker.
    window.__lastWalkT = performance.now();
  } else if (WALK.enabled) {
    const now = performance.now();
    const dt = Math.min((now - (window.__lastWalkT || now)) / 1000, 0.05);
    window.__lastWalkT = now;
    WALK.update(dt, camera.rotation.y);
  } else {
    window.__lastWalkT = performance.now();
    camera.position.y = 1.7 + Math.sin(t * 0.4) * 0.015;
  }
  if (window.__tickWeather) window.__tickWeather();

  // The sky dome and the ground tiles were both built around a viewer
  // standing at the origin, which was true when the camera could not
  // move. It can now walk 27m in any direction across the podium, and
  // at that distance the star dome is visibly off-centre and the map
  // tiles are simply somewhere else — which is what "everything
  // scrambled" was. Both follow the walker horizontally; the sky also
  // follows vertically so the horizon stays at eye level.
  if (window.__skyGroup) {
    window.__skyGroup.position.set(camera.position.x, camera.position.y, camera.position.z);
  }
  if (window.__groundGroup) {
    // The map lies on the podium, not on your face — but it must lie
    // just ABOVE it. The podium's top face is y=0 and the paving grid
    // y=0.004, so tiles drawn at y=0 z-fight with the floor they are
    // supposed to replace.
    window.__groundGroup.position.x = camera.position.x;
    window.__groundGroup.position.z = camera.position.z;
    window.__groundGroup.position.y = 0.06;
  }

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

// ════════════════════════════════════════════════════════
// OFFBOARD RITUAL
// Deliberate exit ceremony after every focus block.
// Breath animation (3.6s) → optional binary question → onComplete.
// No storage, no tracking. Auto-dismisses after 8s if untouched.
// ════════════════════════════════════════════════════════
let _offboardCleanup = null;

function openOffboard(onComplete) {
  const el = document.getElementById('offboard');
  if (!el) { if (onComplete) onComplete(); return; }
  if (_offboardCleanup) { _offboardCleanup(); _offboardCleanup = null; }

  const qEl   = document.getElementById('offboard-q');
  const still  = document.getElementById('offboard-still');
  const moving = document.getElementById('offboard-moving');
  const cont   = document.getElementById('offboard-dismiss');

  if (qEl) qEl.style.opacity = '0';
  el.classList.add('in');

  let done = false;
  let questionTimer = null, autoTimer = null;

  function dismiss() {
    if (done) return;
    done = true;
    clearTimeout(questionTimer);
    clearTimeout(autoTimer);
    el.classList.remove('in');
    if (qEl) qEl.style.opacity = '0';
    if (onComplete) setTimeout(onComplete, 80);
    _offboardCleanup = null;
  }

  // Question appears after one full breath cycle (3.6s).
  // Inline style set directly — CSS transition unreliable with
  // Chrome's frozen-timeline bug (same as pomoShowQuote path).
  questionTimer = setTimeout(() => {
    if (qEl) qEl.style.opacity = '1';
  }, 3600);

  if (still)  still.onclick  = dismiss;
  if (moving) moving.onclick = dismiss;
  if (cont)   cont.onclick   = dismiss;

  autoTimer = setTimeout(dismiss, 8000);

  _offboardCleanup = () => {
    done = true;
    clearTimeout(questionTimer);
    clearTimeout(autoTimer);
    el.classList.remove('in');
    if (qEl) qEl.style.opacity = '0';
  };
}

// Hook offboard into Pomodoro work-phase end (timer) and hold-to-exit.
// Wrap pomoStart's tick so work-phase completion triggers the ritual.
(() => {
  const origPomoStart = pomoStart;
  window.__pomoStartWrapped = true;
  // Re-define pomoStart to intercept the work→break transition
  window._pomoStartWithRitual = function() {
    if (POMO.tickInt) clearInterval(POMO.tickInt);
    POMO.running = true;
    POMO.tickInt = setInterval(() => {
      POMO.remaining -= 1;
      if (POMO.remaining <= 0) {
        if (POMO.phase === 'work') {
          pomoPause();
          openOffboard(() => { pomoNextPhase(); pomoUpdate(); });
          return;
        } else {
          pomoNextPhase();
        }
      }
      pomoUpdate();
    }, 1000);
    pomoUpdate();
  };
})();

// Intercept the Pomodoro hold-to-exit path:
// only show ritual when exiting a work phase.
const _origHoldTick = holdTick;
// holdTick is defined above; we patch its behaviour by
// monkey-patching the pct >= 100 branch via a flag.
// Simpler: override the pomo-exit hold handlers directly.
(function rewirePomoExit() {
  const exitBtn = document.getElementById('pomo-exit');
  if (!exitBtn) return;
  // Remove the existing listeners (they were added above) and
  // replace with ones that trigger the ritual for work phases.
  // We use a shared state flag to avoid re-running holdTick.
  let _ritualHoldStart = null, _ritualHoldRAF = null;
  const RHOLD_MS = 3000;
  const rHoldRoot  = () => document.querySelector('.pomo-exit-bar');
  const rHoldLabel = () => document.getElementById('pomo-exit-label');

  function rHoldTick() {
    if (_ritualHoldStart === null) return;
    const pct = Math.min(100, ((Date.now() - _ritualHoldStart) / RHOLD_MS) * 100);
    rHoldRoot()?.style.setProperty('--hold', pct + '%');
    if (pct >= 100) {
      rHoldEnd();
      if (POMO.phase === 'work') {
        pomoPause();
        openOffboard(() => closePomodoro());
      } else {
        closePomodoro();
      }
      return;
    }
    _ritualHoldRAF = requestAnimationFrame(rHoldTick);
  }
  function rHoldBegin(e) {
    e?.preventDefault?.();
    _ritualHoldStart = Date.now();
    rHoldLabel()?.classList.add('in');
    _ritualHoldRAF = requestAnimationFrame(rHoldTick);
  }
  function rHoldEnd() {
    _ritualHoldStart = null;
    if (_ritualHoldRAF) cancelAnimationFrame(_ritualHoldRAF);
    _ritualHoldRAF = null;
    rHoldRoot()?.style.setProperty('--hold', '0%');
    rHoldLabel()?.classList.remove('in');
  }

  // Clone the button to strip all prior listeners, then re-add.
  const fresh = exitBtn.cloneNode(true);
  exitBtn.parentNode.replaceChild(fresh, exitBtn);
  fresh.addEventListener('mousedown',   rHoldBegin);
  fresh.addEventListener('mouseup',     rHoldEnd);
  fresh.addEventListener('mouseleave',  rHoldEnd);
  fresh.addEventListener('touchstart',  rHoldBegin, { passive: false });
  fresh.addEventListener('touchend',    rHoldEnd);
  fresh.addEventListener('touchcancel', rHoldEnd);
  fresh.addEventListener('click', () => {
    rHoldLabel()?.classList.add('in');
    setTimeout(() => rHoldLabel()?.classList.remove('in'), 1500);
  });
})();

// Hook offboard into frame exit (timer end + hold-to-exit).
function closeFrameWithRitual() {
  clearInterval(FRAME.slideHandle); FRAME.slideHandle = null;
  openOffboard(() => closeFrame());
}

// Patch the frame tick to use the ritual on natural timer end.
(function rewireFrameTick() {
  const el = document.getElementById('frame');
  if (!el) return;
  // The frame ticker is already set up above. Monkey-patch by
  // re-setting the tick interval when openFrame is called next.
  // Simplest: override closeFrame reference inside the tick closure
  // by storing it on FRAME and referencing that.
  FRAME._closeWithRitual = closeFrameWithRitual;
})();

// Patch frame hold-to-exit to also use ritual.
(function rewireFrameExit() {
  const btn = document.getElementById('frame-exit');
  if (!btn) return;
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  const bar = document.querySelector('.frame-exit-bar');
  const lbl = document.getElementById('frame-exit-label');
  const HOLD_MS = 3000;
  let pressing = false, t0 = 0;
  function frame() {
    if (!pressing) { if (bar) bar.style.background = 'rgba(245,158,11,0)'; return; }
    const elapsed = performance.now() - t0;
    const pct = Math.min(1, elapsed / HOLD_MS);
    if (bar) bar.style.background = `rgba(245,158,11,${0.55 * pct})`;
    if (lbl) lbl.textContent = pct >= 1 ? 'OK' : 'HOLD ' + Math.ceil((HOLD_MS - elapsed) / 1000);
    if (pct >= 1) { pressing = false; closeFrameWithRitual(); return; }
    FRAME.holdRAF = requestAnimationFrame(frame);
  }
  function down(e) { e.preventDefault(); pressing = true; t0 = performance.now(); FRAME.holdRAF = requestAnimationFrame(frame); }
  function up() {
    pressing = false; cancelAnimationFrame(FRAME.holdRAF);
    if (bar) bar.style.background = 'rgba(245,158,11,0)';
    if (lbl) lbl.textContent = 'HOLD';
  }
  fresh.addEventListener('pointerdown',  down);
  fresh.addEventListener('pointerup',    up);
  fresh.addEventListener('pointercancel', up);
  fresh.addEventListener('pointerleave', up);
})();

// ════════════════════════════════════════════════════════
// DOOR — FIRST-VISIT ENTRY CHOICE (host vs guest)
// localStorage nonarkara.mode = 'host' | 'guest'
// ════════════════════════════════════════════════════════
(() => {
  const doorEl = document.getElementById('door');
  if (!doorEl) return;
  const KEY = 'nonarkara.mode';
  const lsRead  = () => { try { return localStorage.getItem(KEY); } catch (_) { return null; } };
  const lsWrite = (m) => { try { localStorage.setItem(KEY, m); } catch (_) {} };
  const lsClear = ()  => { try { localStorage.removeItem(KEY); } catch (_) {} };

  function applyMode(m) {
    if (m === 'host' || m === 'guest') document.body.dataset.mode = m;
  }

  // Populate guest vCard QR once buildQR is available.
  function paintGuestCardQR() {
    try {
      const img = document.getElementById('plan-guest-qr');
      if (img && typeof buildQR === 'function' && typeof VCARD === 'string') {
        img.src = buildQR(VCARD, 'L');
      }
    } catch (_) {}
  }

  // Wire guest contact card tap → existing contact modal.
  const guestCard = document.getElementById('plan-guest-card');
  if (guestCard) {
    guestCard.addEventListener('click', () => {
      try { openFurnitureModal('coffee'); } catch (_) {}
    });
  }

  // Query overrides for testing / sharing.
  const params = new URLSearchParams(location.search);
  if (params.has('door'))  lsClear();
  if (params.has('host'))  { lsWrite('host');  applyMode('host'); }
  if (params.has('guest')) { lsWrite('guest'); applyMode('guest'); }

  const stored = lsRead();
  if (stored === 'host' || stored === 'guest') {
    applyMode(stored);
    if (stored === 'guest') paintGuestCardQR();
    doorEl.classList.add('skip');
    return;
  }

  // No stored mode — door is visible underneath boot (z 9999).
  // Boot disappears at ~2.1s; door appears. No fade needed.

  function pick(mode) {
    lsWrite(mode);
    applyMode(mode);
    if (mode === 'guest') paintGuestCardQR();
    doorEl.classList.add('skip');
    // Host → OS all day. Guest → Pavilion. Clear saved view so the
    // mode's default wins on this first choice (later toggles stick).
    try {
      localStorage.removeItem('nonarkara.view');
      const go = mode === 'host' ? 'plan' : 'room';
      (window.setView || setView)(go);
    } catch (_) {}
  }

  document.getElementById('door-host')?.addEventListener('click',  () => pick('host'));
  document.getElementById('door-guest')?.addEventListener('click', () => pick('guest'));
})();

// Discovery HUD — counter + toast. Lives next to the room HUD.
DISCOVERY = createDiscovery({
  counterEl: document.getElementById('discover-count'),
  toastEl: document.getElementById('discover-toast'),
});
document.getElementById('discover-chip')?.addEventListener('click', () => {
  if (!DISCOVERY) return;
  const rows = DISCOVERY.list().map(s =>
    `<span class="row">${s.found ? '▣' : '▢'}  ${s.found ? s.title : s.whisper}</span>`
  ).join('');
  showModal('FOUND', `${DISCOVERY.found.size} / ${DISCOVERY.total}`, `
    <div class="modal-cap">walk the pavilion · nothing is announced</div>
    <div class="modal-meta">${rows}</div>`);
});

// ════════════════════════════════════════════════════════
// ACCESSIBILITY — aria-pressed sync on lang switchers
// applyLang already updates data-lang; here we keep the
// aria-pressed attribute in sync so screen readers announce
// which language is active.
// ════════════════════════════════════════════════════════
function syncLangAriaPressed() {
  ['#lang', '#plan-lang'].forEach(sel => {
    document.querySelectorAll(`${sel} button[data-l]`).forEach(btn => {
      btn.setAttribute('aria-pressed', btn.dataset.l === LANG ? 'true' : 'false');
    });
  });
}
// Run once on load and after every lang switch.
syncLangAriaPressed();
const _origApplyLang = applyLang;
// applyLang is defined at module level; shadow it with a wrapper.
// (module-level reassignment works because the original callers
//  look up applyLang at call-time via the closure, and we update
//  the binding below.)
// Actually, use an event-listener approach instead:
document.querySelectorAll('#lang button[data-l], #plan-lang button[data-l]').forEach(btn => {
  btn.addEventListener('click', () => { setTimeout(syncLangAriaPressed, 0); });
});

// ════════════════════════════════════════════════════════
// NON OS — home-grid readouts + connection state
//
// The plan view is the operating system: a home screen whose tiles
// carry their own state, so the page answers "how did today go" and
// "is anything broken" before you open a single thing.
// ════════════════════════════════════════════════════════

// Tile readouts. Cheap enough to repaint wholesale on any state change.
function paintTiles() { try { _paintTilesBody(); } catch (_) {} }
function _paintTilesBody() {
  const set = (id, txt) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== txt) el.textContent = txt;
  };

  const m = loadFocusMinutes();
  set('os-r-focus', m > 0
    ? (m >= 60 ? `${Math.floor(m / 60)}H${_pad2(m % 60)}M TODAY` : `${m} MIN TODAY`)
    : '25 MIN');

  // The music claim is the point of the whole project: these ten tracks
  // are on the device, bought and precached. Say so even while playing.
  const song = SONGS[musicIdx];
  set('os-r-music', audio.paused
    ? `${SONGS.length} TRACKS · OWNED`
    : (song?.alt || song?.title || '—').toUpperCase().slice(0, 22));

  const n = loadNotes().length;
  set('os-r-note', n ? `${n} SAVED` : 'EMPTY');

  set('os-r-theme', (CURRENT_THEME || 'dark').toUpperCase());

  const d = window.__lastStatusData;
  if (d?.sites) {
    const parked = new Set(d.parked || []);
    const active = Object.entries(d.sites).filter(([k]) => !parked.has(k));
    set('os-r-fleet', `${active.filter(([, v]) => OK_CODE(v.code)).length}/${active.length} UP`);
  }

  const f = document.getElementById('os-focus-today');
  if (f) f.textContent = m > 0
    ? (m >= 60 ? `+${Math.floor(m / 60)}H${_pad2(m % 60)}M FOCUS` : `+${m}M FOCUS`)
    : '';
}

// Connection state. Offline is not an error here — it is the mode this
// thing was built for, so it gets said out loud rather than hidden.
let _connOpen = false;
function paintConn() {
  const wrap = document.getElementById('os-conn');
  const label = document.getElementById('os-conn-t');
  if (!wrap || !label) return;
  const online = navigator.onLine;
  wrap.dataset.state = online ? 'online' : 'offline';
  label.textContent = t(online ? 'os_online' : 'os_offline');
  document.body.dataset.conn = online ? 'online' : 'offline';
}
window.addEventListener('online', paintConn);
window.addEventListener('offline', paintConn);
document.getElementById('os-conn')?.addEventListener('click', () => {
  _connOpen = !_connOpen;
  if (!_connOpen) { closeModal(); return; }
  showModal(
    t(navigator.onLine ? 'os_online' : 'os_offline'),
    t('os_offline_title'),
    `<p class="modal-body-p">${t('os_offline_body')}</p>`
  );
});
paintConn();

document.getElementById('os-fleet-jump')?.addEventListener('click', () => {
  (document.getElementById('plan-fleet') || document.querySelector('.plan-stat'))
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Repaint after each thing that can change a readout. Wrapping the four
// existing painters beats threading a paintTiles() call through their
// call sites — same effect, nothing else has to know the OS layer exists.
const _afterPaint = (orig) => function () { const r = orig.apply(this, arguments); paintTiles(); return r; };
renderFocusToday = _afterPaint(renderFocusToday);
paintSteps       = _afterPaint(paintSteps);
renderNoteList   = _afterPaint(renderNoteList);
paintPlanStatus  = _afterPaint(paintPlanStatus);
applyTheme       = _afterPaint(applyTheme);
audio.addEventListener('play', paintTiles);
audio.addEventListener('pause', paintTiles);
paintTiles();
setInterval(paintTiles, 30_000);

// ════════════════════════════════════════════════════════
// FLEET CONSOLE — every system Non runs, as a transit board
//
// Vignelli's rule: maximum density and maximum legibility are the same
// problem solved correctly. Stations sit on a line; a station is either
// running, down, or a closed platform on the siding. Amber means one
// thing here — something needs attention.
// ════════════════════════════════════════════════════════

const FLEET_API = 'https://api.nonarkara.org';
let FLEET_EXTRA = null;   // { uptime, incidents, history }
let FLEET_OPEN = null;    // domain whose detail strip is expanded

// Station code from a domain: the part that identifies it to a human.
//   phuket-dashboard.nonarkara.org/war-room -> WAR-ROOM
//   bangkok-ioc.pages.dev                   -> BANGKOK-IOC
//   nonarkara.org                           -> ORG
function stationCode(d) {
  const path = d.split('/')[1];
  if (path) return path.toUpperCase();
  if (d === 'nonarkara.org') return 'ORG';
  return d.replace(/\.nonarkara\.org$/, '').replace(/\.(pages|fly)\.dev$/, '').toUpperCase();
}

// Lines are derived, not listed: a second hardcoded list of domains is a
// second thing to forget to update.
function fleetLines(data) {
  const parked = new Set(data.parked || []);
  const own = [], ext = [], sid = [];
  for (const d of Object.keys(data.sites || {})) {
    if (parked.has(d)) sid.push(d);
    else if (d === 'nonarkara.org' || d.endsWith('.nonarkara.org')) own.push(d);
    else ext.push(d);
  }
  return [
    { key: 'pages',  label: t('fleet_pages'),  stations: own },
    { key: 'ext',    label: t('fleet_ext'),    stations: ext },
    // Work with no public URL — under NDA or too experimental to point
    // at. It cannot be probed, so it is never counted up or down, but a
    // board that shows only what is deployable is not a picture of the
    // work. Sabai Sabai lives here.
    { key: 'pipeline', label: t('fleet_pipeline'),
      stations: (data.pipeline || []).map(p => p.id), pipeline: data.pipeline || [] },
    { key: 'parked', label: t('fleet_parked'), stations: sid },
  ].filter(l => l.stations.length);
}

function paintFleet(data) { try { _paintFleetBody(data); } catch (_) {} }
function _paintFleetBody(data) {
  const host = document.getElementById('fleet-lines');
  if (!host || !data?.sites) return;
  const parked = new Set(data.parked || []);

  host.innerHTML = fleetLines(data).map(line => `
    <div class="fleet-line" data-line="${line.key}">
      <div class="fleet-line-lbl">${line.label}</div>
      <div class="fleet-stns">${line.stations.map(d => {
        if (line.key === 'pipeline') {
          const p = (line.pipeline || []).find(x => x.id === d) || { label: d, note: '' };
          return `<span class="fleet-stn" data-state="pipeline" title="${p.note}"
                        aria-label="${p.label} — in the pipeline, not deployed">
                    <span class="fleet-dot" aria-hidden="true"></span>
                    <span class="fleet-code">${p.label}</span>
                  </span>`;
        }
        const v = data.sites[d];
        const state = parked.has(d) ? 'parked' : (OK_CODE(v.code) ? 'up' : 'down');
        return `<button class="fleet-stn" data-dom="${d}" data-state="${state}"
                        aria-label="${d} — ${state}">
                  <span class="fleet-dot" aria-hidden="true"></span>
                  <span class="fleet-code">${stationCode(d)}</span>
                </button>`;
      }).join('')}</div>
    </div>
  `).join('');

  host.querySelectorAll('.fleet-stn').forEach(btn => {
    btn.addEventListener('click', () => {
      FLEET_OPEN = FLEET_OPEN === btn.dataset.dom ? null : btn.dataset.dom;
      paintFleetDetail(data);
    });
  });

  // Summary counts ACTIVE only — a parked station is not a failure.
  const active = Object.entries(data.sites).filter(([k]) => !parked.has(k));
  const up = active.filter(([, v]) => OK_CODE(v.code)).length;
  const sum = document.getElementById('plan-stat-summary');
  const next = `${up} / ${active.length} UP`;
  if (sum && sum.textContent !== next) {
    sum.textContent = next;
    sum.classList.remove('flash');
    void sum.offsetWidth;                 // force reflow so flash re-runs
    sum.classList.add('flash');
  }

  paintHealthGlance(active.length, up, (data.pipeline || []).length);
  paintFleetDetail(data);
  paintIncidents();
}

/**
 * The health line: one sentence, readable at arm's length, answering
 * the only question you have forty times a day — is everything fine?
 *
 * Green when it is, amber when it is not. Two colours in a status
 * readout is a deliberate exception to the one-amber law: amber stays
 * the interrupt and never means "fine", so the page still has exactly
 * one attention colour. A green dot is not competing for your eye —
 * it is telling you that you can stop looking.
 */
function paintHealthGlance(total, up, pipelineCount) {
  const el = document.getElementById('os-health');
  if (!el) return;
  const down = total - up;
  const ok = down === 0;
  el.dataset.state = ok ? 'ok' : 'bad';
  const label = ok
    ? `${total} ${t('health_systems')} · ${t('health_allgood')}`
    : `${down} ${down === 1 ? t('health_problem') : t('health_problems')} · ${up}/${total}`;
  const pipe = pipelineCount ? ` · ${pipelineCount} ${t('health_pipeline')}` : '';
  const next = label + pipe;
  if (el.querySelector('.os-health-lbl').textContent !== next) {
    el.querySelector('.os-health-lbl').textContent = next;
  }
}

function paintFleetDetail(data) {
  const el = document.getElementById('fleet-detail');
  if (!el) return;
  document.querySelectorAll('.fleet-stn').forEach(b =>
    b.classList.toggle('open', b.dataset.dom === FLEET_OPEN));
  if (!FLEET_OPEN) { el.hidden = true; el.innerHTML = ''; return; }

  const d = FLEET_OPEN;
  const v = data?.sites?.[d];
  const u = FLEET_EXTRA?.uptime?.[d];
  const hist = FLEET_EXTRA?.history?.[d] || [];
  const pct = n => (n == null ? '—' : `${n}%`);
  const inc = (FLEET_EXTRA?.incidents || []).find(i => i.domain === d);

  el.hidden = false;
  el.innerHTML = `
    <div class="fleet-detail-head">
      <a href="https://${d}" target="_blank" rel="noopener">${d}</a>
      <span class="fleet-detail-code">${v ? v.code : '—'} · ${v ? v.ms : '—'} ms</span>
    </div>
    <div class="fleet-detail-row">
      <span>24H <b>${pct(u?.d1)}</b></span>
      <span>7D <b>${pct(u?.d7)}</b></span>
      <span>30D <b>${pct(u?.d30)}</b></span>
    </div>
    ${sparkline(hist)}
    <div class="fleet-detail-note">${inc
      ? `${t('fleet_last_incident')} ${new Date(inc.downAt).toISOString().slice(0, 16).replace('T', ' ')} · ${inc.upAt ? t('fleet_resolved') : t('fleet_ongoing')}`
      : t('fleet_no_incidents')}</div>
  `;
}

// 24h of latency as one polyline. Down probes break the line — a gap is
// more honest than a zero, which would read as "very fast".
function sparkline(hist) {
  if (hist.length < 2) return '';
  const W = 100, H = 18;
  const max = Math.max(...hist.map(h => h[2]), 1);
  let dAttr = '', pen = false;
  hist.forEach(([, code, ms], i) => {
    if (!OK_CODE(code)) { pen = false; return; }
    const x = (i / (hist.length - 1)) * W;
    const y = H - (ms / max) * (H - 2) - 1;
    dAttr += `${pen ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    pen = true;
  });
  return `<svg class="fleet-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
               aria-label="24 hour latency">
            <path d="${dAttr}"/>
          </svg>
          <div class="fleet-spark-cap">24H · ${t('fleet_peak')} ${max} MS</div>`;
}

function paintIncidents() {
  const el = document.getElementById('fleet-incidents');
  if (!el) return;
  const list = (FLEET_EXTRA?.incidents || []).slice(0, 6);
  if (!list.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="fleet-inc-lbl">${t('fleet_incidents')}</div>
    ${list.map(i => {
      const mins = i.upAt
        ? Math.max(1, Math.round((Date.parse(i.upAt) - Date.parse(i.downAt)) / 60000))
        : null;
      return `<div class="fleet-inc" data-open="${!i.upAt}">
        <span class="d">${new Date(i.downAt).toISOString().slice(5, 16).replace('T', ' ')}</span>
        <span class="n">${stationCode(i.domain)}</span>
        <span class="c">${i.lastCode || '—'}</span>
        <span class="t">${mins != null ? mins + 'm' : t('fleet_ongoing')}</span>
      </div>`;
    }).join('')}
  `;
}

// Uptime and incidents move on the scale of hours, not seconds.
async function fetchFleetExtra() {
  try {
    const [u, i, h] = await Promise.all([
      fetch(`${FLEET_API}/uptime`).then(r => r.json()),
      fetch(`${FLEET_API}/incidents`).then(r => r.json()),
      fetch(`${FLEET_API}/history`).then(r => r.json()),
    ]);
    FLEET_EXTRA = { uptime: u.uptime, incidents: i.incidents, history: h.history };
    const rib = document.getElementById('ribbon-uptime');
    if (rib && u.uptime) {
      const vals = Object.entries(u.uptime)
        .filter(([k]) => !(u.parked || []).includes(k))
        .map(([, x]) => x.d30).filter(n => n != null);
      if (vals.length) rib.textContent = `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)} %`;
    }
    if (window.__lastStatusData) paintFleet(window.__lastStatusData);
  } catch (_) { /* offline — the board keeps its last painted state */ }
}
fetchFleetExtra();
setInterval(fetchFleetExtra, 5 * 60_000);

// The 60s status poll already paints the plan; hang the board off it.
paintPlanStatus = ((orig) => function (data) {
  const r = orig.apply(this, arguments);
  if (data) paintFleet(data);
  return r;
})(paintPlanStatus);
if (window.__lastStatusData) paintFleet(window.__lastStatusData);

// ════════════════════════════════════════════════════════
// THE SKY — look up
//
// The room has a ceiling. Above the ceiling is the actual sky over
// wherever you happen to be standing, at whatever moment you are
// standing there. Tilt the phone up and the room fades to a memory
// underfoot; turn on the spot and the stars hold still, because they
// are the fixed thing and you are the one moving.
//
// Camera ownership is explicit now. Room drag, the dolly zoom and the
// sky each want the camera, and before this they composed by accident.
// ════════════════════════════════════════════════════════

let CAMERA_MODE = 'room';           // 'room' | 'sky' | 'ground'  (dolly on top)
let SKY = null;                     // the built dome, once WebGL is confirmed
let SKY_BLEND = 0;                  // 0 room · 1 sky
// Reused every frame. Allocating two Colors per frame is 120 objects a
// second for the garbage collector to clean up after, for no reason.
const _bgScratch = new THREE.Color();
const _night = new THREE.Color(0x05070b);
const _deepEarth = new THREE.Color(0x070a0f);
let SKY_SITE = { lat: 13.7563, lon: 100.5018, label: 'BANGKOK' };
let SKY_HEADING = null;             // degrees from true north, if the phone knows
let SKY_YAW = 0;                    // scene yaw actually used
let SKY_LAST_CALC = 0;
const SKY_PITCH = 1.32;             // ~76°, so the horizon stays in frame

const skyHud  = document.getElementById('sky-hud');
const skyHint = document.getElementById('sky-hint');

function skyAvailable() { return WEBGL_OK && SKY; }

async function initSky() {
  if (!WEBGL_OK || SKY) return;
  // Show the control immediately — waiting on the module made the sky
  // look "missing" for the whole first second (and forever if import failed silently).
  if (skyHint) {
    skyHint.classList.add('in');
    skyHint.disabled = true;
  }
  try {
    const mod = await import('./sky.js');
    // Starlight, not theme foreground: the sky is night in both themes,
    // and the light theme's near-black would draw invisible stars.
    SKY = mod.buildSky(0xe6edf3, 0xf59e0b);
    window.__skyGroup = SKY.group;
    SKY.mod = mod;
    SKY.group.visible = false;
    scene.add(SKY.group);
    recalcSky(true);
    if (skyHint) skyHint.disabled = false;
  } catch (e) {
    // No sky is a missing feature, not a broken room.
    if (skyHint) skyHint.remove();
  }
}

// The sky turns a quarter of a degree per minute. Recomputing every
// frame would be 152 stars of arithmetic to move them less than a pixel.
function recalcSky(force) {
  if (!SKY) return;
  const now = Date.now();
  if (!force && now - SKY_LAST_CALC < 10_000) return;
  SKY_LAST_CALC = now;
  const d = new Date();
  SKY.update(d, SKY_SITE);
  const place = document.getElementById('sky-place');
  const time  = document.getElementById('sky-time');
  if (place) place.textContent = `${t('sky_over')} ${SKY_SITE.label}`;
  if (time) {
    time.textContent = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      + (SKY_HEADING != null ? ` · ${cardinal(SKY_HEADING)} ${Math.round(SKY_HEADING)}°` : '');
  }
}

const cardinal = (deg) =>
  ['N','NE','E','SE','S','SW','W','NW'][Math.round(((deg % 360) + 360) % 360 / 45) % 8];

// Ask once, gently, and treat a refusal as a normal answer. Bangkok is
// not a failure state — it is where this was built.
function askForLocation() {
  if (!navigator.geolocation || SKY_SITE.asked) return;
  SKY_SITE.asked = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      SKY_SITE = {
        lat: pos.coords.latitude, lon: pos.coords.longitude,
        label: t('sky_here'), asked: true,
      };
      recalcSky(true);
      if (GROUND) GROUND.load(SKY_SITE);
    },
    () => {},
    { timeout: 8000, maximumAge: 600_000 }
  );
}

// The buttons and keys are conveniences now, not doorways: they simply
// aim the view up or down through the same integrator the finger uses.
// The sky appears because you are looking at it — same as walking.
function enterSky() {
  if (!skyAvailable()) return;
  LOOK.aimAt(LOOK.yaw, 1.15, 0.10);
  askForLocation();
  try { enableGyro(); } catch (_) {}
}

function exitSky() { LOOK.aimAt(LOOK.yaw, 0, 0.10); }

function toggleSky() { CAMERA_MODE === 'sky' ? exitSky() : enterSky(); }

// HUD bookkeeping follows the blends — it never leads them. One place
// decides what "in the sky" means (you are mostly looking at it), and
// every side-effect hangs off the transition.
function syncOverheadHud() {
  const sb = window.__skyBlend || 0, gb = window.__groundBlend || 0;
  const mode = sb > 0.45 ? 'sky' : gb > 0.45 ? 'ground' : 'room';
  if (mode === CAMERA_MODE) return;

  if (mode === 'sky') {
    askForLocation();
    recalcSky(true);
    document.body.dataset.sky = 'on';
    if (skyHud) skyHud.setAttribute('aria-hidden', 'false');
    try { window.__discover?.('sky'); } catch (_) {}
  } else if (CAMERA_MODE === 'sky') {
    document.body.dataset.sky = 'off';
    if (skyHud) skyHud.setAttribute('aria-hidden', 'true');
    const el = document.getElementById('sky-star');
    if (el) el.textContent = '';
    const lore = document.getElementById('sky-lore');
    if (lore) { lore.classList.remove('in'); lore.innerHTML = ''; }
  }

  if (mode === 'ground') {
    askForLocation();
    if (GROUND) {
      GROUND.load(SKY_SITE);
      const cap = document.getElementById('ground-cap');
      if (cap) cap.textContent = `${GROUND.scaleLabel(SKY_SITE.lat)} · ${GROUND.mod.ATTRIBUTION}`;
      const place = document.getElementById('ground-place');
      if (place) place.textContent = `${SKY_SITE.lat.toFixed(4)}°, ${SKY_SITE.lon.toFixed(4)}°`;
    }
    document.body.dataset.ground = 'on';
    try { window.__discover?.('ground'); } catch (_) {}
  } else if (CAMERA_MODE === 'ground') {
    document.body.dataset.ground = 'off';
  }

  CAMERA_MODE = mode;
}

// ── THE GROUND — the sky's mirror ───────────────────────────
// Same position, same compass, opposite direction. The floor goes to
// glass and underneath it is the actual ground, from orbit, turned so
// that north on the photograph is north in the room.
let GROUND = null;
let GROUND_BLEND = 0;
const GROUND_PITCH = -1.18;

async function initGround() {
  if (!WEBGL_OK || GROUND) return;
  const gHint = document.getElementById('ground-hint');
  if (gHint) { gHint.classList.add('in'); gHint.disabled = true; }
  try {
    const mod = await import('./ground.js');
    GROUND = mod.buildGround(0xe6edf3, 0xf59e0b, renderer.capabilities.getMaxAnisotropy());
    window.__groundGroup = GROUND.group;
    GROUND.mod = mod;
    GROUND.group.visible = false;
    scene.add(GROUND.group);
    if (gHint) gHint.disabled = false;
  } catch (_) {
    gHint?.remove();
  }
}

function enterGround() {
  if (!GROUND) return;
  LOOK.aimAt(LOOK.yaw, -1.15, 0.10);
  askForLocation();
  try { enableGyro(); } catch (_) {}
}

function exitGround() { LOOK.aimAt(LOOK.yaw, 0, 0.10); }

function toggleGround() { CAMERA_MODE === 'ground' ? exitGround() : enterGround(); }
document.getElementById('ground-hint')?.addEventListener('click', enterGround);
document.getElementById('ground-exit')?.addEventListener('click', exitGround);

skyHint?.addEventListener('click', enterSky);
document.getElementById('sky-exit')?.addEventListener('click', exitSky);

// Compass. On iOS webkitCompassHeading rides the same permission grant
// the room's gyro already asks for; on Android the absolute event
// carries it in alpha, measured the other way round.
let SKY_HAS_MOTION = false;
let DEVICE_PITCH = null;            // radians: +up, 0 = horizon, -down

/**
 * The phone's actual pitch, absolute — not relative to however you were
 * holding it when you started.
 *
 * DeviceOrientation beta is 0 when the phone lies flat face-up and 90
 * when you hold it upright in front of you. So looking-up angle is
 * (90 - beta): flat means you are pointing at the zenith, upright means
 * you are pointing at the horizon.
 *
 * This is the difference between a planetarium and a picture of one. The
 * sky used to sit at a FIXED 76° whatever you did, so holding the phone
 * normally showed you the zenith — which reads exactly as lying on your
 * back on the floor. Now the sky is where the sky is: lift the phone and
 * the stars are behind the screen, lower it and the horizon comes down,
 * keep going and you are looking at the map under your feet.
 */
function pitchFromBeta(beta, gamma) {
  const screenAngle = (screen.orientation && screen.orientation.angle) || 0;
  let b = beta;
  // Landscape: the phone's front-back axis is gamma, not beta.
  if (screenAngle === 90) b = -gamma;
  else if (screenAngle === -90 || screenAngle === 270) b = gamma;
  const deg = 90 - b;                       // 0 = horizon, +90 = zenith
  return Math.max(-85, Math.min(89, deg)) * Math.PI / 180;
}

function onCompass(e) {
  if (e && typeof e.beta === 'number' && e.beta !== null) {
    SKY_HAS_MOTION = true;
    DEVICE_PITCH = pitchFromBeta(e.beta, e.gamma || 0);
  }
  window.__skyHasMotion = SKY_HAS_MOTION;
  let h = null;
  if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
  else if (e.absolute && typeof e.alpha === 'number') h = 360 - e.alpha;
  if (h == null || Number.isNaN(h)) return;
  const screenAngle = (screen.orientation && screen.orientation.angle) || 0;
  SKY_HEADING = ((h + screenAngle) % 360 + 360) % 360;
  window.__skyHeading = SKY_HEADING;
}
window.addEventListener('deviceorientation', onCompass, true);
if ('ondeviceorientationabsolute' in window) {
  window.addEventListener('deviceorientationabsolute', onCompass, true);
}

// The old sky-entry gesture lived here: hold the phone tilted past a
// threshold for 450ms and a MODE switched. It also read its tilt with
// the sign inverted, so lifting the phone to the sky could enter the
// ground — "I look up and I'm lying on the floor". There is no gesture
// and no mode any more: the sky is up, the ground is down, and the
// blend comes from nothing but where you are looking (look.js).

// Tap a star for its name. Reuses the room's tooltip element so there is
// one thing on screen that names what you are pointing at, not two.
function skyTap(clientX, clientY) {
  if (CAMERA_MODE !== 'sky' || !SKY) return false;
  const ndc = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = SKY.mod.nearestStar(raycaster.ray.direction.clone().normalize(), SKY_SITE, new Date(), 5);
  const el = document.getElementById('sky-star');
  const panel = document.getElementById('sky-lore');
  if (el) {
    el.textContent = hit
      ? `${hit.name.toUpperCase()} · ${t('sky_mag')} ${hit.mag.toFixed(2)}`
      : '';
    if (hit && hit.name === SKY.mod.FOLLY.name) {
      el.textContent += ` · ${t('sky_folly')}`;
    }
  }

  // The teaching layer. A named dot is trivia; the point is what the
  // shape meant to the people who drew it and one true thing about the
  // object itself. Tapping empty sky clears it — silence is a state.
  if (panel) {
    if (!hit) { panel.classList.remove('in'); panel.innerHTML = ''; return true; }
    const fig = SKY.mod.figureOfStar(hit.name);
    const lore = fig ? STARLORE_MOD.loreFor(fig) : null;
    const star = STARLORE_MOD.starNote(hit.name);
    const esc = (x) => String(x).replace(/</g, '&lt;');
    const rows = [];
    if (star) {
      rows.push(`<div class="lore-star">${esc(hit.name.toUpperCase())} · ${star.distance} ${t('sky_ly')}</div>`);
      rows.push(`<div class="lore-note">${esc(star.note)}</div>`);
    }
    if (lore) {
      rows.push(`<div class="lore-fig">${esc(fig.toUpperCase())}${lore.zh ? ` · ${esc(lore.zh)}` : ''}</div>`);
      rows.push(`<div class="lore-see">${esc(lore.see)}</div>`);
      rows.push(`<div class="lore-story">${esc(lore.story)}</div>`);
      rows.push(`<div class="lore-fact">${esc(lore.fact)}</div>`);
    }
    if (rows.length) { panel.innerHTML = rows.join(''); panel.classList.add('in'); }
    else { panel.classList.remove('in'); panel.innerHTML = ''; }
  }
  return true;
}

// Fold the sky into the frame loop: camera blend, opacity, recalcs.
// Returns how much of the room should remain visible.
// Compass steers the yaw when the phone knows which way it faces;
// otherwise the finger does, exactly as in the room. Sky and ground
// share it — pointing north means the same thing in both directions.

function tickSky() {
  syncOverheadHud();
  const roomLeftByGround = tickGround();
  const want = window.__skyBlend || 0;
  SKY_BLEND += (want - SKY_BLEND) * 0.055;
  if (SKY_BLEND < 0.002 && want === 0) {
    SKY_BLEND = 0;
    if (SKY) SKY.group.visible = false;
    return roomLeftByGround;
  }
  if (!SKY) return roomLeftByGround;
  SKY.group.visible = true;
  recalcSky(false);

  // Ease the scene clear colour toward night. The CSS background sits
  // behind the canvas, so without this the light theme keeps painting a
  // white sky underneath the stars.
  _bgScratch.set(THEMES[CURRENT_THEME].bg).lerp(_night, SKY_BLEND);
  scene.background = _bgScratch;

  const k = SKY_BLEND;
  SKY.mod.fadeTargets(SKY).forEach(o => {
    o.material.opacity = (o.userData.targetOpacity ?? 0.6) * k;
  });
  return Math.min(roomLeftByGround, 1 - SKY_BLEND * 0.94);   // room left visible
}

// The ground fades the room the same way the sky does, and eases the
// scene toward the deep blue of an image seen from very high up.
function tickGround() {
  const want = window.__groundBlend || 0;
  GROUND_BLEND += (want - GROUND_BLEND) * 0.055;
  if (GROUND_BLEND < 0.002) {
    GROUND_BLEND = 0;
    if (GROUND) GROUND.group.visible = false;
    return 1;
  }
  if (!GROUND) return 1;
  GROUND.group.visible = true;
  GROUND.fadeTargets().forEach(o => {
    o.material.opacity = (o.userData.targetOpacity ?? 0.8) * GROUND_BLEND;
  });
  _bgScratch.set(THEMES[CURRENT_THEME].bg).lerp(_deepEarth, GROUND_BLEND);
  scene.background = _bgScratch;
  return 1 - GROUND_BLEND * 0.88;
}

// Palette + keyboard. U = look up (sky), J = look down (ground).
// S used to toggle the sky — and S is also walk-backwards. Every step
// reverse flipped the planetarium on and off. That is why "sky and floor
// are missing" while the keyboard felt broken.
document.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const inRoom = document.body.dataset.view === 'room';
  const k = e.key.toLowerCase();
  if (k === 'u' && inRoom) { e.preventDefault(); toggleSky(); }
  else if (k === 'j' && inRoom) { e.preventDefault(); toggleGround(); }
  else if (e.key === 'Escape' && CAMERA_MODE === 'sky') exitSky();
  else if (e.key === 'Escape' && CAMERA_MODE === 'ground') exitGround();
});

if (WEBGL_OK) { initSky(); initGround(); }

// Published for animate(), which runs its first frame before this module
// finishes evaluating. One handle, so the loop never reaches into the
// sky's bindings directly.
window.__skyTap = (e) => {
  if (CAMERA_MODE !== 'sky') return false;
  const pt = e.changedTouches ? e.changedTouches[0] : e;
  return skyTap(pt.clientX, pt.clientY);
};

window.__sky = {
  blend: 0, yaw: 0, pitch: SKY_PITCH,
  tick() {
    const dim = tickSky();
    // Sky and ground are mutually exclusive, so one blend and one pitch
    // can stand for both — whichever is currently pulling the camera.
    if (GROUND_BLEND > SKY_BLEND) {
      this.blend = GROUND_BLEND;
      // On a phone, point it where you actually point it. The fixed
      // angle is the desktop fallback, where there is nothing to point.
      this.pitch = (SKY_HAS_MOTION && DEVICE_PITCH !== null)
        ? Math.min(DEVICE_PITCH, -0.15) : GROUND_PITCH;
    } else {
      this.blend = SKY_BLEND;
      this.pitch = (SKY_HAS_MOTION && DEVICE_PITCH !== null)
        ? DEVICE_PITCH : SKY_PITCH;
    }
    this.yaw = SKY_YAW;
    return dim;
  },
};

// ════════════════════════════════════════════════════════
// THE MORNING BRIEF — the screen for it
//
// What the internet argued about while you slept, written by a model on
// your own machine and read back in your own voice. The audio shares the
// one <audio> element the music player already owns, so the brief and a
// track can never talk over each other.
// ════════════════════════════════════════════════════════

const BRIEF_API = 'https://api.nonarkara.org/podcast/episodes.json';
let BRIEF = { episodes: [], i: 0 };
let briefRAF = 0;

const fmtClock = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

async function loadBrief() {
  try {
    const r = await fetch(BRIEF_API, { cache: 'no-cache' });
    if (!r.ok) return;
    const d = await r.json();
    BRIEF.episodes = d.episodes || [];
    BRIEF.i = 0;
    paintBriefScreen();
    paintTiles();
  } catch (_) { /* offline — the screen keeps whatever it last showed */ }
}

function currentBrief() { return BRIEF.episodes[BRIEF.i] || null; }

function paintBriefScreen() { try { _paintBriefScreenBody(); } catch (_) {} }
function _paintBriefScreenBody() {
  const ep = currentBrief();
  const title = document.getElementById('brief-title');
  const meta = document.getElementById('brief-meta');
  const stories = document.getElementById('brief-stories');
  const transcript = document.getElementById('brief-transcript');
  const archive = document.getElementById('brief-archive');
  if (!title) return;

  if (!ep) {
    title.textContent = t('brief_waiting');
    if (meta) meta.textContent = '—';
    return;
  }

  title.textContent = ep.title;
  if (meta) {
    // The voice is stated because "read in his own voice" is a claim,
    // and a claim about provenance should carry its own evidence.
    meta.textContent = `${Math.round(ep.seconds / 60)} MIN · ${ep.words} WORDS · ${(ep.voice || '').toUpperCase()}`;
  }

  if (stories) {
    stories.innerHTML = (ep.stories || []).slice(0, 8).map(s => `
      <a class="brief-story" href="${s.hn}" target="_blank" rel="noopener">
        <span class="s-title">${s.title.replace(/</g, '&lt;')}</span>
        <span class="s-meta">${s.score} · ${s.host || 'hn'}</span>
      </a>`).join('');
  }
  if (transcript) transcript.textContent = ep.script || '';

  if (archive) {
    archive.innerHTML = BRIEF.episodes.slice(0, 7).map((e, i) => `
      <button class="brief-day${i === BRIEF.i ? ' on' : ''}" data-i="${i}">
        ${new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
      </button>`).join('');
    archive.querySelectorAll('.brief-day').forEach(b => b.addEventListener('click', () => {
      BRIEF.i = parseInt(b.dataset.i, 10);
      paintBriefScreen();
      if (document.body.dataset.playing === 'brief') playBrief(true);
    }));
  }
  paintBriefProgress();
}

// The brief borrows the shared <audio>. Whoever plays last owns it, so
// the music UI is told to let go rather than left painting a phantom.
function playBrief(restart) {
  const ep = currentBrief();
  if (!ep) return;
  const src = ep.audio;
  if (restart || !audio.src.includes(ep.id)) {
    audio.src = src;
    audio.currentTime = 0;
  }
  document.body.dataset.playing = 'brief';
  audio.play().catch(() => {});
  tickBriefProgress();
}

function paintBriefProgress() {
  const bar = document.getElementById('brief-bar');
  const time = document.getElementById('brief-time');
  const play = document.getElementById('brief-play');
  const ep = currentBrief();
  const mine = document.body.dataset.playing === 'brief' && ep;
  if (play) play.textContent = (mine && !audio.paused) ? '❚❚' : '▶';
  const dur = mine ? (audio.duration || ep?.seconds || 0) : (ep?.seconds || 0);
  const cur = mine ? audio.currentTime : 0;
  if (bar) bar.style.width = dur ? `${(cur / dur) * 100}%` : '0%';
  if (time) time.textContent = `${fmtClock(cur)} / ${fmtClock(dur)}`;
  const scrub = document.getElementById('brief-scrub');
  if (scrub && dur) scrub.setAttribute('aria-valuenow', String(Math.round((cur / dur) * 100)));
}

function tickBriefProgress() {
  cancelAnimationFrame(briefRAF);
  const step = () => {
    paintBriefProgress();
    if (document.body.dataset.playing === 'brief' && !audio.paused) {
      briefRAF = requestAnimationFrame(step);
    }
  };
  step();
}

document.getElementById('brief-play')?.addEventListener('click', () => {
  if (document.body.dataset.playing === 'brief' && !audio.paused) { audio.pause(); paintBriefProgress(); }
  else playBrief(false);
});

document.getElementById('os-brief')?.addEventListener('click', () => {
  document.getElementById('brief-screen')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (currentBrief() && audio.paused) playBrief(false);
});

// Scrub. Pointer events cover mouse and touch with one path.
(() => {
  const scrub = document.getElementById('brief-scrub');
  if (!scrub) return;
  const seek = (e) => {
    const ep = currentBrief();
    if (!ep || document.body.dataset.playing !== 'brief') return;
    const r = scrub.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    if (audio.duration) audio.currentTime = p * audio.duration;
    paintBriefProgress();
  };
  scrub.addEventListener('pointerdown', (e) => { scrub.setPointerCapture(e.pointerId); seek(e); });
  scrub.addEventListener('pointermove', (e) => { if (scrub.hasPointerCapture(e.pointerId)) seek(e); });
  scrub.addEventListener('keydown', (e) => {
    if (!audio.duration || document.body.dataset.playing !== 'brief') return;
    if (e.key === 'ArrowRight') { audio.currentTime = Math.min(audio.duration, audio.currentTime + 15); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - 15); e.preventDefault(); }
    paintBriefProgress();
  });
})();

audio.addEventListener('play', () => { if (document.body.dataset.playing === 'brief') tickBriefProgress(); });
audio.addEventListener('pause', paintBriefProgress);
audio.addEventListener('ended', () => { paintBriefProgress(); });

// Playing a music track takes ownership back from the brief.
const _origLoadTrack = typeof loadTrack === 'function' ? loadTrack : null;
if (_origLoadTrack) {
  loadTrack = function () { document.body.dataset.playing = 'music'; return _origLoadTrack.apply(this, arguments); };
}

// The tile readout says how fresh today's brief is — "3H AGO" answers
// the only question you actually have about a daily show.
const _briefTileText = () => {
  const ep = currentBrief();
  if (!ep) return 'NONE YET';
  const hrs = Math.floor((Date.now() - Date.parse(ep.date)) / 3_600_000);
  const age = hrs < 1 ? 'JUST NOW' : hrs < 24 ? `${hrs}H AGO` : `${Math.floor(hrs / 24)}D AGO`;
  return `${Math.round(ep.seconds / 60)} MIN · ${age}`;
};
paintTiles = ((orig) => function () {
  const r = orig.apply(this, arguments);
  const el = document.getElementById('os-r-brief');
  if (el) el.textContent = _briefTileText();
  return r;
})(paintTiles);

loadBrief();
setInterval(loadBrief, 30 * 60_000);

// ════════════════════════════════════════════════════════
// BRAIN — vital signs of the resident brain worker on the M5
//
// braind pulses every 15 minutes: transfers when the laptop is online,
// computes regardless. Only counts and dates ever reach this page — the
// brain's contents stay on the laptop, which is the entire point of a
// second brain that lives at home.
// ════════════════════════════════════════════════════════

let BRAIN_STATUS = null;
let brainAlt = false; // tile alternates between two readouts on tap

async function loadBrainStatus() {
  try {
    const r = await fetch('https://api.nonarkara.org/brain', { cache: 'no-cache' });
    if (!r.ok) return;
    BRAIN_STATUS = await r.json();
    paintBrainTile();
  } catch (_) { /* offline — the tile keeps its last truth */ }
}

function paintBrainTile() {
  const el = document.getElementById('os-r-brain');
  if (!el) return;
  const b = BRAIN_STATUS;
  if (!b || !b.ts) { el.textContent = t('brain_asleep'); return; }
  const hrs = Math.floor((Date.now() - Date.parse(b.ts)) / 3_600_000);
  const age = hrs < 1 ? 'NOW' : `${hrs}H`;
  el.textContent = brainAlt
    ? `${(b.mode || '').toUpperCase()} · ${b.pulses ?? 0} PULSES`
    : `${b.documents ?? '?'} DOCS · ${age}`;
}

document.getElementById('os-health')?.addEventListener('click', () => {
  document.getElementById('plan-fleet')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('os-brain')?.addEventListener('click', () => {
  brainAlt = !brainAlt;
  paintBrainTile();
});

loadBrainStatus();
setInterval(loadBrainStatus, 5 * 60_000);

// ════════════════════════════════════════════════════════
// WALK MODE — explore the Pavilion on foot
//
// A mode with a visible switch rather than a click-to-lock, because
// clicking already means "open this thing" and a control that means two
// things depending on what is under the cursor is a Norman door.
//
// Desktop: pointer lock, mouse looks, WASD moves, Esc leaves.
// Phone:   a thumbstick appears bottom-left; drag anywhere to look,
//          which is the gesture the room already used.
// ════════════════════════════════════════════════════════

// Coarse pointer, not screen width: a small window on a desktop still
// wants pointer lock, and a large tablet still wants the thumbstick.
const IS_TOUCH = window.matchMedia?.('(pointer: coarse)').matches
  ?? ('ontouchstart' in window);

let stickEl = null;

function setWalk(on) {
  if (on === WALK.enabled) return;
  WALK.enabled = on;
  document.body.classList.toggle('walking', on);

  const btn = document.getElementById('walk-btn');
  if (btn) {
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
  }

  if (on) {
    // Start from wherever the camera already is, so entering walk mode
    // never teleports you.
    WALK.teleport(camera.position.x, camera.position.z);
    const cvs = renderer.domElement;
    if (!IS_TOUCH && cvs.requestPointerLock) {
      try { cvs.requestPointerLock(); } catch (_) {}
    }
    if (IS_TOUCH && !stickEl) stickEl = attachStick(WALK);
    if (stickEl) stickEl.classList.add('in');
    try { window.__discover?.('walk'); } catch (_) {}
  } else {
    WALK.stick = null;
    if (stickEl) stickEl.classList.remove('in');
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
window.__setWalk = setWalk;

// ════════════════════════════════════════════════════════
// THE COMPASS — getting between three buildings
//
// The triangle is about 120m a side. On foot that is a minute and a
// half of empty grass each way, three times over, and the third time
// nobody does it. So the compass names the nearest building you are
// not standing in, says how far it is and which way, and takes you to
// its threshold if you tap it.
//
// It names the building rather than drawing a marker on it because you
// often cannot see the thing — you are behind an onyx wall, or under
// Savoye, or it is raining. A name and a number work from anywhere.
//
// The travel itself is not a cut. You cover the distance in 1.6s along
// the straight line, which is fast enough not to be a walk and slow
// enough that you watch the ground go past and know you moved. A cut
// would leave you unsure whether you had been teleported or the world
// had been swapped.
// ════════════════════════════════════════════════════════
let TRAVEL = null;
if (WEBGL_OK && SITE.length > 1) {
  const chip = document.getElementById('compass-chip');
  const label = document.getElementById('compass-label');
  const needle = document.getElementById('compass-needle');

  // Where you are put down: the building's own arrival point, in world
  // coordinates, which is the view its plan was drawn to be seen from.
  const doorstep = (b) => ({
    x: b.origin.x + b.plan.spawn.x,
    z: b.origin.z + b.plan.spawn.z,
    lookX: b.origin.x + b.plan.spawn.lookAt.x,
    lookZ: b.origin.z + b.plan.spawn.lookAt.z,
  });

  // Nearest building that is not the one you are standing in. Sorting
  // and taking the second means the chip cycles on its own: arrive at
  // the Glass House and it starts offering Savoye.
  const byDistance = () => {
    const p = camera.position;
    return SITE
      .map(b => ({ b, d: Math.hypot(b.origin.x - p.x, b.origin.z - p.z) }))
      .sort((a, c) => a.d - c.d);
  };
  const nextBuilding = () => byDistance()[1];

  const travelTo = (b) => {
    if (TRAVEL) return;
    const to = doorstep(b);
    // Face the building on arrival: aim the head through the same
    // integrator every other input uses, eased to land as the feet do.
    LOOK.aimAt(Math.atan2(-(to.lookX - to.x), -(to.lookZ - to.z)), 0, 0.055);
    // Pointer lock has to be asked for inside the tap, not 1.6s later.
    setWalk(true);
    TRAVEL = { from: { ...WALK.pos }, to, t0: performance.now(), ms: 1600 };
    document.body.classList.add('travelling');
  };

  // Called from the render loop. Owns the camera while it runs.
  window.__tickTravel = () => {
    if (!TRAVEL) return false;
    const t = Math.min(1, (performance.now() - TRAVEL.t0) / TRAVEL.ms);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    WALK.teleport(
      TRAVEL.from.x + (TRAVEL.to.x - TRAVEL.from.x) * e,
      TRAVEL.from.z + (TRAVEL.to.z - TRAVEL.from.z) * e,
      0, // travel is across the plain — never carry a ramp height with you
    );
    camera.position.set(WALK.pos.x, 1.65, WALK.pos.z);
    if (t >= 1) { TRAVEL = null; document.body.classList.remove('travelling'); }
    return true;
  };

  chip?.addEventListener('click', () => {
    const n = nextBuilding();
    if (n) travelTo(n.b);
  });

  // Four times a second is plenty for a distance readout and keeps the
  // needle honest without putting DOM writes in the render loop.
  const here = document.querySelector('.room-hud-cluster.top-left .hud-eyebrow');
  setInterval(() => {
    if (!chip || document.body.dataset.view !== 'room') return;
    const near = byDistance();
    // The HUD used to say PAVILION whatever happened. There are three
    // buildings now and it has to say the true one, or it is lying.
    if (here && here.textContent !== near[0].b.name) here.textContent = near[0].b.name;
    const n = near[1];
    if (!n) return;
    label.textContent = `${n.b.name} · ${Math.round(n.d)} M`;
    // Bearing relative to where you are looking, so the needle points
    // at the building on screen and not at magnetic north.
    const dx = n.b.origin.x - camera.position.x;
    const dz = n.b.origin.z - camera.position.z;
    const rel = Math.atan2(dx, -dz) + camera.rotation.y;
    needle.style.transform = `rotate(${(rel * 180) / Math.PI}deg)`;
  }, 250);
}

// Full mouse-look while the pointer is locked. Without the lock the
// existing gentle parallax stays exactly as it was.
document.addEventListener('mousemove', (e) => {
  if (!WALK.enabled || !document.pointerLockElement) return;
  LOOK.addDelta(-e.movementX * 0.0022, -e.movementY * 0.0018);
}, { passive: true });

document.addEventListener('pointerlockchange', () => {
  document.body.classList.toggle('pointer-locked', !!document.pointerLockElement);
  // Esc releases the lock; walk mode should follow it out rather than
  // leaving you moving with an invisible cursor loose on screen.
  if (WALK.enabled && !document.pointerLockElement && !IS_TOUCH) setWalk(false);
});

document.getElementById('walk-btn')?.addEventListener('click', () => setWalk(!WALK.enabled));

// On touch, the joystick is not a walk-mode accessory — it is THE
// movement control, present whenever you are in the room. One circle
// for the feet, the rest of the screen for the eyes. The arrow pad it
// replaces needed four targets and a hold; the stick needs a thumb.
if (IS_TOUCH) {
  const syncStick = () => {
    const inRoom = document.body.dataset.view === 'room';
    if (inRoom && !stickEl) stickEl = attachStick(WALK);
    if (stickEl) stickEl.classList.toggle('in', inRoom);
  };
  new MutationObserver(syncStick)
    .observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
  syncStick();

  // If motion events never arrive after the permission dance — denied,
  // or hardware without them — the tilt-to-look path is dead, and the
  // sky needs a door again: two bare chevrons that aim the same
  // integrator (see index/styles: they are the old LOOK UP/DOWN buttons,
  // stripped to arrows and shown only in this case).
  const checkGyro = () => setTimeout(() => {
    if (!window.__skyHasMotion) document.body.dataset.nogyro = '1';
  }, 3000);
  window.addEventListener('touchend', () => { try { enableGyro(); } catch (_) {} checkGyro(); },
    { once: true, passive: true });
}

// iOS only grants motion access from a user gesture, and the only place
// that ever asked was entering the sky. So in the room the gyro was
// simply off, and holding the phone up did nothing at all. Ask on the
// first touch in the room instead — one prompt, then the room is a
// window for the rest of the session.
if (IS_TOUCH) {
  const askMotionOnce = () => {
    window.removeEventListener('touchend', askMotionOnce);
    if (document.body.dataset.view !== 'room') {
      window.addEventListener('touchend', askMotionOnce, { once: true, passive: true });
      return;
    }
    try { enableGyro(); } catch (_) {}
  };
  window.addEventListener('touchend', askMotionOnce, { once: true, passive: true });
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && WALK.enabled) setWalk(false);
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  // Same key that starts a walk in most games.
  if ((e.key === 'v' || e.key === 'V') && document.body.dataset.view === 'room') setWalk(!WALK.enabled);

  // Pressing a movement key IS the request to move. Call setWalk so
  // desktop also gets pointer-lock + mouse-look — without it, WASD
  // slid you around a fixed gaze and felt like a broken camera, not a
  // walk. Esc still releases the lock and ends the walk.
  if (document.body.dataset.view !== 'room' || WALK.enabled) return;
  if (document.getElementById('modal')?.classList.contains('in')) return;
  if (document.getElementById('drawer')?.classList.contains('in')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'q', 'e',
       'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    setWalk(true);
  }
});

// ════════════════════════════════════════════════════════
// NAV PAD — walking without a keyboard
//
// The Pavilion is 54m long. On a phone that is unreachable unless there
// is something to hold, so walking is no longer a mode you switch into:
// the pad is simply there whenever you are in the room. Hold the big
// button to move, tap the arrows to turn on the spot, pinch to zoom.
// Dragging anywhere still looks around exactly as it always did.
//
// Walk mode turns itself on the first time you touch any of these, and
// the WALK chip / V key stay as the pointer-lock path for desktop.
// ════════════════════════════════════════════════════════
{
  const hold = (el, onDown, onUp) => {
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      el.classList.add('held');
      if (!WALK.enabled) { WALK.enabled = true; WALK.teleport(camera.position.x, camera.position.z); }
      onDown();
    };
    const up = () => { el.classList.remove('held'); onUp(); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  };

  // Forward / back drive the same stick the thumbstick uses, so there is
  // one movement path and it already has acceleration and collision.
  hold(document.getElementById('nav-fwd'),
       () => { WALK.stick = { dx: 0, dy: -1 }; },
       () => { WALK.stick = null; });
  hold(document.getElementById('nav-back'),
       () => { WALK.stick = { dx: 0, dy: 0.7 }; },
       () => { WALK.stick = null; });

  // Turning is a held rotation, not a jump — a 90° snap loses you.
  // Turning is shared by the on-screen arrows and the keyboard arrows,
  // and it is time-based rather than per-frame: at 0.028 rad/frame a
  // 120Hz laptop turned twice as fast as a 60Hz one, which is exactly
  // the kind of thing that feels "not synchronised" without being
  // nameable. 1.9 rad/s is a brisk but controllable turn — a full
  // circle in about 3.3 seconds.
  let padTurn = 0;
  const TURN_RATE = 2.2;   // rad/s — a full circle in ~2.8s
  const PITCH_RATE = 1.4;
  hold(document.getElementById('nav-left'),  () => { padTurn = 1; },  () => { padTurn = 0; });
  hold(document.getElementById('nav-right'), () => { padTurn = -1; }, () => { padTurn = 0; });

  let lastSpin = performance.now();
  (function spin(now) {
    now = now || performance.now();
    const dt = Math.min((now - lastSpin) / 1000, 0.05);
    lastSpin = now;
    const t = Math.max(-1, Math.min(1, padTurn + WALK.turnInput()));
    LOOK.setTurnRate(t * TURN_RATE);
    const p = WALK.pitchInput();
    if (p) LOOK.addDelta(0, p * PITCH_RATE * dt);
    requestAnimationFrame(spin);
  })();

  // Pinch to zoom the field of view. Narrowing the FOV is how you look
  // closely at something across the room without walking to it.
  // ── Pinch zoom ────────────────────────────────────────────
  // The previous version collapsed and could not be reversed. touchstart
  // fires again whenever the touch list changes, so a finger wobbling
  // mid-pinch re-captured the baseline at the ALREADY-zoomed FOV. Every
  // re-capture ratcheted further in and nothing could undo it: a
  // collapsing universe, exactly as described.
  //
  // Fixes: capture the baseline once, on the transition into a two-finger
  // gesture and never again while it lasts; keep the range narrow enough
  // that no gesture can strand you; and always leave a way out.
  const FOV_MIN = 38, FOV_MAX = 75, FOV_HOME = 58;
  let pinching = false, pinch0 = 0, fov0 = FOV_HOME;

  const setFov = (v) => {
    camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, v));
    camera.updateProjectionMatrix();
  };
  window.__resetFov = () => setFov(FOV_HOME);

  const pinchDist = (e) => Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY);

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2 && !pinching) {   // the transition, once
      pinching = true;
      pinch0 = pinchDist(e);
      fov0 = camera.fov;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!pinching || e.touches.length !== 2) return;
    const d = pinchDist(e);
    if (d < 20 || pinch0 < 20) return;           // ignore degenerate pinches
    setFov(fov0 * (pinch0 / d));
  }, { passive: true });

  const endPinch = (e) => { if (!e.touches || e.touches.length < 2) pinching = false; };
  window.addEventListener('touchend', endPinch, { passive: true });
  window.addEventListener('touchcancel', endPinch, { passive: true });

  // Always a way back. Double-tap anywhere in the room returns the lens
  // to normal — the escape hatch the old version simply did not have.
  let lastTap = 0;
  window.addEventListener('touchend', (e) => {
    if (e.touches.length) return;
    const now = Date.now();
    if (now - lastTap < 300) window.__resetFov();
    lastTap = now;
  }, { passive: true });

  // Desktop: the wheel does the same thing.
  window.addEventListener('wheel', (e) => {
    if (document.body.dataset.view !== 'room') return;
    if (document.getElementById('modal')?.classList.contains('in')) return;
    setFov(camera.fov + Math.sign(e.deltaY) * 2);
  }, { passive: true });
}

// ════════════════════════════════════════════════════════
// THE ROOM KNOWS WHAT TIME IT IS
//
// The Pavilion roofs half its podium and leaves the rest open, which is
// why weather belongs in it. Light follows the sun's actual altitude at
// the visitor's latitude — not the clock, because 18:30 is dusk in
// Bangkok and midnight in Tromsø. Rain falls only where there is no
// roof; stand under the slab and you stay dry.
//
// Everything here degrades to "night in Bangkok, dry" without a
// network or a location, which is a perfectly good room.
// ════════════════════════════════════════════════════════
if (WEBGL_OK && PAVILION) {
  const SITE = { lat: 13.7563, lon: 100.5018, name: 'BANGKOK' };
  let weather = null;
  let RAIN = makeRain(THREE, PLAN);
  scene.add(RAIN.points);

  const mixHex = (a, b, t) => {
    const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
    return (m(16) << 16) | (m(8) << 8) | m(0);
  };

  const applyPalette = (p) => {
    const M = PAVILION.materials;
    M.travertine.color.setHex(p.travertine);
    M.green.color.setHex(p.green);
    M.chrome.color.setHex(p.chrome);
    M.water.color.setHex(p.water);
    M.podium.color.setHex(p.podium);
    M.roof.color.setHex(p.roof);
    // The others answer the same light in their own materials —
    // steel and brick, render and pale columns, white tray and wood.
    if (GLASS) paintGlass(GLASS.materials, p);
    if (SAVOYE) paintSavoye(SAVOYE.materials, p);
    if (FARNSWORTH) paintFarn(FARNSWORTH.materials, p);
    if (scene.background) scene.background.setHex(p.bg);
    else scene.background = new THREE.Color(p.bg);
    // Fog has to follow the sky or the far buildings sit in last
    // night's haze at noon.
    if (scene.fog) scene.fog.color.setHex(p.bg);
    // The plain is the ground under every building: a shade off the sky,
    // so there is a horizon rather than a void.
    if (window.__plainMat) window.__plainMat.color.setHex(mixHex(p.bg, p.podium, 0.35));
    if (window.__plainGridMat) window.__plainGridMat.color.setHex(p.line);
    // The HUD is white-on-dark by default. In the day and twilight
    // palettes the ground goes pale and every label vanishes into it —
    // §11.10, unreadable is shipped broken. Flip the overlay to dark ink
    // whenever the room itself is bright. Rec-601 luma, because that is
    // what the eye does, not the average of three channels.
    const R = (p.bg >> 16) & 255, Gc = (p.bg >> 8) & 255, B = p.bg & 255;
    const luma = (0.299 * R + 0.587 * Gc + 0.114 * B) / 255;
    document.body.dataset.roomLight = luma > 0.42 ? '1' : '0';

    // The onyx never changes. It is lit stone, and it is the one amber.
    const el = document.getElementById('hud-phase');
    if (el) {
      el.textContent = p.label + (weather?.raining ? ' · RAIN' : '');
    }
  };

  const refresh = () => {
    const now = new Date();
    const alt = sunAltitude(now, SITE.lat, SITE.lon);
    // Rising or setting: compare with ten minutes ago. Cheaper and more
    // honest than hard-coding sunrise tables per latitude.
    const before = sunAltitude(new Date(now.getTime() - 600000), SITE.lat, SITE.lon);
    applyPalette(paletteFor(alt, alt > before));
  };

  refresh();
  setInterval(refresh, 60_000);

  // Where the visitor actually is, if they will say. The sky and ground
  // already ask; this reuses whatever they were given.
  navigator.geolocation?.getCurrentPosition(
    (p) => {
      SITE.lat = p.coords.latitude;
      SITE.lon = p.coords.longitude;
      refresh();
      fetchWeather(SITE.lat, SITE.lon).then(w => { weather = w; refresh(); });
    },
    () => { fetchWeather(SITE.lat, SITE.lon).then(w => { weather = w; refresh(); }); },
    { timeout: 8000, maximumAge: 600000 }
  );
  setInterval(() => {
    fetchWeather(SITE.lat, SITE.lon).then(w => { weather = w; refresh(); });
  }, 15 * 60_000);

  let _rainT = performance.now();
  window.__tickWeather = () => {
    const now = performance.now();
    const dt = Math.min((now - _rainT) / 1000, 0.05);
    _rainT = now;
    RAIN.tick(dt, !!weather?.raining, camera.position);
  };
}

// ════════════════════════════════════════════════════════
// THE POEM — one a day, on the onyx
//
// The aphorism wall used to rotate one-liners from the blog. It now
// carries a poem, because a stranger who has never heard of him should
// meet the writing before the CV. Same wall, same amber stone, longer
// breath. Deterministic by date, so it is the same poem all day.
// ════════════════════════════════════════════════════════
window.__poemToday = () => poemForDate(new Date());
