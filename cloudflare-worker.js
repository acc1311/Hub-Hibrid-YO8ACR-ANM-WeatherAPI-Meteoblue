// ============================================================
// Cloudflare Worker — Proxy pentru:
//   1. meteoromania.ro (ANM)          -> /anm
//   2. WeatherAPI.com                  -> /wapi/*
//   3. Meteoblue                       -> /mb/*
//   4. Web Push alerte ANM             -> /push/*  + Cron Trigger
//
// IMPORTANT: Cheile API NU mai sunt în codul client (index.html).
// Se configurează ca SECRETE Cloudflare:
//   wrangler secret put WAPI_KEY
//   wrangler secret put MB_KEY
//   wrangler secret put VAPID_PRIVATE      (JWK JSON complet)
// Variabile necesare (Settings -> Variables):
//   VAPID_PUBLIC  (base64url)              — și în index.html
//   PUSH_KV       — binding KV namespace
// Cron Trigger recomandat: */15 * * * *  (Settings -> Triggers)
// ============================================================

const ANM_URL = "https://www.meteoromania.ro/wp-json/meteoapi/v2/starea-vremii";
const ANM_WARN_URL = "https://www.meteoromania.ro/wp-json/meteoapi/v2/avertizari-generale";
const WAPI_BASE = "https://api.weatherapi.com/v1";
const MB_BASE = "https://my.meteoblue.com/packages";
const SUBS_KEY = "hub_push_subs"; // un singur cheie KV: { hash: {endpoint, keys, added} }

/* ── Protecție endpoint push ─────────────────────────────────
   - allowlist origini push service (FCM/Mozilla/Apple/Edge)
   - limită total abonamente (protejează KV de umplere abuzivă)
   - rate-limit per IP: fereastră fixă de 1 oră, în KV cu TTL   */
const PUSH_ORIGIN_ALLOWLIST = [
  "https://fcm.googleapis.com",
  "https://updates.push.services.mozilla.com",
  "https://webpush.apple.com",
  "https://wns.windows.com",
  "https://push.db.raycon.io"
];
const MAX_SUBS = 5000;
const RATE_LIMIT_PER_HOUR = 10;
const B64URL_RE = /^[A-Za-z0-9\-_]+$/;

function validPushSub(sub) {
  if (!sub || typeof sub !== "object") return "body invalid";
  if (typeof sub.endpoint !== "string" || sub.endpoint.length > 500) return "endpoint invalid";
  let epOrigin;
  try { epOrigin = new URL(sub.endpoint).origin; } catch { return "endpoint invalid"; }
  if (!sub.endpoint.startsWith("https://")) return "endpoint trebuie să fie HTTPS";
  if (!PUSH_ORIGIN_ALLOWLIST.includes(epOrigin)) return "origine push neacceptată";
  const keys = sub.keys;
  if (!keys || typeof keys !== "object") return "keys lipsă";
  if (typeof keys.p256dh !== "string" || !B64URL_RE.test(keys.p256dh) || keys.p256dh.length < 40 || keys.p256dh.length > 200) return "cheie p256dh invalidă";
  if (typeof keys.auth !== "string" || !B64URL_RE.test(keys.auth) || keys.auth.length < 10 || keys.auth.length > 100) return "cheie auth invalidă";
  return null;
}

async function rateLimited(env, request) {
  if (!env.PUSH_KV) return false; // fără KV nu putem limita; validările rămân active
  const ip = request.headers.get("CF-Connecting-IP") || "necunoscut";
  const bucket = Math.floor(Date.now() / 3600000);
  const key = `rl_${await sha256(ip + "_" + bucket)}`;
  const count = parseInt((await env.PUSH_KV.get(key)) || "0", 10);
  if (count >= RATE_LIMIT_PER_HOUR) return true;
  await env.PUSH_KV.put(key, String(count + 1), { expirationTtl: 7200 });
  return false;
}

