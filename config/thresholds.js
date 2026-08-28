/**
 * config/thresholds.js
 * Centralized alert and comfort thresholds — YO8ACR Weather Hub PRO
 * No magic numbers elsewhere.
 */

export const ALERT_THRESHOLDS = {
  wind: {
    yellow: 40,   // km/h gust
    orange: 62,
    red: 90,
    unit: 'km/h',
  },
  gust: {
    yellow: 40,
    orange: 62,
    red: 90,
  },
  rain: {
    yellow: 5,    // mm/h
    orange: 10,
    red: 20,
  },
  snow: {
    yellow: 5,    // cm snow_depth or mm equiv
    orange: 15,
    red: 30,
  },
  heat: {
    yellow: 33,   // °C max
    orange: 36,
    red: 40,
  },
  frost: {
    yellow: -3,   // °C min
    orange: -10,
    red: -20,
  },
  uv: {
    yellow: 6,
    orange: 8,
    red: 11,
  },
  visibility: {
    yellow: 1000, // m
    orange: 500,
    red: 200,
  },
  cape: {
    yellow: 1000, // J/kg
    orange: 2000,
    red: 3500,
  },
  pressureDrop: {
    yellow: -3,   // hPa /3h
    orange: -6,
    red: -10,
  },
};

export const COMFORT_THRESHOLDS = {
  heatIndex: {
    noDiscomfort: 20,
    low: 24,
    moderate: 28,
    high: 32,
    veryHigh: 36,
  },
  windChill: {
    comfortableMin: 18,
    comfortableMax: 26,
  },
};

export const FUSION_WEIGHTS = {
  // Base weights for Romania 0-24h (derived from verification, overridden dynamically)
  romania_0_24h: {
    anm_observation: 0.45,
    icon_d2: 0.25,
    icon_eu: 0.15,
    ecmwf: 0.10,
    meteoblue: 0.03,
    weatherapi: 0.02,
  },
  global_0_24h: {
    ecmwf: 0.40,
    icon_eu: 0.25,
    meteoblue: 0.20,
    weatherapi: 0.15,
  },
  // Long range >5 days
  longRange: {
    ecmwf: 0.60,
    icon_eu: 0.25,
    meteoblue: 0.15,
  },
};

export const CONFIDENCE_WEIGHTS = {
  sourceQuality: 0.30,
  dataFreshness: 0.25,
  modelAgreement: 0.25,
  observationConfidence: 0.20,
};

export const STALE_THRESHOLDS_MS = {
  anmObservation: 30 * 60 * 1000, // 30 min
  anmWarnings: 15 * 60 * 1000,
  forecast: 3 * 60 * 60 * 1000,
  radar: 15 * 60 * 1000,
};
