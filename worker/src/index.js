// nonarkara-status — Cloudflare Worker
// Cron pings every nonarkara.org subdomain every 5 minutes, stores the
// snapshot in KV. The /status endpoint returns the latest snapshot.
//
// Bindings (set in wrangler.toml):
//   STATUS — KV namespace
//
// Endpoints:
//   GET  /              — status JSON (CORS open)
//   GET  /status        — same as /
//   GET  /now           — server time (ISO + Bangkok local) for sanity-checking
//   GET  /history       — per-domain ring buffer of the last 24h of probes
//   GET  /uptime        — 24h / 7d / 30d uptime percentages
//   GET  /incidents     — the last 50 down→up episodes
//   GET  /alert-test    — send one Telegram message (needs ?key=ALERT_TEST_SECRET)
//
// Alerting: the cron detects up→down and down→up transitions and pings
// Telegram. Secrets TG_BOT_TOKEN + TG_CHAT_ID (wrangler secret put).
// A domain must fail FAIL_STRIKES consecutive probes before it alerts, so
// a single blip never wakes anyone.

const ACTIVE = [
  "nonarkara.org",
  "ninja.nonarkara.org",
  "axiom.nonarkara.org",
  "slic.nonarkara.org",
  "sciti.nonarkara.org",
  "tkc.nonarkara.org",
  "tkcx.nonarkara.org",
  "monitor.nonarkara.org",
  "bangkok-ioc.pages.dev",
  "conflict.nonarkara.org",
  "mem.nonarkara.org",
  "geo.nonarkara.org",
  "cdp.nonarkara.org",
  "phuket.nonarkara.org",
  "phuket-dashboard.nonarkara.org/war-room",
  "mean.nonarkara.org",
  "bus.nonarkara.org",
  "kuching.nonarkara.org",
  "solomon.nonarkara.org",
  "slowdown.nonarkara.org",
  "ascn.nonarkara.org",
  "asean.nonarkara.org",
  "scl.nonarkara.org",
  "dao.nonarkara.org",
  "solitude.nonarkara.org",
];

// Parked: DNS still resolves, nothing is meant to be serving. Kept on the
// board as closed stations so the map stays honest, but they never alert
// and never drag the uptime numbers down.
//   oil / bot / brain — point at Render + Vercel targets deleted long ago
//   tkc-digital-twin  — suspended Fly app (530 since at least 2026-05)
const PARKED = [
  "oil.nonarkara.org",
  "bot.nonarkara.org",
  "brain.nonarkara.org",
  "tkc-digital-twin.fly.dev",
];

const DOMAINS = [...ACTIVE, ...PARKED];

// One consolidated document: snapshot + history + state + incidents +
// rollups. Written exactly once per cron run — 288 writes/day, which
// leaves plenty of room under the KV free-tier daily write limit. A key
// per metric would have blown through it before lunch.
const FLEET_KEY = "fleet:v1";

const HISTORY_LEN   = 288;  // 24h at one probe every 5 min
const INCIDENT_LEN  = 50;
const ROLLUP_DAYS   = 90;
const FAIL_STRIKES  = 2;    // consecutive failures before an alert fires

const isUp = c => c >= 200 && c < 400;

export { isUp, ACTIVE, PARKED };  // for test-fold.mjs

async function probe(d) {
  const start = Date.now();
  try {
    const r = await fetch(`https://${d}`, {
      method: "GET",
      // Don't follow — Workers' fetch can't always traverse a redirect
      // that lands on another Cloudflare Worker route (loop guard). The
      // page treats 200/301/302 all as healthy, so storing the original
      // 302 is correct + cheaper.
      redirect: "manual",
      cf: { cacheTtl: 0, cacheEverything: false },
      signal: AbortSignal.timeout(10_000),
    });
    return { code: r.status, ms: Date.now() - start };
  } catch (_) {
    return { code: 0, ms: Date.now() - start };
  }
}

