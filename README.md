# 🌤️ Hub Hibrid PRO — Weather Intelligence Platform v2.3 (YO8ACR)

> **PRO v2.3 — Transformare completă în platformă hibridă profesională — ANM FIRST în România, MULTI-MODEL global, cu motor de fuziune, încredere 0-100, provenance și verificare.**  
> Vezi `docs/ARCHITECTURE.md` · `docs/DATA-SOURCES.md` · `docs/ANM-INTEGRATION.md` · `docs/FUSION-ENGINE.md`

> ### 🌐 [Accesează Aplicația Live Aici](https://tinyurl.com/vremea-tg-neamt)
> ### 🔗 [Vezi direct aici!](https://acc1311.github.io/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/)
> ### 🔗 [Aplicație Android direct aici!](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/releases/download/1/Hub_Hibrid_PRO_-_Meteo_Multi-Surs__v1.0.1.APK)

**Hub Hibrid PRO** este o aplicație web meteo PWA (vanilla, single-file) care combină modelele globale de prognoză cu stațiile meteorologice oficiale din România (ANM) pentru cea mai precisă imagine a vremii — plus radar animat, hartă avertizări pe județe și notificări push.

Aplicația rezolvă problema erorilor de localizare (ex: confuzia între *Târgu Neamț* și *Târgu Jiu*) printr-un sistem de mapare și filtrare strictă.

---

## ✨ Funcționalități

### Precizie & date
* 🎯 **Smart Match** — potrivire strictă oraș → stație ANM exactă
* 📊 **Fuziune 4+ surse** — ICON-D2/EU + ECMWF + WeatherAPI + Meteoblue + stații ANM
* ⏱️ **Nowcast minutely_15** — bandă „precipitații în ~X min" pe următoarele 3h (ICON-EU)
* 🎲 **Probabilitate ensemble** — % derivat din membrii ECMWF, nu doar media modelului
* 💧 **Probabilitate max pe zi** — bannerul arată max % pentru restul zilei, nu doar ora curentă
* 👁️ **Consens modele** — badge „n/3 modele de acord · dispersie ±x°"
* 📈 **Normale climatice ERA5** — istoric 7 zile vs climatologia 1991–2020 reală
* 🌡️ **Indice Căldură (ITU)** — Heat Index Rothfusz cu praguri românești (fără disconfort → pericol caniculă)

### Radar & hărți
* 🌧️ **RainViewer complet** — radar animat (past + nowcast) **și Satelit IR**, 9 scheme culori, toggle zăpadă, selector interval (-2h…+30m / -1h / -30min), play/pause + timeline seek
* 🗺️ **Harta ANM pe județe** — colorată după cod galben/portocaliu/roșu, deschisă implicit, cu **temperaturi live de la stațiile ANM** (marker-e colorate după praguri, toggle 🌡️)
* 🌐 **MeteoRadar RO + Windy** — embeduri alternative

### Avertizări
* ⚠️ **Alerte ANM oficiale** + alerte locale automate (praguri CAPE/vânt/vizibilitate/WMO)
* 🟡 **Badge în header** — punct pulsant dacă județul locației curente are avertizare activă
* 📂 **Panou minimizabil** — header „N avertizări active" (implicit minimizat, starea persistă); fiecare avertizare se poate colapsa individual

