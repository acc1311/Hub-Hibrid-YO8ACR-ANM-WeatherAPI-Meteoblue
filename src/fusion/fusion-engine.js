/**
 * src/fusion/fusion-engine.js
 * Data Fusion — FĂRĂ "average orb"
 * Pipeline: candidate values → validation → normalization → quality scoring → weighting → spatial/temporal correction → consensus → outlier detection → final + confidence
 */

import { haversineKm } from '../utils/geo.js';

// Per-parameter fusion policy
export const FieldFusionPolicy = {
  'temperature.current': { method: 'weighted', outlierSigma: 2.5, maxSpread: 8 },
  'temperature.forecast': { method: 'weighted', outlierSigma: 2.0, maxSpread: 10 },
  'humidity': { method: 'weighted', outlierSigma: 2.0, discretize: false },
  'pressure': { method: 'weighted', outlierSigma: 2.0 },
  'wind': { method: 'weighted', outlierSigma: 2.2 },
  'gust': { method: 'max', outlierSigma: 2.5 }, // use max for gusts (safety)
  'precipitation_probability': { method: 'ensemble', outlierSigma: 2.0 },
  'precipitation_amount': { method: 'weighted', outlierSigma: 2.5 },
  'snow': { method: 'weighted', outlierSigma: 2.0 },
  'visibility': { method: 'min', outlierSigma: 2.0 }, // worst visibility matters
  'cloud_cover': { method: 'weighted', outlierSigma: 2.0 },
  'weather_code': { method: 'mode' }, // discrete
  'uv': { method: 'max' },
};

function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }
function toFinite(v) { if (v==null||v==='') return null; const n=Number(v); return Number.isFinite(n)?n:null; }

export function validateCandidates(candidates) {
  return candidates.filter(c => c != null && isNum(c.value));
}

export function normalizeCandidates(candidates, field) {
  // e.g. convert all temps to C, wind to km/h, pressure to hPa
  // For now, assume already normalized — but hook exists for unit conversion
  return candidates.map(c => ({ ...c, value: toFinite(c.value) })).filter(c => c.value != null);
}

export function detectOutliers(values, sigma = 2.0) {
  if (values.length < 3) return { inliers: values, outliers: [], flags: [] };
  const mean = values.reduce((a,b)=>a+b,0)/values.length;
  const variance = values.reduce((a,v)=>a+(v-mean)**2,0)/values.length;
  const std = Math.sqrt(variance);
  if (std === 0) return { inliers: values, outliers: [], flags: [] };
  const inliers = [], outliers = [];
  values.forEach((v,i) => {
    const z = Math.abs(v-mean)/std;
    if (z > sigma) outliers.push({ index: i, value: v, z });
    else inliers.push({ index: i, value: v, z });
  });
  return { inliers: inliers.map(x=>x.value), outliers: outliers.map(x=>x.value), flags: outliers.map(o=>`outlier:${o.value}`) };
}

export function detectTemporalJump(series, maxDelta) {
  // detect 25→26→27→42→27 style impossible jumps (>maxDelta between consecutive)
  const flags = [];
  for (let i=1;i<series.length;i++) {
    if (series[i]!=null && series[i-1]!=null && Math.abs(series[i]-series[i-1]) > maxDelta) {
      flags.push(`temporal_jump[${i-1}->${i}]:${series[i-1]}→${series[i]}`);
    }
  }
  return flags;
}

export function spatialConsistencyCheck(stationValues, modelGridValue, threshold = 5) {
  // station A vs B vs model grid
  if (!stationValues.length || modelGridValue==null) return [];
  const avgStation = stationValues.reduce((a,b)=>a+b,0)/stationValues.length;
  if (Math.abs(avgStation - modelGridValue) > threshold) return [`spatial_anomaly: stations avg ${avgStation.toFixed(1)} vs model ${modelGridValue.toFixed(1)}`];
  return [];
}

export function weightedConsensus(candidates, weights) {
  // candidates: [{value, source, weight?}]
  let sum=0, wSum=0;
  const contributing=[];
  candidates.forEach(c => {
    const w = c.weight ?? weights[c.source] ?? 0.2;
    if (c.value != null && Number.isFinite(w) && w>0) {
      sum += c.value * w;
      wSum += w;
      contributing.push(c.source);
    }
  });
  if (wSum===0) return null;
  return { value: sum/wSum, contributing, weightSum: wSum };
}

export function modelConsensusStats(values) {
  const vals = values.filter(isNum);
  const n = vals.length, tot = values.length;
  if (!n) return { n:0, tot, spread:null, min:null, max:null, mean:null, median:null };
  const sorted=[...vals].sort((a,b)=>a-b);
  const spread = parseFloat((Math.max(...vals)-Math.min(...vals)).toFixed(1));
  const mean = vals.reduce((a,b)=>a+b,0)/n;
  const median = n%2===1 ? sorted[(n-1)/2] : (sorted[n/2-1]+sorted[n/2])/2;
  const p = q => {
    const idx = (q/100)*(n-1);
    const lo=Math.floor(idx), hi=Math.ceil(idx);
    if (lo===hi) return sorted[lo];
    return sorted[lo]*(hi-idx)+sorted[hi]*(idx-lo);
  };
  return {
    n, tot, spread,
    min: Math.min(...vals), max: Math.max(...vals),
    mean: parseFloat(mean.toFixed(2)), median: parseFloat(median.toFixed(2)),
    p10: parseFloat(p(10).toFixed(1)), p25: parseFloat(p(25).toFixed(1)),
    p50: parseFloat(p(50).toFixed(1)), p75: parseFloat(p(75).toFixed(1)), p90: parseFloat(p(90).toFixed(1)),
    range: `${Math.min(...vals).toFixed(1)}–${Math.max(...vals).toFixed(1)}`,
  };
}

