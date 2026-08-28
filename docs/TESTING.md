# TESTING.md

## Running
```
npm install
npm test              # vitest run 124 tests
npm run test:watch
npm run verify        # lint + check-inline (vm.Script) + test
```

## Coverage (124 tests)
- ANM parser: `cleanAnmText`, `anmVal`, `parseAnmWind`, `parseAnmPressure`, `findStationByName`, `getClosestStation`, `haversine`, `anmFeatureLatLon` (16)
- ANM alerts: `parseANMWarnings` single/multi-color, `countyLevels`, `RO_JUDET_COD` (5)
- Regions: `isRomania`, `getRegionMode`, invalid coords (4)
- Fusion: `validateCandidates`, `detectOutliers`, `temporal`, `spatial`, `weightedConsensus`, `modelConsensusStats`, `fuseField` weighted/outlier/mode (13)
- Confidence: 5 scorers + `computeConfidence` + `band` (7)
- Verification: `mae/rmse/bias/correlation/brier`, `VerificationStore` (7)
- WeatherDecisionEngine: `decideMode`, `rankSources`, field weights (5)
- Alerts: `severityScore`, `deriveAlerts`, `combine` (3)
- Utils: `haversine`, `parseCoordinateInput`, `to24h`, `observationAgeMs` (6)
- Quality: flags, jumps (3)
- HealthRegistry, Cache, cacheKey, stale (6)
- Edge: DST, displayTemp F, formatWind kn, wrong coords, stale, fallback, ensemble median/percentiles, outlier sigma, thresholds (15)
- Extra: providers interface, config, time, units, ANM extra, fusion extra, international, timezone (39)
- Legacy: `js/app-logic.js` escapeHtml etc (3)

## What is tested
- ANM parsing (observations, warnings, multi-color, national, county map)
- Model fusion (outliers, stale, fallback, wrong coords, station matching, precip prob, ensemble, confidence, units, timezone/DST, international)
- Schema validation, fallback transparency, error paths
- No mocks that just `expect(fn).toBeDefined()` — each asserts value.

## CI
`.github/workflows/ci.yml` (if present) runs `npm run verify` on push.

## Adding tests
Create `tests/*.test.js`, use `import` ESM, `vi` for fetch mocks. For ANM, use `mockStation()` helper.
