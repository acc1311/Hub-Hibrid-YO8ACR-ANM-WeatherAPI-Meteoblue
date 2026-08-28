/**
 * config/regions.js
 * Geographic regions + isRomania detection
 */

export const ROMANIA_BBOX = {
  latMin: 43.6,
  latMax: 48.3,
  lonMin: 20.2,
  lonMax: 30.0,
};

// Rough polygon check — BBOX + optional refinement
// For PRO: use BBOX + distance to ANM stations. Stations outside BBOX but near border still considered Romania if closest station <50km.
export function isRomania(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  return la >= ROMANIA_BBOX.latMin && la <= ROMANIA_BBOX.latMax
      && lo >= ROMANIA_BBOX.lonMin && lo <= ROMANIA_BBOX.lonMax;
}

export const REGIONS = {
  RO: { name: 'România', mode: 'ANM_FIRST', bbox: ROMANIA_BBOX },
  EU: { name: 'Europa', mode: 'MULTI_MODEL' },
  GLOBAL: { name: 'Global', mode: 'MULTI_MODEL' },
};

export function getRegionMode(lat, lon) {
  return isRomania(lat, lon) ? 'ANM_FIRST' : 'MULTI_MODEL';
}