### UX & PWA
* ⚡ **Cache offline instant** — ultimele date apar imediat la deschidere („⚡ Date locale de la HH:MM"), apoi refresh în fundal
* 📍 **Buton GPS** — „Locația mea" cu reverse-geocoding automat
* 🌱 **Card Polen** — 6 alergeni (alun, mesteacăn, iarbă, pelin, măslin, ambrozie) din Air Quality API
* 📊 **Comparație favorite** — tabel temp/vânt/precip pentru toate locațiile salvate
* 💾 **Export CSV/JSON/PNG** — hourly + daily + metadata; PNG cu avertizări incluse
* 🌗 **Auto dark mode** — urmează `prefers-color-scheme` până alegi explicit o temă
* 🔔 **Web Push ANM** — notificări chiar și cu aplicația închisă (cron 15 min pe worker)
* 📱 **PWA instalabilă** — badge temperatură pe iconiță, skeleton loading, fundal dinamic
* ⌨️ **Autocomplete tastatură** + ARIA; 🌍 **7 limbi** (ro/en/it/fr/de/es/hu); unități vânt km/h·m/s·mph·kn

---

## 📡 Surse de Date

| Sursă | Rol | Date furnizate |
|-------|-----|---------------|
| **Open-Meteo ICON-D2/EU** | 🎯 Primar | Temp, vânt, precipitații, UV, nowcast minutely_15, 120h |
| **Open-Meteo ECMWF** | 🌍 Ensemble | Probabilități din membri, extensie prognoză |
| **Open-Meteo Archive/ERA5** | 📚 Climatologie | Normale 1991–2020, istoric 7 zile |
| **Open-Meteo Air Quality** | 🌱 Polen/AQI | PM2.5, PM10, O₃, NO₂, SO₂, CO + polen (Europa) |
| **WeatherAPI** | 🌐 Global | Condiții text, AQI US-EPA, astro, reverse geocoding |
| **Meteoblue** | 📈 Orar | Temperaturi orare detaliate |
| **ANM (proxy Cloudflare)** | 🇷🇴 Oficial RO | Stații: temp, vânt, presiune, umiditate + avertizări județene |
| **RainViewer** | 🌧️ Radar/Satelit | Tile-uri radar past+nowcast, satelit IR |
| **BigDataCloud** | 📍 Reverse geo | Nume locație + județ pentru GPS |

---

## 🚀 Instalare & Utilizare

Proiect 100% vanilla — fără framework-uri, fără build. Totul rulează direct în browser.

```bash
# 1. Clonează
git clone https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue.git
cd Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue

# 2. Deschide index.html în browser sau servește local:
python -m http.server 8000     # Python
npx serve                      # Node.js
```

### Dezvoltare & verificare
```bash
npm install          # ESLint 9 + Prettier + Vitest
npm run verify       # lint + sintaxă inline JS + 124 teste unitare
npm run test:watch   # teste în mod watch
```

CI: `.github/workflows/ci.yml` rulează `npm run verify` la fiecare push.

### Nou în v2.3 PRO — Enterprise
| Modul | Detalii |
|---|---|
| 🧠 **Weather Decision Engine** | `src/weather/weather-engine.js` — ANM FIRST vs GLOBAL, ranking dinamic pe freshness/distanță/rezoluție/istoric |
| 🔀 **Fusion Engine** | `src/fusion/fusion-engine.js` — FieldFusionPolicy per param, outlier/temporal/spatial, consensus `n/tot` + spread + percentiles |
| 💯 **Confidence 0-100** | `confidence-engine.js` — sourceQuality + freshness + agreement + observation + forecast, niciodată `100% accuracy` |
| 📦 **Provenance** | Fiecare valoare `{source, sourceType, timestamp, modelRun, confidence, contributingSources, qualityFlags}` + `Why this value?` |
| 🛡️ **Alert Engine** | `OFFICIAL ANM` > `HUB DERIVED` + severity 0-100 + `Why this alert?` |
| 🗺️ **ANM Adapter** | `AnmProvider` cu `WeatherProvider` interface + haversine + elevation correction |
| 📡 **Health Center** | `src/core/health.js` — status/latency/failureRate per provider, `/api/health` |
| 💾 **Cache L1→L4** | memory → storage → SW → edge, TTL per tip (`config/refresh.js`) |
| 🔒 **Worker PRO** | Strict CORS allowlist, path/query allowlist, rate-limit, `/api/*` + legacy compat, CSP, circuit breaker |
| 🧪 **124 teste** | `tests/pro.test.js` + `pro-extra.test.js` — ANM, fuziune, outlier, DST, internațional, security (vezi `docs/TESTING.md`) |
| 📚 **Docs** | `ARCHITECTURE.md` · `DATA-SOURCES.md` · `ANM-INTEGRATION.md` · `FUSION-ENGINE.md` · `ALERT-ENGINE.md` · `SECURITY.md` · `DEPLOYMENT.md` |
| 🧩 **Modular Frontend** | `src/app/main.js` ESM + `src/components/*` + `sw.js v5` stale-while-revalidate |

---

## 🆕 Changelog v2.1 / v2.2

### v2.2 — Radar opțiuni, hartă ANM cu temperaturi, avertizări minimizabile
| Funcționalitate | Detalii |
|----------------|---------|
| 🛰️ **RainViewer panou opțiuni** | Comutare Radar ↔ Satelit IR, 9 scheme culori (persistente), zăpadă on/off, interval de timp (tot / -1h / -30min); datele se descarcă o dată, comutările sunt instant |
| 🌡️ **Temperaturi pe harta ANM** | Marker-e pill colorate după praguri (violet ≤-10° … roșu >28°) pentru toate stațiile ANM, tooltip cu nume + valoare exactă, buton toggle 🌡️ |
| ⚠️ **Avertizări minimizabile** | Header cu contor (implicit **minimizat**, starea persistă în localStorage); colaps individual pe titlu |
| 🗺️ **Hartă ANM mărită** | 500px desktop / 380px mobil, secțiune deschisă automat după ce devine vizibilă; `initAnmMap` așteaptă Leaflet (defer-safe) |

### v2.1 — Fix-uri precizitate + Confort Termic ITU
| Funcționalitate | Detalii |
|----------------|---------|
| 💧 **Șanse precipitații corecte** | Bannerul + grila afișează probabilitatea **maximă pentru restul zilei** (`_maxPrecipToday`), nu valoarea orei curente — fix pentru „0% dar e avertizare de averse" |
| 🌡️ **Confort Termic cu ITU** | Rând nou Indice Căldură (Rothfusz) cu clasificare RO: Fără disconfort <20° · Ușor 20–24° · Moderat 24–28° · Ridicat 28–32° · Foarte ridicat 32–36° · Pericol >36°; rând Umiditate; textele corectate |

### v2.0 — Precizie, securitate, arhitectură (17 îmbunătățiri)
<details>
<summary>Vezi lista completă v2.0</summary>

* **Precizie:** nowcast minutely_15, probabilitate ensemble ECMWF, normale climatice ERA5, consens modele
* **Securitate:** `safeFetch()` global (timeout+retry), XSS închis cu `escapeHtml()`, CSP întărit, worker cu rate-limit per IP + validare push
* **Arhitectură:** `js/app-logic.js` extras (lint-uibil/testabil), pipeline paralel `Promise.allSettled`, zero monkey-patching, ESLint 9 + Prettier + Vitest + CI GitHub Actions
* **UX:** autocomplete tastatură + ARIA, unități vânt, locale complete 7 limbi, pauză particule la tab ascuns
</details>

---

## ☁️ Cloudflare Worker (proxy API)

Worker-ul (`cloudflare-worker.js`) ține cheile server-side:

| Rută | Destinație |
|------|-----------|
| `/anm` | meteoromania.ro — stații |
| `/anm-warnings` | avertizările oficiale ANM |
| `/wapi/*` | api.weatherapi.com (secret `WAPI_KEY`) |
| `/mb/*` | my.meteoblue.com (secret `MB_KEY`) |
| `/push/*` | Web Push: allowlist origini FCM/Mozilla/Apple, validare base64url, cap 5000 subs, rate-limit 10/oră/IP via KV |

```bash
npm i -g wrangler
wrangler login
wrangler deploy
wrangler secret put WAPI_KEY   # cheia WeatherAPI
wrangler secret put MB_KEY     # cheia Meteoblue
```

Configurare push (o singură dată):
1. KV namespace `hub_push_kv` → legat ca variabilă `PUSH_KV`
2. Secret `VAPID_PRIVATE` (JWK JSON) + variabilă `VAPID_PUBLIC`
3. Cron Trigger: `*/15 * * * *`

După deploy, actualizează `API_PROXY` din `index.html`.

---

## 🏗️ Arhitectură v2.3 PRO

```
├── index.html              # UI (monolit compat + import src/app/main.js ESM)
├── src/
│   ├── app/main.js         # entry ESM
│   ├── weather/weather-engine.js, weather-schema.js, verification.js, nowcast-engine.js
│   ├── fusion/fusion-engine.js, confidence-engine.js, quality.js
│   ├── providers/anm/*, openmeteo/*, weatherapi/*, meteoblue/*, radar/*
│   ├── alerts/alert-engine.js
│   ├── core/cache.js, health.js, observability.js
│   └── utils/geo.js, time.js, units.js
├── config/                 # providers, thresholds, regions, units, refresh
├── worker/src/             # modular Cloudflare Worker (index + routes + security)
├── cloudflare-worker.js    # single-file PRO deploy (legacy+new /api/* + health + strict CORS)
├── js/app-logic.js         # logică pură legacy (compat, UMD)
├── sw.js                   # Service Worker v5 (stale-while-revalidate + precache)
├── tests/pro.test.js + pro-extra.test.js # 124 teste Vitest
└── docs/                   # ARCHITECTURE, DATA-SOURCES, etc.
```

Funcții-cheie în `index.html`: `updateWeather()` (flux hibrid paralel), `fetchOpenMeteoAll()` (fuziune ICON-D2/EU/ECMWF), `renderAlerts()` + `countyLevels()` (avertizări + hartă), `loadRainViewerFrames()` / `_buildRvLayers()` (radar multi-strat), `initAnmMap()` + `_buildAnmTempMarkers()` (hartă + temperaturi), `_maxPrecipToday()` (probabilitate restul zilei), `calcHeatIndex()` (ITU, în app-logic.js).

---

## 🔐 Securitate & CSP

CSP configurat explicit (script/style/font/img/connect/frame/worker/manifest), fără `'unsafe-eval'`. Toate interfațările cu conținut extern trec prin `escapeHtml()`. Cheile API nu există în client — totul prin worker.

---

## 📄 Licență

Open-source sub licența [MIT](LICENSE).

## 🙏 Mulțumiri

* **Cătălin Ardei (YO8ACR)** — accesul la datele colectate și suport tehnic
* **ANM Meteoromania** — datele meteorologice oficiale din România
* **Open-Meteo** — API-ul gratuit și precis ICON-EU/ECMWF
* **Comunitatea open-source** — librăriile și inspirația

---

> ⭐ **Dacă îți place proiectul, dă-i un Star pe GitHub!**
> 🐛 Găsești o problemă? Deschide un [Issue](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/issues).
