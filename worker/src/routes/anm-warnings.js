/**
 * worker/src/routes/anm-warnings.js
 */
const ANM_WARN_URL = "https://www.meteoromania.ro/wp-json/meteoapi/v2/avertizari-generale";
import { json, corsHeaders, securityHeaders } from '../security.js';

export async function handleAnmWarnings(request, env){
  try{
    const controller=new AbortController();
    const t=setTimeout(()=>controller.abort(), 12000);
    const res=await fetch(ANM_WARN_URL, {
      headers:{
        "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept":"application/json, */*",
        "Referer":"https://www.meteoromania.ro/",
        "Cache-Control":"no-cache",
        "Pragma":"no-cache"
      },
      cf:{ cacheTtl:0, cacheEverything:false },
      signal: controller.signal,
    });
    clearTimeout(t);
    if(!res.ok) return new Response(`Eroare ANM avertizări: HTTP ${res.status}`, { status: res.status, headers:{...corsHeaders(request, env), ...securityHeaders()} });
    const data=await res.json();
    // Validation: should have avertizare array or object
    if(!data || (data.avertizare==null && !Array.isArray(data))){
      // Some responses are empty when no warnings — that's valid (return as-is)
      return json(data, 200, request, env);
    }
    return json(data, 200, request, env);
  }catch(err){
    if(err.name==='AbortError') return new Response('ANM warnings timeout', { status:504, headers:{...corsHeaders(request, env), ...securityHeaders()}});
    return new Response(`Eroare ANM avertizări: ${err.message}`, { status:500, headers:{...corsHeaders(request, env), ...securityHeaders()}});
  }
}
