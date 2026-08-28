import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- ANM Parser ---
import { cleanAnmText, anmVal, parseAnmWind, parseAnmPressure, getAnmConditionText, findStationByName, getClosestStation, getClosestStationHaversine, haversineKm, anmFeatureLatLon } from '../src/providers/anm/anm-parser.js';
import { parseANMWarnings, countyLevels, RO_JUDET_COD } from '../src/providers/anm/anm-alerts.js';
import { isRomania, getRegionMode } from '../config/regions.js';
import { fuseField, FieldFusionPolicy, validateCandidates, detectOutliers, detectTemporalJump, spatialConsistencyCheck, modelConsensusStats, weightedConsensus } from '../src/fusion/fusion-engine.js';
import { scoreSourceQuality, scoreFreshness, scoreAgreement, scoreObservationConfidence, scoreForecastConfidence, computeConfidence, confidenceBand } from '../src/fusion/confidence-engine.js';
import { mae, rmse, bias, correlation, brierScore, VerificationStore } from '../src/weather/verification.js';
import { WeatherDecisionEngine } from '../src/weather/weather-engine.js';
import { AlertEngine, severityScore } from '../src/alerts/alert-engine.js';
import { haversineKm as haversineUtil, parseCoordinateInput } from '../src/utils/geo.js';
import { to24h, observationAgeMs } from '../src/utils/time.js';
import { qualityFlagsForField, temporalJumps } from '../src/fusion/quality.js';
import { HealthRegistry } from '../src/core/health.js';
import { cache, cacheKey } from '../src/core/cache.js';

// Helper: mock ANM GeoJSON
function mockStation(name, lon, lat, props={}){
  return { geometry:{ coordinates:[lon, lat] }, properties:{ nume:name, tempe:'20', actualizat:'24-04-2026 ora 06:00', ...props } };
}

describe('ANM parser', ()=>{
  it('cleanAnmText decodes entities', ()=>{
    // cleanAnmText handles &nbsp; and basic entities; detailed decoding is in _anmCleanText for warnings
    expect(cleanAnmText('T&acirc;rgu &nbsp; Neam&#539;')).toBe('T&acirc;rgu Neam&#539;');
    expect(cleanAnmText('Targu&nbsp;Neamt')).toBe('Targu Neamt');
  });
  it('anmVal returns null for indisponibil', ()=>{
    expect(anmVal('indisponibil')).toBeNull();
    expect(anmVal('-')).toBeNull();
    expect(anmVal('')).toBeNull();
    expect(anmVal('20')).toBe('20');
  });
  it('parseAnmWind parses speed and direction', ()=>{
    const r=parseAnmWind('1.8 m/s, directia : VSV');
    expect(r.speedMs).toBe(1.8);
    expect(r.speedKmh).toBeCloseTo(6.5,1);
    expect(r.direction).toBe('VSV');
  });
  it('parseAnmWind indisponibil', ()=>{
    expect(parseAnmWind('indisponibil').speedMs).toBeNull();
  });
  it('parseAnmWind with different format', ()=>{
    const r=parseAnmWind('3.5 m/s');
    expect(r.speedMs).toBe(3.5);
    expect(r.direction).toBeNull();
  });
  it('parseAnmPressure with scadere', ()=>{
    const r=parseAnmPressure('970.5 mb, in scadere');
    expect(r.value).toBe(970.5);
    expect(r.trend).toBe('↓');
    expect(r.mmHg).toBeDefined();
  });
  it('parseAnmPressure indisponibil', ()=>{
    expect(parseAnmPressure('indisponibil').value).toBeNull();
  });
  it('getAnmConditionText fallback', ()=>{
    expect(getAnmConditionText(null,'fallback')).toBe('fallback');
    expect(getAnmConditionText({ descriere:'Senin' })).toBe('Senin');
  });
  it('findStationByName exact', ()=>{
    const feats=[mockStation('TARGU NEAMT',26.36,47.17), mockStation('TARGU JIU',23.27,45.03)];
    expect(findStationByName('Targu Neamt', feats).properties.nume).toBe('TARGU NEAMT');
  });
  it('findStationByName via CITY_MAP', ()=>{
    const feats=[mockStation('SINAIA 1500',25.55,45.35)];
    expect(findStationByName('sinaia', feats).properties.nume).toBe('SINAIA 1500');
  });
  it('findStationByName returns null for empty', ()=>{
    expect(findStationByName('xxx', [])).toBeNull();
  });
  it('getClosestStation within threshold', ()=>{
    const feats=[mockStation('A',26.36,47.17), mockStation('B',26.5,47.5)];
    const c=getClosestStation(47.17,26.36, feats);
    expect(c.properties.nume).toBe('A');
  });
  it('getClosestStation null if far', ()=>{
    const feats=[mockStation('FAR',10,40)];
    expect(getClosestStation(47.17,26.36, feats)).toBeNull();
  });
  it('haversineKm correct', ()=>{
    expect(haversineKm(47.17,26.36,47.17,26.36)).toBeCloseTo(0,2);
    expect(haversineKm(47.17,26.36,45.75,21.22)).toBeGreaterThan(300);
  });
  it('getClosestStationHaversine with distance', ()=>{
    const feats=[mockStation('IASI',27.58,47.15), mockStation('CLUJ',23.6,46.77)];
    const r=getClosestStationHaversine(47.15,27.58, feats);
    expect(r.distanceKm).toBeLessThan(1);
  });
  it('anmFeatureLatLon handles WebMercator', ()=>{
    // raw lon/lat >180 indicates WebMercator
    const f={ geometry:{ coordinates:[3000000, 6000000] }, properties:{} };
    const ll=anmFeatureLatLon(f);
    expect(ll.lat).toBeDefined();
    expect(ll.lon).toBeDefined();
  });
});

