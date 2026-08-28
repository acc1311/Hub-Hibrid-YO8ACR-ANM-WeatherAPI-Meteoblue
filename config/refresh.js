/**
 * config/refresh.js
 * TTL per data type for multi-level cache
 */
export const TTL = {
  anmObservation: 2 * 60 * 1000,
  anmWarnings: 2 * 60 * 1000,
  anmNowcasting: 60 * 1000,
  forecastHourly: 15 * 60 * 1000,
  forecastDaily: 30 * 60 * 1000,
  modelRun: 60 * 60 * 1000, // depends on model run actually
  radarMeta: 2 * 60 * 1000,
  airQuality: 30 * 60 * 1000,
  historical: 24 * 60 * 60 * 1000,
  climateNormals: 30 * 24 * 60 * 60 * 1000,
};

// Auto refresh intervals (user selectable)
export const REFRESH_OPTIONS = [300, 600, 900, 1800]; // seconds
export const DEFAULT_REFRESH_SEC = 600;
