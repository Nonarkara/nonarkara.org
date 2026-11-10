# Agenda sidecar

Optional listener for the NON OS desk. It is not part of the public site build, it is not deployed to Cloudflare Pages, and nothing starts it for you.

The public pavilion does not contain a calendar. After the existing device choice (NON OS, “this is my device”), the desk asks this listener for today’s blocks and the travel still ahead. If the listener is missing, refused, or down, the desk says so. It does not invent a day.

Real events, tokens, OAuth client secrets, and any TripIt ICS URL stay on the M3. Do not copy `~/.agenda/cache.json`, a filled environment, or a refresh token into this repository.

## FloodDash comes first

This machine (`Agentics-MacBook-Air-5.local`) is the FloodDash origin until a Mac Studio arrives. The sidecar is built to stay out of its way:

- It does not install a login item, a launch agent, or a cron job. Start it by hand when you want it. Stop it with `SIGINT` / `SIGTERM` (the process title is `non-agenda`) the moment FloodDash needs the machine.
- It binds to `127.0.0.1` unless you set `AGENDA_BIND`.
- The first sync waits 20 seconds. After that it runs every 30 minutes, one pass at a time, calendars one after another, at a lower CPU priority.
- If the 1-minute load is already at or above the number of CPUs, or this process is over 80 MB resident, that pass is skipped and the last good cache keeps being served.
- Each Google response is capped (50 events, a narrow window from the start of today through three weeks). An optional ICS body over 512 KB is refused. The cache file is refused over 256 KB.

## What it reads

Another assistant owns the feeds. This process does not create calendars and does not subscribe to anything. It reads, through the Google Calendar API, read-only:

1. The primary calendar.
2. The non-primary calendar whose name is exactly `Calendar` (the Outlook import). If more than one matches, it is skipped.
3. The subscribed calendar whose name or id contains `TripIt`. If more than one matches, it is skipped.

`TRIPIT_ICS_URL` is optional. Set it only on the M3, and only if Google does not already list the TripIt calendar. When Google does list it, the ICS URL is ignored so the same feed is not read twice. Leave it unset otherwise. Do not paste the URL into this repo.

## Run

From the repo root, with the variables below in the environment (not in a committed file):

```bash
node sidecar/agenda/auth.mjs   # once, when Google has not yet issued a refresh token
node sidecar/agenda/server.mjs
```

`auth.mjs` listens on `127.0.0.1:8742` for a single OAuth redirect, prints `GOOGLE_REFRESH_TOKEN` to stdout, and exits. The OAuth client has to allow `http://127.0.0.1:8742/` as a redirect. The script does not write the token to disk.

The listener then serves:

- `GET /agenda` — today’s blocks and upcoming travel. Bearer token required.
- `GET /health` — counts and timings only. Same token. No titles.

Both answers are `no-store`. A missing or wrong token is `{"ok":false}` with no schedule in the body.

## Environment

Names only. Values live on the M3.

| Name | Required | Purpose |
|---|---|---|
| `AGENDA_TOKEN` | yes | Bearer token the desk sends. Generate it on the machine (`openssl rand -hex 32`). The process will not listen without it. |
| `GOOGLE_CLIENT_ID` | yes, to sync | OAuth client id. |
| `GOOGLE_CLIENT_SECRET` | yes, to sync | OAuth client secret. |
| `GOOGLE_REFRESH_TOKEN` | yes, to sync | From `auth.mjs`. Scope is `calendar.readonly`. |
| `TRIPIT_ICS_URL` | no | Optional ICS fallback. Ignored when Google already lists the TripIt calendar. Never commit the value. |
| `AGENDA_MACHINE_ID` | no | If set, the process reads this Mac’s `IOPlatformUUID` and exits when it differs. The value stays in the environment. |
| `AGENDA_EXPECT_HOST` | no | Default `Agentics-MacBook-Air-5.local`. Any other hostname refuses to start unless `AGENDA_ALLOW_OTHER_HOST=1`. |
| `AGENDA_ALLOW_OTHER_HOST` | no | Set to `1` only when you mean to run somewhere else. |
| `AGENDA_BIND` | no | Default `127.0.0.1`. |
| `AGENDA_PORT` | no | Default `8741`. Do not use FloodDash’s port. |
| `AGENDA_SYNC_MINUTES` | no | Default 30. Clamped to 15–180. |
| `AGENDA_SYNC_DELAY_SECONDS` | no | Default 20. Pause before the first sync. |
| `AGENDA_ORIGINS` | no | Extra CORS origins, comma-separated. The pavilion origins and local preview ports are already allowed. |
| `AGENDA_TLS_CERT` | no | PEM path. Set together with the key, or set neither. |
| `AGENDA_TLS_KEY` | no | PEM path. |
| `AGENDA_CACHE` | no | Default `~/.agenda/cache.json`, mode `0600`. Private schedule data. Do not copy it into this repo. |

## HTTPS

The live pavilion is HTTPS, and its content-security policy upgrades insecure requests. A page on `https://nonarkara.org` cannot call `http://127.0.0.1:8741`.

Terminate TLS on the desk (both `AGENDA_TLS_CERT` and `AGENDA_TLS_KEY`) or put an HTTPS name in front of the loopback port. The committed policy allows:

- `https://agentics-macbook-air-5.local`
- `https://agentics-macbook-air-5.local:8741`

A tunnel or Tailscale name is a different origin. Add that exact origin to `connect-src` in `_headers` or the browser will refuse the fetch. Chrome may also ask before a public page may touch a private-network address; the listener answers the private-network preflight for an allowed origin.

## On the device

The desk does not know the origin until this device tells it. After choosing NON OS, the agenda line is “not on this device” until you keep an origin and a token there. They are stored only in `localStorage`:

- `nonarkara.agenda.base`
- `nonarkara.agenda.token`

`window.NON_AGENDA = { base, token }` is read only when those keys are empty. Do not commit either value, and do not put the token in a URL.

The same door as the rest of NON OS decides who can see the section. Guests, and anyone who has not chosen, do not get the section and do not trigger a fetch. Guessing a path on the public site still returns no events: there are none in the repository, and the listener will not answer without the token.

## Contract

`GET /agenda` with `Authorization: Bearer <AGENDA_TOKEN>`.

Failure, including “not synced yet”, is `{"ok":false}` and no arrays. Success:

```json
{
  "ok": true,
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "tz": "Asia/Bangkok",
  "today": [
    {
      "id": "fake-1",
      "title": "Example block",
      "start": "2026-01-01T09:00:00+07:00",
      "end": "2026-01-01T10:00:00+07:00",
      "where": "",
      "allDay": false,
      "kind": "event",
      "hold": null,
      "role": "primary"
    }
  ],
  "travel": [
    {
      "id": "fake-2",
      "title": "Example departure",
      "start": "2026-01-02T06:00:00+07:00",
      "end": "2026-01-02T09:00:00+07:00",
      "where": "",
      "allDay": false,
      "kind": "travel",
      "hold": null,
      "role": "tripit"
    }
  ]
}
```

The titles above are fake placeholders for the shape, not a schedule.

`kind` is `event`, `travel`, or `leave`. `hold` is `leave-the-house`, `leave-for-airport`, or `null`. `role` is `primary`, `work`, or `tripit`. Descriptions, guests, and conference links are not copied onto the wire.

A later reading of conflicts, leave timing, and a one-line “what’s next” is designed in [LATER.md](LATER.md). It is not built here.
