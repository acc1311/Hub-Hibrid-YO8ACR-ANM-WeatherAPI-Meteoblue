# DATA-SOURCES.md — YO8ACR Weather Hub PRO

## Surse per parametru

| Parametru | România (ANM FIRST) | Internațional (MULTI_MODEL) | Fallback | Când indisponibil |
|---|---|---|---|---|
| **Temp curent** | 1. ANM stație (observed, 98%) <br>2. ICON-D2 2km <br>3. ICON-EU 7km | 1. ICON-EU <br>2. ECMWF <br>3. WeatherAPI | ultim cache L1 → stale badge 🟡 | `Unavailable` — nu inventa, arată `—` |
| **Umiditate** | ANM → ICON-EU | ICON-EU / ECMWF | — | `Estimated` dacă derivat din model |
| **Vânt / Rafale** | ANM (obs) → ICON-D2 (gust max) → ICON-EU | ICON-EU / ECMWF | — | `Derived` |
| **Presiune** | ANM (mb + trend) → ICON-EU | ICON-EU / ECMWF | — | — |
| **Precip prob** | ICON-D2/EU/ECMWF ensemble spread (`memberPrecipProbability`) | ECMWF ensemble | — | `—` |
| **Precip amount** | ICON-D2 (0-48h) weighted 0.5 + ICON-EU 0.32 + ECMWF 0.18 | ECMWF 0.4 + ICON-EU 0.3 + Meteoblue 0.2 | — | — |
| **Nebulozitate** | ANM text → ICON-EU % | ICON-EU | — | — |
| **Vizibilitate** | ICON-EU (m) | ICON-EU | WeatherAPI | — |
| **UV** | ECMWF uv_index (hourly) → WeatherAPI | ECMWF | — | `Unavailable` |
| **AQI** | WeatherAPI (US-EPA) | WeatherAPI / Open-Meteo AQ | — | `Unavailable` în ANM-only |
| **Polen** | Open-Meteo Air Quality (europa only, gr/m³) | — | — | `—` |
| **Avertizări** | ANM oficial galben/portocaliu/roșu (prioritate absolută) | Hub Derived (praguri CAPE/vânt/vis) | — | Panou ascuns dacă 0 |
| **Nowcasting** | ANM Nowcasting (dacă API expune) → minutely_15 ICON-EU (12×15min) | minutely_15 / radar nowcast | — | `Fără fenomene` |
| **Radar** | RainViewer radar+nowcast+sat IR (9 scheme) | idem | MeteoRadar RO / Windy iframe | `Satellite` tag |
| **Prognoză orară** | ICON-D2 (0-48h) + ICON-EU (până 120h) fused | ICON-EU + ECMWF | Meteoblue | — |
| **Prognoză zilnică** | ICON-EU 1-5 + ECMWF 1-5 ensemble (buildOMDays) → blend + badges | ECMWF 1-10 | WeatherAPI | — |
| **Climatologie** | ERA5 1991-2020 via archive-api (cache 30 zile) | idem | fallback constante | `—` |
| **Astronomie** | WeatherAPI (răsărit/apus, lună) → calcul local | idem | — | `Calculated` |

## Ordine și weighting (România 0-24h, temp)
```
ANM observation correction 0.45
ICON-D2                    0.25
ICON-EU                    0.15
ECMWF                      0.10
Meteoblue                  0.03
WeatherAPI                 0.02
```
Weighting-ul este **configurabil** (`config/thresholds.js FUSION_WEIGHTS`) și **verificat** (`verification.js` MAE/RMSE).

## TTL (cache)
- ANM observation / warnings: 2 min
- ANM nowcasting: 1 min
- Forecast hourly: 15 min
- Model run: 60 min
- Radar meta: 2 min
- AQI: 30 min
- Historical/Climate: 24h / 30d

## Stare fallback
Fiecare provider: `PRIMARY | SECONDARY | FALLBACK | UNAVAILABLE | STALE`
- Dacă ANM cade → toast `ANM indisponibil temporar` + badge 🟠 FALLBACK + surse modelate vizibile în Trust panel
- Niciun provider nu blochează UI (`Promise.allSettled`)

## Provenance exemplu
```
Temperatură: 24.7 °C
Sursă: ANM — Stația Iași (observed)
Observație: 07:00 (vechime 8 min)
Încredere: 98/100 (Foarte ridicată)
Contribuitori: ANM + ICON-EU + ECMWF
Flags: —
```
