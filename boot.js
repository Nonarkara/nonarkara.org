// ════════════════════════════════════════════════════════════════
// BOOT — the two decisions that must land before the first paint
// ════════════════════════════════════════════════════════════════
//
// 1. THE THEME. The page is born in one colour and never changes it.
//
// 2. THE VIEW. If the URL names a desk, the desk is the first thing on
//    the screen — not the sign that asks which desk you wanted.
//
// This module imports NOTHING, and that is the whole point. The desk's
// words and data arrive with a network round trip and a parse; the room
// is a megabyte of JavaScript that has nothing to do with a document.
// The theme and the view must not wait for either of them.
//
// A theme decided late is a theme that is seen late: the page paints in
// one set of colours and then changes to another, and for a moment a cell
// and the surface behind it are in different colours.
//
// And a desk that opens late is a desk that is not there. A reader who
// asked for /?view=plan used to be shown the sign for half a second while
// the room's module graph was fetched and parsed — and any instrument
// that measures the page in its first seconds measured the sign instead
// of the desk, which is how a receipt can certify a page nobody asked
// for.
//
// The door is skipped here too: a question is only asked when there is
// something to choose between.
//
// The door module in app.js reaches the same conclusion later, from the
// same URL, and sets the view again. This is the same decision, taken
// early.

export const SAVED_THEME = (() => {
  try { return localStorage.getItem('nonarkara.theme'); } catch (_) { return null; }
})();
export const LOCAL_HOUR = new Date().getHours();
export const THEME = SAVED_THEME || (LOCAL_HOUR >= 18 || LOCAL_HOUR < 6 ? 'dark' : 'light');

// The theme is put on the body HERE, before anything is painted.
try { document.body.dataset.theme = THEME; } catch (_) {}

// The view, if the URL names one.
export const VIEW = (() => {
  try {
    const v = new URLSearchParams(location.search).get('view');
    return (v === 'plan' || v === 'ioc' || v === 'room') ? v : null;
  } catch (_) { return null; }
})();

if (VIEW) {
  try {
    document.body.dataset.view = VIEW;
    const door = document.getElementById('door');
    if (door) door.classList.add('skip');
  } catch (_) {}
}

// ════════════════════════════════════════════════════════════════
// 3. THE QUESTION.
//
// When no desk is named and the reader has not answered yet, the sign is
// up. That is decided HERE — the first module, before the room's megabyte
// of 3D code has been fetched, parsed and evaluated.
//
// It used to be decided at the far end of app.js, which meant that for the
// second and a half that three.js takes to arrive, the landing was the
// room's furniture — brand, caption, hints, links — with the sign sitting
// on top of it. The room's furniture is hidden while the question is up,
// and it was not yet known that the question was up.
//
// A reader saw the furniture for a beat before it disappeared. An
// instrument that landed in that window measured a page no reader ever
// saw: one width of a sweep showed the desk, the next showed the sign,
// and the receipt said the site was both.
//
// The door module in app.js reaches the same conclusion later, from the
// same URL and the same storage, and sets the view again. This is the
// same decision, taken early.
export const MODE = (() => {
  try {
    const p = new URLSearchParams(location.search);
    let m = localStorage.getItem('nonarkara.mode');
    if (p.has('door')) m = null;
    if (p.has('host')) m = 'host';
    if (p.has('guest')) m = 'guest';
    return (m === 'host' || m === 'guest') ? m : null;
  } catch (_) { return null; }
})();

export const ASK = !VIEW && !MODE;

if (ASK) {
  try {
    document.body.dataset.door = 'open';
    if (!document.body.dataset.view) document.body.dataset.view = 'room';
  } catch (_) {}
}
