/**
 * Robust weather data fusion engine.
 * - Normalizes/validates candidates
 * - Robust outlier detection (median/MAD)
 * - Field-specific fusion policies
 * - Honest provenance and confidence
 */

export const FieldFusionPolicy = {
  'temperature.current': { method: 'robustWeighted', outlierSigma: 3.5, hardReject: true },
  'temperature.forecast': { method: 'robustWeighted', outlierSigma: 3.5, hardReject: true },
  'humidity': { method: 'weightedMedian', outlierSigma: 3.5, hardReject: true },
  'pressure': { method: 'weightedMedian', outlierSigma: 3.5, hardReject: true },
  'wind': { method: 'weightedMedian', outlierSigma: 3.5, hardReject: true },
  'gust': { method: 'max', outlierSigma: 4.0, hardReject: false },
  'precipitation_probability': { method: 'ensemble', outlierSigma: 4.0, hardReject: false },
  'precipitation_amount': { method: 'weightedMedian', outlierSigma: 4.0, hardReject: true },
  'snow': { method: 'weightedMedian', outlierSigma: 4.0, hardReject: true },
  'visibility': { method: 'min' },
  'cloud_cover': { method: 'weightedMedian', outlierSigma: 4.0, hardReject: true },
  'weather_code': { method: 'mode' },
  'uv': { method: 'max' },
};

