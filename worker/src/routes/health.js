/**
 * worker/src/routes/health.js
 */
import { json } from '../security.js';

export async function handleHealth(request, env){
  const checks=[];
  const time=Date.now();
  // Check ANM reachability (quick HEAD)
  try{
    const c=new AbortController();
    const t=setTimeout(()=>c.abort(), 5000);
    const r=await fetch("https://www.meteoromania.ro/wp-json/meteoapi/v2/starea-vremii", { method:'GET', headers:{ "User-Agent":"Mozilla/5.0" }, signal:c.signal, cf:{ cacheTtl:0 } });
    clearTimeout(t);
    checks.push({ id:'anm', status: r.ok?'ONLINE':'DEGRADED', latencyMs: Date.now()-time, httpStatus:r.status, fallback: !r.ok });
  }catch(e){
    checks.push({ id:'anm', status:'UNAVAILABLE', latencyMs: Date.now()-time, error:String(e.message).slice(0,120) });
  }
  const t2=Date.now();
  // Open-Meteo
  try{
    const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude=47.17&longitude=26.36&current=temperature_2m&timezone=auto", { signal: AbortSignal.timeout(5000) });
    checks.push({ id:'openmeteo', status: r.ok?'ONLINE':'DEGRADED', latencyMs: Date.now()-t2, httpStatus:r.status });
  }catch(e){
    checks.push({ id:'openmeteo', status:'UNAVAILABLE', latencyMs: Date.now()-t2, error:String(e.message).slice(0,120) });
  }
  // Config check
  checks.push({ id:'weatherapi_proxy', status: env.WAPI_KEY?'ONLINE':'UNAVAILABLE', note: env.WAPI_KEY?'WAPI_KEY set':'WAPI_KEY missing' });
  checks.push({ id:'meteoblue_proxy', status: env.MB_KEY?'ONLINE':'UNAVAILABLE', note: env.MB_KEY?'MB_KEY set':'MB_KEY missing' });
  checks.push({ id:'push', status: env.PUSH_KV&&env.VAPID_PUBLIC?'ONLINE':'DEGRADED', note: env.PUSH_KV?'KV bound':'KV missing' });

  const hasUnavailable=checks.some(c=>c.status==='UNAVAILABLE');
  const hasDegraded=checks.some(c=>c.status==='DEGRADED');
  const overall=hasUnavailable?'DEGRADED':hasDegraded?'DEGRADED':'ONLINE';

  return json({
    ok:true,
    overall,
    timestamp: new Date().toISOString(),
    checks,
    version: '2.3-pro',
    uptime: 'edge',
  }, 200, request, env);
}
