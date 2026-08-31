/** Official ANM nowcasting bridge. Fetches current public ANM nowcasting page and normalizes all visible messages. */
import { json, corsHeaders, securityHeaders } from '../security.js';
const ANM_NOWCAST_PAGE='https://www.meteoromania.ro/avertizari-nowcasting/';
function stripHtml(html){ return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10))).replace(/[ \t\r]+/g,' ').replace(/\n\s+/g,'\n').trim(); }
function clean(v){ return String(v||'').replace(/\s+/g,' ').trim(); }
function parseMessages(text){
  const starts=[...text.matchAll(/(?:Avertizare|Atenționare) nowcasting/gi)].map(m=>m.index).filter(Number.isInteger);
  const blocks=[]; for(let i=0;i<starts.length;i++) blocks.push(text.slice(starts[i],starts[i+1]||text.length));
  const out=[];
  for(const block of blocks){
    if(!/Sursa\s*:\s*Administrația Națională de Meteorologie/i.test(block)) continue;
    const code=(block.match(/COD\s*:\s*(ROȘU|ROSU|PORTOCALIU|GALBEN)/i)?.[1]||'GALBEN').toUpperCase();
    const issued=clean(block.match(/Data emiterii\s*:\s*([^|\n]+?)(?=\s*\|\s*Nr\.|\s*Valabil|$)/i)?.[1]);
    const validFrom=clean(block.match(/Valabil de la\s*:\s*([^|\n]+?)(?=\s*\|\s*|\s*până la|$)/i)?.[1]);
    const validUntil=clean(block.match(/până la\s*:\s*([^\n|]+?)(?=\s*\|\s*|$)/i)?.[1]);
    const area=clean(block.match(/In zona\s*:\s*(.*?)(?=\s*Se vor semnala\s*:)/i)?.[1]);
    const phenomena=clean(block.match(/Se vor semnala\s*:\s*(.*?)(?=\s*(?:Sursa\s*:|Tipul mesajului|$))/i)?.[1]);
    out.push({level:code.includes('RO')?'red':code==='PORTOCALIU'?'orange':'yellow',title:`ANM Nowcasting — ${code}`,issuedAt:issued||null,validFrom:validFrom||null,validUntil:validUntil||null,area:area||null,phenomena:phenomena||null,official:true,source:'ANM',sourceType:'official-nowcasting'});
  }
  return out.map((x,i)=>({...x,id:`anm-nowcast-${i}-${x.issuedAt||'unknown'}`}));
}
export async function handleAnmNowcasting(request, env){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const res=await fetch(ANM_NOWCAST_PAGE,{headers:{Accept:'text/html,application/xhtml+xml','User-Agent':'YO8ACR Weather Hub PRO'},signal:controller.signal,cf:{cacheTtl:60,cacheEverything:false}});
    if(!res.ok) return json({ok:false,error:`ANM nowcasting HTTP ${res.status}`,source:'ANM',sourceType:'official-nowcasting'},res.status,request,env);
    const text=stripHtml(await res.text()); const items=parseMessages(text);
    return json({ok:true,source:'ANM',sourceType:'official-nowcasting',official:true,fetchedAt:new Date().toISOString(),items,count:items.length,officialPage:ANM_NOWCAST_PAGE},200,request,env);
  }catch(err){
    const status=err.name==='AbortError'?504:503;
    return new Response(JSON.stringify({ok:false,error:`ANM nowcasting unavailable: ${err.message}`,source:'ANM',sourceType:'official-nowcasting'}),{status,headers:{'Content-Type':'application/json',...corsHeaders(request,env),...securityHeaders()}});
  }finally{ clearTimeout(timer); }
}
