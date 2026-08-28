/**
 * src/weather/weather-schema.js
 * Normalized Weather Schema — YO8ACR Weather Hub PRO
 * UI never sees raw provider structures. Everything goes through this schema.
 */

/**
 * @typedef {Object} Provenance
 * @property {number} value
 * @property {string} unit
 * @property {string} source           // e.g. "ANM — Stația Iași" or "ICON-EU"
 * @property {string} sourceType       // observed | forecast | nowcast | model | blended | derived | fallback | unavailable
 * @property {string} timestamp        // observation or model run time ISO
 * @property {string|null} modelRun    // e.g. "06Z" or ISO datetime
 * @property {number|null} observationAge // ms since observation
 * @property {number} confidence       // 0-100
 * @property {string[]} contributingSources
 * @property {string[]} qualityFlags   // e.g. ["outlier","stale","interpolated"]
 */

/**
 * @typedef {Object} WeatherSnapshot
 * @property {{name:string,country:string,lat:number,lon:number,county?:string,timezone:string,isRomania:boolean,mode:string}} location
 * @property {string} observedAt
 * @property {Object} current        // each field: { value, provenance }
 * @property {Object} hourly
 * @property {Object} daily
 * @property {Array} alerts
 * @property {Object|null} nowcast
 * @property {Object|null} airQuality
 * @property {Object|null} astronomy
 * @property {Object|null} radar
 * @property {Object|null} modelConsensus
 * @property {number} confidence   // overall 0-100
 * @property {Object} provenance   // per-section provenance
 */

export function createProvenance({
  value,
  unit,
  source,
  sourceType = 'model',
  timestamp = new Date().toISOString(),
  modelRun = null,
  observationAge = null,
  confidence = 75,
  contributingSources = [],
  qualityFlags = [],
} = {}) {
  return {
    value,
    unit,
    source,
    sourceType,
    timestamp,
    modelRun,
    observationAge,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
    contributingSources: Array.isArray(contributingSources) ? contributingSources : [],
    qualityFlags: Array.isArray(qualityFlags) ? qualityFlags : [],
  };
}

export function withProvenance(value, provenance) {
  return { value, provenance };
}

export function provenanceExplain(p) {
  if (!p) return 'Unavailable';
  const parts = [];
  parts.push(`Source: ${p.source} (${p.sourceType})`);
  if (p.timestamp) parts.push(`At: ${p.timestamp}`);
  if (p.modelRun) parts.push(`Run: ${p.modelRun}`);
  if (p.observationAge != null) parts.push(`Age: ${Math.round(p.observationAge/60000)} min`);
  parts.push(`Confidence: ${p.confidence}/100`);
  if (p.contributingSources?.length) parts.push(`Contributors: ${p.contributingSources.join(', ')}`);
  if (p.qualityFlags?.length) parts.push(`Flags: ${p.qualityFlags.join(', ')}`);
  return parts.join(' · ');
}

// Default empty snapshot
export function emptySnapshot({ lat, lon, name = 'Unknown', country = 'RO', timezone = 'Europe/Bucharest' } = {}) {
  const { isRomania } = awaitIsRomania(lat, lon); // sync wrapper below
  return {
    location: { name, country, lat, lon, timezone, isRomania: isRomaniaSync(lat, lon), mode: isRomaniaSync(lat, lon) ? 'ANM_FIRST' : 'MULTI_MODEL' },
    observedAt: new Date().toISOString(),
    current: {},
    hourly: { time: [], temperature: [], provenance: {} },
    daily: { time: [], provenance: {} },
    alerts: [],
    nowcast: null,
    airQuality: null,
    astronomy: null,
    radar: null,
    modelConsensus: null,
    confidence: 0,
    provenance: {},
  };
}

function isRomaniaSync(lat, lon) {
  const la = Number(lat), lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  return la >= 43.6 && la <= 48.3 && lo >= 20.2 && lo <= 30.0;
}
async function awaitIsRomania(lat, lon) { return { isRomania: isRomaniaSync(lat, lon) }; }

// Status enum for UI
export const DATA_STATUS = {
  LIVE: 'LIVE',       // 🟢
  STALE: 'STALE',     // 🟡
  FALLBACK: 'FALLBACK', // 🟠
  OFFLINE: 'OFFLINE', // 🔴
};

export function deriveStatus(provenance, ttlMs) {
  if (!provenance || provenance.sourceType === 'unavailable') return DATA_STATUS.OFFLINE;
  if (provenance.qualityFlags?.includes('fallback')) return DATA_STATUS.FALLBACK;
  if (provenance.observationAge != null && ttlMs != null && provenance.observationAge > ttlMs) return DATA_STATUS.STALE;
  if (provenance.confidence < 40) return DATA_STATUS.STALE;
  return DATA_STATUS.LIVE;
}

// Confidence bands
export function confidenceBand(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return { label: 'Limitată', band: 'limited' };
  if (s >= 98) return { label: 'Foarte ridicată', band: 'very-high' };
  if (s >= 90) return { label: 'Ridicată', band: 'high' };
  if (s >= 75) return { label: 'Bună', band: 'good' };
  if (s >= 60) return { label: 'Moderată', band: 'moderate' };
  if (s >= 40) return { label: 'Scăzută', band: 'low' };
  return { label: 'Limitată', band: 'limited' };
}

// Why this value? — structured explanation for UI modal
export function whyThisValue(provenance, candidates = []) {
  return {
    value: provenance?.value,
    unit: provenance?.unit,
    source: provenance?.source,
    sourceType: provenance?.sourceType,
    timestamp: provenance?.timestamp,
    confidence: provenance?.confidence,
    confidenceBand: confidenceBand(provenance?.confidence),
    contributingSources: provenance?.contributingSources || [],
    candidates: candidates.map(c => ({ source: c.source, value: c.value })),
    flags: provenance?.qualityFlags || [],
    explanation: provenanceExplain(provenance),
  };
}
