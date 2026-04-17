

> ### 🌐 [Accesează Aplicația Live Aici](https://tinyurl.com/vremea-tg-neamt)  sau 🔗[Vezi direct aici!](https://acc1311.github.io/Hub-Hibrid-YO8ACR-ANM-WeatherAPI-Meteoblue/)

# 🌤️ Hub Hibrid PRO - Dashboard Meteo Multi-Sursă

**Hub Hibrid PRO** este o aplicație web meteo ușoară (single-file), dezvoltată pentru a oferi cea mai precisă prognoză și stare a vremii, combinând date de la furnizori globali cu stațiile meteorologice locale din România (ANM).

Aplicația rezolvă problema erorilor de localizare (ex: confuzia între orașe cu nume similare precum *Târgu Neamț* și *Târgu Jiu*) printr-un sistem de mapare și filtrare strictă.

## ✨ Funcționalități Principale

* 🔍 **Smart Match (Filtrare Inteligentă):** Sistem avansat de potrivire a locației care caută exact stația ANM relevantă pentru orașul introdus.
* 📊 **Sistem Hibrid de Date:** Agregă date în timp real din 3 surse diferite pentru a construi un profil meteo complet.
* 🌗 **Temă Dark / Light:** Interfață modernă cu suport nativ pentru modul întunecat (comutare instantanee).
* 📱 **Design Responsiv:** UI de tip „card” optimizat perfect pentru ecranele telefoanelor mobile, dar și pentru desktop.
* 🤖 **Smart Summary:** Generare de text dinamic cu rezumatul vremii și șansele de precipitații.

## 📡 Surse de Date (API-uri integrate)

Aplicația face cereri asincrone către următoarele servicii:
1.  **WeatherAPI (W-API):** Sursa globală principală (prognoză zilnică, min/max, UV, vizibilitate, șanse de ploaie).
2.  **Meteoblue:** Folosit specific pentru calculul temperaturii exacte pe timp de noapte.
3.  **ANM (prin Proxy Cloudflare):** Preia date hiper-locale de la stațiile oficiale ale Administrației Naționale de Meteorologie din România (vânt, presiune atmosferică, umiditate, temperatura la sol).

## 🚀 Cum se instalează / folosește

Proiectul este un `vanilla` complet (fără framework-uri, fără build-steps). Totul rulează direct din browser.

1.  Clonează repository-ul:
    ```bash
    git clone [https://github.com/numele-tau/hub-hibrid-pro.git](https://github.com/numele-tau/hub-hibrid-pro.git)
    ```
2.  Deschide fișierul `index.html` în orice browser modern (Chrome, Safari, Firefox, Edge).
3.  Introdu numele unui oraș în bara de căutare și apasă Enter (sau pe lupă).

## 🛠️ Detalii Tehnice pentru Dezvoltatori

* **Tehnologii:** HTML5, CSS3 (CSS Variables, Flexbox, Grid), JavaScript (ES6, Fetch API, Async/Await).
* **Iconițe:** FontAwesome 6.
* **Logica de Mapare:** În cod există o constantă `CITY_MAP` care poate fi extinsă. Aceasta leagă numele uzual al unui oraș de numele exact al stației ANM pentru a preveni rezultatele false (ex: `"SINAIA": "SINAIA 1500"`).

### Notă privind securitatea (API Keys)
Acest proiect conține chei API încorporate în codul de front-end pentru demonstrație. Pentru utilizarea în producție la scară largă, se recomandă mutarea cheilor (`W_KEY`, `M_KEY`) pe un server backend (Node.js, PHP, Python etc.) pentru a le proteja.

## 📄 Licență

Acest proiect este open-source și disponibil sub licența [MIT](LICENSE).

## 🤝 Contribuții

Aprecierile și contribuțiile sunt binevenite! Proiectul a fost dezvoltat cu pasiune pentru comunitatea locală. 
Mulțumiri speciale către **YO8ACR** pentru furnizarea accesului la datele colectate.

---
⭐ Dacă îți place acest proiect, nu uita să îi dai un Star pe GitHub!
