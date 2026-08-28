/**
 * worker/src/routes/meteoblue.js
 */
const MB_BASE="https://my.meteoblue.com/packages";
import { json, corsHeaders, securityHeaders } from '../security.js';

export async function handleMeteoblue(request, env){
  const key=env.MB_KEY;
  if(!key) return new Response("MB_KEY lipsă", { status:500, headers:{...corsHeaders(request, env), ...securityHeaders()} });
  const url=new URL(request.url);
  const path=url.pathname;
  // allow only basic-1h, basic-day etc
  let targetPath = path.startsWith('/api/meteoblue/') ? path.replace('/api/meteoblue/','') : path.replace('/mb/','');
  if(!/^(basic-1h|basic-day|trend-day|current)$/.test(targetPath.split('?')[0].split('/')[0])){
    return json({ error:'Meteoblue path not allowed' }, 400, request, env);
  }
  const qs=new URLSearchParams(url.search);
  qs.set('apikey', key);
  if(!qs.has('format')) qs.set('format','json');
  // allow only lat/lon
  const filtered=new URLSearchParams();
  for(const [k,v] of qs.entries()){
    if(['lat','lon','apikey','format','asl','tz','forecast_days'].includes(k)) filtered.set(k,v);
  }
  const target=`${MB_BASE}/${targetPath}?${filtered.toString()}`;
  try{
    const controller=new AbortController();
    const t=setTimeout(()=>controller.abort(), 10000);
    const res=await fetch(target, { headers:{ Accept:'application/json' }, signal: controller.signal });
    clearTimeout(t);
    const data=await res.json();
    return json(data, res.status, request, env);
  }catch(err){
    if(err.name==='AbortError') return json({ error:'Meteoblue timeout' }, 504, request, env);
    return json({ error: err.message }, 500, request, env);
  }
}
