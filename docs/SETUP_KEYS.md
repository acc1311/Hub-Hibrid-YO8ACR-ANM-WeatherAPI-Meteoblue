# SETUP_KEYS — Chei secrete Cloudflare Worker

**NU commita cheile în git.** Folosește `wrangler secret put`.

Cheile furnizate (exemplu — setează-le local, nu le publica):

- `WAPI_KEY = bdffdac051334f298e0175011261604`
- `MB_KEY = dTx4DkKZerufXShl`
- `VAPID_PUBLIC = BL65fORtxWkvw8fD2koz8Kjl4iueVYayPxJEyIHe1J9AgV57Na8cGYkO9b4NIexsorG9FEFBMsvIx4OniI_Uk_Q`
- `VAPID_PRIVATE = {"kty":"EC","x":"...","y":"...","crv":"P-256","d":"..."}`

## Pași

```bash
npm i -g wrangler
wrangler login
# din folderul cu cloudflare-worker.js
wrangler secret put WAPI_KEY      # apoi paste bdffdac...
wrangler secret put MB_KEY        # paste dTx4DkKZerufXShl
wrangler secret put VAPID_PRIVATE # paste JSON complet într-o linie

# Vars (Dashboard → Workers → Settings → Variables)
# VAPID_PUBLIC = BL65fORtxWkvw8fD2koz8Kjl4iueVYayPxJEyIHe1J9AgV57Na8cGYkO9b4NIexsorG9FEFBMsvIx4OniI_Uk_Q
# ALLOWED_ORIGINS = https://acc1311.github.io,http://localhost:8000
# PUSH_KV = binding KV namespace hub_push_kv

wrangler deploy
```

Verifică:
```
https://hubmeteoacr.brm-laser-veronese.workers.dev/api/health
https://hubmeteoacr.brm-laser-veronese.workers.dev/anm
https://hubmeteoacr.brm-laser-veronese.workers.dev/api/anm/warnings
```

`API_PROXY` în `index.html:3099` trebuie să fie `https://hubmeteoacr.brm-laser-veronese.workers.dev`.

## Local dev
```bash
python -m http.server 8000
# deschide http://localhost:8000 — NU file://
```
