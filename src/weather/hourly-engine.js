/**
 * src/weather/hourly-engine.js
 * Hourly forecast engine — 24h/48h/72h/120h with availability
 */
export class HourlyEngine {
  constructor(hourlyDataFull){
    this.full = Array.isArray(hourlyDataFull)?hourlyDataFull:[];
  }
  slice(mode){
    const count = mode==='120h'?120: mode==='72h'?72: mode==='48h'?48:24;
    return this.full.slice(0, Math.min(count, this.full.length));
  }
  availableModes(){
    const len=this.full.length;
    const modes=[];
    if(len>=24) modes.push('24h');
    if(len>=48) modes.push('48h');
    if(len>=72) modes.push('72h');
    if(len>=120) modes.push('120h');
    return modes;
  }
  nextMode(current){
    const modes=this.availableModes();
    const idx=modes.indexOf(current);
    return modes[(idx+1)%modes.length]||modes[0]||'24h';
  }
}
export default HourlyEngine;
