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

## 🛠️ Detalii Tehnice pentru Dezvoltatori

### Stack Tehnologic
* **Frontend:** HTML5, CSS3 (CSS Variables, Flexbox, Grid, Animations), JavaScript ES6+
* **Librării externe:** Leaflet.js (hărți), FontAwesome 6 (iconițe)
* **Arhitectură:** Single-file, zero dependencies build, CSP headers pentru securitate

### Structura Codului
```javascript
// Config API (la începutul script-ului)
// Cheile API NU mai există în client — totul trece prin Cloudflare Worker
const API_PROXY = "https://hubmeteoacr.brm-laser-veronese.workers.dev"; // /anm, /wapi/*, /mb/*

// Provider state management
const providers = { wapi: true, anm: true, mb: true, om: true };

// Funcții principale
- updateWeather()          // Flux principal hibrid
- updateWeatherANMOnly()   // Mod ANM exclusiv
- updateWeatherOMOnly()    // Mod Open-Meteo exclusiv
- fetchOpenMeteo()         // Fuziune ICON-D2 + ICON-EU + ECMWF
- showRadarTab()           // Comutare tab-uri radar
- renderForecastOM()       // Randare prognoză 5 zile (120h)
- generateAlerts()         // Generare alerte automate
```

### Cloudflare Worker (proxy API)
Worker-ul din `cloudflare-worker.js` rutează 3 API-uri, ținând cheile **server-side**:
* `/anm` → meteoromania.ro (fără cache, ca înainte)
* `/wapi/*` → api.weatherapi.com (cheia din secretul `WAPI_KEY`)
* `/mb/*` → my.meteoblue.com (cheia din secretul `MB_KEY`)

Deploy + configurare secrete:
```bash
# 1. Instalează Wrangler (dacă nu ai): npm i -g wrangler
# 2. Login: wrangler login
# 3. Deploy: wrangler deploy
# 4. Configurează secretele (cheile tale personale):
wrangler secret put WAPI_KEY
wrangler secret put MB_KEY
```
După deploy, actualizează `API_PROXY` din `index.html` cu URL-ul worker-ului tău.

### Logica de Mapare Locații
În cod există constanta `CITY_MAP` (lângă `findStationByName`) care leagă numele uzual al unui oraș de numele exact al stației ANM, prevenind rezultate false (ex: *Târgu Neamț* vs *Târgu Jiu*, *Sinaia* vs *Sinaia 1500*):
```javascript
// Exemplu CITY_MAP (deja implementat în index.html)
const CITY_MAP = {
  'sinaia': 'SINAIA 1500',
  'targu neamt': 'TARGU NEAMT',
  'targu jiu': 'TARGU JIU',
  'bucuresti': 'BUCURESTI FILARET',
  // Adaugă aici mapările tale (chei normalizate: fără diacritice, lowercase)
};
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

### ⚠️ Pas necesar:
Redeploy worker-ul cu noul cod (`cloudflare-worker.js` conține acum și ruta `/anm-warnings`) — altfel alertele ANM oficiale nu vor apărea.

---

## ✨ Modificări Recente (v1.5 — PRO Pack: UX & Funcționalități Avansate)

### ✅ Ce s-a schimbat:
| Modificare | Detalii |
|------------|---------|
| ⚖️ **Comparativă modele** *(opțional)* | Secțiune **pliabilă, închisă implicit**, sub grila de date — date reale din **ICON-EU, ECMWF** + coloana Hub; coloanele fără acoperire (ex. ICON-D2 în România) se ascund automat; cache 15 min |
| 📈 **Istoric 7 zile** *(opțional)* | Secțiune pliabilă sub comparativă — grafic canvas max/min din **Open-Meteo Archive API** (gratuit) vs benzile mediilor climatice ale lunii; se desenează doar la deschidere |
| 🗺️ **Harta Avertizărilor ANM** *(opțional)* | Secțiune pliabilă — harta României cu **județe colorate după cod** (verde/galben/portocaliu/roșu), ca pe meteoromania.ro; tooltip cu titlurile avertizărilor per județ; avertizările naționale colorează toată țara; GeoJSON cache 7 zile |
| 🗂️ **Taburi grilă date** | Grila de 18 indicatori, direct sub „Încredere Date", organizată în taburi: **Toate / Acum / Vânt & Presiune / Cer & Soare / Aer**; filtrarea persistă la actualizările automate |
| 📸 **Export imagine** | PNG cu oraș, **dată și oră**, temp., condiție **și textul complet al avertizărilor ANM active** (casete colorate galben/portocaliu/roșu) + **creditele din Setări** (sursele de date și mulțumiri); nume fișier cu dată (`hub-meteo-2026-08-21.png`); distribuie prin Web Share API sau download |
| 🌐 **7 limbi** | Adăugate **Germană, Spaniolă, Maghiară** (ro/en/it/fr/de/es/hu) — ciclare cu butonul de limbă + select în Setări; **creditele & linkurile din Setări** și mesajul de favorite goale sunt traduse în toate limbile |
| 🖱️ **Tooltip grafic orar** | Crosshair + tooltip cu ora și temperatura la hover/atingere pe graficul pe 8h |
| 💀 **Skeleton loading** | Placeholder-e animate (shimmer) la prima încărcare până sosesc datele |
| 🎨 **Fundal dinamic** | Gradient-ul paginii se schimbă după condiție: senin zi/noapte, ploaie, ninsoare, furtună, noros, ceață, zori, amurg |
| 📲 **Install prompt** | Banner „Instalează Hub Meteo" după a -a vizită (beforeinstallprompt), cu posibilitate de amânare |
| 🔢 **PWA badge** | Temperatura curentă afișată pe iconița aplicației (`setAppBadge`, unde e suportat) |
| ♿ **Accesibilitate** | `role="alert"` pe panoul de alerte, `aria-live` pe toast/sincronizare, `aria-label` pe butoanele-icon, închidere modale cu **Escape**, `:focus-visible` |
| 🎞️ **Micro-interacțiuni** | Animație pop la actualizarea temperaturii, stagger-in pe griduri, ripple la click pe butoane, respectă `prefers-reduced-motion` |

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
