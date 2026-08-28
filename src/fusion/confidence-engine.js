/**
 * src/fusion/confidence-engine.js
 * Confidence scoring 0-100 — YO8ACR Weather Hub PRO
 * SOURCE QUALITY + DATA FRESHNESS + MODEL AGREEMENT + OBSERVATION CONFIDENCE + FORECAST CONFIDENCE
 */

import { STALE_THRESHOLDS_MS } from '../../config/thresholds.js';

function clamp01(v){ return Math.max(0, Math.min(1, v)); }

export function scoreSourceQuality(provider, isRomania) {
  // Official ANM gets 98 in Romania, 30 outside; global models higher outside
  const table = {
    anm: isRomania ? 98 : 30,
    openmeteo_d2: isRomania ? 92 : 60,
    openmeteo_eu: isRomania ? 90 : 88,
    openmeteo_ecmwf: 90,
    meteoblue: 82,
    weatherapi: 78,
    rainviewer: 75,
  };
  return table[provider] ?? 65;
}

export function scoreFreshness(ageMs, ttlMs) {
  if (ageMs==null || !Number.isFinite(ageMs)) return 50;
  if (ageMs <= ttlMs) return 100;
  if (ageMs <= ttlMs*2) return 70;
  if (ageMs <= ttlMs*4) return 40;
  return 15;
}

export function scoreAgreement(spread, n) {
  // spread in °C for temp, or % for prob — adapt
  if (n==null || n<=1) return 50;
  if (spread==null) return 60;
  if (spread <= 1) return 98;
  if (spread <= 2) return 85;
  if (spread <= 4) return 65;
  if (spread <= 8) return 42;
  return 25;
}

export function scoreObservationConfidence({ distanceKm, elevationDiffM, stationAgeMs, isInterpolated }) {
  let s=95;
  if (distanceKm!=null) {
    if (distanceKm>50) s-=30;
    else if (distanceKm>20) s-=15;
    else if (distanceKm>10) s-=6;
  }
  if (elevationDiffM!=null) {
    const ad=Math.abs(elevationDiffM);
    if (ad>500) s-=20;
    else if (ad>200) s-=10;
    else if (ad>80) s-=4;
  }
  if (stationAgeMs!=null) {
    if (stationAgeMs> 30*60*1000) s-=18;
    else if (stationAgeMs> 15*60*1000) s-=8;
  }
  if (isInterpolated) s-=10;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function scoreForecastConfidence({ horizonH, ensembleSpread, modelCount }) {
  let s=85;
  if (horizonH!=null) {
    if (horizonH>120) s-=25;
    else if (horizonH>72) s-=15;
    else if (horizonH>48) s-=8;
    else if (horizonH>24) s-=3;
  }
  if (ensembleSpread!=null) {
    if (ensembleSpread>8) s-=20;
    else if (ensembleSpread>4) s-=10;
    else if (ensembleSpread>2) s-=4;
  }
  if (modelCount!=null) {
    if (modelCount>=4) s+=5;
    else if (modelCount<=1) s-=10;
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function computeConfidence({ sourceQuality, freshness, agreement, observation, forecast, alert }) {
  // Weighted average 0-100
  const weights = { sourceQuality:0.28, freshness:0.22, agreement:0.22, observation:0.14, forecast:0.14 };
  const parts = [];
  if (sourceQuality!=null) parts.push({ v:sourceQuality, w:weights.sourceQuality });
  if (freshness!=null) parts.push({ v:freshness, w:weights.freshness });
  if (agreement!=null) parts.push({ v:agreement, w:weights.agreement });
  if (observation!=null) parts.push({ v:observation, w:weights.observation });
  if (forecast!=null) parts.push({ v:forecast, w:weights.forecast });
  if (alert!=null) parts.push({ v:alert, w:0.10 });
  if (!parts.length) return 60;
  const wSum=parts.reduce((a,b)=>a+b.w,0);
  const score=parts.reduce((a,b)=>a+b.v*b.w,0)/wSum;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function confidenceBand(score) {
  const s=Number(score);
  if (!Number.isFinite(s)) return { label:'Limitată', band:'limited', color:'#64748b' };
  if (s>=98) return { label:'Foarte ridicată', band:'very-high', color:'#16a34a' };
  if (s>=90) return { label:'Ridicată', band:'high', color:'#22c55e' };
  if (s>=75) return { label:'Bună', band:'good', color:'#84cc16' };
  if (s>=60) return { label:'Moderată', band:'moderate', color:'#eab308' };
  if (s>=40) return { label:'Scăzută', band:'low', color:'#f97316' };
  return { label:'Limitată', band:'limited', color:'#ef4444' };
}

// Build per-section trust panel data
export function buildTrustPanel({ current, forecast, aqi, radar }) {
  // Each arg: { source, freshnessMs, ttlMs, agreementSpread, n, observationMeta, forecastMeta, status }
  const mk = ({ source, freshnessMs, ttlMs, agreementSpread, n, observationMeta, forecastMeta, isRomania, provider }) => {
    const sq = scoreSourceQuality(provider||source, isRomania);
    const fr = scoreFreshness(freshnessMs, ttlMs||STALE_THRESHOLDS_MS.forecast);
    const ag = scoreAgreement(agreementSpread, n);
    const obs = observationMeta ? scoreObservationConfidence(observationMeta) : null;
    const fc = forecastMeta ? scoreForecastConfidence(forecastMeta) : null;
    const overall = computeConfidence({ sourceQuality:sq, freshness:fr, agreement:ag, observation:obs, forecast:fc });
    return { source, confidence: overall, band: confidenceBand(overall), freshnessMs, agreementSpread, sq, fr, ag, obs, fc };
  };
  return {
    current: current ? mk(current) : null,
    forecast: forecast ? mk(forecast) : null,
    aqi: aqi ? mk(aqi) : null,
    radar: radar ? mk(radar) : null,
  };
}
