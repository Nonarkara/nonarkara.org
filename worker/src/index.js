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
  "globalmonitor.nonarkara.org",
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

  // The rest of the estate, taken from the systems section of the Axiom
  // page. These were built and shipped but never monitored, which meant
  // the board claimed "25/25 up" while saying nothing about two-thirds
  // of the work. All seventeen answered when added.
  "air.nonarkara.org",                      // Air D&D · Sabai Sabai
  "atlas.nonarkara.org",                    // BKKx 3D Atlas
  "chula.nonarkara.org",                    // Chula campus control tower
  "global.nonarkara.org",                   // Global Monitor
  "hcmc.nonarkara.org",                     // Ho Chi Minh super dashboard
  "nsp.nonarkara.org",                      // NSP
  "sikhio.nonarkara.org",                   // Sikhio
  "chonburi-control-tower.pages.dev",
  "city-hub.pages.dev",                     // UNL city hub
  "flood-ami.pages.dev",                    // FloodDash
  "horizon-field-lab.pages.dev",            // Horizon 45
  "kmitl-control-tower.pages.dev",
  "lcbcity.pages.dev",
  "mtt-super-dashboard-v2.pages.dev",       // Muang Thong Thani
  "siam-markets.pages.dev",
  "yala-control-tower.pages.dev",
  "ascn-smart-cities-network.pages.dev",
  "ekkasarn-ai.pages.dev",
  "nonwriter.nonarkara.org",
  "news.nonarkara.org",
  "nonscrape.nonarkara.org",
  "watch-1de.pages.dev",
  "luma-house.pages.dev",
  "depa-usdot.nonarkara.org",
];

// In the pipeline: real work with no public URL yet, either because it
// is under NDA or because it is too experimental to point at. They
// cannot be probed, so they are never counted as up or down — but they
// appear on the board, because a board that only shows what is
// deployable is not a picture of the work.
const PIPELINE = [
  { id: "sabai-sabai",  label: "SABAI SABAI",  note: "Air D&D · experimental" },
  { id: "tkc-pmo",      label: "TKC PMO",      note: "client · NDA" },
  { id: "each",         label: "EACH",         note: "ERP · ACT · CRM · HR" },
  { id: "otop",         label: "OTOP",         note: "in development" },
  { id: "ikigai",       label: "IKIGAI",       note: "finance engine · research" },
];

