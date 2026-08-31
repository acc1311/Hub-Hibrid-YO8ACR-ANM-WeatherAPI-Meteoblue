# WEATHER-ENGINE.md — Weather Decision Engine

`src/weather/weather-engine.js` + `src/weather/weather-decision-engine.js` (re-export).

**Responsabilitate:** decide ce sursă pentru fiecare `field × locatie × horizon`.

**Intrări:** `source quality` (98 ANM în RO), `freshness` (age vs TTL), `distance` (haversine), `altitude`, `resolution` (2km D2 vs 7km EU vs 9km ECMWF), `coverage`, `horizon`, `historical skill` (`ModelSkillDB`), `agreement` (spread), `availability`.

**Ieșiri:** `rankSources()` sorted 0-100, `decideMode()` → `ANM_FIRST` (BBOX 43.6/48.3/20.2/30.0) else `MULTI_MODEL`, `createProvenance()`.

**Exemplu RO temp curent:** `anm 0.45 + d2 0.25 + eu 0.15 + ecmwf 0.10` → `dynamicWeights()` ajustează cu skill local (`src/verification/dynamic-weighting.js`).

**Test:** `WeatherDecisionEngine` 4 teste `tests/pro.test.js`.