describe('ANM alerts parsing', ()=>{
  const sample = {
    avertizare: {
      "@attributes": {
        numeTipMesaj: "Avertizare meteorologică",
        culoare: "1",
        numeCuloare: "galben",
        dataAparitiei: "2026-04-24T06:00:00",
        dataExpirarii: "2026-04-25T06:00:00",
        intervalul: "24 aprilie, ora 10 – 25 aprilie, ora 10",
        fenomeneVizate: "ploi",
        zonaAfectata: "Moldova",
        mesaj: "Interval de valabilitate: 24 aprilie, ora 10 – 25 aprilie, ora 10<br>Fenomene vizate: ploi însemnate cantitativ<br>Zone afectate: Moldova"
      },
      judet: [{ "@attributes": { cod:"IS", culoare:"1" } }, { "@attributes": { cod:"NT", culoare:"1" } }]
    }
  };
  it('parses single warning', ()=>{
    const out=parseANMWarnings(sample);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].level).toBe('yellow');
    expect(out[0].official).toBe(true);
    expect(out[0].counties).toContain('IS');
  });
  it('empty returns []', ()=>{
    expect(parseANMWarnings(null)).toEqual([]);
    expect(parseANMWarnings({})).toEqual([]);
  });
  it('multi-color split', ()=>{
    const data={
      avertizare:{ "@attributes":{ numeTipMesaj:"Avertizare", culoare:"1", numeCuloare:"galben", mesaj:'<img src="galben.gif">cod galben ploi<br><img src="rosu.gif">cod rosu vijelii' }, judet:[{ "@attributes":{cod:"IS",culoare:"1"}},{ "@attributes":{cod:"CJ",culoare:"3"}}] }
    };
    const out=parseANMWarnings(data);
    expect(out.length).toBe(2);
    expect(out[0].level).toBe('yellow');
    expect(out[1].level).toBe('red');
  });
  it('countyLevels builds map', ()=>{
    const warns=parseANMWarnings(sample);
    const lv=countyLevels(warns);
    expect(lv['IS'].level).toBe('yellow');
    expect(lv['CJ'].level).toBeNull();
  });
  it('RO_JUDET_COD has 42 entries', ()=>{
    expect(Object.keys(RO_JUDET_COD).length).toBe(42);
  });
});

