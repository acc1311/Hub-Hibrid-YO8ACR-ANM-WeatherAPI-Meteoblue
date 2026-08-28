/**
 * src/core/health.js
 * System Health — provider status, latency, lastUpdate, HTTP, cache, fallback
 */

export class HealthRegistry {
  constructor(){
    this.providers=new Map(); // id -> { status, latencyMs, lastUpdate, httpStatus, cacheHit, fallbackCount, failureCount }
  }
  init(ids){
    ids.forEach(id=> this.providers.set(id, { id, status:'UNKNOWN', latencyMs:null, lastUpdate:null, httpStatus:null, cacheHit:0, fallbackCount:0, failureCount:0 }));
  }
  markSuccess(id, { latencyMs, httpStatus=200, cacheHit=false }={}){
    const p=this.providers.get(id)||{ id };
    p.status='ONLINE';
    p.latencyMs=latencyMs??p.latencyMs;
    p.lastUpdate=new Date().toISOString();
    p.httpStatus=httpStatus;
    if(cacheHit) p.cacheHit=(p.cacheHit||0)+1;
    p.failureCount=0;
    this.providers.set(id,p);
  }
  markFallback(id){ const p=this.providers.get(id)||{id}; p.status='FALLBACK'; p.fallbackCount=(p.fallbackCount||0)+1; this.providers.set(id,p);}
  markStale(id){ const p=this.providers.get(id)||{id}; p.status='STALE'; this.providers.set(id,p);}
  markUnavailable(id, { latencyMs, httpStatus, error }={}){
    const p=this.providers.get(id)||{id};
    p.status='UNAVAILABLE';
    p.latencyMs=latencyMs??p.latencyMs;
    p.httpStatus=httpStatus??p.httpStatus;
    p.failureCount=(p.failureCount||0)+1;
    p.lastError=error||null;
    this.providers.set(id,p);
  }
  snapshot(){
    return Array.from(this.providers.values()).map(p=>({
      id:p.id, status:p.status, latencyMs:p.latencyMs, lastUpdate:p.lastUpdate, httpStatus:p.httpStatus, cacheHit:p.cacheHit, fallbackCount:p.fallbackCount, failureCount:p.failureCount
    }));
  }
  toUI(){
    const s=this.snapshot();
    return s.map(p=>({
      label:p.id,
      dot: p.status==='ONLINE'?'🟢':p.status==='STALE'?'🟡':p.status==='FALLBACK'?'🟠':'🔴',
      status:p.status, latency:p.latencyMs, lastUpdate:p.lastUpdate
    }));
  }
}
export const healthRegistry = new HealthRegistry();
healthRegistry.init(['anm','anm-warnings','icon_d2','icon_eu','ecmwf','weatherapi','meteoblue','rainviewer','aq','pollen']);
export default healthRegistry;
