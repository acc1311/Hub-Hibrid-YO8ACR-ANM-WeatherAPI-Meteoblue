/**
 * src/weather/verification.js
 * Forecast Verification — compares forecast vs ANM observation
 * Computes MAE, RMSE, bias, correlation, Brier score; derives dynamic weighting
 */

export function mae(forecasts, observations){
  if(!forecasts.length||!observations.length||forecasts.length!==observations.length) return null;
  const n=forecasts.length;
  let sum=0, cnt=0;
  for(let i=0;i<n;i++){ if(typeof forecasts[i]==='number'&&typeof observations[i]==='number'){ sum+=Math.abs(forecasts[i]-observations[i]); cnt++; } }
  return cnt? parseFloat((sum/cnt).toFixed(2)) : null;
}
export function rmse(forecasts, observations){
  if(!forecasts.length||forecasts.length!==observations.length) return null;
  let sum=0,cnt=0;
  for(let i=0;i<forecasts.length;i++){ if(typeof forecasts[i]==='number'&&typeof observations[i]==='number'){ sum+=(forecasts[i]-observations[i])**2; cnt++; } }
  return cnt? parseFloat(Math.sqrt(sum/cnt).toFixed(2)) : null;
}
export function bias(forecasts, observations){
  if(!forecasts.length||forecasts.length!==observations.length) return null;
  let sum=0,cnt=0;
  for(let i=0;i<forecasts.length;i++){ if(typeof forecasts[i]==='number'&&typeof observations[i]==='number'){ sum+=forecasts[i]-observations[i]; cnt++; } }
  return cnt? parseFloat((sum/cnt).toFixed(2)) : null;
}
export function correlation(x, y){
  const n=x.length;
  if(n<2||n!==y.length) return null;
  const pairs=x.map((xi,i)=>[xi,y[i]]).filter(([a,b])=> typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b));
  if(pairs.length<2) return null;
  const xs=pairs.map(p=>p[0]), ys=pairs.map(p=>p[1]);
  const mx=xs.reduce((a,b)=>a+b,0)/xs.length, my=ys.reduce((a,b)=>a+b,0)/ys.length;
  let num=0, denX=0, denY=0;
  for(let i=0;i<xs.length;i++){ const dx=xs[i]-mx, dy=ys[i]-my; num+=dx*dy; denX+=dx*dx; denY+=dy*dy; }
  const den=Math.sqrt(denX*denY);
  return den===0?0: parseFloat((num/den).toFixed(3));
}
export function brierScore(probabilities, outcomes){
  // probabilities 0-100, outcomes 0/1
  if(!probabilities.length||probabilities.length!==outcomes.length) return null;
  let sum=0,cnt=0;
  for(let i=0;i<probabilities.length;i++){
    const p=probabilities[i]/100, o=outcomes[i];
    if(typeof p==='number'&&Number.isFinite(p)&&(o===0||o===1)){ sum+=(p-o)**2; cnt++; }
  }
  return cnt? parseFloat((sum/cnt).toFixed(3)) : null;
}

// Verification store: Map<latlonKey, Map<provider, {mae,rmse,bias,weight}>>
export class VerificationStore {
  constructor(){ this.store=new Map(); }
  keyFor(lat,lon){ return `${Number(lat).toFixed(1)},${Number(lon).toFixed(1)}`; }
  record(lat, lon, provider, forecasts, observations){
    const k=this.keyFor(lat,lon);
    let m=this.store.get(k); if(!m){ m=new Map(); this.store.set(k,m); }
    const metrics={ mae:mae(forecasts,observations), rmse:rmse(forecasts,observations), bias:bias(forecasts,observations), corr:correlation(forecasts,observations), count:forecasts.length, updatedAt:Date.now() };
    // derive weight: lower mae => higher weight (inverse)
    const prev=m.get(provider);
    if(metrics.mae!=null){
      const score = Math.max(0, 100 - metrics.mae*8); // mae 0 =>100, mae 5=>60, mae10=>20
      metrics.weight = score;
    }
    m.set(provider, metrics);
  }
  get(lat,lon,provider){
    const m=this.store.get(this.keyFor(lat,lon));
    if(!m) return null;
    return m.get(provider)||null;
  }
  weightsFor(lat,lon){
    const m=this.store.get(this.keyFor(lat,lon));
    if(!m) return null;
    const out={};
    for(const [prov, met] of m.entries()){ if(met.weight!=null) out[prov]=met.weight; }
    // normalize to sum 1
    const sum=Object.values(out).reduce((a,b)=>a+b,0);
    if(sum===0) return out;
    Object.keys(out).forEach(k=> out[k]=parseFloat((out[k]/sum).toFixed(3)));
    return out;
  }
}
export const verificationStore = new VerificationStore();
export default verificationStore;
