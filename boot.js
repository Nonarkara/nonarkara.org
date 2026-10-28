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