function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }
function toFinite(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function median(values) {
  const a = values.filter(isNum).slice().sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function mad(values) {
  const m = median(values);
  if (m == null) return null;
  return median(values.map(v => Math.abs(v - m)));
}

export function validateCandidates(candidates) {
  return (Array.isArray(candidates) ? candidates : [])
    .filter(c => c && isNum(toFinite(c.value)) && c.source);
}

export function normalizeCandidates(candidates) {
  return candidates.map(c => ({ ...c, value: toFinite(c.value) })).filter(c => c.value != null);
}

/** Robust outlier detector using median absolute deviation. */
export function detectOutliers(values, sigma = 3.5) {
  const vals = values.filter(isNum);
  if (vals.length < 3) return { inliers: vals.slice(), outliers: [], flags: [], median: median(vals), mad: mad(vals) };
  const med = median(vals);
  const rawMad = mad(vals);
  if (rawMad == null || rawMad === 0) {
    const exact = vals.filter(v => v !== med);
    // For repeated identical observations, any different value is a candidate outlier.
    if (exact.length && vals.filter(v => v === med).length >= Math.ceil(vals.length / 2)) {
      const outliers = exact;
      return {
        inliers: vals.filter(v => v === med),
        outliers,
        flags: outliers.map(v => `outlier:${v}:MAD0`),
        median: med,
        mad: 0,
      };
    }
    return { inliers: vals.slice(), outliers: [], flags: [], median: med, mad: 0 };
  }
  // 0.6745 scales MAD to a normal-equivalent z score.
  const inliers = [];
  const outliers = [];
  vals.forEach(v => {
    const robustZ = 0.6745 * Math.abs(v - med) / rawMad;
    if (robustZ > sigma) outliers.push(v);
    else inliers.push(v);
  });
  return {
    inliers,
    outliers,
    flags: outliers.map(v => `outlier:${v}:rz`),
    median: med,
    mad: rawMad,
  };
}

export function detectTemporalJump(series, maxDelta) {
  const flags = [];
  for (let i = 1; i < series.length; i++) {
    if (series[i] != null && series[i - 1] != null && Math.abs(series[i] - series[i - 1]) > maxDelta) {
      flags.push(`temporal_jump[${i - 1}->${i}]:${series[i - 1]}→${series[i]}`);
    }
  }
  return flags;
}

export function spatialConsistencyCheck(stationValues, modelGridValue, threshold = 5) {
  if (!stationValues?.length || modelGridValue == null) return [];
  const med = median(stationValues);
  if (med == null || Math.abs(med - modelGridValue) > threshold) {
    return [`spatial_anomaly: station median ${med?.toFixed?.(1) ?? 'n/a'} vs model ${Number(modelGridValue).toFixed(1)}`];
  }
  return [];
}

export function weightedConsensus(candidates, weights = {}) {
  let sum = 0;
  let wSum = 0;
  const contributing = [];
  for (const c of candidates || []) {
    const w = c.weight ?? weights[c.source] ?? 0.2;
    if (isNum(c.value) && Number.isFinite(w) && w > 0) {
      sum += c.value * w;
      wSum += w;
      contributing.push(c.source);
    }
  }
  if (!wSum) return null;
  return { value: sum / wSum, contributing, weightSum: wSum };
}


export function robustWeightedMean(candidates, weights = {}, tuning = 1.5) {
  const rows=(candidates||[]).map(c=>({value:Number(c.value),weight:Number(c.weight??weights[c.source]??0.2),source:c.source}))
    .filter(c=>isNum(c.value)&&isNum(c.weight)&&c.weight>0);
  if(!rows.length) return null;
  let center=median(rows.map(r=>r.value));
  for(let iter=0; iter<3; iter++){
    let sum=0,wSum=0;
    rows.forEach(r=>{
      const scale=Math.max(0.25, Math.abs(r.value-center));
      const huber=Math.min(1, tuning/scale);
      const w=r.weight*huber;
      sum+=r.value*w; wSum+=w;
    });
    if(wSum) center=sum/wSum;
  }
  return {value:center,contributing:rows.map(r=>r.source),weightSum:rows.reduce((s,r)=>s+r.weight,0)};
}

export function weightedMedian(candidates, weights = {}) {
  const rows = (candidates || [])
    .map(c => ({ value: Number(c.value), weight: Number(c.weight ?? weights[c.source] ?? 0.2), source: c.source }))
    .filter(c => isNum(c.value) && isNum(c.weight) && c.weight > 0)
    .sort((a, b) => a.value - b.value);
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + r.weight, 0);
  let acc = 0;
  for (const row of rows) {
    acc += row.weight;
    if (acc >= total / 2) {
      return { value: row.value, contributing: rows.map(r => r.source), weightSum: total };
    }
  }
  return { value: rows.at(-1).value, contributing: rows.map(r => r.source), weightSum: total };
}

export function modelConsensusStats(values) {
  const vals = values.filter(isNum);
  const n = vals.length;
  const tot = values.length;
  if (!n) return { n: 0, tot, spread: null, min: null, max: null, mean: null, median: null };
  const sorted = [...vals].sort((a, b) => a - b);
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const p = q => {
    const idx = (q / 100) * (n - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
  };
  return {
    n,
    tot,
    spread: +(Math.max(...vals) - Math.min(...vals)).toFixed(1),
    min: Math.min(...vals),
    max: Math.max(...vals),
    mean: +mean.toFixed(2),
    median: +median(vals).toFixed(2),
    p10: +p(10).toFixed(1), p25: +p(25).toFixed(1), p50: +p(50).toFixed(1),
    p75: +p(75).toFixed(1), p90: +p(90).toFixed(1),
    range: `${Math.min(...vals).toFixed(1)}–${Math.max(...vals).toFixed(1)}`,
    mad: +(mad(vals) ?? 0).toFixed(2),
  };
}

export function ensembleProbability(memberValues, threshold, { comparator = '>=', scale = 100 } = {}) {
  const vals = Array.isArray(memberValues) ? memberValues.map(Number).filter(Number.isFinite) : [];
  if (!vals.length || !Number.isFinite(Number(threshold))) return { probability: null, validMembers: 0, threshold: Number(threshold), comparator };
  const th = Number(threshold);
  const hits = vals.filter(v => comparator === '>' ? v > th : comparator === '<' ? v < th : comparator === '<=' ? v <= th : v >= th).length;
  return { probability: +(hits / vals.length * scale).toFixed(1), validMembers: vals.length, threshold: th, comparator };
}

export function ensembleProbabilities(memberValues, thresholds = [0.1, 1, 5]) {
  const out = {};
  const arr = Array.isArray(memberValues) ? memberValues : [];
  for (const th of thresholds) out[`p_ge_${th}mm`] = arr.length && arr.every(isNum) ? ensembleProbability(arr, th) : arr.map(group => ensembleProbability(group, th));
  return out;
}

function sourceTypeFor(candidates) {
  const types = new Set(candidates.map(c => c.sourceType).filter(Boolean));
  if (types.size === 1) return [...types][0];
  if (types.has('observed')) return 'blended';
  return 'blended';
}

function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }

export function fuseField(field, candidates, options = {}) {
  const policy = FieldFusionPolicy[field] || { method: 'weightedMedian', outlierSigma: 3.5, hardReject: true };
  let vals = normalizeCandidates(validateCandidates(candidates));
  if (!vals.length) {
    return { value: null, confidence: 0, provenance: { source: 'unavailable', sourceType: 'unavailable', confidence: 0 }, flags: ['no_data'] };
  }

  const rawValues = vals.map(v => v.value);
  const officialObserved = vals.filter(v => v.source === 'anm' && ['observed','official'].includes(v.sourceType));
  if (field.endsWith('.current') && officialObserved.length) {
    const best = officialObserved[0];
    const confidence = Math.max(70, Math.min(100, Math.round(best.confidence ?? 97)));
    return { value: best.value, confidence, stats: modelConsensusStats(rawValues), candidates: vals, flags: ['official_authority:ANM'], provenance: { value: best.value, unit: options.unit || '', source: best.source, sourceType: 'observed', timestamp: best.timestamp || options.timestamp || new Date().toISOString(), modelRun: null, observationAge: best.ageMs ?? options.observationAge ?? null, confidence, contributingSources: [best.source], qualityFlags: ['official_authority:ANM'], fusionMethod: 'official-precedence', robustOutlierMethod: 'N/A' } };
  }
  const outlierResult = policy.method === 'mode' || policy.method === 'max' || policy.method === 'min'
    ? { inliers: rawValues, outliers: [], flags: [], median: median(rawValues), mad: mad(rawValues) }
    : detectOutliers(rawValues, policy.outlierSigma);

  const outlierSet = new Set(outlierResult.outliers);
  const filtered = vals.map(c => ({
    ...c,
    isOutlier: outlierSet.has(c.value),
    effectiveWeight: (options.weights?.[c.source] ?? c.weight ?? 0.2) * (outlierSet.has(c.value) ? (policy.hardReject ? 0 : 0.15) : 1),
  }));

  let temporalFlags = [];
  if (Array.isArray(options.timeSeries)) {
    const maxDeltaMap = { 'temperature.current': 8, 'temperature.forecast': 12, pressure: 15, wind: 30, gust: 45 };
    temporalFlags = detectTemporalJump(options.timeSeries, maxDeltaMap[field] ?? 20);
  }

  const spatialFlags = [];
  let elevationCorrection = null;
  if (options.elevationDiff != null && field.startsWith('temperature') && options.applyElevationCorrection) {
    const lapse = Number.isFinite(options.lapseRateCPer100m) ? Number(options.lapseRateCPer100m) : -0.65;
    elevationCorrection = Number(options.elevationDiff) / 100 * lapse;
    spatialFlags.push(`elevation_delta:${Number(options.elevationDiff)}m`);
    spatialFlags.push(`elevation_correction:${elevationCorrection.toFixed(2)}C`);
  }

  let fused;
  let contributing;
  const usable = filtered.filter(c => c.effectiveWeight > 0);
  const sourceCandidates = usable.length ? usable : filtered;

  if (policy.method === 'mode') {
    const counts = new Map();
    sourceCandidates.forEach(c => counts.set(c.value, (counts.get(c.value) || 0) + 1));
    fused = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    contributing = sourceCandidates.filter(c => c.value === fused).map(c => c.source);
  } else if (policy.method === 'max') {
    fused = Math.max(...sourceCandidates.map(c => c.value));
    contributing = sourceCandidates.filter(c => c.value === fused).map(c => c.source);
  } else if (policy.method === 'min') {
    fused = Math.min(...sourceCandidates.map(c => c.value));
    contributing = sourceCandidates.filter(c => c.value === fused).map(c => c.source);
  } else if (policy.method === 'robustWeighted') {
    const r = robustWeightedMean(sourceCandidates.map(c => ({ ...c, weight: c.effectiveWeight })), {});
    fused = r?.value ?? null;
    contributing = r?.contributing ?? [];
  } else if (policy.method === 'weightedMedian') {
    const r = weightedMedian(sourceCandidates.map(c => ({ ...c, weight: c.effectiveWeight })), {});
    fused = r?.value ?? null;
    contributing = r?.contributing ?? [];
  } else {
    const r = weightedConsensus(sourceCandidates, options.weights || {});
    fused = r?.value ?? null;
    contributing = r?.contributing ?? [];
  }

  const stats = modelConsensusStats(rawValues);
  let confidence = 68;
  if (stats.n <= 1) confidence -= 18;
  if (stats.spread != null) {
    if (stats.spread <= 1) confidence += 26;
    else if (stats.spread <= 2.5) confidence += 18;
    else if (stats.spread <= 5) confidence += 7;
    else if (stats.spread <= 8) confidence -= 8;
    else confidence -= 22;
  }
  if (outlierResult.outliers.length) confidence -= 8;
  if (temporalFlags.length) confidence -= 8;
  if (spatialFlags.length) confidence -= 2;
  confidence = clamp(confidence);

  if (fused != null && elevationCorrection != null && !officialObserved.length) fused += elevationCorrection;
  if (fused != null && field.includes('temperature')) fused = +fused.toFixed(1);
  if (fused != null && field.includes('probability')) fused = Math.round(fused);
  if (fused != null && field.includes('pressure')) fused = +fused.toFixed(1);

  const qualityFlags = [
    ...outlierResult.flags,
    ...temporalFlags,
    ...spatialFlags,
    ...(options.qualityFlags || []),
  ];
  return {
    value: fused,
    confidence,
    stats,
    flags: qualityFlags,
    candidates: vals,
    provenance: {
      value: fused,
      unit: options.unit || '',
      source: contributing.length === 1 ? contributing[0] : contributing.join(' + '),
      sourceType: sourceTypeFor(vals),
      timestamp: options.timestamp || new Date().toISOString(),
      modelRun: options.modelRun || null,
      observationAge: options.observationAge ?? null,
      confidence,
      contributingSources: contributing,
      qualityFlags,
      fusionMethod: policy.method,
      robustOutlierMethod: 'MAD',
      elevationCorrection: elevationCorrection == null ? null : { correctionC: +elevationCorrection.toFixed(2), deltaM: Number(options.elevationDiff), lapseRateCPer100m: Number(options.lapseRateCPer100m ?? -0.65) },
    },
  };
}
