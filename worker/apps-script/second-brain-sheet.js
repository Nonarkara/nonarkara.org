/**
 * NON Second Brain — Google Apps Script
 *
 * Deploy as: Extensions → Apps Script → Deploy → Web App
 *   Execute as: Me
 *   Access: Anyone
 *
 * Once deployed, paste the /exec URL into the Worker as BRAIN_SHEET_URL.
 *
 * The Sheet has two auto-created tabs:
 *   CAPTURES  — every raw thought/note
 *   SESSIONS  — every focus session
 */

const SHEET_ID = '1DYYL4B3SN4gWYetj4q0JRkmXpv-dNbXpGZ9Fa560rro';

// Called by every POST from the Worker
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'capture';

    if (action === 'capture') {
      return appendCapture(payload);
    }
    if (action === 'session') {
      return appendSession(payload);
    }
    return jsonResponse({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function appendCapture(p) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('CAPTURES');
  if (!sheet) {
    sheet = ss.insertSheet('CAPTURES');
    sheet.appendRow([
      'ID', 'TIMESTAMP (BKK)', 'DATE', 'TIME', 'TEXT',
      'SOURCE', 'TAGS', 'SESSION_ID', 'WORDS',
    ]);
    // Freeze header, bold it
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  const bkk = Utilities.formatDate(
    new Date(p.ts || Date.now()),
    'Asia/Bangkok',
    'yyyy-MM-dd HH:mm:ss'
  );
  const date = bkk.split(' ')[0];
  const time = bkk.split(' ')[1];
  const words = (p.text || '').trim().split(/\s+/).length;

  sheet.appendRow([
    p.id || '',
    bkk,
    date,
    time,
    p.text || '',
    p.source || 'note',
    (p.tags || []).join(', '),
    p.session_id || '',
    words,
  ]);

  return jsonResponse({ ok: true, row: sheet.getLastRow() });
}

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

  const fmt = (ts) => ts
    ? Utilities.formatDate(new Date(ts), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
    : '';

  sheet.appendRow([
    p.id || '',
    fmt(p.started_at),
    fmt(p.ended_at),
    p.duration_min || 25,
    p.type || 'pomodoro',
    p.completed ? 'YES' : 'NO',
    p.reflection || '',
    (p.tags || []).join(', '),
  ]);

  return jsonResponse({ ok: true });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
