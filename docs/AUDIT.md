# Audit Complet — Hub Hibrid YO8ACR — stare 2026-08-28

## 1. Inventar funcții existente (index.html ~8621 linii)

| Feature | Current Implementation | Problem | Target Module | Target Behavior | Test Required |
|---|---|---|---|---|---|
| **Observații ANM** | `fetchANMData()` + `anmVal` / `parseAnmWind` / `parseAnmPressure` inline + `getClosestStation` euclidian | Fără model Run, fără provenance, fără validare schemă, fără fallback weighting | `src/providers/anm/anm-client.js` + `anm-parser.js` | Normalizare în `WeatherSnapshot.current` cu provenance `{value,unit,source,observationAge,confidence}` + schema validation + timeout+retry | parser tests, station matching, stale detection |
| **Avertizări ANM** | `fetchANMWarnings()` + `parseANMWarnings()` multiline HTML parsing | Monolit în index.html, fără separare official/derived, fără severity engine | `src/providers/anm/anm-alerts.js` + `src/alerts/alert-engine.js` | `_anmSplitSections`, `_anmLevelFromAttrs`, `AlertEngine.createOfficial()` + severity 0-100 | ANM parsing 12 cases, multi-color split, national detection |
| **Smart station matching** | `CITY_MAP` + `findStationByName` + `getClosestStation` euclidian (deg) | Fără distanță haversine, fără altitudine, fără confidence, false positives Târgu Neamț/Jiu | `src/providers/anm/station-matcher.js` | haversine km + elevation diff + name exact > fuzzy + confidence 0-100 | exact match, fuzzy, distance threshold 0.35°, city map |
| **Open-Meteo fusion** | `fetchOpenMeteoAll()` 3 Promise.allSettled D2/EU/ECMWF ensemble + `_fusionValue` weighted avg | Weights hardcodate 0.5/0.32/0.18, fără performance-based, fără FieldFusionPolicy per param, fără outlier detection | `src/fusion/fusion-engine.js` | `FieldFusionPolicy` per param + quality scoring + outlier + consensus spread + provenance | fusion weighted, outlier, missing members |
| **Meteoblue / WeatherAPI** | `fetch` via `/mb/*` + `/wapi/*` fără interfață comună | UI cunoaște structura raw, fără adapter | `src/providers/weatherapi/client.js`, `src/providers/meteoblue/client.js` implem `WeatherProvider` | `WeatherProvider` interfață standard + normalized schema | schema validation fallback |
| **Radar** | `loadRainViewerFrames()` + `_buildRvLayers` + satelit, Windy, MeteoRadar iframe | Single provider logic în UI, fără abstraction, fără ANM radar official | `src/providers/radar/rainviewer.js` + `src/maps/radar-controller.js` | `RadarProvider` abstraction + `RadarLayer` enum + ANM official tag | radar frames, color, range filter |
| **Prognoză orară** | `_hourlyDataFull` global + `renderHourlyCurrentView()` + SVG inline | Monolit, fără module, fără 24h/48h/120h availability check | `src/weather/hourly-engine.js` + `src/charts/hourly-chart.js` | HourlyEngine cu `getSlice()` + availability per source + confidence per hour | hourly slicing, missing hours |
| **Prognoză zilnică** | `buildOMDays()` + `renderForecastOM()` hybrid ICON-EU/ECMWF | Lipsă ECMWF ensemble percentiles, fără scenario best/most/worst | `src/weather/daily-engine.js` | daily-engine + ensemble stats P10/50/90 | daily fusion 10 days |
| **Nowcasting** | `renderNowcastStrip()` minutely_15 12 segmente 3h | Fără prioritate ANM nowcasting, fără probabilitate ensemble | `src/weather/nowcast-engine.js` | ANM > radar nowcast > ICON high-res > global | nowcast priority |
| **AQI / Polen** | `renderAqiDetail()` + `renderPollen()` direct fetch air-quality | Fără provider abstraction, fără fallback | `src/providers/openmeteo/air-quality.js` | AQI provider + provenance | AQI mapping |
| **Favorite + Local storage** | `appState.favorites` + `APP_STATE_KEY` v1 | Fără migrare, fără limită clară per location metadata, fără custom alert settings | `src/storage/favorites.js` | FavoritesStore cu CRUD + versioning | CRUD, persistence |
| **PWA / Service Worker** | `sw.js` v4 network-first + precache 5 files | Fără versioning robust, fără stale-while-revalidate, fără background sync, fără update notification | `src/pwa/service-worker.js` + `sw.js` v5 | versioning + SWR + offline shell + push tickle | SW lifecycle |
| **Notificări** | `HubNotif` + `HubPush` cu VAPID + KV | Fără categorii per tip, fără allowlist strict per origine | `src/notifications/push-manager.js` | categories ANM Official / Hub Derived / Rain imminent etc + per category opt-in | push validation, rate limit |
| **Unități / i18n** | `LANG` object 7 limbi inline + `currentUnit` global | Texte împrăștiate, fără JSON catalogs, fără unit central | `config/units.js` + `src/i18n/catalog.js` | JSON translation catalogs + `t(key)` central | i18n fallback |
| **Cache** | `anmCache` 5min + `anmWarnCache` 15min memory only + localStorage snapshot | Fără L1/L2/L3/SW edge, fără TTL per tip | `src/core/cache.js` | 4-level cache with TTL map | TTL, invalidation |
| **Security** | CSP meta, `escapeHtml()`, `safeFetch` timeout+retry, worker rate-limit + allowlist | `Access-Control-Allow-Origin: *` în worker, fără CORS strict per origin, fără circuit breaker | `worker/src/security.js` | strict CORS allowlist, CSP, schema validation, circuit breaker, timeout | CORS, XSS, rate-limit |
| **Health / Observability** | none | Fără metrics | `src/core/health.js` + `src/core/observability.js` | provider status/latency/failureRate/cacheHit/fallbackCount | health reporting |
| **UI / Design System** | single index.html 1200 linii CSS + inline style | Monolit, fără componente, fără design tokens | `src/components/*` + `src/app/theme.css` | CSS variables design system + component isolation | smoke tests |
| **Worker** | `cloudflare-worker.js` 333 linii monolit | Toate rutele într-un bloc, fără module separation, fără `/api/health` | `worker/src/*` | modular routes `/api/anm/*`, `/api/models/*`, `/api/health` | worker tests |

