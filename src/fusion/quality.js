/**
 * src/fusion/quality.js
 * Quality flags, outlier, temporal, spatial checks — standalone helpers for tests
 */
export function isOutlier(value, mean, stdDev, sigma = 2.0) {
  if (!Number.isFinite(value) || !Number.isFinite(mean) || !Number.isFinite(stdDev) || stdDev===0) return false;
  return Math.abs(value-mean)/stdDev > sigma;
}

export function temporalJumps(series, maxDelta) {
  const flags=[];
  for(let i=1;i<series.length;i++){
    const a=series[i-1], b=series[i];
    if (a!=null && b!=null && Math.abs(b-a) > maxDelta) flags.push(i);
  }
  return flags;
}

export function spatialInconsistency(stations, modelValue, tolerance) {
  if (!stations.length || modelValue==null) return false;
  const avg = stations.reduce((a,b)=>a+b,0)/stations.length;
  return Math.abs(avg-modelValue) > tolerance;
}

export function flagStale(ageMs, ttlMs) {
  if (ageMs==null) return false;
  return ageMs > ttlMs;
}

export function qualityFlagsForField({ value, candidates, ageMs, ttlMs, stationDistanceKm }) {
  const flags=[];
  if (value==null) flags.push('unavailable');
  if (ageMs!=null && ttlMs!=null && ageMs>ttlMs) flags.push('stale');
  if (stationDistanceKm!=null && stationDistanceKm>50) flags.push('distant_station');
  if (candidates && candidates.length===1) flags.push('single_source');
  if (candidates && candidates.length>=3) {
    const vals=candidates.map(c=>c.value).filter(v=>typeof v==='number'&&Number.isFinite(v));
    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    const std=Math.sqrt(vals.reduce((a,v)=>a+(v-mean)**2,0)/vals.length);
    if (candidates.some(c=> isOutlier(c.value, mean, std, 2.0))) flags.push('outlier_present');
  }
  return flags;
}
