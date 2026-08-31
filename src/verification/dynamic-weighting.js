/** Dynamic source weighting from policy + verified regional skill + provider health. */
import { FUSION_WEIGHTS } from '../../config/thresholds.js';
import { modelSkillDB, canonicalModel } from './model-skill.js';
function normalizeWeights(input={}){ const clean={}; for(const [k,v] of Object.entries(input)){ if(Number.isFinite(v)&&v>0) clean[k]=v; } const sum=Object.values(clean).reduce((a,b)=>a+b,0); if(!sum)return clean; for(const k of Object.keys(clean)) clean[k]=+(clean[k]/sum).toFixed(6); return clean; }
function skillWeightFor(provider,skill){ const k=canonicalModel(provider); return skill?.[provider]??skill?.[k]??null; }
export function dynamicWeights({lat,lon,param,horizon,baseWeights,agreementSpread,providerHealth={}}){
  const base=normalizeWeights(baseWeights); const skill=modelSkillDB.weightsFor(lat,lon,param,horizon)||{}; const out={};
  for(const [provider,w] of Object.entries(base)){
    const s=skillWeightFor(provider,skill); let x=w;
    if(s!=null) x=x*0.55+s*0.45;
    const health=providerHealth[provider]; if(Number.isFinite(health)) x*=Math.max(0.25,Math.min(1,health/100));
    out[provider]=x;
  }
  if(agreementSpread!=null){ const flatten=agreementSpread>10?0.35:agreementSpread>7?0.2:agreementSpread>4?0.08:0; if(flatten){const keys=Object.keys(out); const mean=keys.reduce((s,k)=>s+out[k],0)/Math.max(1,keys.length); keys.forEach(k=>out[k]=out[k]*(1-flatten)+mean*flatten);} }
  return normalizeWeights(out);
}
export function weightsForRomaniaTemp(lat,lon,horizon='0-24h',agreementSpread=null,providerHealth={}){
 const b=horizon==='0-24h'?FUSION_WEIGHTS.romania_0_24h:FUSION_WEIGHTS.longRange;
 return dynamicWeights({lat,lon,param:'temperature',horizon,baseWeights:{anm:b.anm_observation??0.45,openmeteo_d2:b.icon_d2??0.25,openmeteo_eu:b.icon_eu??0.15,openmeteo_ecmwf:b.ecmwf??0.10,meteoblue:b.meteoblue??0.03,weatherapi:b.weatherapi??0.02},agreementSpread,providerHealth});
}
