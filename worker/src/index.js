/**
 * worker/src/index.js — Modular Cloudflare Worker
 * YO8ACR Weather Hub PRO — routes: /api/anm/*, /api/weatherapi/*, /api/meteoblue/*, /api/radar/*, /api/health, /push/*
 */

import { handleAnmObservations } from './routes/anm.js';
import { handleAnmWarnings } from './routes/anm-warnings.js';
import { handleWeatherApi } from './routes/weatherapi.js';
import { handleMeteoblue } from './routes/meteoblue.js';
import { handleHealth } from './routes/health.js';
import { handlePushSubscribe, handlePushUnsubscribe, handlePushStatus, scheduledPush } from './routes/push.js';
import { corsHeaders, json, isAllowedOrigin, securityHeaders } from './security.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...corsHeaders(request, env), ...securityHeaders() } });
    }

    // Strict CORS check for non-GET or sensitive routes
    try {
      // Legacy + new API routes
      // 1. Health — open
      if (path === '/api/health' || path === '/health') {
        const res = await handleHealth(request, env);
        return withCors(res, request, env);
      }

      // 2. Web Push
      if (path === '/push/subscribe' || path === '/api/push/subscribe') {
        if (!isAllowedOrigin(origin, env) && origin !== '') return json({ ok:false, error:'Origin not allowed' }, 403, request, env);
        const res = await handlePushSubscribe(request, env);
        return withCors(res, request, env);
      }
      if (path === '/push/unsubscribe' || path === '/api/push/unsubscribe') {
        if (!isAllowedOrigin(origin, env) && origin !== '') return json({ ok:false, error:'Origin not allowed' }, 403, request, env);
        const res = await handlePushUnsubscribe(request, env);
        return withCors(res, request, env);
      }
      if (path === '/push/status' || path === '/api/push/status') {
        const res = await handlePushStatus(request, env);
        return withCors(res, request, env);
      }

      if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405, headers: { ...corsHeaders(request, env), ...securityHeaders() } });
      }

      // 3. ANM — support legacy /anm and new /api/anm/observations
      if (path === '/anm' || path.startsWith('/anm/') || path === '/api/anm/observations' || path.startsWith('/api/anm/observations')) {
        const res = await handleAnmObservations(request, env);
        return withCors(res, request, env);
      }
      if (path === '/anm-warnings' || path.startsWith('/anm-warnings/') || path === '/api/anm/warnings' || path.startsWith('/api/anm/warnings') || path === '/api/anm/nowcasting') {
        const res = await handleAnmWarnings(request, env);
        return withCors(res, request, env);
      }

      // 4. WeatherAPI — legacy /wapi/* and new /api/weatherapi/*
      if (path.startsWith('/wapi/') || path.startsWith('/api/weatherapi/')) {
        const res = await handleWeatherApi(request, env);
        return withCors(res, request, env);
      }

      // 5. Meteoblue — legacy /mb/* and new /api/meteoblue/*
      if (path.startsWith('/mb/') || path.startsWith('/api/meteoblue/')) {
        const res = await handleMeteoblue(request, env);
        return withCors(res, request, env);
      }

      // 6. Radar metadata passthrough (optional)
      if (path.startsWith('/api/radar/')) {
        return json({ ok:true, info:'Radar is client-side via RainViewer; no proxy needed' }, 200, request, env);
      }

      return new Response('Not found', { status: 404, headers: { ...corsHeaders(request, env), ...securityHeaders() } });
    } catch (err) {
      return new Response(`Eroare worker: ${err.message}`, { status: 500, headers: { ...corsHeaders(request, env), ...securityHeaders() } });
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduledPush(env));
  },
};

function withCors(res, request, env) {
  const headers = new Headers(res.headers);
  const cors = corsHeaders(request, env);
  Object.entries(cors).forEach(([k,v])=> headers.set(k,v));
  Object.entries(securityHeaders()).forEach(([k,v])=> headers.set(k,v));
  return new Response(res.body, { status: res.status, headers });
}
