'use strict';
// Podcast archive player. No inline script (site CSP is script-src 'self').
const L = {
  en: { kicker: 'Podcast archive', h1: 'Before the restart', lede: 'Episodes Dr Non published before his podcasts started again from Episode 1 in October 2026. Play any of them here.',
    search: 'Search titles and descriptions', of: 'of', desc: 'Description', now: 'Now playing', play: 'Play', pause: 'Pause',
    intro: n => `${n} archived episodes, newest first. Press play on any one, or open its description.`,
    none: 'No episodes match that search.', fail: 'The episode list could not be loaded. Please reload the page, or use the RSS feeds below.',
    loading: 'Loading episodes…', audioerr: 'Audio unavailable for this episode.', feeds: 'New episodes (RSS):', voice: "Most episodes are narrated in an AI clone of Dr Non's voice, used with his consent.", min: 'min', shows: 'Shows', player: 'Episode player',
    blurb: { nonism: 'Philosophy for people who work: one idea, followed until it touches a desk, a city or a decision.', brief: "The day's biggest world stories in about twenty minutes, stake first, numbers attached.", oneapp: 'One system Dr Non built, explained in about five minutes: what it does, how it was made, what broke.' } },
  th: { kicker: 'คลังพอดแคสต์', h1: 'ก่อนเริ่มใหม่', lede: 'ตอนที่ ดร.นนท์ เผยแพร่ก่อนพอดแคสต์ทั้งสามรายการเริ่มนับตอนที่ 1 ใหม่ในเดือนตุลาคม 2569 กดฟังได้ที่นี่',
    search: 'ค้นหาชื่อตอนและคำอธิบาย', of: 'จาก', desc: 'คำอธิบาย', now: 'กำลังเล่น', play: 'เล่น', pause: 'หยุด',
    intro: n => `${n} ตอนในคลัง เรียงจากใหม่ไปเก่า กดเล่นหรือเปิดคำอธิบายได้ทุกตอน`,
    none: 'ไม่พบตอนที่ตรงกับคำค้น', fail: 'โหลดรายการตอนไม่สำเร็จ กรุณาโหลดหน้าใหม่ หรือใช้ฟีด RSS ด้านล่าง',
    loading: 'กำลังโหลดรายการตอน…', audioerr: 'ไม่มีไฟล์เสียงของตอนนี้', feeds: 'ตอนใหม่ (RSS):', voice: 'ตอนส่วนใหญ่บรรยายด้วยเสียง AI โคลนจากเสียงของ ดร.นนท์ โดยได้รับความยินยอม', min: 'นาที', shows: 'รายการ', player: 'เครื่องเล่นตอน',
    blurb: { nonism: 'ปรัชญาสำหรับคนทำงาน: หนึ่งความคิด ตามไปจนถึงโต๊ะทำงาน เมือง หรือการตัดสินใจ', brief: 'ข่าวโลกที่สำคัญที่สุดของวันในราว 20 นาที', oneapp: 'หนึ่งระบบที่ ดร.นนท์ สร้างเอง อธิบายในราว 5 นาที' } },
  zh: { kicker: '播客存档', h1: '重启之前', lede: 'Non 博士的三档播客于 2026 年 10 月从第 1 集重新开始，这里收录此前发布的存档节目，可直接播放。',
    search: '搜索标题和简介', of: '/', desc: '简介', now: '正在播放', play: '播放', pause: '暂停',
    intro: n => `存档共 ${n} 集，按时间倒序。点击播放或展开简介。`,
    none: '没有符合搜索的节目。', fail: '节目列表加载失败。请刷新页面，或使用下方的 RSS 订阅。',
    loading: '正在加载节目…', audioerr: '本集音频暂不可用。', feeds: '新节目（RSS）：', voice: '大部分节目使用经本人同意的 Non 博士 AI 克隆声音朗读。', min: '分钟', shows: '节目', player: '节目播放器',
    blurb: { nonism: '写给上班族的哲学：一个观点，一直追到你的办公桌、城市或下一个决定。', brief: '约二十分钟听完当天最重要的国际新闻。', oneapp: 'Non 博士亲手搭建的一个系统，约五分钟讲清楚。' } },
};
let lang = 'en';
try { lang = localStorage.getItem('nonarkara.lang') || 'en'; } catch (e) { /* storage blocked */ }
if (!L[lang]) lang = 'en';
const T = L[lang];
document.documentElement.lang = lang;

