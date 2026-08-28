# ARCHITECTURE.md — YO8ACR Weather Hub PRO v2.3

## Overview
Platformă meteo hibridă profesională — ANM FIRST în România, MULTI-MODEL global. Arhitectura modulară separă `providers → fusion → weather-engine → UI`.

```
User Location
      ↓
[ regions.isRomania() ] → ANM_FIRST vs MULTI_MODEL
      ↓
[Providers]  ANM | ICON-D2 | ICON-EU | ECMWF Ensemble | Meteoblue | WeatherAPI | RainViewer
      ↓ (normalized via WeatherProvider interface)
[Weather Schema]  WeatherSnapshot { location, current, hourly, daily, alerts, nowcast, provenance }
      ↓
[Fusion Engine]  FieldFusionPolicy per param + outlier/temporal/spatial + consensus
      ↓
[Confidence Engine]  0-100 (sourceQuality + freshness + agreement + observation + forecast)
      ↓
[Alert Engine]  OFFICIAL (ANM) > DERIVED (Hub thresholds) + severity 0-100
      ↓
[Cache L1→L4]  memory → storage → SW → edge
      ↓
[UI Components]  CurrentWeather | Hourly | Daily | Radar | Alerts | Trust | Maps | Health
```

## Directory
```
src/
  app/main.js          # entry ESM, bridges legacy globals
  core/cache.js        # 4-level TTL cache
  core/health.js       # provider status/latency
  core/observability.js
  weather/weather-schema.js  # Normalized schema + provenance
  weather/weather-engine.js  # Decision ranking + ANM FIRST
  weather/verification.js    # MAE/RMSE/bias + dynamic weighting
  weather/nowcast-engine.js
  fusion/fusion-engine.js    # FieldFusionPolicy + fuseField()
  fusion/confidence-engine.js
  providers/base.js      # WeatherProvider interface
  providers/anm/*        # client, parser, alerts, station-matcher
  providers/openmeteo/*  # ICON-D2/EU/ECMWF ensemble
  alerts/alert-engine.js
  utils/geo.js, time.js, units.js
config/
  providers.js, thresholds.js, regions.js, units.js, refresh.js
worker/
  src/index.js + src/routes/* + src/security.js
```

## Decision Flow (Romania)
```
ANM observation (if age <30min & distance <50km) → PRIMARY
  ↓ fallthrough
ICON-D2 (0-48h, 2km, RO-West) → PRIMARY for hourly if ANM stale
  ↓
ICON-EU (0-120h, 7km) → SECONDARY
  ↓
ECMWF Ensemble (probabilities, 0-240h) → SECONDARY
  ↓
Meteoblue / WeatherAPI → FALLBACK / complement (AQI, text)
```

Each field has independent `FieldFusionPolicy` — e.g., `gust` uses `max`, `visibility` uses `min`, `weather_code` uses `mode`.

## Provenance
Every value: `{value, unit, source, sourceType, timestamp, modelRun, observationAge, confidence, contributingSources, qualityFlags}`

UI exposes `Why this value?` modal via `whyThisValue()`.

## Module Loading
- Legacy `index.html` (~8621 lines) kept for compatibility, but now imports `src/app/main.js` as ESM.
- New modules use `import/export`; old globals remain on `window.Hub*` for inline script interop.
- `sw.js v5` uses stale-while-revalidate for API.

## Verification
`npm run verify` → `eslint` → `check-inline` (vm.Script) → `vitest` (124 tests).
