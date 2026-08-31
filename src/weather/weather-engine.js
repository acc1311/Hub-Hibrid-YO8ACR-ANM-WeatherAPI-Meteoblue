/**
 * src/weather/weather-engine.js
 * Weather Decision Engine — YO8ACR Weather Hub PRO
 * ANM FIRST in Romania, MULTI_MODEL globally.
 * Determines which data to display based on location, freshness, model performance etc.
 */

import { isRomania, getRegionMode } from '../../config/regions.js';
import { ROMANIA_PRIORITY, GLOBAL_PRIORITY, PROVIDER_STATUS } from '../../config/providers.js';
import { confidenceBand } from './weather-schema.js';
import { modelSkillDB } from '../verification/model-skill.js';
import { dynamicWeights } from '../verification/dynamic-weighting.js';
import { verificationStore } from './verification.js';

export class WeatherDecisionEngine {
  constructor({ verificationStore = null, skillDB = modelSkillDB, providerHealth = null } = {}) {
    this.verificationStore = verificationStore;
    this.skillDB = skillDB;
    this.providerHealth = providerHealth;
  }

  /**
   * Decide source ranking for a given field and location
   * @param {string} field - e.g. 'temperature.current'
   * @param {{lat:number,lon:number}} location
   * @param {Array<{provider:string, ageMs:number|null, distanceKm:number|null, resolution:number|null, horizonH:number|null}>} candidates
   * @returns {Array} sorted candidates with score
   */
  rankSources(field, location, candidates) {
    const inRo = isRomania(location.lat, location.lon);
    const baseOrder = inRo ? ROMANIA_PRIORITY : GLOBAL_PRIORITY;
    const fieldWeights = this._fieldWeights(field, inRo);
    const hours = candidates.map(c => Number(c.horizonH)).find(Number.isFinite);
    const horizon = hours == null ? '0-24h' : hours <= 24 ? '0-24h' : hours <= 48 ? '24-48h' : hours <= 72 ? '48-72h' : '72-120h';
    const values = candidates.map(c => Number(c.value)).filter(Number.isFinite);
    const spread = values.length > 1 ? Math.max(...values) - Math.min(...values) : null;
    const health = this.providerHealth || {};
    const adaptive = dynamicWeights({ lat: location.lat, lon: location.lon, param: String(field).split('.')[0], horizon, baseWeights: fieldWeights, agreementSpread: spread, providerHealth: health });

    return candidates.map(c => {
      let score = 18;
      const baseIdx = baseOrder.indexOf(c.provider);
      if (baseIdx >= 0) score += Math.max(0, 30 - baseIdx * 5);
      score += (adaptive[c.provider] ?? fieldWeights[c.provider] ?? 0.1) * 50;

      if (inRo && c.provider === 'anm' && ['observed','official','official-nowcasting','official-warning'].includes(c.sourceType)) score += 25;
      if (c.ageMs != null) { const h = c.ageMs / 3600000; if (h > 6) score -= 25; else if (h > 2) score -= 10; else if (h > 0.5) score -= 4; }
      if (c.distanceKm != null) { if (c.distanceKm > 75) score -= 25; else if (c.distanceKm > 50) score -= 15; else if (c.distanceKm > 20) score -= 8; else if (c.distanceKm > 10) score -= 3; }
      if (c.horizonH != null && c.horizonH > 72) score -= Math.min(15, (c.horizonH - 72) * 0.2);
      const perf = this.getPerformance(c.provider, location, field, c.horizonH);
      if (perf != null) score += (perf - 50) * 0.22;
      if (c.resolution != null && ['forecast','nowcast'].some(x => field.includes(x)) && c.horizonH != null && c.horizonH < 24) { if (Number(c.resolution) <= 2) score += 5; else if (Number(c.resolution) <= 7) score += 3; }
      return { ...c, score: Math.max(0, Math.min(100, Math.round(score))) };
    }).sort((a,b) => b.score - a.score);
  }

