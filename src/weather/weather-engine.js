/**
 * src/weather/weather-engine.js
 * Weather Decision Engine — YO8ACR Weather Hub PRO
 * ANM FIRST in Romania, MULTI_MODEL globally.
 * Determines which data to display based on location, freshness, model performance etc.
 */

import { isRomania, getRegionMode } from '../../config/regions.js';
import { ROMANIA_PRIORITY, GLOBAL_PRIORITY, PROVIDER_STATUS } from '../../config/providers.js';
import { confidenceBand } from './weather-schema.js';

export class WeatherDecisionEngine {
  constructor({ verificationStore = null } = {}) {
    this.verificationStore = verificationStore; // optional Map<region, Map<provider, score>>
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

    return candidates
      .map(c => {
        let score = 100;

        // 1. Base priority (static order)
        const baseIdx = baseOrder.indexOf(c.provider);
        const baseScore = baseIdx >= 0 ? (100 - baseIdx * 10) : 30;
        score = baseScore * 0.35;

        // 2. Field-specific weighting
        const fw = fieldWeights[c.provider] ?? 0.1;
        score += fw * 40;

        // 3. Freshness penalty
        if (c.ageMs != null) {
          const hours = c.ageMs / 3600000;
          if (hours > 6) score -= 25;
          else if (hours > 2) score -= 10;
          else if (hours > 0.5) score -= 4;
        }

        // 4. Distance penalty (for observations)
        if (c.distanceKm != null) {
          if (c.distanceKm > 50) score -= 20;
          else if (c.distanceKm > 20) score -= 10;
          else if (c.distanceKm > 10) score -= 4;
        }

        // 5. Horizon penalty (forecast far future less reliable)
        if (c.horizonH != null && c.horizonH > 72) score -= Math.min(15, (c.horizonH - 72) * 0.2);

        // 6. Historical performance (if available)
        const perf = this.getPerformance(c.provider, location);
        if (perf != null) score += (perf - 50) * 0.2; // perf 0-100 centered at 50

        // 7. Resolution bonus (high-res for short range)
        if (c.resolution != null && field.includes('forecast') && c.horizonH != null && c.horizonH < 24) {
          if (c.resolution <= 2) score += 5;
          else if (c.resolution <= 7) score += 3;
        }

        return { ...c, score: Math.max(0, Math.min(100, Math.round(score))) };
      })
      .sort((a, b) => b.score - a.score);
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

  getPerformance(provider, location) {
    if (!this.verificationStore) return null;
    try {
      const key = `${location.lat.toFixed(1)},${location.lon.toFixed(1)}`;
      const m = this.verificationStore.get(key);
      if (!m) return null;
      const v = m.get(provider);
      return typeof v === 'number' ? v : null;
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
export const weatherEngine = new WeatherDecisionEngine();
export default weatherEngine;
