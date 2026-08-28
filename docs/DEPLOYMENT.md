# DEPLOYMENT.md

## Local
```
python -m http.server 8000
# or
npx serve
# open http://localhost:8000
```

## Cloudflare Worker
```
npm i -g wrangler
wrangler login
wrangler deploy   # entry: cloudflare-worker.js (ESM, single-file PRO)
wrangler secret put WAPI_KEY
wrangler secret put MB_KEY
wrangler secret put VAPID_PRIVATE   # JWK JSON
```
Vars (Dashboard → Settings → Variables):
- `VAPID_PUBLIC` (base64url)
- `ALLOWED_ORIGINS` = `https://acc1311.github.io,https://yourdomain.com`
- `PUSH_KV` binding: KV namespace `hub_push_kv`

Cron Trigger: `*/15 * * * *`

Update `API_PROXY` in `index.html` after deploy:
```js
const API_PROXY = "https://your-worker.workers.dev";
```

## GitHub Pages
Push to `main` → Pages serves `index.html` + `src/*`. No build step.

## PWA
`sw.js v5` — stale-while-revalidate for API, cache-first for static. Bump `CACHE_NAME` on breaking change.

## Verification before deploy
```
npm run verify   # must be green: lint 0 errors, 124/124 tests, inline syntax OK
```
