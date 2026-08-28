/**
 * worker/src/routes/anm.js
 */
const ANM_URL = "https://www.meteoromania.ro/wp-json/meteoapi/v2/starea-vremii";
import { json, corsHeaders, securityHeaders } from '../security.js';

export async function handleAnmObservations(request, env) {
  try{
    const controller = new AbortController();
    const t = setTimeout(()=>controller.abort(), 12000);
    const res = await fetch(ANM_URL, {
      headers: {
        "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept":"application/json, */*",
        "Referer":"https://www.meteoromania.ro/",
        "Cache-Control":"no-cache",
        "Pragma":"no-cache"
      },
      cf: { cacheTtl:0, cacheEverything:false },
      signal: controller.signal,
    });
    clearTimeout(t);
    if(!res.ok) return new Response(`Eroare ANM: HTTP ${res.status}`, { status: res.status, headers: { ...corsHeaders(request, env), ...securityHeaders() } });
    const data = await res.json();
    // Schema validation: must have features array
    if(!data || typeof data !== 'object' || !Array.isArray(data.features)){
      return json({ error:'ANM schema validation failed', details:'expected GeoJSON with features' }, 502, request, env);
    }
    return json(data, 200, request, env);
  } catch(err){
    if(err.name==='AbortError') return new Response('ANM timeout', { status:504, headers:{...corsHeaders(request, env), ...securityHeaders()}});
    return new Response(`Eroare ANM: ${err.message}`, { status:500, headers:{...corsHeaders(request, env), ...securityHeaders()}});
  }
}