export default {
  async fetch(request, env) {
    // CORS preflight pentru POST (abonare push)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders("POST") });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ── 0. Web Push — abonare/dezabonare ───────────────────
      if (path === "/push/subscribe" && request.method === "POST") {
        if (!env.PUSH_KV) return json({ ok: false, error: "PUSH_KV lipsă — leagă un namespace KV în Cloudflare" }, 500);
        if (await rateLimited(env, request)) {
          return json({ ok: false, error: "Prea multe cereri — încearcă mai târziu" }, 429);
        }
        const sub = await request.json().catch(() => null);
        const invalid = validPushSub(sub);
        if (invalid) return json({ ok: false, error: "Abonare invalidă: " + invalid }, 400);
        const store = (await env.PUSH_KV.get(SUBS_KEY, "json")) || {};
        const hash = await sha256(sub.endpoint);
        if (!store[hash] && Object.keys(store).length >= MAX_SUBS) {
          return json({ ok: false, error: "Limită abonamente atinsă" }, 507);
        }
        store[hash] = { endpoint: sub.endpoint, keys: sub.keys, added: Date.now() };
        await env.PUSH_KV.put(SUBS_KEY, JSON.stringify(store));
        return json({ ok: true, total: Object.keys(store).length });
      }

      if (path === "/push/unsubscribe" && request.method === "POST") {
        if (!env.PUSH_KV) return json({ ok: false, error: "PUSH_KV lipsă" }, 500);
        if (await rateLimited(env, request)) {
          return json({ ok: false, error: "Prea multe cereri — încearcă mai târziu" }, 429);
        }
        const body = await request.json().catch(() => null);
        const endpoint = body && body.endpoint;
        if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 500) {
          return json({ ok: false, error: "Endpoint invalid" }, 400);
        }
        const store = (await env.PUSH_KV.get(SUBS_KEY, "json")) || {};
        delete store[await sha256(endpoint)];
        await env.PUSH_KV.put(SUBS_KEY, JSON.stringify(store));
        return json({ ok: true, total: Object.keys(store).length });
      }

      if (path === "/push/status") {
        const store = env.PUSH_KV ? ((await env.PUSH_KV.get(SUBS_KEY, "json")) || {}) : {};
        return json({ ok: true, subscriptions: Object.keys(store).length, configured: !!env.VAPID_PUBLIC && !!env.PUSH_KV });
      }

      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
      }

      // ── 1. ANM (Meteoromania) ──────────────────────────────
      if (path === "/anm" || path.startsWith("/anm/")) {
        // Forțăm cererea către ANM să ignore orice cache existent
        const response = await fetch(ANM_URL, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, */*",
            "Referer": "https://www.meteoromania.ro/",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          },
          cf: {
            cacheTtl: 0,
            cacheEverything: false
          }
        });

        if (!response.ok) {
          return new Response(`Eroare ANM: HTTP ${response.status}`, {
            status: response.status,
            headers: corsHeaders()
          });
        }

        const data = await response.json();
        return json(data);
      }

      // ── 1b. ANM — Avertizări meteorologice oficiale ─────────
      if (path === "/anm-warnings" || path.startsWith("/anm-warnings/")) {
        const response = await fetch(ANM_WARN_URL, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, */*",
            "Referer": "https://www.meteoromania.ro/",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          },
          cf: {
            cacheTtl: 0,
            cacheEverything: false
          }
        });

        if (!response.ok) {
          return new Response(`Eroare ANM avertizări: HTTP ${response.status}`, {
            status: response.status,
            headers: corsHeaders()
          });
        }

        const data = await response.json();
        return json(data);
      }

      // ── 2. WeatherAPI ──────────────────────────────────────
      if (path.startsWith("/wapi/")) {
        const key = env.WAPI_KEY;
        if (!key) {
          return new Response("WAPI_KEY lipsă — configurează secretul în Cloudflare (wrangler secret put WAPI_KEY)", {
            status: 500,
            headers: corsHeaders()
          });
        }
        const target = path.replace("/wapi/", "") + url.search + (url.search ? "&" : "?") + "key=" + encodeURIComponent(key);
        const res = await fetch(`${WAPI_BASE}/${target}`, {
          headers: { "Accept": "application/json" }
        });
        const data = await res.json();
        return json(data, res.status);
      }

      // ── 3. Meteoblue ───────────────────────────────────────
      if (path.startsWith("/mb/")) {
        const key = env.MB_KEY;
        if (!key) {
          return new Response("MB_KEY lipsă — configurează secretul în Cloudflare (wrangler secret put MB_KEY)", {
            status: 500,
            headers: corsHeaders()
          });
        }
        const target = path.replace("/mb/", "") + url.search + (url.search ? "&" : "?") + "apikey=" + encodeURIComponent(key) + "&format=json";
        const res = await fetch(`${MB_BASE}/${target}`, {
          headers: { "Accept": "application/json" }
        });
        const data = await res.json();
        return json(data, res.status);
      }

      return new Response("Not found", { status: 404, headers: corsHeaders() });
    } catch (err) {
      return new Response(`Eroare worker: ${err.message}`, {
        status: 500,
        headers: corsHeaders()
      });
    }
  },

  /* ── Cron Trigger: verifică avertizările ANM și trimite push la schimbare ── */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAndPush(env));
  }
};

