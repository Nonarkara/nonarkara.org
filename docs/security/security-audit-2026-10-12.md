# Security audit · nonarkara.org · 2026-10-12

Read-only six-phase audit of `main` at `af5187a05df3d4607a832d71141a85f10bc72504`, using [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) at `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`. Scope is the Pages site and the Cloudflare Worker, including Apps Script in this repository. Profile: standard. No budget cap. No prior ledger. Hunters did not execute target code, and nothing was sent to production endpoints.

Line numbers below are from that commit. This pull request adds a defensive text prefix after those lines, so the live file in the branch is a few lines longer. The prefix does not turn the open lead into a confirmed vulnerability.

This is one pass. It is not a claim that every future defect is absent.

## Ranked result

**Confirmed findings: none.** No record had both a complete source trace and a bounded local result across a real trust boundary. Nothing is rated critical, high, medium, or low.

**Needs validation: one lead, no severity.** Ranked first because it is the only path that could become high if a throwaway sheet calculates a caller-controlled cell. It is not confirmed.

| Rank | Status | Title | Why it is first |
|---|---|---|---|
| 1 | needs validation | `doPost` writes caller strings with `appendRow` and no formula-prefix guard | A lower-trust writer reaches the owner's spreadsheet. Exploitability depends on Sheets and the live web-app ACL, neither of which is in this repository. |

A separate podcast-key claim was rejected during validation and is a coverage note in Hardening, not a finding.

## 1. Needs validation — formula prefix on `appendRow`

Fingerprint: `apps-script.appendRow.unneutralized-formula-prefix`

Lower-trust principal: any client that can POST to the Apps Script exec URL published in `_shared/lib/visitor-tracking.js`, or the Worker capture fan-out when `BRAIN_SHEET_URL` is configured.

Affected resource: the operator spreadsheet opened by `SHEET_ID` in `worker/apps-script/second-brain-sheet.js`.

### Trace (audited commit)

1. **Entrypoint** `worker/apps-script/second-brain-sheet.js:20` `doPost`. Line 22 parses `e.postData.contents`. Lines 27–33 dispatch on caller-controlled `dashboard`, `hostname`, or `action`, defaulting to capture. No token check.
2. **Propagation** `:70` `appendVisitor` copies dashboard, hostname, page, geo fields, referrer, and user agent. Only the user agent is sliced.
3. **Propagation** `:113` `appendCapture` copies `p.text`, source, session id, and joined tags.
4. **Propagation** `:148` `appendSession` copies reflection, tags, and type.
5. **Sink** `:108` `sheet.appendRow` writes those strings. The same call shape is at `:66` and `:141`.

### Evidence

- `_shared/lib/visitor-tracking.js:31` hardcodes the exec URL. Line 9 documents importing that file from the public site.
- `.deployignore:17` drops `worker/` and does not drop `_shared/`, so the URL is in the Pages stage. `docs/` is ignored; this report is not served.
- `worker/apps-script/second-brain-sheet.js:4` says to deploy as "Access: Anyone". That comment is not the live ACL.
- `appendCapture` (`:108`) copies `p.text` into `appendRow`. `appendVisitor` (`:66`) and `appendSession` (`:141`) do the same for their caller fields.
- `worker/src/index.js:309` leaves a leading `=` in sanitized capture text. `:586` POSTs the record to `BRAIN_SHEET_URL` when that secret exists. `worker/wrangler.toml` does not commit the URL.

### Blockers

- This repository does not show whether `SpreadsheetApp.appendRow` stores a leading `=` as a formula or as plain text.
- The live web-app ACL is not in the repository.
- `BRAIN_SHEET_URL` is not committed, so the Worker forward may be off in production.

If a throwaway sheet calculates that cell, the concrete result is formula execution in the owner's spreadsheet, which can read other cells in that file. That would rank as **high**. If the cell stays literal text, the lead is refuted. This audit observed neither result.

### Owner-observed check

Do not POST the committed exec URL or the production spreadsheet.

