# 🌤️ Hub Hibrid PRO — Weather Intelligence Platform

[![Version](https://img.shields.io/badge/version-2.5.1-blue.svg)](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-124%20passing-brightgreen.svg)](#-dezvoltare--verificare--development--verification)
[![PWA](https://img.shields.io/badge/PWA-installable-purple.svg)](#-instalare--utilizare--installation--usage)
[![Languages](https://img.shields.io/badge/languages-7-orange.svg)](#-ux--pwa)
[![Platform](https://img.shields.io/badge/platform-web%20%7C%20android%20%7C%20PWA-lightgrey.svg)](#-instalare--utilizare--installation--usage)

> **RO:** **PRO v2.5.1** — Platformă hibridă profesională de prognoză meteo: **ANM FIRST** în România, **MULTI-MODEL** global, motor de fuziune, încredere 0-100, provenance și verificare automată.
>
> **EN:** **PRO v2.5.1** — Professional hybrid weather forecasting platform: **ANM FIRST** in Romania, global **MULTI-MODEL**, data fusion engine, 0-100 confidence scoring, provenance, and automated verification.

---

**RO:** **Hub Hibrid PRO** este o aplicație web meteo PWA (vanilla, single-file) care combină modelele globale de prognoză (ICON-D2/EU, ECMWF, WeatherAPI, Meteoblue) cu stațiile meteorologice oficiale din România (ANM) pentru cea mai precisă imagine a vremii — plus radar animat, hartă avertizări pe județe și notificări push. Aplicația rezolvă problema erorilor de localizare (ex: confuzia între *Târgu Neamț* și *Târgu Jiu*) printr-un sistem de mapare și filtrare strictă.

**EN:** **Hub Hibrid PRO** is a PWA weather web application (vanilla, single-file) combining global forecast models (ICON-D2/EU, ECMWF, WeatherAPI, Meteoblue) with official Romanian weather stations (ANM) for maximum precision — featuring animated radar, county warnings map, and push notifications. It resolves geolocation confusion (e.g., *Târgu Neamț* vs. *Târgu Jiu*) using strict mapping algorithms.

---

## 🌐 Accesare Online / Online Access

| Versiune / Version | Link | Descriere / Description |
|---|---|---|
| 🚀 **Aplicația Live / Live App** | [vremea](https://tinyurl.com/vremea-tg-neamt) | Versiunea principală de producție / Main production app |
| 📊 **GitHub Pages** | [Vezi direct / View Direct](https://acc1311.github.io/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/) | Deploy direct din repo / Direct repo deployment |
| 📱 **Android APK** | [Descarcă / Download v1.0.1](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/releases/download/1/Hub_Hibrid_PRO_-_Meteo_Multi-Surs__v1.0.1.APK) | Aplicație nativă / Native Android App |

> 💡 **Recomandare / Tip:** Pentru experiența completă (PWA + notificări push), folosește **Aplicația Live** pe Chrome/Edge mobil și instalează-o din meniul browserului. / *For the full experience (PWA + push notifications), open the Live App in mobile Chrome/Edge and install it from the browser menu.*

---

## 📋 Cuprins / Table of Contents

- [🌐 Accesare Online / Online Access](#-accesare-online--online-access)
- [✨ Funcționalități / Features](#-funcționalități--features)
- [📡 Surse de Date / Data Sources](#-surse-de-date--data-sources)
- [🚀 Instalare & Utilizare / Installation & Usage](#-instalare--utilizare--installation--usage)
- [🧪 Dezvoltare & Verificare / Development & Verification](#-dezvoltare--verificare--development--verification)
- [🏗️ Arhitectură / Architecture](#️-arhitectură--architecture)
- [☁️ Cloudflare Worker](#️-cloudflare-worker-api-proxy)
- [🔐 Securitate & CSP / Security & CSP](#-securitate--csp--security--csp)
- [📋 Changelog](#-changelog)
- [📄 Licență / License](#-licență--license)
- [🙏 Mulțumiri / Acknowledgments](#-mulțumiri--acknowledgments)

---

## ✨ Funcționalități / Features

### 🎯 Precizie & Date / Accuracy & Data

| Funcționalitate / Feature | Descriere (RO) | Description (EN) |
|---|---|---|
| **Smart Match** | Potrivire strictă oraș → stație ANM exactă | Strict matching: City → Exact ANM station |
| **Fuziune 4+ surse / 4+ Fusion** | ICON-D2/EU + ECMWF + WeatherAPI + Meteoblue + stații ANM | ICON-D2/EU + ECMWF + WeatherAPI + Meteoblue + ANM stations |
| **Nowcast minutely_15** | Bandă „precipitații în ~X min" pe 3h (ICON-EU) | "Precipitation starting in ~X min" banner for 3h (ICON-EU) |
| **Probabilitate ensemble** | % derivat din membrii ECMWF | % derived directly from ECMWF ensemble members |
| **Probabilitate max pe zi** | Max % pentru restul zilei în banner | Dynamic daily peak % indicator in header badge |
| **Consens modele / Consensus** | Badge „n/3 modele de acord · dispersie ±x°" | "n/3 models agree · spread ±x°" consensus badge |
| **Normale ERA5 / Climatology** | Istoric 7 zile vs climatologia 1991–2020 | 7-day history vs 1991–2020 real climate normals |
| **Indice Căldură (ITU)** | Heat Index Rothfusz adaptat pentru RO | Rothfusz Heat Index tuned for Romanian thresholds |

### 🌧️ Radar & Hărți / Radar & Maps

| Funcționalitate / Feature | Descriere (RO) | Description (EN) |
|---|---|---|
| **RainViewer complet** | Radar animat (past+nowcast) **și Satelit IR**, 9 teme culori, selector interval | Animated radar (past+nowcast) **& IR Satellite**, 9 color schemes, range selector |
| **Harta ANM pe județe** | Coduri culori alerte + **temperaturi live stații ANM** | Color-coded county alerts + **live station temperatures** |
| **MeteoRadar RO + Windy** | Embed-uri de rezervă | Alternative map embeds |

### ⚠️ Avertizări / Warnings & Alerts

| Funcționalitate / Feature | Descriere (RO) | Description (EN) |
|---|---|---|
| **Alerte ANM / Official Alerts** | Alerte oficiale + alerte derivate locale (CAPE/vânt/WMO) | Official alerts + local derived thresholds (CAPE/wind/WMO) |
| **Badge Header** | Punct pulsant pe județ dacă există alerte active | Pulsing dot indicator for active county alerts |
| **Panou minimizabil** | Header minimizat implicit, își păstrează starea | Collapsible alert container, retains toggle state |

### 📱 UX & PWA

| Funcționalitate / Feature | Descriere (RO) | Description (EN) |
|---|---|---|
| **Cache offline instant** | Afișare instantă din cache + refresh în fundal | Instant cache render on boot + silent background refresh |
| **GPS Auto** | Buton „Locația mea" cu reverse-geocoding | "My Location" with auto reverse geocoding |
| **Polen / Pollen Card** | Monitorizare 6 alergeni principali | Tracks 6 main environmental allergens |
| **Comparație / Comparison** | Tabel comparativ pentru locațiile favorite | Comparison matrix across saved favorite locations |
| **Export Data** | Export CSV/JSON/PNG (cu avertizări incluse) | CSV/JSON/PNG exports (including active warnings) |
| **Auto Dark Mode** | Sincronizare cu `prefers-color-scheme` | Auto adapts to system `prefers-color-scheme` |
| **Web Push ANM** | Notificări push pe server (cron 15 min) | Server-side alert push notifications (15-min cron) |
| **PWA & Multilingv** | Instalabilă pe ecran; **7 limbi** (ro/en/it/fr/de/es/hu) | Installable PWA; **7 supported languages** |

---

## 📡 Surse de Date / Data Sources

| Sursă / Source | Rol / Role | Date furnizate / Data Provided |
|---|---|---|
| **Open-Meteo ICON-D2/EU** | 🎯 Primar / Primary | Temp, vânt, precipitații, UV, nowcast minutely_15, 120h |
| **Open-Meteo ECMWF** | 🌍 Ensemble | Probabilități din membri, prognoză extinsă / Member probabilities |
| **Open-Meteo Archive/ERA5**| 📚 Climatologie | Normale 1991–2020, istoric 7 zile / 1991–2020 climate normals |
| **Open-Meteo Air Quality** | 🌱 Polen / AQI | PM2.5, PM10, O₃, NO₂, SO₂, CO + polen / Air quality & pollen |
| **WeatherAPI** | 🌐 Global | Descrieri condiții, AQI US-EPA, astro, reverse geo |
| **Meteoblue** | 📈 Orar / Hourly | Temperaturi orare detaliate / Detailed hourly temperature |
| **ANM (Cloudflare Proxy)** | 🇷🇴 Oficial RO | Stații RO live: temp, vânt, presiune + avertizări județene |
| **RainViewer** | 🌧️ Radar/Sat | Tile-uri radar past+nowcast, satelit IR / Radar & Satellite tiles |
| **BigDataCloud** | 📍 Geocoding | Nume locație + județ GPS / Reverse geocoding for GPS |

---

## 🚀 Instalare & Utilizare / Installation & Usage

### 1. Utilizare Online / Online Usage

- **Live Web App:** [https://tinyurl.com/vremea-tg-neamt](https://tinyurl.com/vremea-tg-neamt)
- **GitHub Pages:** [https://acc1311.github.io/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/](https://acc1311.github.io/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/)
- **Android APK:** [Download v1.0.1](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/releases/download/1/Hub_Hibrid_PRO_-_Meteo_Multi-Surs__v1.0.1.APK)

### 2. Dezvoltare Locală / Local Development

**RO:** Proiect **100% vanilla** — fără framework-uri, fără pas de build. Rulează direct în orice browser modern.  
**EN:** **100% Vanilla project** — no frameworks, no build step required. Runs directly in any modern browser.

```bash
# Clonează / Clone repo
git clone [https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue.git](https://github.com/acc1311/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue.git)
cd Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue

# Servește local / Serve locally
python -m http.server 8000     # Python
# sau / or
npx serve                      # Node.js
