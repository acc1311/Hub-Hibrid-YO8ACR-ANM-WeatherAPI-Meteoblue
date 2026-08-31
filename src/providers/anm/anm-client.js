/**
 * src/providers/anm/anm-client.js
 * ANM Provider — implements WeatherProvider interface
 * All ANM access goes through this adapter. No raw structure leaks to UI.
 */

import { WeatherProvider } from '../base.js';
import { anmVal, parseAnmWind, parseAnmPressure, getAnmConditionText, anmFeatureLatLon, findStationByName, getClosestStationHaversine, haversineKm, cleanAnmText } from './anm-parser.js';
import { observationAgeMs } from '../../utils/time.js';
import { normalizeAnmNowcasting } from './anm-nowcasting.js';

// Worker proxy base — will be injected or default
const DEFAULT_PROXY = 'https://hubmeteoacr.brm-laser-veronese.workers.dev';

export class AnmProvider extends WeatherProvider {
  constructor({ proxyBase = DEFAULT_PROXY, fetchImpl = globalThis.fetch } = {}) {
    super('anm', 'ANM Meteoromania');
    this.proxyBase = proxyBase;
    this.fetchImpl = fetchImpl;
    this._obsCache = null;
    this._obsCacheTime = 0;
    this._warnCache = null;
    this._warnCacheTime = 0;
    this._nowcastCache = null;
    this._nowcastCacheTime = 0;
    this.cacheTTL = 2 * 60 * 1000;
    this.warnTTL = 5 * 60 * 1000;
  }

  async _safeFetch(url, opts = {}) {
    const timeout = opts.timeout || 12000;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await this.fetchImpl(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      return res;
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  async getStations(force = false) {
    const now = Date.now();
    if (!force && this._obsCache && now - this._obsCacheTime < this.cacheTTL) return this._obsCache;
    const res = await this._safeFetch(`${this.proxyBase}/anm?t=${now}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`ANM HTTP ${res.status}`);
    const data = await res.json();
    this._obsCache = data;
    this._obsCacheTime = now;
    this.markOnline();
    return data;
  }

  async getNowcasting(force = false) {
    const now = Date.now();
    if (!force && this._nowcastCache && now - this._nowcastCacheTime < 60 * 1000) return this._nowcastCache;
    const res = await this._safeFetch(`${this.proxyBase}/api/anm/nowcasting?t=${now}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`ANM nowcasting HTTP ${res.status}`);
    const data = await res.json();
    this._nowcastCache = normalizeAnmNowcasting(data); this._nowcastCacheTime = now;
    return this._nowcastCache;
  }

  async getWarnings(force = false) {
    const now = Date.now();
    if (!force && this._warnCache && now - this._warnCacheTime < this.warnTTL) return this._warnCache;
    const res = await this._safeFetch(`${this.proxyBase}/anm-warnings?t=${now}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`ANM warnings HTTP ${res.status}`);
    const data = await res.json();
    this._warnCache = data;
    this._warnCacheTime = now;
    return data;
  }

  /**
   * Resolve location → station
   * Returns { station, distanceKm, elevationDiff, confidence, lat, lon }
   */
  async resolveStation({ query, lat, lon }) {
    const data = await this.getStations();
    const features = data.features || [];
    let station = null;
    if (query) station = findStationByName(query, features);
    if (!station && lat != null && lon != null) {
      const r = getClosestStationHaversine(lat, lon, features, 150);
      if (r) station = r.feature;
    }
    if (!station) return null;
    const stPos = anmFeatureLatLon(station);
    const distanceKm = (lat!=null&&lon!=null&&stPos) ? haversineKm(lat, lon, stPos.lat, stPos.lon) : null;
    let confidence = 98;
    if (distanceKm != null) {
      if (distanceKm > 50) confidence = 55;
      else if (distanceKm > 20) confidence = 75;
      else if (distanceKm > 10) confidence = 88;
      else if (distanceKm > 5) confidence = 93;
    }
    if (query && station && cleanAnmText(station.properties.nume).toLowerCase() !== String(query).toLowerCase().trim()) {
      confidence = Math.min(confidence, 82);
    }
    return {
      station,
      properties: station.properties,
      lat: stPos?.lat ?? null,
      lon: stPos?.lon ?? null,
      distanceKm,
      confidence,
    };
  }

  async fetchObservation(lat, lon, query = null) {
    const resolved = await this.resolveStation({ query, lat, lon });
    if (!resolved) throw new Error('No ANM station found');
    const p = resolved.properties;
    const wind = parseAnmWind(p.vant);
    const pressure = parseAnmPressure(p.presiunetext);
    const ageMs = observationAgeMs(p.actualizat);
    return {
      source: 'ANM',
      sourceType: 'observed',
      lat: resolved.lat,
      lon: resolved.lon,
      stationName: cleanAnmText(p.nume),
      observationTime: p.actualizat,
      observationAgeMs: ageMs,
      distanceKm: resolved.distanceKm,
      confidence: resolved.confidence,
      temperature: p.tempe != null && anmVal(p.tempe) ? parseFloat(p.tempe) : null,
      humidity: p.umezeala != null && anmVal(p.umezeala) ? parseFloat(p.umezeala) : null,
      pressure: pressure.value,
      pressureTrend: pressure.trend,
      windSpeedMs: wind.speedMs,
      windSpeedKmh: wind.speedKmh,
      windDir: wind.direction,
      condition: getAnmConditionText(p),
      raw: p,
      provenance: {
        source: `ANM — Stația ${cleanAnmText(p.nume)}`,
        sourceType: 'observed',
        timestamp: p.actualizat,
        observationAge: ageMs,
        confidence: resolved.confidence,
        contributingSources: ['ANM'],
        qualityFlags: ageMs!=null && ageMs>30*60*1000 ? ['stale'] : [],
      },
    };
  }

  async fetchNowcastingNormalized() {
    return await this.getNowcasting();
  }

  async fetchWarningsNormalized() {
    const raw = await this.getWarnings();
    const { parseANMWarnings } = await import('./anm-alerts.js');
    return parseANMWarnings(raw);
  }

  // WeatherProvider interface stubs
  async search(query) {
    const data = await this.getStations();
    const q = String(query).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const matches = (data.features||[]).filter(f=>{
      const name=(f.properties.nume||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return name.includes(q);
    }).slice(0,6);
    return matches.map(f=>{
      const p=f.properties;
      const pos=anmFeatureLatLon(f);
      return { name: cleanAnmText(p.nume), lat: pos?.lat, lon: pos?.lon, detail: cleanAnmText(p.actualizat||''), feature:f };
    });
  }
}
export default AnmProvider;
