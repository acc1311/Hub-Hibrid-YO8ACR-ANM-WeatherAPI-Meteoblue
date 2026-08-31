/** Forecast verification: aggregate metrics + bounded persistent observations. */
import { modelSkillDB } from '../verification/model-skill.js';
function pairs(a,b){ if(!Array.isArray(a)||!Array.isArray(b)) return []; const n=Math.min(a.length,b.length); const out=[]; for(let i=0;i<n;i++) if(Number.isFinite(a[i])&&Number.isFinite(b[i])) out.push([a[i],b[i]]); return out; }
export function mae(f,o){const p=pairs(f,o);return p.length?+(p.reduce((s,[a,b])=>s+Math.abs(a-b),0)/p.length).toFixed(3):null;}
export function rmse(f,o){const p=pairs(f,o);return p.length?+Math.sqrt(p.reduce((s,[a,b])=>s+(a-b)**2,0)/p.length).toFixed(3):null;}
export function bias(f,o){const p=pairs(f,o);return p.length?+(p.reduce((s,[a,b])=>s+a-b,0)/p.length).toFixed(3):null;}
export function correlation(x,y){const p=pairs(x,y);if(p.length<2)return null;const mx=p.reduce((s,[a])=>s+a,0)/p.length,my=p.reduce((s,[,b])=>s+b,0)/p.length;let num=0,dx=0,dy=0;p.forEach(([a,b])=>{const da=a-mx,db=b-my;num+=da*db;dx+=da*da;dy+=db*db;});const den=Math.sqrt(dx*dy);return den?+(num/den).toFixed(4):0;}
export function brierScore(probabilities,outcomes){const p=pairs(probabilities,outcomes).filter(([a,b])=>a>=0&&a<=100&&(b===0||b===1));return p.length?+(p.reduce((s,[a,b])=>s+(a/100-b)**2,0)/p.length).toFixed(4):null;}
export function skillFromMetrics({mae:m,rmse:r,brier}){const a=m==null?50:100*Math.exp(-Math.max(0,m)/3),q=r==null?a:100*Math.exp(-Math.max(0,r)/4),br=brier==null?null:100*(1-Math.min(1,Math.max(0,brier)));return Math.round(br==null?a*.6+q*.4:a*.45+q*.35+br*.2);}
export class VerificationStore{
 constructor({key='hub_verification_v3',skillDb=modelSkillDB,maxHistory=1500}={}){this.key=key;this.skillDb=skillDb;this.maxHistory=maxHistory;try{this.store=JSON.parse(localStorage.getItem(key)||'{"metrics":{},"history":[]}')||{metrics:{},history:[]};}catch{this.store={metrics:{},history:[]};}this.store.metrics??={};this.store.history??=[];}
 _save(){try{localStorage.setItem(this.key,JSON.stringify(this.store));}catch{}}
 keyFor(lat,lon){return `${Number(lat).toFixed(1)},${Number(lon).toFixed(1)}`;}
 record(lat,lon,provider,forecasts,observations,meta={}){
   const valid=pairs(forecasts,observations); const metrics={mae:mae(forecasts,observations),rmse:rmse(forecasts,observations),bias:bias(forecasts,observations),corr:correlation(forecasts,observations),brier:meta.brier??null,count:valid.length,updatedAt:new Date().toISOString()};
   metrics.weight=skillFromMetrics(metrics); const k=this.keyFor(lat,lon); this.store.metrics[k]??={}; this.store.metrics[k][provider]=metrics;
   const stamp=meta.validAt||meta.forecastIssuedAt||new Date().toISOString();
   valid.forEach(([forecast,observation])=>this.store.history.push({lat:Number(lat),lon:Number(lon),provider,param:meta.param||'temperature',horizon:meta.horizon||'0-24h',validAt:stamp,forecast,observation,error:+(forecast-observation).toFixed(3)}));
   if(this.store.history.length>this.maxHistory)this.store.history=this.store.history.slice(-this.maxHistory);
   this._save(); if(meta.model&&meta.param&&meta.horizon)this.skillDb.record({model:meta.model,lat,lon,param:meta.param,horizon:meta.horizon,mae:metrics.mae,rmse:metrics.rmse,bias:metrics.bias,correlation:metrics.corr,brier:metrics.brier,sampleCount:metrics.count}); return metrics;
 }
 get(lat,lon,provider){return this.store.metrics[this.keyFor(lat,lon)]?.[provider]||null;}
 weightsFor(lat,lon){const m=this.store.metrics[this.keyFor(lat,lon)]||{};const raw={};for(const[p,v]of Object.entries(m))if(Number.isFinite(v.weight))raw[p]=v.weight;const sum=Object.values(raw).reduce((a,b)=>a+b,0);if(!sum)return null;for(const k of Object.keys(raw))raw[k]=+(raw[k]/sum).toFixed(4);return raw;}
 historyFor({provider=null,param=null,horizon=null,sinceMs=null}={}){const min=sinceMs?Date.now()-sinceMs:0;return this.store.history.filter(r=>(!provider||r.provider===provider)&&(!param||r.param===param)&&(!horizon||r.horizon===horizon)&&(!r.validAt||Date.parse(r.validAt)>=min));}
 export(){return JSON.parse(JSON.stringify(this.store));}
 clear(){this.store={metrics:{},history:[]};this._save();}
}
export const verificationStore=new VerificationStore();
export default verificationStore;
