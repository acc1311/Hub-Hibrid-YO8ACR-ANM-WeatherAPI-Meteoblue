// ============================================================
// Cloudflare Worker — YO8ACR Weather Hub PRO v2.3
// Proxy pentru:
//   ANM                -> /anm , /api/anm/observations
//   ANM warnings       -> /anm-warnings , /api/anm/warnings
//   WeatherAPI         -> /wapi/* , /api/weatherapi/*
//   Meteoblue          -> /mb/* , /api/meteoblue/*
//   Health             -> /api/health , /health
//   Web Push           -> /push/* , /api/push/*  + Cron Trigger
//
// Secrets: WAPI_KEY, MB_KEY, VAPID_PRIVATE (JWK JSON)
// Vars:    VAPID_PUBLIC (base64url), PUSH_KV (KV), ALLOWED_ORIGINS (CSV)
// Cron:    */15 * * * *  (Settings -> Triggers)
// ============================================================

const ANM_URL = "https://www.meteoromania.ro/wp-json/meteoapi/v2/starea-vremii";
const ANM_WARN_URL = "https://www.meteoromania.ro/wp-json/meteoapi/v2/avertizari-generale";
const WAPI_BASE = "https://api.weatherapi.com/v1";
const MB_BASE = "https://my.meteoblue.com/packages";
const SUBS_KEY = "hub_push_subs";

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

