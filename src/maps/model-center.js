/**
 * src/maps/model-center.js
 * Model Center — status per model
 */
import { PROVIDERS } from '../../config/providers.js';

export function modelCenterStatus(healthSnapshot){
  const map=new Map((healthSnapshot||[]).map(h=>[h.id, h]));
  return Object.values(PROVIDERS).filter(p=>p.type!=='official').map(p=>{
    const h=map.get(p.id) || map.get(p.name) || {};
    return {
      id: p.id,
      name: p.name,
      model: p.model||null,
      resolution: p.resolution||'—',
      coverage: p.coverage||'—',
      horizon: p.horizonHours? p.horizonHours+'h' : '—',
      status: h.status||'UNKNOWN',
      latency: h.latencyMs??null,
      lastUpdate: h.lastUpdate||null
    };
  });
}
