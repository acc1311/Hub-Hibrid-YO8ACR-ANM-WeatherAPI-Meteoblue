/** Persistent, regional model-skill database with nearest-location lookup. */
function storageAvailable(){ return typeof localStorage !== 'undefined'; }

const MODEL_ALIASES = {
  anm:'anm', openmeteo_d2:'openmeteo_d2', icon_d2:'openmeteo_d2',
  openmeteo_eu:'openmeteo_eu', icon_eu:'openmeteo_eu',
  openmeteo_ecmwf:'openmeteo_ecmwf', ecmwf:'openmeteo_ecmwf', ecmwf_ifs025:'openmeteo_ecmwf',
  meteoblue:'meteoblue', weatherapi:'weatherapi'
};
function canonicalModel(v){ return MODEL_ALIASES[String(v||'').toLowerCase()] || String(v||''); }
function clamp(v,a=0,b=100){ return Math.max(a,Math.min(b,v)); }
function metricScore({mae,rmse,brier,sampleCount}){
  const a=mae==null?50:100*Math.exp(-Math.max(0,mae)/3);
  const r=rmse==null?a:100*Math.exp(-Math.max(0,rmse)/4);
  const br=brier==null?null:100*(1-clamp(brier,0,1));
  const base=br==null?a*0.6+r*0.4:a*0.45+r*0.35+br*0.2;
  const n=Math.max(1,Number(sampleCount)||1);
  const reliability=Math.min(1,Math.max(0.2,Math.log10(n)/3));
  return clamp(base*(0.65+0.35*reliability));
}

export class ModelSkillDB {
  constructor(key='hub_model_skill_v3'){
    this.key=key; this.store=this._load();
  }
  _load(){ try{ if(!storageAvailable()) return {}; const v=JSON.parse(localStorage.getItem(this.key)||'null'); return v&&typeof v==='object'?v:{}; }catch{return {};} }
  _save(){ try{ if(storageAvailable()) localStorage.setItem(this.key,JSON.stringify(this.store)); }catch{} }
  _k(model,lat,lon,param,horizon){ return `${canonicalModel(model)}|${Number(lat).toFixed(1)},${Number(lon).toFixed(1)}|${param}|${horizon}`; }
  record({model,lat,lon,param,horizon,mae,rmse,bias,correlation,brier,sampleCount=1}){
    const key=this._k(model,lat,lon,param,horizon); const prev=this.store[key]; const prevN=prev?.samples||0; const n=Math.max(1,Number(sampleCount)||1); const total=prevN+n;
    const avg=(a,b)=>a==null?b:b==null?a:(a*prevN+b*n)/total;
    const merged={model:canonicalModel(model),lat:+Number(lat).toFixed(1),lon:+Number(lon).toFixed(1),param,horizon,
      mae:avg(prev?.mae,mae),rmse:avg(prev?.rmse,rmse),bias:avg(prev?.bias,bias),correlation:correlation??prev?.correlation??null,brier:avg(prev?.brier,brier),samples:total,updatedAt:new Date().toISOString()};
    merged.skill=+metricScore({...merged,sampleCount:merged.samples}).toFixed(2);
    this.store[key]=merged; this._save(); return merged;
  }
  get(model,lat,lon,param,horizon){ return this.store[this._k(model,lat,lon,param,horizon)]||null; }
  nearest(model,lat,lon,param,horizon,maxDistanceDeg=0.35){
    const m=canonicalModel(model), la=Number(lat), lo=Number(lon); let best=null,bestD=Infinity;
    for(const v of Object.values(this.store)){ if(v.model!==m||v.param!==param||v.horizon!==horizon||!Number.isFinite(v.skill)) continue;
      const d=Math.hypot((Number(v.lat)-la), (Number(v.lon)-lo)*Math.cos(la*Math.PI/180)); if(d<bestD){bestD=d;best=v;}
    }
    return bestD<=maxDistanceDeg?best:null;
  }
  allForLocation(lat,lon,maxDistanceDeg=0.35){
    const la=Number(lat),lo=Number(lon); return Object.values(this.store).filter(v=>v&&Math.hypot(Number(v.lat)-la,(Number(v.lon)-lo)*Math.cos(la*Math.PI/180))<=maxDistanceDeg);
  }
  weightsFor(lat,lon,param,horizon){
    const entries=this.allForLocation(lat,lon).filter(r=>r.param===param&&r.horizon===horizon&&Number.isFinite(r.skill)); if(!entries.length) return null;
    const raw={}; for(const e of entries){ const k=canonicalModel(e.model); raw[k]=Math.max(raw[k]||0,Number(e.skill)); }
    const sum=Object.values(raw).reduce((a,b)=>a+b,0); if(!sum) return null; const out={}; for(const [k,v] of Object.entries(raw)) out[k]=+(v/sum).toFixed(4); return out;
  }
  export(){ return JSON.parse(JSON.stringify(this.store)); }
  clear(){ this.store={}; this._save(); }
}
export const modelSkillDB=new ModelSkillDB();
export { canonicalModel };
export default modelSkillDB;
