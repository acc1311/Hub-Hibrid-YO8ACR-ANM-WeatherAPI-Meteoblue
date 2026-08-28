# SECURITY.md

## API Keys server-side
`WAPI_KEY`, `MB_KEY` stored as Cloudflare Secrets (`wrangler secret put`), never in client. `VAPID_PRIVATE` JWK JSON secret, `VAPID_PUBLIC` var.

## CORS strict
Worker `corsHeadersFor(request, env)`:
- `ALLOWED_ORIGINS` CSV var (default: `https://acc1311.github.io`, `http://localhost:8000`, `+ workers.dev`)
- Supports `*.example.com` wildcard, echoes `Origin` if allowed, `Vary: Origin`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Max-Age: 86400`
- Push endpoints check `isAllowedOrigin(origin)` → 403 if not allowed

## CSP
`index.html` meta:
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com;
style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com;
font-src https://cdnjs.cloudflare.com https://unpkg.com data:;
img-src 'self' data: blob: https:;
connect-src 'self' https: wss:;
frame-src https://embed.windy.com https://radar.wo-cloud.com https://www.meteoradar.ro https://api.rainviewer.com;
worker-src 'self' blob:;
```
No `unsafe-eval`. All external content via `escapeHtml()`.

## Input validation
- `parseCoordinateInput` strict regex `^(-?\d{1,2}(?:\.\d{1,6})?),\s*(-?\d{1,3}(?:\.\d{1,6})?)$` + range 90/180
- `validPushSub` checks endpoint HTTPS, origin allowlist (FCM/Mozilla/Apple/WNS), `p256dh`/`auth` base64url length
- WAPI/Meteoblue path allowlist (`search/current/forecast.json` etc, `basic-1h` etc), query param allowlist
- ANM response schema validation: `features` array required else 502

## Rate limiting & abuse
- Push: `MAX_SUBS 5000`, `RATE_LIMIT_PER_HOUR 10` per IP via KV `rl_<hash>` TTL 7200, `PUSH_KV` binding required
- All fetches via `safeFetch` (timeout 12s, retry 1, AbortController)

## Output escaping
`escapeHtml(str)` replaces `& < > " '` in all user-controlled renders (`city-title`, `smart-text`, `alerts`, `favorites`).

## Edge security headers
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self)`

## Timeouts & circuit breaker
- ANM 12s, WAPI/Meteoblue 10s, OM via `safeFetch` 12s + retry 1
- `healthRegistry` counts `failureCount`, `fallbackCount`, switches `UNAVAILABLE` → `FALLBACK` UI 🟠
