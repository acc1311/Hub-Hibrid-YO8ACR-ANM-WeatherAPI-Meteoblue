# 🌤️ Hub Hibrid PRO - Dashboard Meteo Multi-Sursă

> ### 🌐 [Accesează Aplicația Live Aici](https://tinyurl.com/vremea-tg-neamt)  
> ### 🔗 [Vezi direct aici!](https://acc1311.github.io/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/)

**Hub Hibrid PRO** este o aplicație web meteo ușoară (single-file), dezvoltată pentru a oferi cea mai precisă prognoză și stare a vremii, combinând date de la furnizori globali cu stațiile meteorologice locale din România (ANM).

---

## ✨ Funcționalități Principale

* 🔍 **Smart Match (Filtrare Inteligentă):** Sistem avansat de potrivire a locației care caută exact stația ANM relevantă pentru orașul introdus.
* 📊 **Sistem Hibrid de Date:** Agregă date în timp real din 4+ surse diferite pentru a construi un profil meteo complet.
* 🌗 **Temă Dark / Light:** Interfață modernă cu suport nativ pentru modul întunecat (comutare instantanee).
* 📱 **Design Responsiv:** UI de tip „card" optimizat perfect pentru ecranele telefoanelor mobile, dar și pentru desktop.
* 🤖 **Smart Summary:** Generare de text dinamic cu rezumatul vremii și șansele de precipitații.
* 🗺️ **Radar Ploi Multiplu:** 3 opțiuni de radar (Leaflet animat, Meteoradar RO, Windy) cu controale intuitive.
* 🧭 **Widget-uri Avansate:** Busolă vânt animată, arc solar, fază lună, confort termic, calitate aer detaliată.
* ⚠️ **Alerte Meteo Automate:** Generare inteligentă de avertismente bazate pe praguri ICON-EU/ECMWF.

---

## 📡 Surse de Date (API-uri integrate)

| Sursă | Rol | Date furnizate |
|-------|-----|---------------|
| **Open-Meteo ICON-EU** | 🎯 Sursă primară | Temperaturi, vânt, precipitații, UV, prognoză 5 zile (120h, rezoluție 3km) |
| **Open-Meteo ECMWF** | 🌍 Ensemble fallback | UV Index, precipitații ensemble, extensie prognoză |
| **WeatherAPI (W-API)** | 🌐 Global + AQI | Condiții text localizat, calitate aer, date astro |
| **Meteoblue** | 📈 Grafic orar | Temperaturi orare detaliate pentru următoarele 8h |
| **ANM (Proxy Cloudflare)** | 🇷🇴 Local RO | Date stații oficiale: vânt, presiune, umiditate, zăpadă |
| **RainViewer** | 🌧️ Radar animat | Tile-uri radar istorice + nowcast |
| **Meteoradar.ro** | 🛰️ Radar RO | Hartă interactivă ploi/satelit pentru România |
| **Windy.com** | 💨 Radar global | Embed Windy cu overlay radar |

---

## 🚀 Instalare & Utilizare

Proiectul este `vanilla` complet (fără framework-uri, fără build-steps). Totul rulează direct din browser.

### Instalare rapidă:
```bash
# 1. Clonează repository-ul
git clone https://github.com/numele-tau/hub-hibrid-pro.git

# 2. Accesează folderul
cd hub-hibrid-pro

# 3. Deschide în browser
# Simplu: dublu-click pe index.html
# Sau folosește un server local:
python -m http.server 8000  # Python 3
# sau
npx serve  # Node.js
```

### Utilizare:
1.  Deschide `index.html` în orice browser modern (Chrome, Safari, Firefox, Edge).
2.  Introdu numele unui oraș în bara de căutare și apasă Enter.
3.  Comută între furnizori din bara de sus pentru a compara datele.
4.  Explorează radarul ploi cu cele 3 opțiuni disponibile.

---

## 🔧 Modificări Recente & Fix-uri (v1.2)

### ✅ Probleme rezolvate:

| Problemă | Soluție aplicată | Status |
|----------|-----------------|--------|
| 📍 Geolocalizare inexactă pe mobil (detecta alt oraș) | Dezactivată opțiunea geo, folosită locație implicită + căutare manuală prin autocomplete | ✅ Optimizat |
| 🌧️ Încărcare lentă/erori iframe Meteoradar | Adăugat `loading="lazy"`, handler `onerror`, timeout de siguranță de 8s | ✅ Îmbunătățit |
| 📱 Dimensiuni iframe pe mobil | CSS media queries ajustate pentru `height: 420px !important` pe ecrane ≤520px | ✅ Responsive |
| ⚠️ Fallback radar dacă nu se încarcă | Toast de eroare + posibilitatea comutării automate la tab-ul Leaflet | ✅ Adăugat |

### Cod CSS modificat:
```css
/* Overlay-urile nu mai blochează interacțiunea cu iframe-ul */
.iframe-nav-blocker,
.iframe-top-blocker,
.wo-overlay-block {
    pointer-events: none !important;
    background: transparent;
}
```

