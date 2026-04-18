# 🌤️ Hub Hibrid PRO - Dashboard Meteo Multi-Sursă

> ### 🌐 [Accesează Aplicația Live Aici](https://tinyurl.com/vremea-tg-neamt)  
> ### 🔗 [Vezi direct aici!](https://acc1311.github.io/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/)

**Hub Hibrid PRO** este o aplicație web meteo ușoară (single-file), dezvoltată pentru a oferi cea mai precisă prognoză și stare a vremii, combinând date de la furnizori globali cu stațiile meteorologice locale din România (ANM).

Aplicația rezolvă problema erorilor de localizare (ex: confuzia între orașe cu nume similare precum *Târgu Neamț* și *Târgu Jiu*) printr-un sistem de mapare și filtrare strictă.

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
| **Open-Meteo ICON-EU** | 🎯 Sursă primară | Temperaturi, vânt, precipitații, UV, prognoză 7-10 zile (rezoluție 3km) |
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

## 🛠️ Detalii Tehnice pentru Dezvoltatori

### Stack Tehnologic
* **Frontend:** HTML5, CSS3 (CSS Variables, Flexbox, Grid, Animations), JavaScript ES6+
* **Librării externe:** Leaflet.js (hărți), FontAwesome 6 (iconițe)
* **Arhitectură:** Single-file, zero dependencies build, CSP headers pentru securitate

### Structura Codului
```javascript
// Config API (la începutul script-ului)
const W_KEY = "your_weatherapi_key";      // WeatherAPI
const M_KEY = "your_meteoblue_key";       // Meteoblue  
const ANM_PROXY = "https://your-proxy";   // Proxy ANM

// Provider state management
const providers = { wapi: true, anm: true, mb: true, om: true };

// Funcții principale
- updateWeather()          // Flux principal hibrid
- updateWeatherANMOnly()   // Mod ANM exclusiv
- updateWeatherOMOnly()    // Mod Open-Meteo exclusiv
- fetchOpenMeteo()         // Fetch ICON-EU + ECMWF
- showRadarTab()           // Comutare tab-uri radar
- renderForecastOM()       // Randare prognoză 10 zile
- generateAlerts()         // Generare alerte automate
```

### Logica de Mapare Locații
În cod există o constantă `CITY_MAP` care poate fi extinsă. Aceasta leagă numele uzual al unui oraș de numele exact al stației ANM pentru a preveni rezultatele false:
```javascript
// Exemplu extensie CITY_MAP
const CITY_MAP = {
  "SINAIA": "SINAIA 1500",
  "PREDEAL": "PREDEAL",
  // Adaugă aici mapările tale
};
```

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
- [ ] Adăugare suport PWA (installable app)
- [ ] Export date meteo în CSV/JSON
- [ ] Notificări push pentru alerte meteo
- [ ] Istoric temperaturi cu grafic interactiv
- [ ] Suport pentru mai multe limbi (EN, FR, DE)

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