## 2. Bugs / Quality Audit

- Duplicate `setRadarLayer()` defined twice (line 3485+3541) — second overwrites first, loses RV color logic
- `safeFetch` not used for all fetches: `fetch('https://api.rainviewer.com/...')` plain fetch fără timeout (race condition)
- `fetchOpenMeteoAll` weights hardcodate without performance derivation
- `CITY_MAP` normalization not applied consistently: query `"târgu  neamț"` double space fails mapping
- `getClosestStation` uses euclidian deg distance not haversine → error at high lat
- `__hourlyTimes` global leaking (tooltip dependency)
- No validation for `currentCoords` before fetch → `NaN` in URL if unset
- CSP `Permissions-Policy: geolocation=()` disables geolocation despite `locateMe()` feature
- `trustPanelState` global mutable without versioning
- `localStorage` keys scattered: `hub_theme`, `hub_lang`, `hub_unit`, `hub_ro_geo`, `hub_model_comp`, `hub_last_city`, `hub_snapshot`, `hub_alerts_min`, `hub_visits`, `hub_install_dismissed`, `hub_notif_enabled`, `hub_push_enabled` → no central inventory
- `setInterval` leaks: multiple `startAutoRefresh()` calls fără clear anterior în failure path
- Race condition `Promise.allSettled` pentru OM D2/EU/ECMWF — cache reuse 60min poate servi stale fară notificare user
- XSS: `innerHTML` assignments use `escapeHtml` but `smart-text` uses `escapeHtml` inconsistently; `forecast-scroll` innerHTML built from `condText` fără escape complet
- DST bug: `todayStr` uses local Date but Open-Meteo returns `Europe/Bucharest` — mismatch on DST transition hour
- `drawWindCompass` E/V swapped for RO locale? Check: SVG E at x= r+12 (right) is correct, V at cx-r-8 left — but label "V"should be west — ok
- `W`/`H` hardcoded for hourly SVG not responsive — overflow on small screens beyond scroll wrapper

## 3. Inventory Local Storage Keys (14 keys)
`hub_app_state_v1`, `hub_theme`, `hub_lang`, `hub_unit`, `hub_wind_unit`, `hub_last_city`, `hub_snapshot`, `hub_theme_explicit`, `hub_ro_geo`, `hub_model_comp`, `hub_alerts_min`, `hub_visits`, `hub_install_dismissed`, `hub_notif_enabled`, `hub_notif_sent`, `hub_push_enabled`

## 4. Worker Routes Inventory
`/anm` → ANM_URL, `/anm-warnings` → ANM_WARN_URL, `/wapi/*` → WAPI_BASE, `/mb/*` → MB_BASE, `/push/subscribe`, `/push/unsubscribe`, `/push/status`, cron `scheduled()` → `checkAndPush`

## 5. Definition of Done — prior gaps
- [x] ANM FIRST in Romania — partial (icon primar, but ANM only for temp/wind/pressure)
- [ ] Data provenance per field — missing (only global trust panel)
- [ ] Confidence 0-100 per value — partial (consensus badge only)
- [ ] Fallback transparent — partial (toast but no UI status)
- [ ] Model consensus per param — only temp via badge
- [ ] Ensemble percentiles — missing
- [ ] Forecast verification — missing
- [ ] Modular frontend — missing
- [ ] Tests 100+ — missing (0 tests existed, now 37-like via app-logic but not enough)
