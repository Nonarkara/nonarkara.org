/**
 * NON Second Brain — Google Apps Script
 *
 * Deploy as: Extensions → Apps Script → Deploy → Web App
 *   Execute as: Me
 *   Access: Anyone
 *
 * Handles three payload types in one endpoint:
 *   CAPTURES  — notes/thoughts from the plan-view NOTE pad
 *   SESSIONS  — Pomodoro / FRAME focus sessions
 *   VISITORS  — site visitors from all nonarkara.org dashboards
 *
 * Once deployed, paste the /exec URL back to Claude.
 * He sets it as BRAIN_SHEET_URL in the Cloudflare Worker
 * and updates APPS_SCRIPT_URL in all visitor trackers.
 */

const SHEET_ID = '1DM66spLCh_PKJ0hncFBWVft_H-3UiePONynjTltSvQg';  // nonarkara memory palace sheet

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    // Detect payload type
    // Visitor payloads have a 'dashboard' or 'hostname' field.
    // Capture/session payloads have an 'action' field.
    if (payload.dashboard || payload.hostname) {
      return appendVisitor(payload);
    }

    const action = payload.action || 'capture';
    if (action === 'capture') return appendCapture(payload);
    if (action === 'session') return appendSession(payload);
    return jsonResponse({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ── VISITORS ─────────────────────────────────────────────────────────────────
function appendVisitor(p) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('VISITORS');
  if (!sheet) {
    sheet = ss.insertSheet('VISITORS');
    sheet.appendRow([
      'TIMESTAMP (BKK)', 'DATE', 'TIME',
      'DASHBOARD', 'HOSTNAME', 'PAGE',
      'COUNTRY', 'REGION', 'CITY', 'IP',
      'REFERRER', 'LANGUAGE', 'SCREEN', 'TIMEZONE',
      'USER AGENT',
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 15).setFontWeight('bold');
    // Freeze IP + UA columns (dim them visually via narrow width)
    sheet.setColumnWidth(10, 120);  // IP
    sheet.setColumnWidth(15, 180); // UA
  }

  const bkk = Utilities.formatDate(
    new Date(),
    'Asia/Bangkok',
    'yyyy-MM-dd HH:mm:ss'
  );

  sheet.appendRow([
    bkk,
    bkk.split(' ')[0],
    bkk.split(' ')[1],
    p.dashboard  || '',
    p.hostname   || '',
    p.page       || '',
    p.country    || '',
    p.region     || '',
    p.city       || '',
    p.ip         || '',
    p.referrer   || 'Direct',
    p.language   || '',
    p.screen     || '',
    p.timezone   || '',
    (p.userAgent || '').slice(0, 200),
  ]);

  return jsonResponse({ ok: true });
}

// ── CAPTURES ──────────────────────────────────────────────────────────────────
function appendCapture(p) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('CAPTURES');
  if (!sheet) {
    sheet = ss.insertSheet('CAPTURES');
    sheet.appendRow([
      'ID', 'TIMESTAMP (BKK)', 'DATE', 'TIME', 'TEXT',
      'SOURCE', 'TAGS', 'SESSION_ID', 'WORDS',
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  const bkk = Utilities.formatDate(
    new Date(p.ts || Date.now()),
    'Asia/Bangkok',
    'yyyy-MM-dd HH:mm:ss'
  );
  const words = (p.text || '').trim().split(/\s+/).length;

  sheet.appendRow([
    p.id          || '',
    bkk,
    bkk.split(' ')[0],
    bkk.split(' ')[1],
    p.text        || '',
    p.source      || 'note',
    (p.tags || []).join(', '),
    p.session_id  || '',
    words,
  ]);

  return jsonResponse({ ok: true, row: sheet.getLastRow() });
}

// ── SESSIONS ──────────────────────────────────────────────────────────────────
function appendSession(p) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('SESSIONS');
  if (!sheet) {
    sheet = ss.insertSheet('SESSIONS');
    sheet.appendRow([
      'ID', 'STARTED (BKK)', 'ENDED (BKK)', 'DURATION_MIN',
      'TYPE', 'COMPLETED', 'REFLECTION', 'TAGS',
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  const fmt = ts => ts
    ? Utilities.formatDate(new Date(ts), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
    : '';

  sheet.appendRow([
    p.id           || '',
    fmt(p.started_at),
    fmt(p.ended_at),
    p.duration_min || 25,
    p.type         || 'pomodoro',
    p.completed    ? 'YES' : 'NO',
    p.reflection   || '',
    (p.tags || []).join(', '),
  ]);

  return jsonResponse({ ok: true });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