function allowedOrigins(env){
  const raw = (env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || '').trim();
  if(!raw){
    return [
      "https://acc1311.github.io",
      "http://localhost:8000",
      "http://127.0.0.1:8000",
      "http://localhost:5500",
      "https://hubmeteoacr.brm-laser-veronese.workers.dev"
    ];
  }
  return raw.split(',').map(s=>s.trim()).filter(Boolean);
}
function isAllowedOrigin(origin, env){
  if(!origin) return true;
  const list = allowedOrigins(env);
  if(list.includes('*')) return true;
  return list.some(p=>{
    if(p===origin) return true;
    if(p.startsWith('*.')){
      const base=p.slice(2);
      try{ const h=new URL(origin).hostname; return h===base||h.endsWith('.'+base); }catch{return false;}
    }
    return false;
  });
}
function corsHeadersFor(request, env, method="GET"){
  // GET = public data (ANM, WAPI, MB) → allow * for compat (GitHub Pages, localhost, file://)
  // POST = push → strict allowlist
  if(method==="GET"){
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    };
  }
  const origin = request ? (request.headers.get("Origin")||"") : "";
  const allowed = isAllowedOrigin(origin, env||{});
  const list = allowedOrigins(env||{});
  let allowOrigin = "*";
  if(origin && allowed) allowOrigin = origin;
  else if(origin && !allowed) allowOrigin = list[0]||"*";
  else allowOrigin = list[0]||"*";
  const headers = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": `${method}, OPTIONS`,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if(list.includes('*')) headers["Access-Control-Allow-Origin"]="*";
  return headers;
}
function securityHeaders(){
  return {
    "X-Content-Type-Options":"nosniff",
    "X-Frame-Options":"DENY",
    "Referrer-Policy":"strict-origin-when-cross-origin",
    "Permissions-Policy":"geolocation=(self), camera=()"
  };
}
function jsonWithCors(data, status=200, request=null, env=null){
  const headers = {
    ...corsHeadersFor(request, env),
    ...securityHeaders(),
    "Content-Type":"application/json",
    "Cache-Control":"public, no-cache, no-store, must-revalidate"
  };
  return new Response(JSON.stringify(data), { status, headers });
}
// legacy json() shim — keeps old calls working
function json(data, status=200){
  return new Response(JSON.stringify(data), {
    status,
    headers:{
      ...corsHeadersFor(null, {}),
      ...securityHeaders(),
      "Content-Type":"application/json",
      "Cache-Control":"public, no-cache, no-store, must-revalidate"
    }
  });
}
function corsHeaders(method="GET"){
  return {
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Methods":`${method}, OPTIONS`,
    "Access-Control-Allow-Headers":"Content-Type",
    ...securityHeaders()
  };
}

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
  if (!env.PUSH_KV) return false;
  const ip = request.headers.get("CF-Connecting-IP") || "necunoscut";
  const bucket = Math.floor(Date.now() / 3600000);
  const key = `rl_${await sha256(ip + "_" + bucket)}`;
  const count = parseInt((await env.PUSH_KV.get(key)) || "0", 10);
  if (count >= RATE_LIMIT_PER_HOUR) return true;
  await env.PUSH_KV.put(key, String(count + 1), { expirationTtl: 7200 });
  return false;
}
async function handleHealth(request, env){
  const checks=[];
  const t0=Date.now();
  try{
    const c=new AbortController(); const tm=setTimeout(()=>c.abort(), 5000);
    const r=await fetch(ANM_URL, { method:'GET', headers:{ "User-Agent":"Mozilla/5.0" }, signal:c.signal, cf:{ cacheTtl:0 } });
    clearTimeout(tm);
    checks.push({ id:'anm', status: r.ok?'ONLINE':'DEGRADED', latencyMs: Date.now()-t0, httpStatus:r.status });
  }catch(e){ checks.push({ id:'anm', status:'UNAVAILABLE', latencyMs: Date.now()-t0, error:String(e.message).slice(0,120) }); }
  const t1=Date.now();
  try{
    const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude=47.17&longitude=26.36&current=temperature_2m&timezone=auto", { signal: AbortSignal.timeout(5000) });
    checks.push({ id:'openmeteo', status: r.ok?'ONLINE':'DEGRADED', latencyMs: Date.now()-t1, httpStatus:r.status });
  }catch(e){ checks.push({ id:'openmeteo', status:'UNAVAILABLE', latencyMs: Date.now()-t1, error:String(e.message).slice(0,120) }); }
  checks.push({ id:'weatherapi_proxy', status: env.WAPI_KEY?'ONLINE':'UNAVAILABLE', note: env.WAPI_KEY?'WAPI_KEY set':'WAPI_KEY missing' });
  checks.push({ id:'meteoblue_proxy', status: env.MB_KEY?'ONLINE':'UNAVAILABLE', note: env.MB_KEY?'MB_KEY set':'MB_KEY missing' });
  checks.push({ id:'push', status: env.PUSH_KV&&env.VAPID_PUBLIC?'ONLINE':'DEGRADED', note: env.PUSH_KV?'KV bound':'KV missing' });
  const hasUnavailable=checks.some(c=>c.status==='UNAVAILABLE');
  const overall=hasUnavailable?'DEGRADED':'ONLINE';
  return jsonWithCors({ ok:true, overall, timestamp:new Date().toISOString(), checks, version:'2.3-pro' }, 200, request, env);
}
function isAllowedWapiPath(path){
  const p=path.replace(/^\/api\/weatherapi\//,'').replace(/^\/wapi\//,'');
  const base=p.split('?')[0].split('/')[0];
  // allow search.json, current.json, forecast.json, marine.json, astronomy.json etc
  return /^(search|current|forecast|marine|astronomy|sports|timezone|history)\.json$/.test(base) || /^(search|current|forecast)\.json$/.test(base);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin")||"";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...corsHeadersFor(request, env, "POST"), ...securityHeaders() } });
    }

    try {
      // Health — open, no auth
      if (path === "/api/health" || path === "/health") {
        return handleHealth(request, env);
      }

      // Web Push — abonare/dezabonare
      if ((path === "/push/subscribe" || path === "/api/push/subscribe") && request.method === "POST") {
        if (!isAllowedOrigin(origin, env) && origin !== "") return jsonWithCors({ ok:false, error:"Origin not allowed" }, 403, request, env);
        if (!env.PUSH_KV) return jsonWithCors({ ok: false, error: "PUSH_KV lipsă — leagă un namespace KV în Cloudflare" }, 500, request, env);
        if (await rateLimited(env, request)) return jsonWithCors({ ok: false, error: "Prea multe cereri — încearcă mai târziu" }, 429, request, env);
        const sub = await request.json().catch(() => null);
        const invalid = validPushSub(sub);
        if (invalid) return jsonWithCors({ ok: false, error: "Abonare invalidă: " + invalid }, 400, request, env);
        const store = (await env.PUSH_KV.get(SUBS_KEY, "json")) || {};
        const hash = await sha256(sub.endpoint);
        if (!store[hash] && Object.keys(store).length >= MAX_SUBS) return jsonWithCors({ ok: false, error: "Limită abonamente atinsă" }, 507, request, env);
        store[hash] = { endpoint: sub.endpoint, keys: sub.keys, added: Date.now() };
        await env.PUSH_KV.put(SUBS_KEY, JSON.stringify(store));
        return jsonWithCors({ ok: true, total: Object.keys(store).length }, 200, request, env);
      }
      if ((path === "/push/unsubscribe" || path === "/api/push/unsubscribe") && request.method === "POST") {
        if (!isAllowedOrigin(origin, env) && origin !== "") return jsonWithCors({ ok:false, error:"Origin not allowed" }, 403, request, env);
        if (!env.PUSH_KV) return jsonWithCors({ ok: false, error: "PUSH_KV lipsă" }, 500, request, env);
        if (await rateLimited(env, request)) return jsonWithCors({ ok: false, error: "Prea multe cereri — încearcă mai târziu" }, 429, request, env);
        const body = await request.json().catch(() => null);
        const endpoint = body && body.endpoint;
        if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 500) return jsonWithCors({ ok: false, error: "Endpoint invalid" }, 400, request, env);
        const store = (await env.PUSH_KV.get(SUBS_KEY, "json")) || {};
        delete store[await sha256(endpoint)];
        await env.PUSH_KV.put(SUBS_KEY, JSON.stringify(store));
        return jsonWithCors({ ok: true, total: Object.keys(store).length }, 200, request, env);
      }
      if (path === "/push/status" || path === "/api/push/status") {
        const store = env.PUSH_KV ? ((await env.PUSH_KV.get(SUBS_KEY, "json")) || {}) : {};
        return jsonWithCors({ ok: true, subscriptions: Object.keys(store).length, configured: !!env.VAPID_PUBLIC && !!env.PUSH_KV }, 200, request, env);
      }

      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: { ...corsHeadersFor(request, env), ...securityHeaders() } });
      }

      // ANM observations — legacy + new
      if (path === "/anm" || path.startsWith("/anm/") || path === "/api/anm/observations" || path.startsWith("/api/anm/observations")) {
        const controller=new AbortController(); const tm=setTimeout(()=>controller.abort(), 12000);
        try{
          const response = await fetch(ANM_URL, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json, */*",
              "Referer": "https://www.meteoromania.ro/",
              "Cache-Control": "no-cache",
              "Pragma": "no-cache"
            },
            cf: { cacheTtl: 0, cacheEverything: false },
            signal: controller.signal
          });
          clearTimeout(tm);
          if (!response.ok) return new Response(`Eroare ANM: HTTP ${response.status}`, { status: response.status, headers: { ...corsHeadersFor(request, env), ...securityHeaders() } });
          const data = await response.json();
          // schema validation
          if(!data || typeof data !== 'object' || !Array.isArray(data.features)){
            return jsonWithCors({ error:'ANM schema validation failed', details:'expected GeoJSON with features' }, 502, request, env);
          }
          return jsonWithCors(data, 200, request, env);
        }catch(e){
          clearTimeout(tm);
          if(e.name==='AbortError') return new Response('ANM timeout', { status:504, headers:{...corsHeadersFor(request, env), ...securityHeaders()}});
          throw e;
        }
      }

      // ANM warnings — legacy + new
      if (path === "/anm-warnings" || path.startsWith("/anm-warnings/") || path === "/api/anm/warnings" || path.startsWith("/api/anm/warnings") || path === "/api/anm/nowcasting") {
        const controller=new AbortController(); const tm=setTimeout(()=>controller.abort(), 12000);
        try{
          const response = await fetch(ANM_WARN_URL, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json, */*",
              "Referer": "https://www.meteoromania.ro/",
              "Cache-Control": "no-cache",
              "Pragma": "no-cache"
            },
            cf: { cacheTtl: 0, cacheEverything: false },
            signal: controller.signal
          });
          clearTimeout(tm);
          if (!response.ok) return new Response(`Eroare ANM avertizări: HTTP ${response.status}`, { status: response.status, headers: { ...corsHeadersFor(request, env), ...securityHeaders() } });
          const data = await response.json();
          return jsonWithCors(data, 200, request, env);
        }catch(e){
          clearTimeout(tm);
          if(e.name==='AbortError') return new Response('ANM warnings timeout', { status:504, headers:{...corsHeadersFor(request, env), ...securityHeaders()}});
          throw e;
        }
      }

      // WeatherAPI — legacy + new with allowlist
      if (path.startsWith("/wapi/") || path.startsWith("/api/weatherapi/")) {
        const key = env.WAPI_KEY;
        if (!key) return new Response("WAPI_KEY lipsă — configurează secretul în Cloudflare (wrangler secret put WAPI_KEY)", { status: 500, headers: { ...corsHeadersFor(request, env), ...securityHeaders() } });
        let targetPath = path.startsWith("/api/weatherapi/") ? path.replace("/api/weatherapi/", "") : path.replace("/wapi/", "");
        // strip leading ? already in url.search
        if(!isAllowedWapiPath("/wapi/"+targetPath)){
          return jsonWithCors({ error:'WAPI path not allowed' }, 400, request, env);
        }
        const allowedParams=new Set(['q','days','lang','aqi','alerts','dt','hour','tides']);
        const qs=new URLSearchParams();
        for(const [k,v] of url.searchParams.entries()){ if(allowedParams.has(k)) qs.set(k,v); }
        qs.set('key', key);
        const target = `${WAPI_BASE}/${targetPath}?${qs.toString()}`;
        const controller=new AbortController(); const tm=setTimeout(()=>controller.abort(), 10000);
        try{
          const res = await fetch(target, { headers: { "Accept": "application/json" }, signal: controller.signal });
          clearTimeout(tm);
          const text=await res.text();
          let data; try{ data=JSON.parse(text);}catch{ data={ error:text.slice(0,500)}; }
          return jsonWithCors(data, res.status, request, env);
        }catch(e){
          clearTimeout(tm);
          if(e.name==='AbortError') return jsonWithCors({ error:'WAPI timeout' }, 504, request, env);
          return jsonWithCors({ error:e.message }, 500, request, env);
        }
      }

      // Meteoblue — legacy + new
      if (path.startsWith("/mb/") || path.startsWith("/api/meteoblue/")) {
        const key = env.MB_KEY;
        if (!key) return new Response("MB_KEY lipsă — configurează secretul în Cloudflare (wrangler secret put MB_KEY)", { status: 500, headers: { ...corsHeadersFor(request, env), ...securityHeaders() } });
        let targetPath = path.startsWith("/api/meteoblue/") ? path.replace("/api/meteoblue/", "") : path.replace("/mb/", "");
        if(!/^(basic-1h|basic-day|trend-day|current)/.test(targetPath.split('?')[0].split('/')[0])){
          return jsonWithCors({ error:'Meteoblue path not allowed' }, 400, request, env);
        }
        const qs=new URLSearchParams(url.search);
        qs.set('apikey', key);
        if(!qs.has('format')) qs.set('format','json');
        const filtered=new URLSearchParams();
        for(const [k,v] of qs.entries()){ if(['lat','lon','apikey','format','asl','tz','forecast_days'].includes(k)) filtered.set(k,v); }
        const target = `${MB_BASE}/${targetPath.split('?')[0]}?${filtered.toString()}`;
        const controller=new AbortController(); const tm=setTimeout(()=>controller.abort(), 10000);
        try{
          const res = await fetch(target, { headers: { "Accept": "application/json" }, signal: controller.signal });
          clearTimeout(tm);
          const text=await res.text();
          let data; try{ data=JSON.parse(text);}catch{ data={ error:text.slice(0,500)}; }
          return jsonWithCors(data, res.status, request, env);
        }catch(e){
          clearTimeout(tm);
          if(e.name==='AbortError') return jsonWithCors({ error:'Meteoblue timeout' }, 504, request, env);
          return jsonWithCors({ error:e.message }, 500, request, env);
        }
      }

      // Radar passthrough info
      if (path.startsWith("/api/radar/")) {
        return jsonWithCors({ ok:true, info:'Radar is client-side via RainViewer; no proxy needed' }, 200, request, env);
      }

      return new Response("Not found", { status: 404, headers: { ...corsHeadersFor(request, env), ...securityHeaders() } });
    } catch (err) {
      return new Response(`Eroare worker: ${err.message}`, { status: 500, headers: { ...corsHeadersFor(null, env), ...securityHeaders() } });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAndPush(env));
  }
};

async function checkAndPush(env) {
  try {
    if (!env.PUSH_KV || !env.VAPID_PRIVATE || !env.VAPID_PUBLIC) return;
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
    if (sig === lastSig) return;
    const store = (await env.PUSH_KV.get(SUBS_KEY, "json")) || {};
    const hashes = Object.keys(store);
    let dead = [];
    for (const h of hashes) {
      const ok = await sendTicklePush(store[h], env);
      if (!ok) dead.push(h);
    }
    for (const h of dead) delete store[h];
    if (dead.length) await env.PUSH_KV.put(SUBS_KEY, JSON.stringify(store));
    if (list.length) await env.PUSH_KV.put("hub_push_last_sig", sig);
  } catch {}
}
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
  } catch { return false; }
}
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
