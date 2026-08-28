/**
 * src/providers/anm/anm-parser.js
 * Pure ANM parsing — no fetch, no DOM
 * Extracted from index.html logic for testability
 */

export function cleanAnmText(str) {
  if (!str) return '';
  return String(str).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+/g,' ').trim();
}
export function anmVal(field) {
  if (!field) return null;
  const clean=String(field).trim().toLowerCase();
  return (clean==='indisponibil'||clean===''||clean==='-')?null:field;
}
export function parseAnmWind(vantRaw) {
  if (!vantRaw||vantRaw==='indisponibil') return { speedMs:null, speedKmh:null, direction:null };
  const s=String(vantRaw);
  const speedMatch=s.match(/([\d.]+)\s*m\/s/i);
  const dirMatch=s.match(/(?:directia\s*[:\s]+)([A-ZĂÎȘȚ]+)/i)||s.match(/:\s*([A-ZĂÎȘȚ]+)\s*$/i)||s.match(/\b([A-Z]{2,4})\b/);
  const speedMs=speedMatch?parseFloat(speedMatch[1]):null;
  const direction=dirMatch?dirMatch[1].toUpperCase():null;
  return { speedMs, speedKmh: speedMs!==null?parseFloat((speedMs*3.6).toFixed(1)):null, direction };
}
export function parseAnmPressure(presiunetext) {
  if (!presiunetext||presiunetext==='indisponibil') return { value:null, unit:null, trend:null, display:'N/A' };
  const txt0=String(presiunetext);
  const numMatch=txt0.match(/([\d.]+)/);
  const value=numMatch?parseFloat(numMatch[1]):null;
  const unitMatch=txt0.match(/(mb|hPa)/i);
  const unit=unitMatch?unitMatch[1].toLowerCase():'mb';
  let trend='';
  const norm=txt0.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (norm.includes('scadere')) trend='↓';
  else if (norm.includes('crestere')) trend='↑';
  else if (norm.includes('stabil')||norm.includes('stationara')||norm.includes('variabila')) trend='→';
  const mmHg=value!==null?(value*0.75006).toFixed(0):null;
  const display=value!==null?`${value} ${unit} (${mmHg} mmHg) ${trend}`:cleanAnmText(presiunetext);
  return { value, unit, trend, mmHg, display };
}
export function getAnmConditionText(p, fallback) {
  if (!p) return fallback||'Date stație ANM';
  return cleanAnmText(p.descriere || p.timp || anmVal(p.fenomen_e) || anmVal(p.nebulozitate) || fallback || 'Date stație ANM');
}

export function anmFeatureLatLon(feature) {
  if (!feature||!feature.geometry||!feature.geometry.coordinates) return null;
  const rawLon=parseFloat(feature.geometry.coordinates[0]);
  const rawLat=parseFloat(feature.geometry.coordinates[1]);
  if (Number.isNaN(rawLat)||Number.isNaN(rawLon)) return null;
  if (Math.abs(rawLon)>180||Math.abs(rawLat)>90) {
    return webMercatorToLatLon(rawLon, rawLat);
  }
  return { lat: rawLat, lon: rawLon };
}
function webMercatorToLatLon(x,y){
  const R=6378137;
  const lon=(parseFloat(x)/R)*180/Math.PI;
  const lat=(2*Math.atan(Math.exp(parseFloat(y)/R))-Math.PI/2)*180/Math.PI;
  return { lat, lon };
}

export const CITY_MAP = {
  'sinaia':'SINAIA 1500','targu neamt':'TARGU NEAMT','tg neamt':'TARGU NEAMT','tg. neamt':'TARGU NEAMT',
  'targu jiu':'TARGU JIU','tg jiu':'TARGU JIU','tg. jiu':'TARGU JIU',
  'bucuresti':'BUCURESTI FILARET','cluj':'CLUJ-NAPOCA','cluj napoca':'CLUJ-NAPOCA',
  'targu mures':'TARGU MURES','tg mures':'TARGU MURES','tg. mures':'TARGU MURES',
  'sfantu gheorghe':'SFANTU GHEORGHE','miercurea ciuc':'MIERCUREA CIUC',
  'ramnicu valcea':'RAMNICU VALCEA','ramnicu sarat':'RAMNICU SARAT',
  'piatra neamt':'PIATRA NEAMT','varful omu':'VARF OMU','varf omu':'VARF OMU',
  'ceahlau toaca':'CEAHLAU TOACA','stana de vale':'STANA DE VALE'
};
function normTok(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }
export function findStationByName(query, features) {
  if (!features||!features.length) return null;
  const q=String(query).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const mapped=CITY_MAP[q]||CITY_MAP[q.replace(/\s+/g,' ')];
  const target=mapped?mapped.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''):q;
  let match=features.find(f=>{
    const name=(f.properties.nume||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return name===target;
  });
  if (match) return match;
  match=features.find(f=>{
    const name=(f.properties.nume||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return name.includes(target)||target.includes(name);
  });
  return match;
}
export function getClosestStation(targetLat, targetLon, features) {
  let closest=null, minDist=Infinity;
  features.forEach(f=>{
    const st=anmFeatureLatLon(f);
    if (st){
      const dist=Math.sqrt(Math.pow(st.lon-targetLon,2)+Math.pow(st.lat-targetLat,2));
      if (dist<minDist){ minDist=dist; closest=f; }
    }
  });
  return minDist < 0.35 ? closest : null;
}
export function haversineKm(lat1, lon1, lat2, lon2){
  const toRad=d=>d*Math.PI/180; const R=6371;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
export function getClosestStationHaversine(targetLat, targetLon, features, maxKm=50){
  let closest=null, minDist=Infinity;
  features.forEach(f=>{
    const st=anmFeatureLatLon(f);
    if (!st) return;
    const dist=haversineKm(targetLat, targetLon, st.lat, st.lon);
    if (dist<minDist){ minDist=dist; closest={ feature:f, distanceKm:dist, station: anmFeatureLatLon(f) }; }
  });
  if (!closest || closest.distanceKm>maxKm) return null;
  return closest;
}
