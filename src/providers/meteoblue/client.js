/**
 * src/providers/meteoblue/client.js
 */
import { WeatherProvider } from '../base.js';
export class MeteoblueProvider extends WeatherProvider {
  constructor({ proxyBase='https://hubmeteoacr.brm-laser-veronese.workers.dev', fetchImpl=globalThis.fetch }={}){
    super('meteoblue','Meteoblue');
    this.proxyBase=proxyBase;
    this.fetchImpl=fetchImpl;
  }
  async fetchHourly(lat, lon){
    const res=await this.fetchImpl(`${this.proxyBase}/mb/basic-1h?lat=${lat}&lon=${lon}`);
    if(!res.ok) throw new Error(`Meteoblue HTTP ${res.status}`);
    const data=await res.json();
    if(!data||!data.data_1h) throw new Error('Meteoblue invalid');
    this.markOnline();
    return data.data_1h;
  }
}
export default MeteoblueProvider;
