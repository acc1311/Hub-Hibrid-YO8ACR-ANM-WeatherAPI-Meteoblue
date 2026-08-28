/**
 * src/core/cache.js
 * Multi-level cache: L1 memory, L2 session/localStorage, L3 service worker, L4 edge (Cloudflare)
 * TTL per data type configurable in config/refresh.js
 */

import { TTL } from '../../config/refresh.js';

class MemoryCache {
  constructor(){ this.map=new Map(); }
  get(key){
    const e=this.map.get(key);
    if(!e) return null;
    if(e.exp && Date.now()>e.exp){ this.map.delete(key); return null; }
    return e.value;
  }
  set(key, value, ttlMs){
    const exp=ttlMs ? Date.now()+ttlMs : null;
    this.map.set(key,{ value, exp });
  }
  del(key){ this.map.delete(key); }
  clear(){ this.map.clear(); }
}

const mem = new MemoryCache();

function storageGet(key){
  try{
    const raw=sessionStorage.getItem(key) || localStorage.getItem(key);
    if(!raw) return null;
    const obj=JSON.parse(raw);
    if(obj && obj.exp && Date.now()>obj.exp){ try{sessionStorage.removeItem(key); localStorage.removeItem(key);}catch{} return null; }
    return obj?obj.value:null;
  }catch{return null;}
}
function storageSet(key, value, ttlMs){
  try{
    const exp=ttlMs?Date.now()+ttlMs:null;
    const payload=JSON.stringify({ value, exp });
    try{ sessionStorage.setItem(key, payload); }catch{ localStorage.setItem(key, payload); }
  }catch{}
}

export const cache = {
  get(key, { level='all' }={}){
    // L1 memory first
    let v=mem.get(key);
    if(v!=null) return v;
    // L2 storage
    v=storageGet(key);
    if(v!=null){
      // promote to L1
      mem.set(key, v, TTL.forecastHourly);
      return v;
    }
    return null;
  },
  set(key, value, ttlMs){
    const ttl=ttlMs ?? TTL.forecastHourly;
    mem.set(key, value, ttl);
    storageSet(key, value, ttl);
  },
  del(key){ mem.del(key); try{sessionStorage.removeItem(key); localStorage.removeItem(key);}catch{}},
  clear(){ mem.clear(); },
  // TTL helpers
  ttlFor(type){ return TTL[type] ?? TTL.forecastHourly; },
};

export function cacheKey(prefix, lat, lon, extra=''){
  return `${prefix}_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}${extra?'_'+extra:''}`;
}
export default cache;
