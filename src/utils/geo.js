/**
 * src/utils/geo.js
 * Geographic utilities — haversine, Web Mercator, BBOX checks
 */

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function webMercatorToLatLon(x, y) {
  const R = 6378137;
  const lon = (parseFloat(x) / R) * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(parseFloat(y) / R)) - Math.PI/2) * 180 / Math.PI;
  return { lat, lon };
}

export function parseCoordinateInput(str) {
  const m = String(str||'').trim().match(/^(-?\d{1,2}(?:\.\d{1,6})?)\s*,\s*(-?\d{1,3}(?:\.\d{1,6})?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

export function elevationCorrection(tempAtStation, stationElevM, targetElevM, lapseRate = -0.0065) {
  // dry adiabatic -6.5°C/km
  const deltaM = targetElevM - stationElevM;
  return tempAtStation + deltaM * lapseRate;
}

export function normalizeToken(s) {
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
