/**
 * src/providers/radar/rainviewer.js
 * RainViewer abstraction — supports radar + satellite, color schemes, snow toggle
 */

export const RV_COLORS = {
  0:'B/W',1:'Original',2:'Universal Blue',3:'TITAN',4:'TWC',5:'Meteored',6:'NEXRAD',7:'Rainbow',8:'Dark Sky'
};
export const RV_RANGES = ['full','past60','recent'];

export class RainViewerProvider {
  constructor({ fetchImpl=globalThis.fetch }={}){
    this.fetchImpl=fetchImpl;
    this.kind='radar'; // radar | satellite
    this.color=2;
    this.snow=1;
    this.range='full';
    this.data=null;
  }
  async fetchMeta(){
    const res=await this.fetchImpl('https://api.rainviewer.com/public/weather-maps.json');
    if(!res.ok) throw new Error(`RainViewer HTTP ${res.status}`);
    this.data=await res.json();
    return this.data;
  }
  setOptions({ kind, color, snow, range }={}){
    if(kind) this.kind=kind==='satellite'?'satellite':'radar';
    if(color!=null) this.color=parseInt(color,10);
    if(snow!=null) this.snow=snow?1:0;
    if(range && RV_RANGES.includes(range)) this.range=range;
  }
  getFrames(){
    if(!this.data) return [];
    const isSat=this.kind==='satellite';
    let frames=isSat ? [...(this.data.satellite?.infrared||[])] : [...(this.data.radar.past||[]), ...(this.data.radar.nowcast||[])];
    if(this.range==='past60') frames=frames.filter(f=>f.time*1000 <= Date.now()).slice(-6);
    if(this.range==='recent') frames=frames.slice(-3);
    return frames;
  }
  tileUrl(frame){
    const isSat=this.kind==='satellite';
    const suffix=isSat? '0/0_0' : `${this.color}/1_${this.snow}`;
    return `${this.data.host}${frame.path}/256/{z}/{x}/{y}/${suffix}.png`;
  }
}
export default RainViewerProvider;
