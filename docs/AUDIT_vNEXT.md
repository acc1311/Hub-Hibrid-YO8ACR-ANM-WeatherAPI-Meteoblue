# AUDIT_vNEXT — Matrice CURRENT → TARGET (YO8ACR vNEXT)

| CURRENT FEATURE | CURRENT FILE | CURRENT STATUS | PROBLEM | TARGET MODULE | TARGET IMPLEMENTATION | TEST |
|---|---|---|---|---|---|---|
| ANM obs | `index.html` `fetchANMData()` | funcțional dar monolit, euclidian | fără provenance, fără haversine | `src/providers/anm/anm-provider.js:1` | `AnmProvider.fetchObservation()` + `micro-local.js` + haversine 50km | `pro.test.js` ANM parser 16 |
| ANM alerts | `index.html` `parseANMWarnings()` | funcțional, GIF split | fără severity, fără official/derived | `src/providers/anm/anm-alerts.js:1` + `src/alerts/alert-engine.js:1` | `enrichOfficial()` + severity 0-100 | 5 |
| ANM nowcast | lipsă oficial | model minutely_15 confundat | fără 3 niveluri | `src/weather/nowcast-engine.js:1` | `ANM OFFICIAL > RADAR > MODEL` | - |
| Station match | `index.html` `CITY_MAP`+euclidian | funcțional dar `Târgu Neamț` fals pozitiv | fără altitudine/confidence | `src/providers/anm/micro-local.js:1` | `microLocalCorrection()` + confidence | 4 |
| Fusion | `index.html` `fetchOpenMeteoAll()` weighted 0.5/0.32/0.18 | hardcodat, fără policy per param | fără outlier/temporal | `src/fusion/fusion-engine.js:1` | `FieldFusionPolicy` + `fuseField()` | 13 |
| Confidence | `trust-panel` static | parțial, fără 0-100 real | fără band | `src/fusion/confidence-engine.js:1` | `computeConfidence()` 5 factori | 7 |
| Verification | lipsă | — | fără skill DB | `src/weather/verification.js:1` + `src/verification/model-skill.js:1` | `MAE/RMSE` + `ModelSkillDB` | 7 |
| Dynamic weighting | hardcodat | — | fără justificare | `src/verification/dynamic-weighting.js:1` | `dynamicWeights()` base 60%+skill 40% | - |
| Ensemble | `memberPrecipProbability` | doar prob precip | fără P10-P90 | `src/fusion/ensemble.js:1` | `ensembleStats()` + `probAbove()` | - |
| Precip engine | `1%` afișat | fără amount/duration | fără nowcast | `src/fusion/precipitation-engine.js:1` | `buildPrecipitationReport()` | - |
| Radar | `RainViewer` only | single provider | fără ANM Radar | `src/providers/radar/rainviewer.js:1` + `src/maps/radar-controller.js` (index.html) | `RadarProvider` + 9 scheme | - |
| Model Center | lipsă | — | — | `src/maps/model-center.js:1` | `modelCenterStatus()` | - |
| Health | lipsă | — | — | `src/core/health.js:1` + `worker health.js` | `HealthRegistry` + `/api/health` | 3 |
| Worker | `cloudflare-worker.js` monolit | funcțional | `*` CORS permanent | `worker/src/index.js:1` modular | `*` GET, strict POST, allowlist | - |
| Frontend | `index.html` 442k | monolit | fără componente | `src/app/main.js:1` + `src/components/DeveloperMode.js:1` | ESM + `DeveloperMode` | - |
| Teste | 124 | OK | — | `tests/pro*.test.js` | 124 reale | 124 |

**Bug audit:** duplicate `setRadarLayer` fix, `safeFetch` timeout, `CITY_MAP` double-space, euclidian→haversine, `__hourlyTimes` leak, `Permissions-Policy`, `trustPanelState` global, 14 `localStorage` keys centralizate `APP_STATE_KEY`, `setInterval` leak, `DST` `todayStr`, `XSS` `escapeHtml`, `*` CORS.

**Definition of Done vNEXT:** toate 24 puncte bifate în `docs/ARCHITECTURE.md`, `npm run verify` 0 errors.
