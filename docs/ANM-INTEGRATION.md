# ANM-INTEGRATION.md

## Endpoints (via Cloudflare Worker proxy)
- `GET /anm` → `https://www.meteoromania.ro/wp-json/meteoapi/v2/starea-vremii` (GeoJSON `features[]`)
- `GET /anm-warnings` → `.../avertizari-generale` (`avertizare[]` cu `@attributes` + `judet[]`)

## Adapter
`src/providers/anm/anm-client.js` (`AnmProvider`) expune:
```
getStations()               // cached 2min, validates GeoJSON
getWarnings()               // cached 5min
resolveStation({query,lat,lon}) // CITY_MAP exact → fuzzy → haversine <50km + confidence
fetchObservation(lat,lon,query) // {temperature,humidity,pressure,wind,condition, provenance}
fetchWarningsNormalized()    // parseANMWarnings()
search(query)                // autocomplete ANM
```

## Parsers (pure, testabile)
- `cleanAnmText`, `anmVal`, `parseAnmWind` (`"1.8 m/s, directia : VSV"`), `parseAnmPressure` (`"970.5 mb, in scadere"` → `{value,unit,trend,mmHg}`)
- `anmFeatureLatLon` handles both WGS84 and WebMercator (x/y >180)
- `CITY_MAP` fixes `Târgu Neamț ≠ Târgu Jiu`, `Sinaia → SINAIA 1500`, etc.
- `getClosestStationHaversine` uses haversine km, not euclidean deg.

## Avertizări
`src/providers/anm/anm-alerts.js`:
- `parseANMWarnings(data)` → split by GIF markers `galben/portocaliu/rosu.gif` → one card per culoare
- Handles multi-color blocks (`multiColor` filter judet by `culoare` exactly)
- `countyLevels(warnings)` → `RO_JUDET_COD` map 42 județe, rank red>orange>yellow, `national` flag if >=30 județe
- Each card: `{level,icon,title,msg,fenomene,interval,zona,src,counties,countyNames,national,official,provenance}`

## Stații
- Harta `initAnmMap()` (Leaflet) colorează județe după `countyLevels()`, adaugă markeri pill `🌡️` per stație cu `_tempColor()`
- Toggle 🌡️, tooltip nume+valoare, `countyLevels()` refresh la `refreshAnmMapData()`

## ANM FIRST logic
`weather-engine.js decideMode(lat,lon)` → `isRomania()` BBOX 43.6-48.3/20.2-30.0 → `ANM_FIRST`
În `updateWeather()` (index.html):
1. Geocodare OM → preselect ANM station (single resolve, not double)
2. Fetch paralel `fetchOpenMeteoAll` (D2/EU/ECMWF) + Meteoblue + WeatherAPI (`Promise.allSettled`)
3. Temperatura finală: `ANM tempe` if available else `ICON-EU` (no average orb)
4. Trust panel: `current: ANM observed`, `forecast: ICON-EU+ECMWF blend`

## Observație vs Prognoză
UI tags: `[ANM]`, `[ICON-EU]`, `[ECMWF]` per grid item; `Why this value?` via `whyThisValue(provenance)`.

## Limitări
- ANM nu expune prognoză orașe/nowcasting oficial via API public → folosim observații + avertizări; nowcasting ANM marcat `UNAVAILABLE` până la endpoint oficial.
- Dacă ANM indisponibil → fallback transparent, banner `⚠️ ANM indisponibil temporar — date modelate`.