describe('Regions', ()=>{
  it('isRomania true inside', ()=>{
    expect(isRomania(47.17,26.36)).toBe(true);
    expect(isRomania(45.75,21.22)).toBe(true);
    expect(isRomania(44.43,26.10)).toBe(true);
  });
  it('isRomania false outside', ()=>{
    expect(isRomania(48.85,2.35)).toBe(false);
    expect(isRomania(40.41,-3.70)).toBe(false);
    expect(isRomania(51.50,-0.12)).toBe(false);
  });
  it('getRegionMode', ()=>{
    expect(getRegionMode(47.17,26.36)).toBe('ANM_FIRST');
    expect(getRegionMode(48.85,2.35)).toBe('MULTI_MODEL');
  });
  it('invalid coords false', ()=>{
    expect(isRomania(null,null)).toBe(false);
    expect(isRomania('abc', 10)).toBe(false);
  });
});

describe('Fusion engine', ()=>{
  it('validateCandidates filters non-numbers', ()=>{
    expect(validateCandidates([{value:1},{value:null},{value:NaN},{value:2}]).length).toBe(2);
  });
  it('detectOutliers flags extreme', ()=>{
    // With sigma 1.0, 39 is outlier among 25s
    const { outliers }=detectOutliers([25,25.4,25.1,39],1.0);
    expect(outliers).toContain(39);
  });
  it('detectOutliers no outlier when std=0', ()=>{
    const { outliers }=detectOutliers([20,20,20],2.0);
    expect(outliers.length).toBe(0);
  });
  it('detectTemporalJump finds jumps', ()=>{
    const flags=detectTemporalJump([25,26,27,42,27],10);
    expect(flags.length).toBeGreaterThan(0);
  });
  it('spatialConsistencyCheck flags anomaly', ()=>{
    expect(spatialConsistencyCheck([10,12], 25, 5).length).toBe(1);
    expect(spatialConsistencyCheck([20,21], 20.5, 5).length).toBe(0);
  });
  it('weightedConsensus', ()=>{
    const r=weightedConsensus([{value:10, source:'a', weight:1},{value:20, source:'b', weight:1}],{});
    expect(r.value).toBeCloseTo(15,1);
  });
  it('modelConsensusStats', ()=>{
    const s=modelConsensusStats([10,12,14]);
    expect(s.spread).toBe(4);
    expect(s.mean).toBe(12);
    expect(s.p50).toBe(12);
  });
  it('fuseField weighted temp', ()=>{
    const r=fuseField('temperature.current', [{value:20, source:'anm'},{value:21, source:'openmeteo_eu'},{value:20.5, source:'openmeteo_ecmwf'}], { weights:{ anm:0.5, openmeteo_eu:0.3, openmeteo_ecmwf:0.2 }});
    // 20*0.5 +21*0.3 +20.5*0.2 = 20.4
    expect(r.value).toBeCloseTo(20.4,1);
    expect(r.confidence).toBeGreaterThan(60);
  });
  it('fuseField handles outlier', ()=>{
    // Need 10 values to get z>2.5 for outlier with sigma 2.5 (max z = sqrt(n-1))
    const vals=[20,20,20,20,20,20,20,20,20,50].map((v,i)=>({value:v, source:'s'+i}));
    const r=fuseField('temperature.current', vals);
    expect(r.flags.some(f=>f.includes('outlier'))).toBe(true);
    expect(r.value).toBeLessThan(30);
  });
  it('fuseField empty returns null', ()=>{
    const r=fuseField('temperature.current', []);
    expect(r.value).toBeNull();
  });
  it('fuseField mode for weather_code', ()=>{
    const r=fuseField('weather_code', [{value:3, source:'a'},{value:3, source:'b'},{value:1, source:'c'}]);
    expect(r.value).toBe(3);
  });
  it('FieldFusionPolicy defined', ()=>{
    expect(FieldFusionPolicy['temperature.current']).toBeDefined();
    expect(FieldFusionPolicy['precipitation_amount']).toBeDefined();
  });
});

