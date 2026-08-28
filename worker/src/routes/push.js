/**
 * worker/src/routes/push.js
 * Web Push — unchanged logic but modularized
 */
import { json, sha256 } from '../security.js';

const ANM_WARN_URL = "https://www.meteoromania.ro/wp-json/meteoapi/v2/avertizari-generale";
const SUBS_KEY = "hub_push_subs";
const PUSH_ORIGIN_ALLOWLIST = [
  "https://fcm.googleapis.com",
  "https://updates.push.services.mozilla.com",
  "https://webpush.apple.com",
  "https://wns.windows.com",
  "https://push.db.raycon.io"
];
const MAX_SUBS = 5000;
const RATE_LIMIT_PER_HOUR = 10;
const B64URL_RE = /^[A-Za-z0-9\-_]+$/;

function validPushSub(sub){
  if(!sub||typeof sub!=="object") return "body invalid";
  if(typeof sub.endpoint!=="string"||sub.endpoint.length>500) return "endpoint invalid";
  let epOrigin; try{ epOrigin=new URL(sub.endpoint).origin; }catch{ return "endpoint invalid"; }
  if(!sub.endpoint.startsWith("https://")) return "endpoint trebuie să fie HTTPS";
  if(!PUSH_ORIGIN_ALLOWLIST.includes(epOrigin)) return "origine push neacceptată";
  const keys=sub.keys;
  if(!keys||typeof keys!=="object") return "keys lipsă";
  if(typeof keys.p256dh!=="string"||!B64URL_RE.test(keys.p256dh)||keys.p256dh.length<40||keys.p256dh.length>200) return "cheie p256dh invalidă";
  if(typeof keys.auth!=="string"||!B64URL_RE.test(keys.auth)||keys.auth.length<10||keys.auth.length>100) return "cheie auth invalidă";
  return null;
}
async function rateLimited(env, request){
  if(!env.PUSH_KV) return false;
  const ip=request.headers.get("CF-Connecting-IP")||"necunoscut";
  const bucket=Math.floor(Date.now()/3600000);
  const key=`rl_${await sha256(ip+"_"+bucket)}`;
  const count=parseInt((await env.PUSH_KV.get(key))||"0",10);
  if(count>=RATE_LIMIT_PER_HOUR) return true;
  await env.PUSH_KV.put(key, String(count+1), { expirationTtl:7200 });
  return false;
}

export async function handlePushSubscribe(request, env){
  if(!env.PUSH_KV) return json({ ok:false, error:"PUSH_KV lipsă" },500,request,env);
  if(await rateLimited(env, request)) return json({ ok:false, error:"Prea multe cereri — încearcă mai târziu" },429,request,env);
  const sub=await request.json().catch(()=>null);
  const invalid=validPushSub(sub);
  if(invalid) return json({ ok:false, error:"Abonare invalidă: "+invalid },400,request,env);
  const store=(await env.PUSH_KV.get(SUBS_KEY,"json"))||{};
  const hash=await sha256(sub.endpoint);
  if(!store[hash] && Object.keys(store).length>=MAX_SUBS) return json({ ok:false, error:"Limită abonamente atinsă" },507,request,env);
  store[hash]={ endpoint:sub.endpoint, keys:sub.keys, added:Date.now() };
  await env.PUSH_KV.put(SUBS_KEY, JSON.stringify(store));
  return json({ ok:true, total:Object.keys(store).length },200,request,env);
}
export async function handlePushUnsubscribe(request, env){
  if(!env.PUSH_KV) return json({ ok:false, error:"PUSH_KV lipsă" },500,request,env);
  if(await rateLimited(env, request)) return json({ ok:false, error:"Prea multe cereri — încearcă mai târziu" },429,request,env);
  const body=await request.json().catch(()=>null);
  const endpoint=body&&body.endpoint;
  if(typeof endpoint!=="string"||!endpoint.startsWith("https://")||endpoint.length>500) return json({ ok:false, error:"Endpoint invalid" },400,request,env);
  const store=(await env.PUSH_KV.get(SUBS_KEY,"json"))||{};
  delete store[await sha256(endpoint)];
  await env.PUSH_KV.put(SUBS_KEY, JSON.stringify(store));
  return json({ ok:true, total:Object.keys(store).length },200,request,env);
}
export async function handlePushStatus(request, env){
  const store=env.PUSH_KV ? ((await env.PUSH_KV.get(SUBS_KEY,"json"))||{}) : {};
  return json({ ok:true, subscriptions:Object.keys(store).length, configured: !!env.VAPID_PUBLIC && !!env.PUSH_KV },200,request,env);
}

export async function scheduledPush(env){
  try{
    if(!env.PUSH_KV||!env.VAPID_PRIVATE||!env.VAPID_PUBLIC) return;
    const res=await fetch(ANM_WARN_URL, {
      headers:{ "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept":"application/json, */*", "Referer":"https://www.meteoromania.ro/", "Cache-Control":"no-cache" },
      cf:{ cacheTtl:0, cacheEverything:false }
    });
    if(!res.ok) return;
    const data=await res.json();
    const list=data&&data.avertizare ? (Array.isArray(data.avertizare)?data.avertizare:[data.avertizare]) : [];
    const sig=await sha256(JSON.stringify(list.map(it=>{
      const at=(it&&it["@attributes"])||{};
      return [at.tipMesaj, at.culoare, at.dataAparitiei, at.dataExpirarii].join("|");
    }).sort()));
    const lastSig=await env.PUSH_KV.get("hub_push_last_sig");
    if(sig===lastSig) return;
    const store=(await env.PUSH_KV.get(SUBS_KEY,"json"))||{};
    const hashes=Object.keys(store);
    let dead=[];
    for(const h of hashes){
      const ok=await sendTicklePush(store[h], env);
      if(!ok) dead.push(h);
    }
    for(const h of dead) delete store[h];
    if(dead.length) await env.PUSH_KV.put(SUBS_KEY, JSON.stringify(store));
    if(list.length) await env.PUSH_KV.put("hub_push_last_sig", sig);
  }catch{}
}
async function sendTicklePush(sub, env){
  try{
    const endpointOrigin=new URL(sub.endpoint).origin;
    const jwt=await makeVapidJwt(endpointOrigin, env.VAPID_PRIVATE, env.VAPID_PUBLIC);
    const r=await fetch(sub.endpoint, { method:"POST", headers:{ "TTL":"60", "Authorization":`vapid t=${jwt}, k=${env.VAPID_PUBLIC}`, "Content-Length":"0" } });
    return r.status===201||r.status===200;
  }catch{ return false; }
}
async function makeVapidJwt(audience, privateJwkJson, _publicKeyB64u){
  const privJwk=JSON.parse(privateJwkJson);
  const key=await crypto.subtle.importKey("jwk", privJwk, { name:"ECDSA", namedCurve:"P-256" }, false, ["sign"]);
  const b64u=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const enc=obj=>b64u(new TextEncoder().encode(JSON.stringify(obj)));
  const head=enc({ typ:"JWT", alg:"ES256" });
  const body=enc({ aud:audience, exp:Math.floor(Date.now()/1000)+12*3600, sub:"mailto:hub-meteo@users.noreply.github.com" });
  const sig=await crypto.subtle.sign({ name:"ECDSA", hash:{name:"SHA-256"} }, key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64u(sig)}`;
}
