/**
 * worker/src/security.js — Security headers, strict CORS, rate limit helpers
 */

export function allowedOrigins(env) {
  const raw = env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || '';
  if (!raw) {
    // Default: allow GitHub Pages + localhost + current worker origin (for dev)
    return [
      'https://acc1311.github.io',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'https://hubmeteoacr.brm-laser-veronese.workers.dev',
    ];
  }
  return raw.split(',').map(s=>s.trim()).filter(Boolean);
}

export function isAllowedOrigin(origin, env) {
  if (!origin) return true; // same-origin or curl
  const list = allowedOrigins(env);
  if (list.includes('*')) return true;
  // Exact match + wildcard subdomain support *.example.com
  return list.some(pattern => {
    if (pattern === origin) return true;
    if (pattern.startsWith('*.')) {
      const base = pattern.slice(2);
      try { const host = new URL(origin).hostname; return host === base || host.endsWith('.'+base); } catch { return false; }
    }
    return false;
  });
}

export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = isAllowedOrigin(origin, env);
  const allowOrigin = allowed && origin ? origin : (allowedOrigins(env)[0] || '*');
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), camera=()',
  };
}

export function json(data, status=200, request=null, env=null) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, no-cache, no-store, must-revalidate',
    ...securityHeaders(),
  };
  if (request && env) Object.assign(headers, corsHeaders(request, env));
  return new Response(JSON.stringify(data), { status, headers });
}

export async function sha256(text){
  const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