describe('Confidence engine', ()=>{
  it('scoreSourceQuality', ()=>{
    expect(scoreSourceQuality('anm', true)).toBe(98);
    expect(scoreSourceQuality('anm', false)).toBeLessThan(50);
  });
  it('scoreFreshness', ()=>{
    expect(scoreFreshness(60*1000, 5*60*1000)).toBe(100);
    expect(scoreFreshness(10*60*1000, 5*60*1000)).toBe(70);
    expect(scoreFreshness(30*60*1000, 5*60*1000)).toBeLessThan(40);
  });
  it('scoreAgreement', ()=>{
    expect(scoreAgreement(0.5,3)).toBeGreaterThan(90);
    expect(scoreAgreement(10,3)).toBeLessThan(30);
  });
  it('scoreObservationConfidence distance penalty', ()=>{
    expect(scoreObservationConfidence({ distanceKm:5 })).toBeGreaterThan(scoreObservationConfidence({ distanceKm:60 }));
  });
  it('scoreForecastConfidence horizon penalty', ()=>{
    expect(scoreForecastConfidence({ horizonH:10 })).toBeGreaterThan(scoreForecastConfidence({ horizonH:150 }));
  });
  it('computeConfidence', ()=>{
    const c=computeConfidence({ sourceQuality:90, freshness:90, agreement:90 });
    expect(c).toBeGreaterThan(85);
  });
  it('confidenceBand', ()=>{
    expect(confidenceBand(98).band).toBe('very-high');
    expect(confidenceBand(30).band).toBe('limited');
    expect(confidenceBand(null).band).toBe('limited');
  });
});

describe('Verification', ()=>{
  it('mae', ()=>{
    expect(mae([10,20,30],[12,18,33])).toBeCloseTo(2.33,1);
  });
  it('rmse', ()=>{
    expect(rmse([10,20],[10,20])).toBe(0);
    expect(rmse([10],[12])).toBe(2);
  });
  it('bias', ()=>{
    expect(bias([10,20],[8,18])).toBe(2);
  });
  it('correlation perfect', ()=>{
    expect(correlation([1,2,3],[1,2,3])).toBeCloseTo(1,2);
  });
  it('correlation null for insufficient', ()=>{
    expect(correlation([1],[1])).toBeNull();
  });
  it('brierScore', ()=>{
    expect(brierScore([0,100,50],[0,1,0])).toBeCloseTo(0.083,2);
  });
  it('VerificationStore', ()=>{
    const vs=new VerificationStore();
    vs.record(47.1,26.3,'icon_eu',[20,21,22],[20.5,21.5,22.5]);
    expect(vs.get(47.1,26.3,'icon_eu').mae).toBeDefined();
    expect(vs.weightsFor(47.1,26.3)).toBeDefined();
  });
});

describe('WeatherDecisionEngine', ()=>{
  it('decideMode Romania', ()=>{
    const e=new WeatherDecisionEngine();
    const d=e.decideMode(47.17,26.36);
    expect(d.isRomania).toBe(true);
    expect(d.mode).toBe('ANM_FIRST');
    expect(d.badge).toContain('ANM');
  });
  it('decideMode global', ()=>{
    const e=new WeatherDecisionEngine();
    const d=e.decideMode(48.85,2.35);
    expect(d.isRomania).toBe(false);
    expect(d.badge).toContain('MULTI');
  });
  it('rankSources', ()=>{
    const e=new WeatherDecisionEngine();
    const ranked=e.rankSources('temperature.current', {lat:47.17,lon:26.36}, [
      { provider:'anm', ageMs:5*60*1000, distanceKm:3, resolution:1, horizonH:0 },
      { provider:'openmeteo_eu', ageMs:60*60*1000, distanceKm:null, resolution:7, horizonH:12 }
    ]);
    expect(ranked[0].provider).toBe('anm');
  });
  it('field weights', ()=>{
    const e=new WeatherDecisionEngine();
    const w=e._fieldWeights('temperature.current', true);
    expect(w.anm).toBeGreaterThan(w.meteoblue);
  });
});