const $ = s => document.querySelector(s);
const ICON_PLAY = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0l9 5-9 5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0h3v10H1zM6 0h3v10H6z"/></svg>';
const au = $('#au'), list = $('#list');
let data = null, show = null, cur = null;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dateFmt = d => d ? new Date(d + 'T12:00:00Z').toLocaleDateString(lang === 'th' ? 'th-TH' : lang === 'zh' ? 'zh-CN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const mins = s => s ? `${Math.round(s / 60)} ${T.min}` : '';

// static chrome
document.querySelectorAll('[data-i]').forEach(el => { const v = T[el.dataset.i]; if (typeof v === 'string') el.textContent = v; });
$('#q').placeholder = T.search; $('#q').setAttribute('aria-label', T.search);
$('#tabs').setAttribute('aria-label', T.shows); au.setAttribute('aria-label', T.player);

function tabs() {
  $('#tabs').innerHTML = data.shows.map(s => {
    const on = s.key === show.key;
    return `<button class="tab" role="tab" id="tab-${s.key}" aria-controls="panel" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-k="${s.key}">${esc(s.name.replace(/^The /, ''))} <span>${s.count}</span></button>`;
  }).join('');
  $('#panel').setAttribute('aria-labelledby', 'tab-' + show.key);
}

function row(e) {
  const on = cur && cur.id === e.id, playing = on && !au.paused;
  return `<li class="ep${on ? ' on' : ''}" data-id="${esc(e.id)}">
    <button class="play" aria-label="${esc((playing ? T.pause : T.play) + ': ' + e.t)}">${playing ? ICON_PAUSE : ICON_PLAY}</button>
    <p class="t">${esc(e.t)}</p>
    <span class="meta">${dateFmt(e.date)}<br>${mins(e.s)}</span>
    <p class="d" id="d-${esc(e.id)}" hidden>${esc(e.d)}</p>
    <button class="more" aria-expanded="false" aria-controls="d-${esc(e.id)}" aria-label="${esc(T.desc + ': ' + e.t)}">${esc(T.desc)}</button>
  </li>`;
}

function render() {
  const q = $('#q').value.trim().toLowerCase();
  const eps = show.episodes.filter(e => !q || (e.t + ' ' + e.d).toLowerCase().includes(q));
  $('#count').textContent = `${eps.length} ${T.of} ${show.count}`;
  list.innerHTML = eps.length ? eps.map(row).join('') : `<li class="msg">${esc(T.none)}</li>`;
}

// update only the affected rows, so keyboard focus stays where it is
function refreshRow(id) {
  const li = list.querySelector(`li.ep[data-id="${CSS.escape(id)}"]`);
  if (!li) return;
  const e = show.episodes.find(x => x.id === id) || data.shows.flatMap(s => s.episodes).find(x => x.id === id);
  const on = cur && cur.id === id, playing = on && !au.paused;
  li.classList.toggle('on', !!on);
  const b = li.querySelector('.play');
  b.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  b.setAttribute('aria-label', (playing ? T.pause : T.play) + ': ' + e.t);
}

function nowPanel(e, s) {
  $('#now').innerHTML = e
    ? `<p class="kicker">${esc(T.now)}</p><h2>${esc(e.t)}</h2><p>${esc(e.d || s.name)}</p>`
    : `<p class="kicker">${esc(show.name)}</p><h2>${esc(T.blurb[show.key] || '')}</h2><p>${esc(T.intro(show.count))}</p>`;
}

function setShow(k, focus) {
  show = data.shows.find(s => s.key === k) || data.shows[0];
  tabs(); render(); if (!cur) nowPanel();
  history.replaceState(null, '', '#' + show.key);
  if (focus) $('#tab-' + show.key).focus();
}

function play(id) {
  if (cur && cur.id === id) { au.paused ? au.play().catch(() => {}) : au.pause(); return; }
  const prev = cur && cur.id;
  const s = data.shows.find(x => x.episodes.some(e => e.id === id)), e = s.episodes.find(x => x.id === id);
  cur = e; au.src = e.a;
  $('#bar').hidden = false; $('#bt').textContent = e.t;
  const bs = $('#bs'); bs.className = ''; bs.textContent = `${s.name} · ${dateFmt(e.date)}`;
  nowPanel(e, s);
  if (prev) refreshRow(prev);
  refreshRow(id);
  au.play().catch(() => {});
}

$('#tabs').addEventListener('click', ev => { const b = ev.target.closest('.tab'); if (b) setShow(b.dataset.k, true); });
$('#tabs').addEventListener('keydown', ev => {
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const i = data.shows.findIndex(s => s.key === show.key);
  let n = null;
  if (ev.key in keys) n = (i + keys[ev.key] + data.shows.length) % data.shows.length;
  else if (ev.key === 'Home') n = 0; else if (ev.key === 'End') n = data.shows.length - 1;
  if (n !== null) { ev.preventDefault(); setShow(data.shows[n].key, true); }
});
list.addEventListener('click', ev => {
  const li = ev.target.closest('li.ep'); if (!li) return;
  if (ev.target.closest('.play')) play(li.dataset.id);
  else if (ev.target.closest('.more')) {
    const b = li.querySelector('.more'), d = li.querySelector('.d'), open = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!open)); d.hidden = open;
  }
});
$('#q').addEventListener('input', render);
au.addEventListener('play', () => cur && refreshRow(cur.id));
au.addEventListener('pause', () => cur && refreshRow(cur.id));
au.addEventListener('error', () => {
  if (!cur || !au.getAttribute('src')) return;
  const bs = $('#bs'); bs.className = 'err'; bs.textContent = T.audioerr;
  refreshRow(cur.id);
});

fetch('archive.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(j => { if (!j || !Array.isArray(j.shows) || !j.shows.length) throw new Error('empty'); data = j; setShow(location.hash.slice(1) || 'nonism'); })
  .catch(() => { list.innerHTML = `<li class="msg">${esc(T.fail)}</li>`; $('#count').textContent = ''; });
