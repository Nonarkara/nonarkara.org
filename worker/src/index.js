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

const DOMAINS = [
  "nonarkara.org",
  "ninja.nonarkara.org",
  "axiom.nonarkara.org",
  "slic.nonarkara.org",
  "sciti.nonarkara.org",
  "tkc.nonarkara.org",
  "tkcx.nonarkara.org",
  "tkc-digital-twin.fly.dev",
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
  "oil.nonarkara.org",
  "bot.nonarkara.org",
  "brain.nonarkara.org",
];

const STATUS_KEY = "snapshot:v1";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=30",
};

export default {
  // ── Scheduled handler (cron */5) ────────────────────────────
  async scheduled(_event, env, ctx) {
    const data = await snapshot();
    ctx.waitUntil(
      env.STATUS.put(STATUS_KEY, JSON.stringify(data), {
        // KV TTL — the next cron will overwrite anyway, but keep around 30 min
        // in case the cron mis-fires.
        expirationTtl: 60 * 30,
      })
    );
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
        if (env.BRAIN_SHEET_URL) {
          tasks.push(
            fetch(env.BRAIN_SHEET_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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

    if (url.pathname === "/" || url.pathname === "/status" || url.pathname === "/status.json") {
      let data = await env.STATUS.get(STATUS_KEY, "json");
      // If KV is empty (first deploy, before cron has run), do an inline probe
      if (!data) {
        data = await snapshot();
        // Don't await — let the response go out, populate KV in the background
        env.STATUS.put(STATUS_KEY, JSON.stringify(data), { expirationTtl: 60 * 30 }).catch(() => {});
      }
      return new Response(JSON.stringify(data, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("nonarkara-status · /status · /now", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  },
};
