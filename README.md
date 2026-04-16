# 🌦️ Prognoză Meteo Dinamică - Târgu Neamț

O aplicație web (widget) modernă și minimalistă care oferă date meteorologice în timp real pentru orașul Târgu Neamț. Proiectul utilizează un model hibrid de colectare a datelor pentru a asigura o precizie maximă.

### 📸 Prezentare Vizuală
<p align="center">
  <img src="mod%20zi.png" alt="Vremea Targu Neamt Light Mode" width="400">
  <br>
  <img src="mod%20nocturn.png" alt="Vremea Targu Neamt Dark Mode" width="400">
</p>

## 🚀 Caracteristici principale

* **Model Hibrid de Date:** Combină citirile în timp real de la stațiile **ANM** (prin hub-ul YO8ACR) cu prognoze predictive de la **WeatherAPI** și **Meteoblue**.
* **Logică Evolutivă:** Textul prognozei nu este static. Acesta se adaptează în funcție de probabilitatea de precipitații și momentul zilei.
* **Design Adaptiv:** Interfață modernă cu suport pentru **Dark Mode** și **Light Mode**.
* **Sincronizare Automată:** Datele se actualizează automat la fiecare 10 minute.
* **Mobile Friendly:** Optimizat pentru a fi adăugat pe ecranul principal al telefonului ca WebApp.

## 📊 Surse de Date (Hub Hibrid)

Aplicația centralizează informații din următoarele surse:
1. **ANM (Administrația Națională de Meteorologie):** Temperatură curentă, umiditate, presiune și vânt (via `vremea-tg-neamt.yo8acr.workers.dev`).
2. **WeatherAPI:** Condiții meteo detaliate, nori, indice UV și șanse de precipitații.
3. **Meteoblue:** Estimări ale temperaturii pentru noaptea curentă.

## 🖥️ Tehnologii Utilizate

* **HTML5 & CSS3:** Structură și stilizare.
* **JavaScript (Vanilla):** Logică Fetch API și manipulare DOM.
* **FontAwesome:** Iconițe meteo.
* **Cloudflare Workers:** Backend-ul pentru colectarea datelor ANM.

## 🤝 Contribuții

Aprecierile și contribuțiile sunt binevenite! Proiectul a fost dezvoltat cu pasiune pentru comunitatea locală. 
Mulțumiri speciale către **YO8ACR** pentru furnizarea accesului la datele colectate.

---
⭐ Dacă îți place acest proiect, nu uita să îi dai un Star pe GitHub!
