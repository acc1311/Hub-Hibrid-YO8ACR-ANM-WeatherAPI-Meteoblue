/**
 * src/weather/nowcast-engine.js
 * Nowcast priority: ANM Nowcasting > radar > high-res models > global
 */

export class NowcastEngine {
  constructor(){}
  // ANM nowcasting not yet exposed via API — placeholder respects priority
  build({ anmNowcast, radarNowcast, minutely15, hourlyPrecip, isRomania }){
    if(isRomania && anmNowcast && anmNowcast.severe){
      return { source:'ANM Nowcasting', sourceType:'official', message: anmNowcast.message, confidence:95, validUntil: anmNowcast.validUntil };
    }
    if(radarNowcast && radarNowcast.active){
      return { source:'Radar Nowcast', sourceType:'radar', message: radarNowcast.message, confidence:80 };
    }
    if(minutely15 && Array.isArray(minutely15.precipitation)){
      // derive from minutely15
      const arr=minutely15.precipitation;
      const now=Date.now();
      let idx=minutely15.time? minutely15.time.findIndex(ts=> new Date(ts).getTime() >= now - 15*60*1000) : 0;
      if(idx<0) idx=0;
      const segments=[];
      let firstWet=null, raining=false;
      for(let i=0;i<12 && idx+i < arr.length;i++){
        const mm=Number(arr[idx+i]);
        const wet=Number.isFinite(mm)&&mm>=0.1;
        if(wet && firstWet==null) firstWet=i*15;
        if(wet && i===0) raining=true;
        segments.push({ mm, wet });
      }
      const label = raining ? 'Precipitații în curs' : firstWet==null ? 'Fără precipitații în 180 min' : `Precipitații probabile în ~${firstWet} min`;
      return { source: 'ICON-EU minutely_15', sourceType:'model', message: label, confidence:70, segments };
    }
    if(hourlyPrecip){
      const max=Math.max(...hourlyPrecip.filter(v=>v!=null));
      if(max>=5) return { source:'High-res model', sourceType:'model', message:`Precipitații prognozate ${max.toFixed(1)} mm/h în 3h`, confidence:65 };
    }
    return { source:'None', sourceType:'none', message:'Fără fenomene severe', confidence:85 };
  }
}
export const nowcastEngine = new NowcastEngine();
export default nowcastEngine;