async function snapshot() {
  const ts = new Date().toISOString();
  const sites = {};
  // Pings in parallel — we have ~22 hosts, that's fine for a single Worker invocation
  const results = await Promise.all(
    DOMAINS.map(async (d) => [d, await probe(d)])
  );
  for (const [d, v] of results) sites[d] = v;
  return { ts, sites };
}

// Empty fleet document — the shape everything else assumes.
const emptyFleet = () => ({
  ts: null, sites: {}, history: {}, state: {}, incidents: [], rollups: {},
});
export { emptyFleet, foldRound, uptimeFor };  // for test-fold.mjs

async function loadFleet(env) {
  const f = await env.STATUS.get(FLEET_KEY, "json");
  return f ? { ...emptyFleet(), ...f } : emptyFleet();
}

// Fold one probe round into the fleet document and return the alerts the
// round produced. Pure apart from the clock: given the same fleet + sites
// it always yields the same next fleet.
function foldRound(fleet, sites, now = new Date()) {
  const minute = Math.floor(now.getTime() / 60_000);
  const day = now.toISOString().slice(0, 10);
  const alerts = [];

  fleet.ts = now.toISOString();
  fleet.sites = sites;
  fleet.rollups[day] = fleet.rollups[day] || {};

  for (const [d, v] of Object.entries(sites)) {
    const up = isUp(v.code);

    const hist = fleet.history[d] || (fleet.history[d] = []);
    hist.push([minute, v.code, v.ms]);
    if (hist.length > HISTORY_LEN) hist.splice(0, hist.length - HISTORY_LEN);

    // [checks, ok, total ms] — array, not object, to keep the doc small
    const r = fleet.rollups[day][d] || (fleet.rollups[day][d] = [0, 0, 0]);
    r[0]++; if (up) r[1]++; r[2] += v.ms;

    if (PARKED.includes(d)) continue;  // parked hosts never alert

    const s = fleet.state[d] || (fleet.state[d] = { up: true, failStreak: 0, since: fleet.ts, alerted: false });
    if (up) {
      if (s.alerted) {
        alerts.push({ kind: "up", domain: d, code: v.code, since: s.since });
        const inc = fleet.incidents.find(i => i.domain === d && !i.upAt);
        if (inc) inc.upAt = fleet.ts;
      }
      if (!s.up) s.since = fleet.ts;
      s.up = true; s.failStreak = 0; s.alerted = false;
    } else {
      if (s.up) s.since = fleet.ts;
      s.up = false; s.failStreak++;
      if (s.failStreak === FAIL_STRIKES && !s.alerted) {
        s.alerted = true;
        alerts.push({ kind: "down", domain: d, code: v.code, since: s.since });
        fleet.incidents.unshift({ domain: d, downAt: s.since, upAt: null, lastCode: v.code });
        if (fleet.incidents.length > INCIDENT_LEN) fleet.incidents.length = INCIDENT_LEN;
      }
    }
  }

  // Prune rollups older than ROLLUP_DAYS
  const cutoff = new Date(now.getTime() - ROLLUP_DAYS * 86_400_000).toISOString().slice(0, 10);
  for (const k of Object.keys(fleet.rollups)) if (k < cutoff) delete fleet.rollups[k];

  return alerts;
}

// One message per cron run, however many domains moved. A storm of
// separate pings is how people learn to mute the channel.
async function sendAlerts(env, alerts) {
  if (!alerts.length || !env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return;
  const mins = since => Math.max(1, Math.round((Date.now() - Date.parse(since)) / 60_000));
  const lines = alerts.map(a => a.kind === "down"
    ? `\u{1F534} DOWN · ${a.domain} · code ${a.code} · ${mins(a.since)}m`
    : `\u{1F7E2} RECOVERED · ${a.domain} · was down ${mins(a.since)}m`);
  await tg(env, lines.join("\n"));
}

async function tg(env, text) {
  return fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text, disable_notification: false }),
  });
}