### Cod JavaScript modificat:
```javascript
// Funcția geoLocate() dezactivată - folosește locație implicită
function geoLocate() {
    console.log('Geolocalizare dezactivată');
    currentCoords = { lat: 47.17, lon: 26.36 }; // Târgu Neamț
    updateWeather();
}

// În init(): înlocuit geoLocate() cu locație implicită
const defaultCity = localStorage.getItem('hub_last_city') || 'Targu Neamt';
document.getElementById('city-in').value = defaultCity;
updateWeather();
```

---

## 🛡️ Modificări Recente (v1.3 — Securitate & Curățenie)

### ✅ Ce s-a schimbat:
| Modificare | Detalii |
|------------|---------|
| 🔑 **Chei API mutate server-side** | WeatherAPI + Meteoblue nu mai sunt în `index.html`; totul trece prin Cloudflare Worker (`/wapi/*`, `/mb/*`) cu chei ca secrete |
| 🐛 **Fix grafic orar Meteoblue** | Graficul afișa date ICON cu titlu „[Meteoblue]"; acum folosește mereu fuziunea ICON (24h/48h/120h) cu titlu corect |
| 🐛 **Fix date precipitații** | `_hourlyPrecipData` folosea mm în loc de probabilitate %; acum citește `precipitation_probability` |
| 🌐 **Mesaje de eroare localizate** | Erorile de rețea nu mai afișează text brut; folosesc `error_generic` în RO/EN/IT/FR |
| 🗺️ **CITY_MAP implementat** | Mapare oraș → stație ANM exactă (Târgu Neamț vs Târgu Jiu, Sinaia 1500 etc.) |
| 🧹 **Cod duplicat eliminat** | ~215 linii de funcții moarte/duplicate (drawHourlyChart, renderForecastOM, generateAlerts, renderComfort, applyDynamicBg, setHourlyView, wrapper-e `_orig*`) |
| 🛡️ **Robustețe W-API** | Toate accesările `dW.current` / `dW.forecast` sunt acum protejate (`dW && dW.current && …`); un răspuns neașteptat de la proxy nu mai blochează întregul flux — restul datelor (ICON-EU, ANM, Meteoblue) se afișează normal |

### ⚠️ Pas necesar după actualizare:
Redeploy worker-ul și configurează secretele (vezi secțiunea „Cloudflare Worker" de mai sus), altfel WeatherAPI și Meteoblue nu vor funcționa.

---

## 📱 Modificări Recente (v1.4 — PWA & Alerte ANM)

### ✅ Ce s-a schimbat:
| Modificare | Detalii |
|------------|---------|
| 📱 **PWA complet** | `manifest.json` + `sw.js` (service worker cu cache offline) + iconițe 192/512/maskable generate din logo; aplicația se poate instala pe telefon/PC („Adaugă pe ecranul de pornire") |
| 🚨 **Alerte ANM oficiale** | Integrare cu endpoint-ul oficial `avertizari-generale` al Meteoromania (prin worker, ruta `/anm-warnings`): coduri **galben/portocaliu/roșu** cu mesaj și valabilitate, afișate împreună cu alertele locale ICON-EU |
| 🧹 **Duplicat eliminat** | Definiția veche `window.renderAlerts` (fără alerte ANM) eliminată; `enhanceDataGrid` păstrat în versiunea nouă |

---

## 🔐 Securitate & CSP

Aplicația include header CSP configurat pentru a permite doar sursele necesare:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; 
  child-src 'self' https: blob:; 
  frame-src https://embed.windy.com https://radar.wo-cloud.com https://api.rainviewer.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://www.meteoradar.ro; 
  connect-src 'self' https:; 
  img-src 'self' https: data: blob:; 
  style-src 'self' 'unsafe-inline' https:;">
```

## 🤝 Contribuții

Aprecierile și contribuțiile sunt binevenite! Proiectul a fost dezvoltat cu pasiune pentru comunitatea locală.

### Cum poți contribui:
1.  Fork repository-ul
2.  Creează un branch pentru feature-ul tău (`git checkout -b feature/nume-feature`)
3.  Commit modificările (`git commit -m 'Adaugă feature X'`)
4.  Push pe branch (`git push origin feature/nume-feature`)
5.  Deschide un Pull Request

### Idei pentru viitoare îmbunătățiri:
- [ x ] Adăugare suport PWA (installable app)
- [ ] Export date meteo în CSV/JSON
- [ ] Notificări push pentru alerte meteo
- [ ] Istoric temperaturi cu grafic interactiv

---

## 📄 Licență

Acest proiect este open-source și disponibil sub licența [MIT](LICENSE).

```
MIT License

Copyright (c) 2026 Hub Hibrid PRO

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Mulțumiri

*   **Cătălin Ardei (YO8ACR)** — pentru furnizarea accesului la datele colectate și suport tehnic.
*   **ANM Meteoromania** — pentru datele meteorologice oficiale din România.
*   **Open-Meteo** — pentru API-ul gratuit și precis ICON-EU/ECMWF.
*   **Comunitatea open-source** — pentru librăriile și inspirația oferită.

---

> ⭐ **Dacă îți place acest proiect, nu uita să îi dai un Star pe GitHub!**  
> 🐛 Găsești o problemă? Deschide un [Issue](https://github.com/numele-tau/hub-hibrid-pro/issues) și te ajut cu plăcere.
