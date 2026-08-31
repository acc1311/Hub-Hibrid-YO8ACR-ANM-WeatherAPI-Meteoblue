/**
 * config/providers.js
 * Central provider registry — YO8ACR Weather Hub PRO
 * Every external source must be registered here.
 */
export const PROVIDERS = {
  anm: {
    id: 'anm',
    name: 'ANM Meteoromania',
    type: 'official',
    priorityRomania: 1,
    priorityGlobal: 999,
    baseUrl: 'https://www.meteoromania.ro/wp-json/meteoapi/v2',
    endpoints: {
      observations: '/starea-vremii',
      warnings: '/avertizari-generale',
      nowcasting: '/avertizari-nowcasting',
      forecast: '/prognoza-orase',
    },
    coverage: 'RO',
    resolution: 'station',
    dataTypes: ['observation', 'warnings', 'nowcasting', 'forecast'],
    ttlMs: 2 * 60 * 1000,
    requiresProxy: true,
  },
  openmeteo_d2: {
    id: 'openmeteo_d2',
    name: 'ICON-D2',
    model: 'icon_d2',
    type: 'high-res-regional',
    priorityRomania: 2,
    priorityGlobal: 5,
    resolution: '2km',
    coverage: 'DACH+RO-West',
    horizonHours: 48,
    dataTypes: ['forecast', 'hourly', 'nowcast'],
    ttlMs: 15 * 60 * 1000,
  },
  openmeteo_eu: {
    id: 'openmeteo_eu',
    name: 'ICON-EU',
    model: 'icon_eu',
    type: 'high-res-regional',
    priorityRomania: 3,
    priorityGlobal: 4,
    resolution: '7km',
    coverage: 'EU',
    horizonHours: 120,
    dataTypes: ['forecast', 'hourly', 'minutely15'],
    ttlMs: 15 * 60 * 1000,
  },
  openmeteo_ecmwf: {
    id: 'openmeteo_ecmwf',
    name: 'ECMWF IFS + Ensemble',
    model: 'ecmwf_ifs025',
    type: 'global-ensemble',
    priorityRomania: 4,
    priorityGlobal: 1,
    resolution: '9km / 0.25°',
    coverage: 'global',
    horizonHours: 240,
    members: 51,
    dataTypes: ['forecast', 'ensemble', 'uv'],
    ttlMs: 30 * 60 * 1000,
  },
  meteoblue: {
    id: 'meteoblue',
    name: 'Meteoblue',
    type: 'commercial',
    priorityRomania: 5,
    priorityGlobal: 3,
    coverage: 'global',
    dataTypes: ['hourly'],
    ttlMs: 30 * 60 * 1000,
    requiresProxy: true,
  },
  weatherapi: {
    id: 'weatherapi',
    name: 'WeatherAPI.com',
    type: 'commercial',
    priorityRomania: 6,
    priorityGlobal: 2,
    coverage: 'global',
    dataTypes: ['current', 'forecast', 'aqi', 'astronomy', 'search'],
    ttlMs: 10 * 60 * 1000,
    requiresProxy: true,
  },
  rainviewer: {
    id: 'rainviewer',
    name: 'RainViewer',
    type: 'radar',
    priorityRomania: 10,
    priorityGlobal: 10,
    coverage: 'global',
    dataTypes: ['radar', 'satellite'],
    ttlMs: 2 * 60 * 1000,
  },
};

// Ordered provider lists
export const ROMANIA_PRIORITY = ['anm', 'openmeteo_d2', 'openmeteo_eu', 'openmeteo_ecmwf', 'meteoblue', 'weatherapi'];
export const GLOBAL_PRIORITY = ['openmeteo_ecmwf', 'weatherapi', 'openmeteo_eu', 'meteoblue', 'openmeteo_d2'];

export const PROVIDER_STATUS = {
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  FALLBACK: 'FALLBACK',
  UNAVAILABLE: 'UNAVAILABLE',
  STALE: 'STALE',
};

export function getPriorityList(isRomania) {
  return isRomania ? ROMANIA_PRIORITY : GLOBAL_PRIORITY;
}