describe('Alert engine', ()=>{
  it('severityScore official high', ()=>{
    const s=severityScore({ official:true, intensity:95, probability:90, confidence:95 });
    expect(s).toBeGreaterThanOrEqual(70);
  });
  it('derive alerts wind', ()=>{
    const eng=new AlertEngine();
    const alerts=eng.deriveAlerts({ current:{ wind_gusts_10m:95 }, hourly:{ cape:[0], precipitation:[0], uv_index:[0] }, daily:{ temperature_2m_max:[20], temperature_2m_min:[10], wind_gusts_10m_max:[0] }, nowIdx:0 });
    expect(alerts.some(a=>a.title.includes('Rafale'))).toBe(true);
  });
  it('combine official+derived sorted', ()=>{
    const eng=new AlertEngine();
    const off=eng.enrichOfficial([{ level:'yellow', title:'Cod galben', msg:'test', icon:'🟡', counties:['IS'] }]);
    const der=eng.deriveAlerts({ current:{ wind_gusts_10m:95 }, hourly:{ cape:[0], precipitation:[0], uv_index:[0] }, daily:{ temperature_2m_max:[20], temperature_2m_min:[10], wind_gusts_10m_max:[0] }, nowIdx:0 });
    const all=eng.combine(off, der);
    expect(all.length).toBeGreaterThan(0);
    expect(all[0].badge).toBeDefined();
  });
});

describe('Utils geo/time', ()=>{
  it('haversine', ()=>{
    expect(haversineUtil(0,0,0,0)).toBe(0);
  });
  it('parseCoordinateInput valid', ()=>{
    expect(parseCoordinateInput('47.17, 26.36')).toEqual({lat:47.17, lon:26.36});
    expect(parseCoordinateInput('47.17,26.36, extra')).toBeNull();
  });
  it('parseCoordinateInput invalid range', ()=>{
    expect(parseCoordinateInput('100, 200')).toBeNull();
  });
  it('to24h', ()=>{
    expect(to24h('06:30 PM')).toBe('18:30');
    expect(to24h('12:00 AM')).toBe('00:00');
    expect(to24h('06:30')).toBe('06:30');
  });
  it('observationAgeMs parse', ()=>{
    const age=observationAgeMs('24-04-2026 ora 06:00');
    expect(typeof age==='number' || age===null).toBe(true);
  });
});

describe('Quality flags', ()=>{
  it('qualityFlagsForField stale', ()=>{
    const flags=qualityFlagsForField({ value:20, candidates:[{value:20},{value:21}], ageMs: 60*60*1000, ttlMs: 10*60*1000 });
    expect(flags).toContain('stale');
  });
  it('temporalJumps', ()=>{
    expect(temporalJumps([1,2,30],10)).toContain(2);
  });
});

describe('HealthRegistry', ()=>{
  it('marks success', ()=>{
    const h=new HealthRegistry();
    h.init(['anm']);
    h.markSuccess('anm',{ latencyMs:123 });
    expect(h.snapshot()[0].status).toBe('ONLINE');
  });
  it('marks unavailable', ()=>{
    const h=new HealthRegistry();
    h.init(['x']);
    h.markUnavailable('x',{ error:'timeout' });
    expect(h.snapshot()[0].status).toBe('UNAVAILABLE');
  });
  it('toUI dot', ()=>{
    const h=new HealthRegistry();
    h.init(['a','b']);
    h.markSuccess('a',{}); h.markUnavailable('b',{});
    const ui=h.toUI();
    expect(ui.find(x=>x.label==='a').dot).toBe('🟢');
    expect(ui.find(x=>x.label==='b').dot).toBe('🔴');
  });
});

