/** Calibrated, explainable confidence scoring. */
import { STALE_THRESHOLDS_MS } from '../../config/thresholds.js';

function clamp(v){ return Math.max(0, Math.min(100, Math.round(v))); }

export function scoreSourceQuality(provider, isRomania, sourceType = 'model') {
  if (sourceType === 'official' && isRomania && provider === 'anm') return 100;
  if (sourceType === 'observed' && isRomania && provider === 'anm') return 99;
  const table = { anm: isRomania ? 97 : 35, openmeteo_d2: isRomania ? 92 : 65, openmeteo_eu: 90, openmeteo_ecmwf: 94, meteoblue: 84, weatherapi: 80, rainviewer: 78 };
  return table[provider] ?? 65;
}

export function scoreFreshness(ageMs, ttlMs) {
  if (ageMs == null || !Number.isFinite(ageMs)) return 50;
  if (ageMs <= ttlMs) return 100;
  if (ageMs <= ttlMs * 2) return 75;
  if (ageMs <= ttlMs * 4) return 45;
  return 15;
}

export function scoreAgreement(spread, n) {
  if (n == null || n <= 1) return 50;
  if (spread == null) return 60;
  if (spread <= 1) return 98;
  if (spread <= 2) return 88;
  if (spread <= 4) return 70;
  if (spread <= 8) return 48;
  return 25;
}

export function scoreObservationConfidence({ distanceKm, elevationDiffM, stationAgeMs, isInterpolated }) {
  let s = 98;
  if (distanceKm != null) {
    if (distanceKm > 75) s -= 35;
    else if (distanceKm > 50) s -= 24;
    else if (distanceKm > 20) s -= 12;
    else if (distanceKm > 10) s -= 5;
  }
  if (elevationDiffM != null) {
    const ad = Math.abs(elevationDiffM);
    if (ad > 700) s -= 22;
    else if (ad > 300) s -= 14;
    else if (ad > 100) s -= 6;
  }
  if (stationAgeMs != null) {
    if (stationAgeMs > 60 * 60 * 1000) s -= 30;
    else if (stationAgeMs > 30 * 60 * 1000) s -= 18;
    else if (stationAgeMs > 15 * 60 * 1000) s -= 8;
  }
  if (isInterpolated) s -= 12;
  return clamp(s);
}

export function scoreForecastConfidence({ horizonH, ensembleSpread, modelCount, historicalSkill }) {
  let s = 86;
  if (horizonH != null) {
    if (horizonH > 240) s -= 30;
    else if (horizonH > 120) s -= 22;
    else if (horizonH > 72) s -= 13;
    else if (horizonH > 48) s -= 7;
    else if (horizonH > 24) s -= 2;
  }
  if (ensembleSpread != null) {
    if (ensembleSpread > 8) s -= 22;
    else if (ensembleSpread > 4) s -= 12;
    else if (ensembleSpread > 2) s -= 5;
  }
  if (modelCount != null) {
    if (modelCount >= 4) s += 5;
    else if (modelCount <= 1) s -= 12;
  }
  if (historicalSkill != null) s += (historicalSkill - 50) * 0.18;
  return clamp(s);
}

export function computeConfidence({ sourceQuality, freshness, agreement, observation, forecast, skill, alert }) {
  const parts = [];
  const add = (v, w) => { if (v != null && Number.isFinite(v)) parts.push({ v, w }); };
  add(sourceQuality, 0.25);
  add(freshness, 0.18);
  add(agreement, 0.20);
  add(observation, 0.14);
  add(forecast, 0.13);
  add(skill, 0.10);
  if (alert != null) add(alert, 0.10);
  if (!parts.length) return 60;
  const w = parts.reduce((a,b)=>a+b.w,0);
  return clamp(parts.reduce((a,b)=>a+b.v*b.w,0)/w);
}

export function confidenceBand(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return { label:'Limitată', band:'limited', color:'#64748b' };
  if (s >= 97) return { label:'Foarte ridicată', band:'very-high', color:'#16a34a' };
  if (s >= 90) return { label:'Ridicată', band:'high', color:'#22c55e' };
  if (s >= 75) return { label:'Bună', band:'good', color:'#84cc16' };
  if (s >= 60) return { label:'Moderată', band:'moderate', color:'#eab308' };
  if (s >= 40) return { label:'Scăzută', band:'low', color:'#f97316' };
  return { label:'Limitată', band:'limited', color:'#ef4444' };
}

export function buildTrustPanel({ current, forecast, aqi, radar }) {
  const mk = ({ source, provider, freshnessMs, ttlMs, agreementSpread, n, observationMeta, forecastMeta, isRomania, historicalSkill, sourceType='model' }) => {
    const sq = scoreSourceQuality(provider||source, isRomania, sourceType);
    const fr = scoreFreshness(freshnessMs, ttlMs||STALE_THRESHOLDS_MS.forecast);
    const ag = scoreAgreement(agreementSpread, n);
    const obs = observationMeta ? scoreObservationConfidence(observationMeta) : null;
    const fc = forecastMeta ? scoreForecastConfidence({ ...forecastMeta, historicalSkill }) : null;
    const overall = computeConfidence({ sourceQuality:sq, freshness:fr, agreement:ag, observation:obs, forecast:fc, skill:historicalSkill });
    return { source, provider, confidence:overall, band:confidenceBand(overall), freshnessMs, agreementSpread, sq, fr, ag, obs, fc, historicalSkill };
  };
  return { current: current ? mk(current) : null, forecast: forecast ? mk(forecast) : null, aqi: aqi ? mk(aqi) : null, radar: radar ? mk(radar) : null };
}
