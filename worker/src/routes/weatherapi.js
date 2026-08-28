/**
 * worker/src/routes/weatherapi.js
 */
const WAPI_BASE="https://api.weatherapi.com/v1";
import { json, corsHeaders, securityHeaders } from '../security.js';

function isAllowedWapiPath(path){
  const p=path.replace(/^\/api\/weatherapi\//,'').replace(/^\/wapi\//,'');
  return /^(search|current|forecast|marine|astronomy|sports|timezone|history)\.json$/.test(p.split('?')[0]);
}

export async function handleWeatherApi(request, env){
  const key=env.WAPI_KEY;
  if(!key) return new Response("WAPI_KEY lipsă", { status:500, headers:{...corsHeaders(request, env), ...securityHeaders()} });
  const url=new URL(request.url);
  const path=url.pathname;
  if(!isAllowedWapiPath(path)){
    return json({ error:'WAPI path not allowed' }, 400, request, env);
  }
  // Strip prefix to get target path + query
  let targetPath = path.startsWith('/api/weatherapi/') ? path.replace('/api/weatherapi/','') : path.replace('/wapi/','');
  // Rebuild URL with allowlisted query params only
  const allowedParams=new Set(['q','days','lang','aqi','alerts','dt','hour','aqi_no','tides','lang']);
  const qs=new URLSearchParams();
  for(const [k,v] of url.searchParams.entries()){
    if(allowedParams.has(k)) qs.set(k, v);
  }
  qs.set('key', key);
  const target=`${WAPI_BASE}/${targetPath}?${qs.toString()}`;
  try{
    const controller=new AbortController();
    const t=setTimeout(()=>controller.abort(), 10000);
    const res=await fetch(target, { headers:{ Accept:'application/json' }, signal: controller.signal });
    clearTimeout(t);
    if(!res.ok){
      const text=await res.text();
      let data; try{ data=JSON.parse(text);}catch{ data={ error:text.slice(0,500)}; }
      return json(data, res.status, request, env);
    }
    const data=await res.json();
    return json(data, res.status, request, env);
  }catch(err){
    if(err.name==='AbortError') return json({ error:'WAPI timeout' }, 504, request, env);
    return json({ error: err.message }, 500, request, env);
  }
}