/* ============================================================
   WEB PUSH — verificare ANM + trimitere tickle push (fără payload)
   SW-ul client își ia singur datele proaspete la trezire.
   ============================================================ */
async function checkAndPush(env) {
  try {
    if (!env.PUSH_KV || !env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return;

    // 1. avertizările actuale + semnătura lor
    const res = await fetch(ANM_WARN_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, */*",
        "Referer": "https://www.meteoromania.ro/",
        "Cache-Control": "no-cache"
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    if (!res.ok) return;
    const data = await res.json();
    const list = data && data.avertizare ? (Array.isArray(data.avertizare) ? data.avertizare : [data.avertizare]) : [];
    const sig = await sha256(JSON.stringify(list.map((it) => {
      const at = (it && it["@attributes"]) || {};
      return [at.tipMesaj, at.culoare, at.dataAparitiei, at.dataExpirarii].join("|");
    }).sort()));

    const lastSig = await env.PUSH_KV.get("hub_push_last_sig");
    if (sig === lastSig) return; // nimic nou

    // 2. trimite push tuturor abonaților
    const store = (await env.PUSH_KV.get(SUBS_KEY, "json")) || {};
    const hashes = Object.keys(store);
    let dead = [];
    for (const h of hashes) {
      const ok = await sendTicklePush(store[h], env);
      if (!ok) dead.push(h);
    }
    for (const h of dead) delete store[h];
    if (dead.length) await env.PUSH_KV.put(SUBS_KEY, JSON.stringify(store));

    // 3. reține semnătura (doar dacă existau avertizări — evită push-uri goale repetate)
    if (list.length) await env.PUSH_KV.put("hub_push_last_sig", sig);
} catch {
    // cronul nu trebuie să arunce erori
  }
}

/* Push fără payload — nu necesită criptare RFC8291; doar autentificare VAPID */
async function sendTicklePush(sub, env) {
  try {
    const endpointOrigin = new URL(sub.endpoint).origin;
    const jwt = await makeVapidJwt(endpointOrigin, env.VAPID_PRIVATE, env.VAPID_PUBLIC);
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "TTL": "60",
        "Authorization": `vapid t=${jwt}, k=${env.VAPID_PUBLIC}`,
        "Content-Length": "0"
      }
    });
    return r.status === 201 || r.status === 200;
  } catch {
    return false;
  }
}

/* JWT ES256 pentru VAPID (RFC 8292): semnat cu cheia privată EC P-256 */
async function makeVapidJwt(audience, privateJwkJson, _publicKeyB64u) {
  const privJwk = JSON.parse(privateJwkJson);
  const key = await crypto.subtle.importKey(
    "jwk", privJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );
  const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const enc = (obj) => b64u(new TextEncoder().encode(JSON.stringify(obj)));
  const head = enc({ typ: "JWT", alg: "ES256" });
  const body = enc({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:hub-meteo@users.noreply.github.com" });
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    new TextEncoder().encode(`${head}.${body}`)
  );
  return `${head}.${body}.${b64u(sig)}`;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
      "Cache-Control": "public, no-cache, no-store, must-revalidate"
    }
  });
}

function corsHeaders(method = "GET") {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": `${method}, OPTIONS`,
    "Access-Control-Allow-Headers": "Content-Type",
  };
}