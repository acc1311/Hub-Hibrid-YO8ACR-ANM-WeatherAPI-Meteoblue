/**
 * src/fusion/precipitation-engine.js
 * Precipitation Engine — distinguishes probability, amount, duration, intensity, type, timing, nowcast, ensemble
 */
export function classifyIntensity(mmPerHour){
  if(mmPerHour==null||!isFinite(mmPerHour)) return null;
  if(mmPerHour<0.1) return { label:'Absent', level:0 };
  if(mmPerHour<1) return { label:'Slabă', level:1 };
  if(mmPerHour<5) return { label:'Moderată', level:2 };
  if(mmPerHour<15) return { label:'Puternică', level:3 };
  return { label:'Extremă', level:4 };
}

export function precipitationTiming(minutely15, hourlyProb){
  // nowcast 0-120min
  if(minutely15 && Array.isArray(minutely15.precipitation)){
    const now=Date.now();
    let firstWet=null;
    let amount=0, duration=0;
    const idx0=(minutely15.time||[]).findIndex(t=> new Date(t).getTime()>=now-15*60*1000);
    const start=idx0>=0?idx0:0;
    for(let i=0;i<12 && start+i<minutely15.precipitation.length;i++){
      const mm=Number(minutely15.precipitation[start+i]);
      if(isFinite(mm) && mm>=0.1){
        if(firstWet==null) firstWet=i*15;
        amount+=mm*0.25; // 15min slice ~ mm/4
        duration+=15;
      } else if(firstWet!=null){
        break;
      }
    }
    if(firstWet!=null){
      return { timing: firstWet, amount: +amount.toFixed(1), duration, intensity: classifyIntensity(amount/(duration/60)||0) };
    }
  }
  // fallback hourly
  if(hourlyProb){
    const max=Math.max(...hourlyProb.filter(v=>v!=null));
    if(max>=15) return { timing: 60, amount: null, duration: null, intensity: null, prob: max };
  }
  return null;
}

export function buildPrecipitationReport({ minutely15, hourly, ensembleProb, modelAmount }){
  const timing=precipitationTiming(minutely15, ensembleProb);
  const prob=ensembleProb? Math.max(...ensembleProb.filter(v=>v!=null)):null;
  const amount=modelAmount!=null? modelAmount : timing?.amount ?? null;
  const intensity= timing?.intensity || classifyIntensity(amount);
  return {
    probability: prob,
    amount,
    duration: timing?.duration ?? null,
    intensity,
    timing: timing?.timing ?? null,
    type: amount!=null && amount>0 ? (timing?.intensity?.level>=3 ? 'Ploaie torențială' : 'Ploaie') : null,
    report: timing? `Ploaie probabilă în ~${timing.timing} min · Prob ${prob??'—'}% · ${amount??'—'} mm · ${intensity?.label??''}` : 'Fără precipitații în 180 min'
  };
}
