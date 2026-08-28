# FUSION-ENGINE.md

## Principiu
Nu `final = (ANM+ICON+ECMWF+WAPI)/4` — ci pipeline:

```
Candidate values
  → validation (isNum)
  → normalization (toFinite, unit)
  → quality scoring (freshness, distance, horizon)
  → source weighting (FieldFusionPolicy + verificationStore)
  → spatial correction (elevation lapse -6.5°C/km, flagged derived)
  → temporal correction (jump detection, no mutation)
  → consensus (weighted | mode | max | min | ensemble)
  → outlier detection (z-score, flagged, down-weighted 0.3×)
  → final value + confidence 0-100
```

## FieldFusionPolicy
```js
'temperature.current': { method:'weighted', outlierSigma:2.5 }
'gust':                { method:'max' }
'visibility':          { method:'min' }
'weather_code':        { method:'mode' }
'precipitation_probability': { method:'ensemble' }
'uv':                  { method:'max' }
```

## Funcții
- `validateCandidates(candidates)` → filter `isNum`
- `detectOutliers(values, sigma)` → z-score, `inliers/outliers/flags`
- `detectTemporalJump(series, maxDelta)` → `25→26→27→42→27` flagged
- `spatialConsistencyCheck(stations, modelGrid, threshold)` → avg stations vs model
- `weightedConsensus(candidates, weights)` → sum(value*w)/sum(w)
- `modelConsensusStats(values)` → `{n,tot,spread,min,max,mean,median,p10..p90,range}`
- `ensembleProbabilities(memberValues, [0.1,1,5])` → `% members ≥ threshold`
- `fuseField(field, candidates, {weights, elevationDiff, timeSeries, unit})` → `{value, confidence, provenance, stats, flags}`

## Confidence
`confidence-engine.js`:
- `scoreSourceQuality(provider, isRomania)` — ANM 98 în RO, 30 outside
- `scoreFreshness(ageMs, ttlMs)` — 100 if within TTL, 15 if 4× TTL
- `scoreAgreement(spread, n)` — spread ≤1°C →98, >8°C →25
- `scoreObservationConfidence({distanceKm,elevationDiffM,stationAgeMs,isInterpolated})`
- `scoreForecastConfidence({horizonH,ensembleSpread,modelCount})`
- `computeConfidence({...})` weighted avg → `confidenceBand()` → `98 Foarte ridicată … <40 Limitată`

Never show `100% accuracy` — show `confidence / agreement / freshness / coverage`.

## Example
```
Candidates: ANM 26.1, ICON-EU 26.0, ECMWF 26.4, Meteoblue 26.3
→ consensus n=4, spread 0.4°C → confidence 95/100 (Bună)
→ final 26.2°C (weighted) provenance ANM+ICON-EU+ECMWF

Candidates: 22,27,31 → spread 9°C → ⚠️ Modelele diferă semnificativ, confidence Moderate (45)
```

## Verification → Dynamic Weighting
`verification.js` computes per-region `MAE/RMSE/bias/correlation/Brier` by comparing `forecast vs ANM observation` history, stores in `VerificationStore`, normalizes to weights `Σ=1`, feeds into `WeatherDecisionEngine.rankSources()`.

## Why this value?
`whyThisValue(provenance, candidates)` returns:
```
De ce 26.2°C?
ANM: 26.1
ICON-EU: 26.0
ECMWF: 26.4
Motor: ANM observation + model consensus
Confidence: 94/100
Flags: []
```