  _fieldWeights(field, inRo) {
    // FieldFusionPolicy influences base weights per field
    if (field.startsWith('temperature')) {
      return inRo
        ? { anm: 0.45, openmeteo_d2: 0.25, openmeteo_eu: 0.15, openmeteo_ecmwf: 0.10, meteoblue: 0.03, weatherapi: 0.02 }
        : { openmeteo_ecmwf: 0.35, openmeteo_eu: 0.25, meteoblue: 0.20, weatherapi: 0.15, openmeteo_d2: 0.05 };
    }
    if (field.includes('precipitation')) {
      return inRo
        ? { anm: 0.10, openmeteo_d2: 0.30, openmeteo_eu: 0.30, openmeteo_ecmwf: 0.25, meteoblue: 0.05 }
        : { openmeteo_ecmwf: 0.40, openmeteo_eu: 0.30, meteoblue: 0.20, openmeteo_d2: 0.10 };
    }
    if (field.includes('wind')) {
      return inRo
        ? { anm: 0.35, openmeteo_d2: 0.30, openmeteo_eu: 0.20, openmeteo_ecmwf: 0.10, weatherapi: 0.05 }
        : { openmeteo_ecmwf: 0.35, openmeteo_eu: 0.30, weatherapi: 0.20, meteoblue: 0.15 };
    }
    if (field.includes('pressure') || field.includes('humidity')) {
      return inRo
        ? { anm: 0.40, openmeteo_eu: 0.30, openmeteo_d2: 0.20, openmeteo_ecmwf: 0.10 }
        : { openmeteo_eu: 0.35, openmeteo_ecmwf: 0.35, meteoblue: 0.20, weatherapi: 0.10 };
    }
    return inRo
      ? { anm: 0.30, openmeteo_eu: 0.30, openmeteo_ecmwf: 0.25, openmeteo_d2: 0.15 }
      : { openmeteo_ecmwf: 0.40, openmeteo_eu: 0.30, meteoblue: 0.20, weatherapi: 0.10 };
  }

  getPerformance(provider, location, field = 'temperature', horizonH = null) {
    if (!this.verificationStore) return null;
    try {
      const key = `${location.lat.toFixed(1)},${location.lon.toFixed(1)}`;
      const m = typeof this.verificationStore.get === 'function' ? this.verificationStore.get(key) : null;
      if (m) { const raw = m instanceof Map ? m.get(provider) : m[provider]; if (raw) return typeof raw === 'number' ? raw : raw.weight ?? raw.skill ?? null; }
      const horizon = horizonH == null ? '0-24h' : horizonH <= 24 ? '0-24h' : horizonH <= 48 ? '24-48h' : horizonH <= 72 ? '48-72h' : '72-120h';
      const param = String(field).split('.')[0];
      const skill = this.skillDB?.get?.(provider, location.lat, location.lon, param, horizon);
      return skill?.skill ?? null;
    } catch { return null; }
  }

  /**
   * High-level decision: ANM FIRST vs MULTI_MODEL
   */
  decideMode(lat, lon) {
    const ro = isRomania(lat, lon);
    return {
      isRomania: ro,
      mode: getRegionMode(lat, lon),
      badge: ro ? '🇷🇴 ANM FIRST' : '🌍 MULTI-MODEL',
      priority: ro ? ROMANIA_PRIORITY : GLOBAL_PRIORITY,
    };
  }

  /**
   * Create a Data Provenance object for a fused value
   */
  createProvenance({ value, unit, source, sourceType, timestamp, modelRun, observationAge, confidence, contributingSources, qualityFlags }) {
    return {
      value,
      unit,
      source,
      sourceType,
      timestamp: timestamp || new Date().toISOString(),
      modelRun,
      observationAge,
      confidence: Math.max(0, Math.min(100, Math.round(confidence ?? 75))),
      contributingSources: contributingSources || [],
      qualityFlags: qualityFlags || [],
    };
  }

  confidenceBand(score) { return confidenceBand(score); }
}

// Singleton default engine
export const weatherEngine = new WeatherDecisionEngine({ verificationStore, skillDB: modelSkillDB });
export default weatherEngine;