// Uptime from what we already store: 24h out of the ring buffer, 7d/30d
// out of the daily rollups. No extra writes.
function uptimeFor(fleet, domain) {
  const hist = fleet.history[domain] || [];
  const pct = (ok, n) => (n ? Math.round((ok / n) * 1000) / 10 : null);
  const day24 = pct(hist.filter(h => isUp(h[1])).length, hist.length);

  const rollupPct = days => {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    let checks = 0, ok = 0;
    for (const [d, byDomain] of Object.entries(fleet.rollups)) {
      if (d < cutoff) continue;
      const r = byDomain[domain];
      if (r) { checks += r[0]; ok += r[1]; }
    }
    return pct(ok, checks);
  };
  return { d1: day24, d7: rollupPct(7), d30: rollupPct(30) };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=30",
};

export default {
  // ── Scheduled handler (cron */5) ────────────────────────────
  async scheduled(_event, env, ctx) {
    const { sites } = await snapshot();
    const fleet = await loadFleet(env);
    const alerts = foldRound(fleet, sites);
    // No expirationTtl: this document carries the history now. Losing it
    // to a TTL would silently reset every uptime figure on the board.
    ctx.waitUntil(Promise.all([
      env.STATUS.put(FLEET_KEY, JSON.stringify(fleet)),
      sendAlerts(env, alerts),
    ]));
  },

  // ── HTTP handler ───────────────────────────────────────────
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/now") {
      const now = new Date();
      const bkk = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Bangkok",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);
      return new Response(
        JSON.stringify({ utc: now.toISOString(), bangkok: bkk }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Yahoo Finance quote proxy — Yahoo blocks browser CORS, so we
    // pass-through here. Path: /quote/^SETI returns the latest SET
    // index (or any Yahoo symbol — minimal validation).
    // ── /daily-brief — ONE call returns all market data ─────────────────────
    // Replaces ~10 separate /quote/ calls per page load.
    // Cached in KV for 5 min so every visitor within that window is free.
    if (url.pathname === "/daily-brief") {
      const BRIEF_KEY = "brief:v1";
      const BRIEF_TTL = 300; // 5 minutes
      // Try KV cache first
      const cached = await env.STATUS.get(BRIEF_KEY, "json");
      if (cached && (Date.now() - cached._ts) < BRIEF_TTL * 1000) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json",
                     "Cache-Control": `max-age=${BRIEF_TTL}` },
        });
      }
      // Fetch all symbols in parallel
      const SYMBOLS = [
        ["USDTHB=X", "usdthb"], ["SGDTHB=X", "sgdthb"],
        ["BTC-USD",  "btc"],    ["%5ESET.BK", "set"],
        ["%5EDJI",  "dji"],     ["%5EIXIC", "nasdaq"],
        ["NVDA",    "nvda"],    ["TSLA", "tsla"],
        ["GOOGL",   "googl"],   ["GC%3DF", "gold"],
        ["BZ%3DF",  "brent"],   ["PTT.BK", "ptt"],
      ];
      const fetchQuote = async ([sym, key]) => {
        try {
          const r = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
            { headers: { "User-Agent": "Mozilla/5.0" } }
          );
          const d = await r.json();
          const meta = d?.chart?.result?.[0]?.meta || {};
          const price = meta.regularMarketPrice ?? null;
          const prev  = meta.chartPreviousClose ?? null;
          const change = price && prev ? ((price - prev) / prev) * 100 : null;
          return [key, { price, prev, change }];
        } catch (_) { return [key, null]; }
      };
      // GISTDA PM2.5 — parallel with market data, no auth needed
      const fetchPm25 = async (lat, lng) => {
        try {
          const r = await fetch(
            `https://pm25.gistda.or.th/rest/getPm25byLocation?lat=${lat}&lng=${lng}`,
            { signal: AbortSignal.timeout(5000) }
          );
          const d = await r.json();
          return d?.data?.pm25 ?? null;
        } catch (_) { return null; }
      };
      const [results, bkkPm25, phuketPm25] = await Promise.all([
        Promise.all(SYMBOLS.map(fetchQuote)),
        fetchPm25(13.7563, 100.5018),   // Bangkok
        fetchPm25(7.8804, 98.3923),     // Phuket town
      ]);
      const brief = Object.fromEntries(results);
      brief.pm25_bkk    = bkkPm25;
      brief.pm25_phuket = phuketPm25;
      brief._ts = Date.now();
      // Cache in KV
      await env.STATUS.put(BRIEF_KEY, JSON.stringify(brief), { expirationTtl: BRIEF_TTL });
      return new Response(JSON.stringify(brief), {
        headers: { ...corsHeaders, "Content-Type": "application/json",
                   "Cache-Control": `max-age=${BRIEF_TTL}` },
      });
    }

    if (url.pathname.startsWith("/quote/")) {
      const sym = decodeURIComponent(url.pathname.slice(7));
      if (!/^[A-Z0-9.^=-]{1,12}$/i.test(sym)) {
        return new Response('{"error":"bad symbol"}', {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        const d = await r.json();
        const result = d?.chart?.result?.[0];
        const meta = result?.meta || {};
        const price = meta.regularMarketPrice ?? null;
        const prev = meta.chartPreviousClose ?? null;
        const change = price && prev ? ((price - prev) / prev) * 100 : null;
        return new Response(
          JSON.stringify({ symbol: sym, price, prev, change, ts: Date.now() }, null, 2),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Second Brain: capture endpoint ───────────────────────────────────────
    // POST /capture  → appends to Supabase + Google Sheets + embeds text
    // Body: { text, source?, session_id?, tags? }
    // Secrets in Worker env: SB_URL, SB_SERVICE_KEY, OPENAI_KEY, BRAIN_SHEET_URL
    if (url.pathname === "/capture" && req.method === "POST") {
      try {
        const body = await req.json();
        if (!body?.text?.trim()) {
          return new Response(JSON.stringify({ error: "text required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const id = crypto.randomUUID();
        const ts = new Date().toISOString();
        const record = {
          id, created_at: ts,
          text: body.text.trim(),
          source: body.source || "note",
          session_id: body.session_id || null,
          tags: body.tags || [],
          metadata: body.metadata || {},
        };

        // Fan-out: Supabase + Sheets + embedding (all async, best-effort)
        const tasks = [];

        // 1. Supabase insert (no embedding yet — added by embed task below)
        if (env.SB_URL && env.SB_SERVICE_KEY) {
          tasks.push(
            fetch(`${env.SB_URL}/rest/v1/captures`, {
              method: "POST",
              headers: {
                "apikey": env.SB_SERVICE_KEY,
                "Authorization": `Bearer ${env.SB_SERVICE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
              },
              body: JSON.stringify(record),
            }).catch(() => {})
          );
        }

        // 2. Google Sheets append
        // Apps Script requires Content-Type: text/plain to bypass
        // the CORS preflight that blocks application/json cross-origin.
        if (env.BRAIN_SHEET_URL) {
          tasks.push(
            fetch(env.BRAIN_SHEET_URL, {
              method: "POST",
              headers: { "Content-Type": "text/plain" },
              redirect: "follow",
              body: JSON.stringify({ action: "capture", ...record }),
            }).catch(() => {})
          );
        }

        // 3. Embed + store back (async — doesn't block the response)
        if (env.OPENAI_KEY && env.SB_URL && env.SB_SERVICE_KEY) {
          tasks.push((async () => {
            try {
              const embRes = await fetch("https://api.openai.com/v1/embeddings", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${env.OPENAI_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ model: "text-embedding-3-small", input: record.text }),
              });
              const embData = await embRes.json();
              const vector = embData?.data?.[0]?.embedding;
              if (vector) {
                await fetch(`${env.SB_URL}/rest/v1/captures?id=eq.${id}`, {
                  method: "PATCH",
                  headers: {
                    "apikey": env.SB_SERVICE_KEY,
                    "Authorization": `Bearer ${env.SB_SERVICE_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ embedding: vector }),
                });
              }
            } catch (_) {}
          })());
        }

        await Promise.allSettled(tasks);

        return new Response(JSON.stringify({ ok: true, id, ts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // AI Council health — reads council-watch's fail-count file from
    // GitHub raw + the latest commit timestamp. council-watch pings
    // Dr Non's M3 every 5 min and writes the consecutive-fail counter
    // to .state/fail-count. We surface that as { count, status, ts }
    // for the plan view, with CORS open.
    //   count 0    → healthy
    //   count 1-2  → degraded (one or two missed 5-min ticks)
    //   count 3+   → down (Telegram alert threshold per the workflow)
    if (url.pathname === "/council" || url.pathname === "/council.json") {
      try {
        const [countResp, commitResp] = await Promise.all([
          fetch("https://raw.githubusercontent.com/Nonarkara/council-watch/main/.state/fail-count", { cf: { cacheTtl: 30 } }),
          fetch("https://api.github.com/repos/Nonarkara/council-watch/commits?path=.state/fail-count&per_page=1", {
            headers: { "User-Agent": "nonarkara-status-worker", "Accept": "application/vnd.github+json" },
            cf: { cacheTtl: 30 },
          }),
        ]);
        const countText = (await countResp.text()).trim();
        const count = /^\d+$/.test(countText) ? parseInt(countText, 10) : null;
        const commits = await commitResp.json();
        const ts = commits?.[0]?.commit?.committer?.date || null;
        const status = count === null ? "unknown"
                     : count === 0    ? "healthy"
                     : count <  3     ? "degraded"
                     :                  "down";
        return new Response(JSON.stringify({ count, status, ts }, null, 2), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "max-age=60" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const json = (obj, extra = {}) => new Response(JSON.stringify(obj, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
    });

    if (url.pathname === "/history") {
      const f = await loadFleet(env);
      const d = url.searchParams.get("domain");
      return json({ ts: f.ts, history: d ? { [d]: f.history[d] || [] } : f.history });
    }

    if (url.pathname === "/uptime") {
      const f = await loadFleet(env);
      const uptime = {};
      for (const d of DOMAINS) uptime[d] = uptimeFor(f, d);
      return json({ ts: f.ts, parked: PARKED, uptime });
    }

    if (url.pathname === "/incidents") {
      const f = await loadFleet(env);
      return json({ ts: f.ts, incidents: f.incidents });
    }

    // Guarded end-to-end check that the bot token and chat id actually work.
    if (url.pathname === "/alert-test") {
      if (!env.ALERT_TEST_SECRET || url.searchParams.get("key") !== env.ALERT_TEST_SECRET) {
        return json({ error: "forbidden" }, { status: 403 });
      }
      const r = await tg(env, "\u{1F7E1} TEST · nonarkara-status alerting is wired up.");
      return json({ ok: r.ok, telegram: await r.json() });
    }

    if (url.pathname === "/" || url.pathname === "/status" || url.pathname === "/status.json") {
      const f = await loadFleet(env);
      // Legacy shape stays byte-compatible: { ts, sites }. `parked` is
      // additive — older cached copies of app.js simply ignore it.
      if (!f.ts) {
        const data = await snapshot();
        const fresh = emptyFleet();
        foldRound(fresh, data.sites);
        env.STATUS.put(FLEET_KEY, JSON.stringify(fresh)).catch(() => {});
        return json({ ...data, parked: PARKED });
      }
      return json({ ts: f.ts, sites: f.sites, parked: PARKED });
    }

    return new Response(
      "nonarkara-status · /status · /now · /history · /uptime · /incidents",
      { headers: { ...corsHeaders, "Content-Type": "text/plain" } }
    );
  },
};