Create a throwaway spreadsheet, point a private copy of `second-brain-sheet.js` at that spreadsheet only, and deploy that copy as a web app executing as the owner. Using only the throwaway URL, POST one capture body whose text is an equals sign followed by a quoted constant, and one visitor body whose `dashboard` field has that same shape. Record whether the throwaway cells stay literal or calculate, and whether an owner-only deployment rejects the anonymous POST. Delete the throwaway app and spreadsheet afterward.

### Defensive change in this pull request

`sheetCell` now prefixes caller strings that start with `=`, `+`, `-`, `@`, tab, or carriage return with a single quote, and leaves numbers and booleans unchanged. It is applied at the three data `appendRow` calls (visitor, capture, and session), which covers both the public exec URL and the Worker fan-out. Script-generated timestamps stay as they are. Capture text in KV is unchanged, so a note can still begin with `=`. No capture token was added to the public visitor module.

This is safe whether or not Sheets evaluates a leading `=`. The lead stays **needs validation** until the throwaway check above is done. Apps Script is deployed by hand; this pull request does not deploy it.

## Hardening (not findings)

- `POST /capture` treats `Origin` as a browser boundary (`worker/src/index.js:281`). A non-browser client that sets `https://nonarkara.org` can write the note queue. The handler states that this is not authentication.
- `captureRateLimited` and `captures:queue` are read-modify-write. A burst can exceed 12 accepts or drop one in-flight note. Both writers share that same origin gate. Bodies stay inside 8192 bytes and the 500-row cap.
- `doPost` has no byte cap. Each call still appends one row. Sustained volume is not a demonstrated superlinear outage.
- `GET /quote/` and `GET /council` put `String(e)` in a 502 body (`worker/src/index.js:485`, `:666`). The upstream hosts are fixed and Worker secrets are not interpolated.
- Fleet and morning-brief HTML in `app.js` interpolates operator-controlled strings. `script-src-attr 'none'` blocks event-handler execution. Encode those strings before a future episode generator copies third-party URLs.
- `?host` only sets `localStorage`. It is not an access boundary.
- `ship.sh` calls unpinned `npx wrangler`. The GitHub workflow pins `wrangler-action` to a commit.
- `.gitignore` ignores `.env`, and `.deployignore` does not. No `.env` file is in the tree.
- The spreadsheet ID in the visitor-module comment is an identifier. Link-sharing of that sheet is not visible here.
- `GET /podcast/` will return any object key in `nonarkara-podcast` that does not contain `..` (`worker/src/index.js:690`). Claim `worker/podcast:arbitrary-r2-object-key` was rejected: the route is the documented public morning-brief store, and source names no private object.

## What is holding

- CSP on `_headers:23` hashes the three inline scripts, sets `script-src-attr 'none'`, `frame-ancestors 'none'`, and `object-src 'none'`. `test-security.mjs` checks those hashes for `index.html` and `mixtape.html`.
- Capture origin checks are exact-match (`worker/src/index.js:284`). `sanitizeCapture` rebuilds the record. Privileged routes fail closed when `BRAIND_KEY` or `ALERT_TEST_SECRET` is unset (`:730`, `:793`).
- Pages deploy runs on push to `main` and `workflow_dispatch` only, with SHA-pinned actions and `contents: read`. The gitleaks workflow is `pull_request`, not `pull_request_target`.
- `.deployignore` keeps `worker/`, `health/`, shell scripts, and `public/` off the site. No tracked voice sample was found.
- Main-site `app.js` does not call `ipapi.co` or the Apps Script URL. `trackVisit` runs only for a page that imports it.

## Coverage

| Status | Count |
|---|---|
| covered | 23 |
| candidate (needs validation, not a confirmed finding) | 1 |
| blocked | 0 |
| deferred | 0 |
| out of scope | 0 |

24 units across the Worker HTTP surface, cron, Apps Script, Pages client, service worker, visitor module, CI, and release staging. The post-wave critic and a separate final-clean critic both accepted the ledger.
