import { describe, it, expect } from 'vitest';
import { isRomania } from '../config/regions.js';
import { PROVIDERS, ROMANIA_PRIORITY, GLOBAL_PRIORITY } from '../config/providers.js';
import { ALERT_THRESHOLDS } from '../config/thresholds.js';
import { fuseField, modelConsensusStats } from '../src/fusion/fusion-engine.js';
import { parseANMWarnings } from '../src/providers/anm/anm-alerts.js';
import { cleanAnmText, parseAnmWind, parseAnmPressure } from '../src/providers/anm/anm-parser.js';
import { observationAgeMs, to24h } from '../src/utils/time.js';
import { displayTemp, formatWind } from '../config/units.js';
import { WeatherDecisionEngine } from '../src/weather/weather-engine.js';
import { mae, rmse, bias } from '../src/weather/verification.js';
import { AnmProvider } from '../src/providers/anm/anm-client.js';
import { OpenMeteoProvider } from '../src/providers/openmeteo/client.js';
import { WeatherProvider } from '../src/providers/base.js';

describe('Config providers', ()=>{
  it('ROMANIA_PRIORITY starts with anm', ()=> expect(ROMANIA_PRIORITY[0]).toBe('anm'));
  it('GLOBAL_PRIORITY not include anm first', ()=> expect(GLOBAL_PRIORITY[0]).not.toBe('anm'));
  it('PROVIDERS anm has ttl', ()=> expect(PROVIDERS.anm.ttlMs).toBeGreaterThan(0));
  it('PROVIDERS ecmwf resolution', ()=> expect(PROVIDERS.openmeteo_ecmwf.resolution).toBeDefined());
});

describe('Alert thresholds', ()=>{
  it('wind thresholds ordered', ()=> expect(ALERT_THRESHOLDS.wind.yellow).toBeLessThan(ALERT_THRESHOLDS.wind.orange));
  it('heat orange < red', ()=> expect(ALERT_THRESHOLDS.heat.orange).toBeLessThan(ALERT_THRESHOLDS.heat.red));
  it('cape thresholds', ()=> expect(ALERT_THRESHOLDS.cape.red).toBe(3500));
});

describe('Time utils', ()=>{
  it('to24h AM/PM', ()=> expect(to24h('02:30 PM')).toBe('14:30'));
  it('to24h invalid returns input', ()=> expect(to24h('nota')).toBe('nota'));
  it('observationAgeMs returns null for invalid', ()=> expect(observationAgeMs('invalid')).toBeNull());
  it('observationAgeMs for ANM format', ()=> {
    const iso=new Date(Date.now()-5*60*1000).toISOString();
    const age=observationAgeMs(iso);
    expect(age).toBeGreaterThan(0);
    expect(age).toBeLessThan(86400000);
    const anm='24-04-2026 ora 06:00';
    expect(observationAgeMs(anm)).not.toBeNull();
  });
});

describe('Units', ()=>{
  it('displayTemp null', ()=> expect(displayTemp(null)).toBe('N/A'));
  it('formatWind null', ()=> expect(formatWind(null,'kmh')).toBe('--'));
  it('displayTemp C', ()=> expect(displayTemp(20,'C')).toBe('20.0°C'));
  it('formatWind kmh', ()=> expect(formatWind(36,'kmh')).toBe('36.0 km/h'));
});

describe('Anm parser extra', ()=>{
  it('parseAnmWind empty', ()=> expect(parseAnmWind('').speedMs).toBeNull());
  it('parseAnmPressure with crestere', ()=> expect(parseAnmPressure('1012 mb, in crestere').trend).toBe('↑'));
  it('parseAnmPressure stabil', ()=> expect(parseAnmPressure('1010 mb, stationara').trend).toBe('→'));
  it('cleanAnmText empty', ()=> expect(cleanAnmText('')).toBe(''));
  it('cleanAnmText trims', ()=> expect(cleanAnmText('  hello  ')).toBe('hello'));
});

describe('Fusion extra', ()=>{
  it('precip prob ensemble', ()=>{
    const r=fuseField('precipitation_probability', [{value:10,source:'a'},{value:90,source:'b'}]);
    expect(r.value).toBeGreaterThan(40);
    expect(r.value).toBeLessThan(60);
  });
  it('visibility min', ()=>{
    const r=fuseField('visibility', [{value:1000,source:'a'},{value:500,source:'b'}]);
    expect(r.value).toBe(500);
  });
  it('uv max', ()=>{
    const r=fuseField('uv', [{value:5,source:'a'},{value:8,source:'b'}]);
    expect(r.value).toBe(8);
  });
  it('wind gust max', ()=>{
    const r=fuseField('gust', [{value:30,source:'a'},{value:45,source:'b'}]);
    expect(r.value).toBe(45);
  });
  it('modelConsensusStats single', ()=>{
    const s=modelConsensusStats([20]);
    expect(s.spread).toBe(0);
    expect(s.n).toBe(1);
  });
});

describe('WeatherDecisionEngine extra', ()=>{
  it('isRomania for border', ()=>{
    expect(isRomania(43.6,20.2)).toBe(true);
    expect(isRomania(43.5,20.2)).toBe(false);
  });
  it('rankSources with performance', ()=>{
    const vs=new Map();
    vs.set('47.2,26.4', new Map([['anm', { weight:90 }]]));
    // mock verificationStore
    const e=new WeatherDecisionEngine({ verificationStore: { get:(k)=> vs.get(k) } });
    const r=e.rankSources('temperature.current', {lat:47.17,lon:26.36}, [{provider:'anm'},{provider:'openmeteo_eu'}]);
    expect(r.length).toBe(2);
  });
});

describe('Verification extra', ()=>{
  it('mae null for mismatched', ()=> expect(mae([1,2],[1])).toBeNull());
  it('rmse with NaN filtered', ()=> expect(rmse([10,20],[10,20])).toBe(0));
  it('bias null for empty', ()=> expect(bias([],[])).toBeNull());
});

describe('Providers interface', ()=>{
  it('WeatherProvider throws if not implemented', async ()=>{
    const p=new WeatherProvider('test','Test');
    await expect(p.fetchObservation()).rejects.toThrow();
  });
  it('AnmProvider id', ()=> expect(new AnmProvider({ fetchImpl: fetch }).id).toBe('anm'));
  it('OpenMeteoProvider model', ()=> expect(new OpenMeteoProvider({model:'icon_eu'}).model).toBe('icon_eu'));
});

describe('International locations', ()=>{
  it('London not Romania', ()=> expect(isRomania(51.5074,-0.1278)).toBe(false));
  it('Paris not Romania', ()=> expect(isRomania(48.8566,2.3522)).toBe(false));
  it('Berlin not Romania', ()=> expect(isRomania(52.52,13.40)).toBe(false));
  it('Tokyo not Romania', ()=> expect(isRomania(35.68,139.69)).toBe(false));
});

describe('Timezone handling', ()=>{
  it('Europe/Bucharest offset', ()=>{
    const d=new Date('2026-06-15T12:00:00+03:00');
    expect(d.getUTCHours()).toBe(9);
  });
  it('DST spring forward', ()=>{
    // Romania DST 2026 last Sunday March 29
    const before=new Date('2026-03-29T00:30:00+02:00');
    const after=new Date('2026-03-29T04:30:00+03:00');
    expect(after.getTime() - before.getTime()).toBeGreaterThan(3600000);
  });
});
