/**
 * src/fusion/ensemble.js
 * Ensemble P10/P25/P50/P75/P90 + P(threshold)
 */
export function ensembleStats(values){
  const vals=values.filter(v=>typeof v==='number'&&isFinite(v)).sort((a,b)=>a-b);
  if(!vals.length) return null;
  const n=vals.length;
  const q=p=>{
    const idx=(p/100)*(n-1);
    const lo=Math.floor(idx), hi=Math.ceil(idx);
    if(lo===hi) return vals[lo];
    return vals[lo]*(hi-idx)+vals[hi]*(idx-lo);
  };
  const mean=vals.reduce((a,b)=>a+b,0)/n;
  return {
    min: vals[0], max: vals[n-1],
    mean: +mean.toFixed(2),
    p10: +q(10).toFixed(1), p25: +q(25).toFixed(1), p50: +q(50).toFixed(1), p75: +q(75).toFixed(1), p90: +q(90).toFixed(1),
    spread: +(vals[n-1]-vals[0]).toFixed(1)
  };
}

export function probAbove(values, threshold){
  const vals=values.filter(v=>typeof v==='number'&&isFinite(v));
  if(!vals.length) return null;
  const cnt=vals.filter(v=>v>threshold).length;
  return Math.round(cnt/vals.length*100);
}

export function probPrecipAbove(memberPrecipArrays, threshold){
  // memberPrecipArrays = [ [m1_t0, m2_t0, ...], [m1_t1, ...] ] per time
  return memberPrecipArrays.map(mems=> probAbove(mems, threshold));
}
