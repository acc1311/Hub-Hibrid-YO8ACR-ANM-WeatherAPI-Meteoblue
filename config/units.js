/**
 * config/units.js
 */
export const WIND_UNITS = {
  kmh: { factor: 1, label: 'km/h' },
  ms:  { factor: 1/3.6, label: 'm/s' },
  mph: { factor: 1/1.609344, label: 'mph' },
  kn:  { factor: 1/1.852, label: 'kn' },
};

export const TEMP_UNITS = {
  C: { label: '°C' },
  F: { label: '°F', toF: c => c*9/5+32 },
};

export const PRESSURE_UNITS = {
  hPa: { label: 'hPa' },
  mb:  { label: 'mb' },
  mmHg:{ label: 'mmHg', fromHpa: h => h*0.75006 },
};

export function convertWind(kmh, unit) {
  const u = WIND_UNITS[unit] || WIND_UNITS.kmh;
  return Number(kmh) * u.factor;
}
export function windLabel(unit) { return (WIND_UNITS[unit]||WIND_UNITS.kmh).label; }
export function formatWind(kmh, unit, digits=1) {
  if (kmh==null || isNaN(Number(kmh))) return '--';
  return convertWind(Number(kmh), unit).toFixed(digits) + ' ' + windLabel(unit);
}
export function displayTemp(c, unit='C') {
  if (c==null || isNaN(Number(c))) return 'N/A';
  if (unit==='F') return (Number(c)*9/5+32).toFixed(1)+'°F';
  return Number(c).toFixed(1)+'°C';
}
