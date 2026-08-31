Iată un README complet actualizat pentru proiectul tău:

````markdown
# 🌤️ Hub Hibrid PRO — Weather Intelligence Platform

[![Version](https://img.shields.io/badge/version-2.5.1-blue.svg)](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-124%20passing-brightgreen.svg)](#-dezvoltare--verificare)
[![PWA](https://img.shields.io/badge/PWA-installable-purple.svg)](#-instalare--utilizare)
[![Languages](https://img.shields.io/badge/languages-7-orange.svg)](#-ux--pwa)


**Accesare online:**
- 🌐 [Aplicația Live]
> ### 🌐 [Accesează Aplicația Live Aici](https://tinyurl.com/vremea-tg-neamt)
> ###📱 [Vezi direct aici!](https://acc1311.github.io/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/)
> ### 📱 [Aplicație Android direct aici!](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/releases/download/1/Hub_Hibrid_PRO_-_Meteo_Multi-Surs__v1.0.1.APK)


> **PRO v2.5.1** — Platformă hibridă profesională de prognoză meteo: **ANM FIRST** în România, **MULTI-MODEL** global, motor de fuziune, încredere 0-100, provenance și verificare automată.

**Hub Hibrid PRO** este o aplicație web meteo PWA (vanilla, single-file) care combină modelele globale de prognoză (ICON-D2/EU, ECMWF, WeatherAPI, Meteoblue) cu stațiile meteorologice oficiale din România (ANM) pentru cea mai precisă imagine a vremii — plus radar animat, hartă avertizări pe județe și notificări push.

Aplicația rezolvă problema erorilor de localizare (ex: confuzia între *Târgu Neamț* și *Târgu Jiu*) printr-un sistem de mapare și filtrare strictă.

---

## 📋 Cuprins

- [✨ Funcționalități](#-funcționalități)
- [📡 Surse de Date](#-surse-de-date)
- [🚀 Instalare & Utilizare](#-instalare--utilizare)
- [🧪 Dezvoltare & Verificare](#-dezvoltare--verificare)
- [🏗️ Arhitectură](#️-arhitectură)
- [☁️ Cloudflare Worker](#️-cloudflare-worker-proxy-api)
- [🔐 Securitate & CSP](#-securitate--csp)
- [📋 Changelog](#-changelog)
- [📄 Licență](#-licență)
- [🙏 Mulțumiri](#-mulțumiri)

---

## ✨ Funcționalități

### 🎯 Precizie & Date

| Funcționalitate | Descriere |
|---|---|
| **Smart Match** | Potrivire strictă oraș → stație ANM exactă |
| **Fuziune 4+ surse** | ICON-D2/EU + ECMWF + WeatherAPI + Meteoblue + stații ANM |
| **Nowcast minutely_15** | Bandă „precipitații în ~X min" pe următoarele 3h (ICON-EU) |
| **Probabilitate ensemble** | % derivat din membrii ECMWF, nu doar media modelului |
| **Probabilitate max pe zi** | Bannerul arată max % pentru restul zilei, nu doar ora curentă |
| **Consens modele** | Badge „n/3 modele de acord · dispersie ±x°" |
| **Normale climatice ERA5** | Istoric 7 zile vs climatologia 1991–2020 reală |
| **Indice Căldură (ITU)** | Heat Index Rothfusz cu praguri românești |

### 🌧️ Radar & Hărți

| Funcționalitate | Descriere |
|---|---|
| **RainViewer complet** | Radar animat (past + nowcast) **și Satelit IR**, 9 scheme culori, toggle zăpadă, selector interval (-2h…+30m / -1h / -30min), play/pause + timeline seek |
| **Harta ANM pe județe** | Colorată după cod galben/portocaliu/roșu, cu **temperaturi live de la stațiile ANM** (marker-e colorate după praguri) |
| **MeteoRadar RO + Windy** | Embed-uri alternative |

### ⚠️ Avertizări

| Funcționalitate | Descriere |
|---|---|
| **Alerte ANM oficiale** | + alerte locale automate (praguri CAPE/vânt/vizibilitate/WMO) |
| **Badge în header** | Punct pulsant dacă județul locației curente are avertizare activă |
| **Panou minimizabil** | Header „N avertizări active" (implicit minimizat, starea persistă) |

### 📱 UX & PWA

| Funcționalitate | Descriere |
|---|---|
| **Cache offline instant** | Ultimele date apar imediat la deschidere, apoi refresh în fundal |
| **Buton GPS** | „Locația mea" cu reverse-geocoding automat |
| **Card Polen** | 6 alergeni (alun, mesteacăn, iarbă, pelin, măslin, ambrozie) |
| **Comparație favorite** | Tabel temp/vânt/precip pentru toate locațiile salvate |
| **Export CSV/JSON/PNG** | Hourly + daily + metadata; PNG cu avertizări incluse |
| **Auto dark mode** | Urmează `prefers-color-scheme` până alegi explicit o temă |
| **Web Push ANM** | Notificări chiar și cu aplicația închisă (cron 15 min) |
| **PWA instalabilă** | Badge temperatură pe iconiță, skeleton loading |
| **Autocomplete tastatură** | + ARIA; **7 limbi** (ro/en/it/fr/de/es/hu) |

---

## 📡 Surse de Date

| Sursă | Rol | Date furnizate |
|---|---|---|
| **Open-Meteo ICON-D2/EU** | 🎯 Primar | Temp, vânt, precipitații, UV, nowcast minutely_15, 120h |
| **Open-Meteo ECMWF** | 🌍 Ensemble | Probabilități din membri, extensie prognoză |
| **Open-Meteo Archive/ERA5** | 📚 Climatologie | Normale 1991–2020, istoric 7 zile |
| **Open-Meteo Air Quality** | 🌱 Polen/AQI | PM2.5, PM10, O₃, NO₂, SO₂, CO + polen |
| **WeatherAPI** | 🌐 Global | Condiții text, AQI US-EPA, astro, reverse geocoding |
| **Meteoblue** | 📈 Orar | Temperaturi orare detaliate |
| **ANM (proxy Cloudflare)** | 🇷🇴 Oficial RO | Stații: temp, vânt, presiune, umiditate + avertizări județene |
| **RainViewer** | 🌧️ Radar/Satelit | Tile-uri radar past+nowcast, satelit IR |
| **BigDataCloud** | 📍 Reverse geo | Nume locație + județ pentru GPS |

---

## 🚀 Instalare & Utilizare

Proiect **100% vanilla** — fără framework-uri, fără build. Totul rulează direct în browser.

```bash
# 1. Clonează repository-ul
git clone https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue.git
cd Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue

# 2. Deschide index.html în browser sau servește local:
python -m http.server 8000     # Python
# sau
npx serve                      # Node.js
```

**Accesare online:**
- 🌐 [Aplicația Live]
> ### 🌐 [Accesează Aplicația Live Aici](https://tinyurl.com/vremea-tg-neamt)
> ###📱 [Vezi direct aici!](https://acc1311.github.io/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/)
> ### 📱 [Aplicație Android direct aici!](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/releases/download/1/Hub_Hibrid_PRO_-_Meteo_Multi-Surs__v1.0.1.APK)

---

## 🧪 Dezvoltare & Verificare

```bash
npm install          # ESLint 9 + Prettier + Vitest
npm run verify       # lint + sintaxă inline JS + 124 teste unitare
npm run test:watch   # teste în mod watch
```

**CI:** `.github/workflows/ci.yml` rulează `npm run verify` la fiecare push.

---

## 🏗️ Arhitectură

### Structură modulară (v2.3+)

```
├── index.html              # UI (monolit compat + import src/app/main.js ESM)
├── src/
│   ├── app/main.js         # entry ESM
│   ├── weather/            # weather-engine, weather-schema, verification, nowcast-engine
│   ├── fusion/             # fusion-engine, confidence-engine, quality
│   ├── providers/          # anm/, openmeteo/, weatherapi/, meteoblue/, radar/
│   ├── alerts/             # alert-engine
│   ├── core/               # cache, health, observability
│   └── utils/              # geo, time, units
├── config/                 # providers, thresholds, regions, units, refresh
├── worker/src/             # modular Cloudflare Worker
├── cloudflare-worker.js    # single-file PRO deploy
├── js/app-logic.js         # logică pură legacy (compat, UMD)
├── sw.js                   # Service Worker v5 (stale-while-revalidate)
├── tests/                  # 124 teste Vitest
└── docs/                   # documentație detaliată
```

### Module-cheie PRO

| Modul | Descriere |
|---|---|
| **Weather Decision Engine** | `src/weather/weather-engine.js` — ANM FIRST vs GLOBAL, ranking dinamic pe freshness/distanță/rezoluție/istoric |
| **Fusion Engine** | `src/fusion/fusion-engine.js` — FieldFusionPolicy per param, outlier/temporal/spatial, consensus + spread |
| **Confidence 0-100** | `confidence-engine.js` — sourceQuality + freshness + agreement + observation + forecast |
| **Provenance** | Fiecare valoare `{source, sourceType, timestamp, modelRun, confidence, contributingSources, qualityFlags}` + „Why this value?" |
| **Alert Engine** | `OFFICIAL ANM` > `HUB DERIVED` + severity 0-100 + „Why this alert?" |
| **ANM Adapter** | `AnmProvider` cu `WeatherProvider` interface + haversine + elevation correction |
| **Health Center** | `src/core/health.js` — status/latency/failureRate per provider |
| **Cache L1→L4** | memory → storage → SW → edge, TTL per tip |
| **Worker PRO** | Strict CORS allowlist, path/query allowlist, rate-limit, CSP, circuit breaker |

**Documentație detaliată:** `docs/ARCHITECTURE.md` · `docs/DATA-SOURCES.md` · `docs/ANM-INTEGRATION.md` · `docs/FUSION-ENGINE.md` · `docs/ALERT-ENGINE.md` · `docs/SECURITY.md` · `docs/DEPLOYMENT.md`

---

## ☁️ Cloudflare Worker (proxy API)

Worker-ul (`cloudflare-worker.js`) ține cheile server-side:

| Rută | Destinație |
|---|---|
| `/anm` | meteoromania.ro — stații |
| `/anm-warnings` | avertizările oficiale ANM |
| `/wapi/*` | api.weatherapi.com (secret `WAPI_KEY`) |
| `/mb/*` | my.meteoblue.com (secret `MB_KEY`) |
| `/push/*` | Web Push: allowlist origini FCM/Mozilla/Apple, cap 5000 subs, rate-limit 10/oră/IP |

```bash
# Deploy
npm i -g wrangler
wrangler login
wrangler deploy

# Setează secrets
wrangler secret put WAPI_KEY   # cheia WeatherAPI
wrangler secret put MB_KEY     # cheia Meteoblue
```

**Configurare push (o singură dată):**
1. KV namespace `hub_push_kv` → legat ca variabilă `PUSH_KV`
2. Secret `VAPID_PRIVATE` (JWK JSON) + variabilă `VAPID_PUBLIC`
3. Cron Trigger: `*/15 * * * *`

---

## 🔐 Securitate & CSP

- CSP configurat explicit (script/style/font/img/connect/frame/worker/manifest), **fără `'unsafe-eval'`**
- Toate interfațările cu conținut extern trec prin `escapeHtml()`
- Cheile API **nu există în client** — totul prin worker
- Worker cu rate-limit per IP + validare push

---

## 📋 Changelog

### v2.5.1 — Curent
- Fixed legacy inline `isRomania` runtime error
- Protected official ANM nowcasting invocation
- Version metadata bumped

### v2.4.0 — Robust Weather Intelligence Upgrade
- MAD-based outlier detection și robust weighted fusion
- Persistent model-skill/verification data în browser storage
- Explainable provenance fields și calibrated confidence inputs
- Official ANM nowcasting bridge prin pagina publică ANM

### v2.3 — Enterprise
- Weather Decision Engine (ANM FIRST vs GLOBAL)
- Fusion Engine cu outlier detection
- Confidence 0-100 cu 5 factori
- Provenance complet per valoare
- Alert Engine cu severity
- 124 teste unitare
- Arhitectură modulară ESM

### v2.2 — Radar & Hartă ANM
- RainViewer panou opțiuni (Radar ↔ Satelit IR, 9 scheme culori)
- Temperaturi live pe harta ANM
- Avertizări minimizabile

### v2.1 — Precizitate & ITU
- Probabilitate max pe zi pentru precipitații
- Indice Căldură Rothfusz cu clasificare RO

### v2.0 — Arhitectură & Securitate
- Nowcast minutely_15, probabilitate ensemble
- `safeFetch()` global, XSS protection, CSP întărit
- ESLint 9 + Prettier + Vitest + CI

---

## 📄 Licență

Open-source sub licența [MIT](LICENSE).

---

## 🙏 Mulțumiri

- **Cătălin Ardei (YO8ACR)** — accesul la datele colectate și suport tehnic
- **ANM Meteoromania** — datele meteorologice oficiale din România
- **Open-Meteo** — API-ul gratuit și precis ICON-EU/ECMWF
- **Comunitatea open-source** — librăriile și inspirația

---

> ⭐ **Dacă îți place proiectul, dă-i un Star!**
> 🐛 **Găsești o problemă?** Deschide un [Issue](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/issues)
````

## v2.5.1
- Fixed legacy inline `isRomania` runtime error by exposing the region helper on `window`.
- Protected official ANM nowcasting invocation when the helper is not yet available.
- Version metadata bumped to 2.5.1.
