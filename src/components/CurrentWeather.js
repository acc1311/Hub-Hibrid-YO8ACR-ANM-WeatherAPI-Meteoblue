/**
 * src/components/CurrentWeather.js
 * Presentational — receives WeatherSnapshot, renders DOM via template.
 * Usage: import { renderCurrentWeather } from './CurrentWeather.js'
 */
export function renderCurrentWeather(snapshot, { displayTemp, formatWind }){
  const cur=snapshot.current||{};
  const loc=snapshot.location||{};
  return `
  <div class="current-card">
    <div class="city-name">${loc.name||'--'} ${loc.isRomania?'<span class="badge-anm">🇷🇴 ANM FIRST</span>':''}</div>
    <div class="temp-main">${cur.temperature?.value!=null?displayTemp(cur.temperature.value):'--'} <small>${cur.temperature?.provenance?.source||''}</small></div>
    <div class="confidence">Încredere: ${snapshot.confidence||'--'}/100</div>
  </div>`;
}
export default { renderCurrentWeather };