// Parked: DNS still resolves, nothing is meant to be serving. Kept on the
// board as closed stations so the map stays honest, but they never alert
// and never drag the uptime numbers down.
//   oil / bot / brain — point at Render + Vercel targets deleted long ago
const PARKED = [
  "oil.nonarkara.org",
  "bot.nonarkara.org",
  "brain.nonarkara.org",
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

export { isUp, ACTIVE, PARKED, PIPELINE };  // for test-fold.mjs

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
  async fetch(req, env, ctx) {
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
        ["ETH-USD",  "eth"],    ["SOL-USD",  "sol"],
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

        // KV queue — the path braind actually drains into the vault.
        // The Supabase/Sheets/embedding chain below is legacy best-effort
        // (its Supabase project no longer resolves in DNS); this line is
        // the one that must not fail, so it happens first.
        // ponytail: read-modify-write race if two captures land in the
        // same instant; single-user capture stream, acceptable.
        const queue = (await env.STATUS.get("captures:queue", "json")) || [];
        queue.push({ id, created_at: ts, text: record.text, source: record.source, tags: record.tags });
        if (queue.length > 500) queue.splice(0, queue.length - 500);
        await env.STATUS.put("captures:queue", JSON.stringify(queue));

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

    // extra = {status, ...headers}. `status` is lifted out — before this,
    // a {status: 401} silently became a header named "status" and every
    // error in the newer endpoints shipped as a confident 200.
    const json = (obj, extra = {}) => {
      const { status = 200, ...hdrs } = extra;
      return new Response(JSON.stringify(obj, null, 2), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...hdrs },
      });
    };

    // ── Morning brief ────────────────────────────────────────────────
    // The episode index and the audio itself, straight out of R2. Range
    // requests matter: without them a phone cannot scrub the audio, it
    // can only play from the start.
    if (url.pathname.startsWith("/podcast/")) {
      const key = decodeURIComponent(url.pathname.slice("/podcast/".length));
      if (!key || key.includes("..")) return json({ error: "bad key" }, { status: 400 });
      const wantsRange = req.headers.has("range");
      const obj = wantsRange
        ? await env.PODCAST.get(key, { range: req.headers })
        : await env.PODCAST.get(key);
      if (!obj) return json({ error: "not found", key }, { status: 404 });

      const h = new Headers(corsHeaders);
      obj.writeHttpMetadata(h);
      h.set("etag", obj.httpEtag);
      h.set("Accept-Ranges", "bytes");
      h.set("Cache-Control", key.endsWith(".json") ? "max-age=300" : "max-age=86400");
      if (!h.get("Content-Type")) {
        h.set("Content-Type", key.endsWith(".json") ? "application/json" : "audio/mpeg");
      }

      // A 206 without a Content-Range is malformed, and Safari's audio
      // element refuses to seek on one. Only ever emit the pair together.
      const r = wantsRange && obj.range ? obj.range : null;
      if (r) {
        const offset = r.offset ?? 0;
        const length = r.length ?? (obj.size - offset);
        h.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
        h.set("Content-Length", String(length));
        return new Response(obj.body, { status: 206, headers: h });
      }
      h.set("Content-Length", String(obj.size));
      return new Response(obj.body, { status: 200, headers: h });
    }

    // ── braind — the resident brain worker on the M5 ─────────────────
    // Three endpoints. Two are authed with BRAIND_KEY (wrangler secret):
    //   GET  /captures?since=ISO   — pull notes captured from anywhere,
    //                                so the laptop vault ingests them
    //   POST /brain-status         — the daemon reports its pulse
    // One is public and deliberately boring:
    //   GET  /brain                — counts and timestamps only. The
    //                                brain's contents never leave the
    //                                laptop; only its vital signs do.
    if (url.pathname === "/captures") {
      if (!env.BRAIND_KEY || url.searchParams.get("key") !== env.BRAIND_KEY) {
        return json({ error: "unauthorized" }, { status: 401 });
      }
      const since = url.searchParams.get("since") || "1970-01-01T00:00:00Z";
      if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(since)) {
        return json({ error: "bad since" }, { status: 400 });
      }
      // The queue lives in KV, not Supabase — the old second-brain
      // Supabase project no longer resolves in DNS, so /capture's cloud
      // chain has been a zombie for a while. KV is already here, needs
      // no credential, and a personal capture stream never outruns it.
      const queue = (await env.STATUS.get("captures:queue", "json")) || [];
      return json({ captures: queue.filter(c => c.created_at > since).slice(0, 200) });
    }

    if (url.pathname === "/brain-status" && req.method === "POST") {
      if (!env.BRAIND_KEY || url.searchParams.get("key") !== env.BRAIND_KEY) {
        return json({ error: "unauthorized" }, { status: 401 });
      }
      let body;
      try { body = await req.json(); } catch { return json({ error: "bad json" }, { status: 400 }); }
      // Allowlist, not passthrough: whatever the daemon sends, only
      // these fields can ever become publicly readable.
      const pick = (k, t) => (typeof body[k] === t ? body[k] : null);
      const status = {
        ts: new Date().toISOString(),
        mode: pick("mode", "string")?.slice(0, 40) ?? "unknown",
        documents: pick("documents", "number"),
        chunks: pick("chunks", "number"),
        pulses: pick("pulses", "number"),
        capturesPulled: pick("capturesPulled", "number"),
        lastPulseNote: pick("lastPulseNote", "string")?.slice(0, 10) ?? null, // date only
        indexFresh: pick("indexFresh", "boolean"),
      };
      await env.STATUS.put("brain:v1", JSON.stringify(status), { expirationTtl: 60 * 60 * 24 * 7 });
      return json({ ok: true });
    }

    if (url.pathname === "/brain") {
      const s = await env.STATUS.get("brain:v1", "json");
      return json(s || { mode: "asleep", ts: null });
    }

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
        // waitUntil, not fire-and-forget: without it the runtime can kill
        // the write as soon as the response is sent, and the fleet
        // document never gets created.
        ctx.waitUntil(env.STATUS.put(FLEET_KEY, JSON.stringify(fresh)));
        return json({ ...data, parked: PARKED, pipeline: PIPELINE });
      }
      return json({ ts: f.ts, sites: f.sites, parked: PARKED, pipeline: PIPELINE });
    }

    return new Response(
      "nonarkara-status · /status · /now · /history · /uptime · /incidents",
      { headers: { ...corsHeaders, "Content-Type": "text/plain" } }
    );
  },
};
