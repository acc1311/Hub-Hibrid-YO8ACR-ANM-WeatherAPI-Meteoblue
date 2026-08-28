# ALERT-ENGINE.md

## Two levels — never mixed visually
- **OFFICIAL** — ANM Yellow/Orange/Red, Nowcasting. `🔴 OFICIAL ANM` badge, always on top, requires `official:true`, confidence 100.
- **DERIVED** — Hub thresholds (`config/thresholds.js`). `🟠 HUB DERIVED` badge, shows `Why this alert?`.

## Thresholds (centralized)
```js
ALERT_THRESHOLDS = {
  wind: { yellow:40, orange:62, red:90 }, // km/h gust
  rain: { yellow:5, orange:10, red:20 },   // mm/h
  cape: { yellow:1000, orange:2000, red:3500 },
  uv:   { yellow:6, orange:8, red:11 },
  pressureDrop: { yellow:-3, orange:-6, red:-10 } // hPa/3h
}
```

## Derived rules (OM data)
- `wind_gusts_10m` → yellow/orange/red
- `precipitation` maxNext 24h → yellow/orange/red
- `cape` maxNext 6h → yellow/orange/red
- WMO codes 95/96/99 thunder, 71/73/75 snow, 45/48 fog
- `visibility <500m` → orange
- `pressureTrend ≤-3 hPa/3h` → yellow
- `humidity≥92 && |T - dew| ≤1.5` → fog risk yellow
- `uv` max → yellow/orange/red
- `temperature_2m_max/min` → heat/frost yellow/orange/red, plus days 2-5 scan for rain/heat/ger/snow/wind

## Severity 0-100
```
severity = f(official, intensity, proximity, durationH, probability, impact, confidence)
official +30, intensity*0.25, proximity 15-0, duration*1.2, prob*0.15, impact, (confidence-50)*0.05
```

## Flow
```
fetchANMWarnings() → parseANMWarnings() → enrichOfficial() → severity
fetchOpenMeteoAll() → deriveAlerts() → severity
combine(official, derived) → sorted red>orange>yellow, deduplicated by title slice, sliced 10, badge assigned
renderAlerts() → panel with header `N avertizări active — atinge pentru min/ext`, 🟢/🟡/🟠/🔴 per county, header badge pulsant if current county has warning
```

## Why this alert?
Click → modal:
```
De ce?
Rafale: 72 km/h
ICON-EU: 70 km/h
ECMWF: 68 km/h
Probabilitate: 81%
Threshold: 65 km/h
Confidence: 89%
```

## Notifications
`HubNotif` (browser Notification) + `HubPush` (VAPID push) — both filter `red|orange` only, cooldown 30 min per title, update badge `has-alert`.
Push tickle via Worker cron `*/15 * * * *` → `checkAndPush` sig change → `sendTicklePush` (VAPID JWT ES256) → SW `showAlertNotifications()` fetches fresh warnings.