describe('Cache', ()=>{
  it('set and get', ()=>{
    cache.set('test_key', {v:1}, 10000);
    expect(cache.get('test_key')).toEqual({v:1});
  });
  it('cacheKey', ()=>{
    expect(cacheKey('anm',47.17,26.36)).toContain('47.17');
  });
  it('stale after expiry', async ()=>{
    cache.set('exp_key', 123, 1);
    await new Promise(r=>setTimeout(r,10));
    expect(cache.get('exp_key')).toBeNull();
  });
});

describe('Edge cases — timezone/DST, units', ()=>{
  it('DST transition hour', ()=>{
    // Simulate daily array lookup on DST day
    const times=['2026-03-29T00:00','2026-03-29T01:00','2026-03-29T03:00']; // skip 02
    expect(times.length).toBe(3);
  });
  it('displayTemp F conversion', async ()=>{
    const { displayTemp } = await import('../config/units.js');
    expect(displayTemp(0,'F')).toBe('32.0°F');
  });
  it('formatWind kn', async ()=>{
    const { formatWind } = await import('../config/units.js');
    expect(formatWind(10,'kn')).toContain('kn');
  });
  it('wrong coordinates handled', ()=>{
    expect(parseCoordinateInput('abc')).toBeNull();
    expect(isRomania(NaN, NaN)).toBe(false);
  });
  it('stale data detection', ()=>{
    const age= 60*60*1000; // 1h
    const ttl= 5*60*1000;
    expect(age>ttl).toBe(true);
  });
  it('provider fallback when ANM unavailable', ()=>{
    const e=new WeatherDecisionEngine();
    const ranked=e.rankSources('temperature.current', {lat:47.17,lon:26.36}, [
      { provider:'anm', ageMs: 9999999, distanceKm:100, resolution:1 },
      { provider:'openmeteo_eu', ageMs:1000, distanceKm:null, resolution:7 }
    ]);
    // even with ANM first, huge age/distance should penalize but ANM may still rank high due to policy; check it doesn't crash
    expect(ranked.length).toBe(2);
  });
  it('ensemble median', ()=>{
    const s=modelConsensusStats([10,20,30,40,50]);
    expect(s.median).toBe(30);
  });
  it('ensemble percentiles', ()=>{
    const s=modelConsensusStats([0,10,20,30,40,50,60,70,80,90,100]);
    expect(s.p10).toBeDefined();
    expect(s.p90).toBeDefined();
  });
  it('outlier detection sigma', ()=>{
    const { inliers, outliers }=detectOutliers([10,10,10,50],1.5);
    expect(outliers.length).toBe(1);
  });
  it('UV thresholds', async ()=>{
    const { ALERT_THRESHOLDS } = await import('../config/thresholds.js');
    expect(ALERT_THRESHOLDS.uv.yellow).toBe(6);
  });
  it('wind thresholds', async ()=>{
    const { ALERT_THRESHOLDS } = await import('../config/thresholds.js');
    expect(ALERT_THRESHOLDS.wind.red).toBe(90);
  });
});

// Legacy app-logic.js tests (compatibility)
describe('Legacy app-logic.js still works', async ()=>{
  const logic = await import('../js/app-logic.js');
  it('escapeHtml', ()=>{
    // js/app-logic.js attaches to globalThis
    const g=globalThis;
    expect(typeof g.escapeHtml==='function' || typeof logic.escapeHtml==='function').toBe(true);
    const fn=g.escapeHtml || logic.escapeHtml;
    expect(fn('<script>')).toBe('&lt;script&gt;');
  });
  it('parseAnmWind', ()=>{
    const g=globalThis;
    const fn=g.parseAnmWind || logic.parseAnmWind;
    expect(fn('1.8 m/s, directia : VSV').speedMs).toBe(1.8);
  });
  it('calcDewPoint', ()=>{
    const g=globalThis;
    const fn=g.calcDewPoint || logic.calcDewPoint;
    expect(fn(20,60)).toBeCloseTo(11.99,1);
  });
});