export function ensembleProbabilities(memberValues, thresholds = [0.1, 1, 5]) {
  // memberValues: array of member arrays aligned by time, or per time slice
  // For hourly: memberValues[t] = [v_member0, v_member1, ...]
  // thresholds: precip thresholds
  const probs = {};
  thresholds.forEach(th => {
    probs[`p_gt_${th}mm`] = memberValues.map(mems => {
      if (!Array.isArray(mems) || !mems.length) return null;
      const valid = mems.filter(isNum);
      if (!valid.length) return null;
      const wet = valid.filter(v=>v>=th).length;
      return Math.round(wet/valid.length*100);
    });
  });
  return probs;
}

/**
 * Main fusion entry: fuse a single scalar field
 * @param {string} field - FieldFusionPolicy key
 * @param {Array<{value:number, source:string, weight?:number, timestamp?:string, quality?:number}>} candidates
 * @param {Object} options - { weights, location, elevationDiff, timeSeries }
 */
export function fuseField(field, candidates, options = {}) {
  const policy = FieldFusionPolicy[field] || { method: 'weighted', outlierSigma: 2.0 };
  let vals = validateCandidates(candidates);
  if (!vals.length) return { value: null, confidence: 0, provenance: { source: 'unavailable', sourceType: 'unavailable' }, flags: ['no_data'] };

  vals = normalizeCandidates(vals, field);

  // 1. Outlier detection (non-blocking, flag only)
  const rawValues = vals.map(v=>v.value);
  const { inliers, outliers, flags: outlierFlags } = detectOutliers(rawValues, policy.outlierSigma);
  // Keep outliers but flag; if inliers exist and outliers are extreme, down-weight outliers
  const filtered = vals.map(c => {
    const isOutlier = outliers.includes(c.value);
    const baseW = options.weights?.[c.source] ?? c.weight ?? 0.2;
    return { ...c, isOutlier, effectiveWeight: isOutlier ? baseW*0.3 : baseW };
  });

  // 2. Temporal consistency (if timeSeries supplied)
  let temporalFlags = [];
  if (options.timeSeries && Array.isArray(options.timeSeries)) {
    const maxDeltaMap = { 'temperature.current': 8, 'temperature.forecast': 12, 'pressure': 15, 'wind': 30 };
    const md = maxDeltaMap[field] ?? 20;
    temporalFlags = detectTemporalJump(options.timeSeries, md);
  }

  // 3. Spatial correction (elevation)
  let spatialFlags = [];
  if (options.elevationDiff != null && field.includes('temperature')) {
    // apply -6.5°C/km correction and flag as derived
    const lapse = -0.0065;
    filtered.forEach(c => {
      if (c.source === 'anm' && isNum(c.elevationDiff)) {
        // c.value corrected externally; flag
        spatialFlags.push(`elevation_corrected:${c.elevationDiff}m`);
      }
    });
  }

  // 4. Consensus calculation (weighted or mode)
  let fused = null;
  let contributing = vals.map(v=>v.source);
  if (policy.method === 'mode') {
    // discrete — pick most frequent
    const counts = {};
    vals.forEach(c=>{ counts[c.value]=(counts[c.value]||0)+1; });
    let bestVal=null, bestCnt=0;
    Object.entries(counts).forEach(([k,cnt])=>{ if(cnt>bestCnt){bestCnt=cnt; bestVal=Number(k);} });
    fused = bestVal;
  } else if (policy.method === 'max') {
    fused = Math.max(...vals.map(v=>v.value));
  } else if (policy.method === 'min') {
    fused = Math.min(...vals.map(v=>v.value));
  } else if (policy.method === 'ensemble') {
    // for probabilities: average of member-derived probs
    const avg = rawValues.reduce((a,b)=>a+b,0)/rawValues.length;
    fused = Math.round(avg);
  } else {
    // weighted
    const weights = options.weights || {};
    // Use effectiveWeight that penalizes outliers
    let sum=0, wSum=0;
    filtered.forEach(c=>{
      const w = c.effectiveWeight ?? weights[c.source] ?? 0.2;
      sum+=c.value*w; wSum+=w;
    });
    fused = wSum? sum/wSum : rawValues.reduce((a,b)=>a+b,0)/rawValues.length;
  }

  // 5. Confidence: agreement + coverage + quality
  const stats = modelConsensusStats(rawValues);
  let confidence = 70;
  if (stats.spread != null) {
    if (stats.spread <= 1) confidence = 95;
    else if (stats.spread <= 2.5) confidence = 82;
    else if (stats.spread <= 5) confidence = 68;
    else confidence = 45;
  }
  if (outliers.length) confidence -= 12;
  if (temporalFlags.length) confidence -= 8;
  if (vals.length >= 3) confidence += 5;
  if (vals.length === 1) confidence -= 15;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  const qualityFlags = [...outlierFlags, ...temporalFlags, ...spatialFlags];
  if (fused != null && field.includes('temperature')) fused = parseFloat(fused.toFixed(1));
  if (fused != null && field.includes('precipitation_probability')) fused = Math.round(fused);
  if (fused != null && field.includes('pressure')) fused = parseFloat(fused.toFixed(1));

  return {
    value: fused,
    confidence,
    provenance: {
      value: fused,
      unit: options.unit || '',
      source: contributing.length===1 ? contributing[0] : contributing.join(' + '),
      sourceType: contributing.length>1 ? 'blended' : (vals[0]?.sourceType || 'model'),
      timestamp: new Date().toISOString(),
      confidence,
      contributingSources: contributing,
      qualityFlags,
      stats,
    },
    stats,
    flags: qualityFlags,
    candidates: vals,
  };
}
