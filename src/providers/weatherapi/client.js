/**
 * src/providers/weatherapi/client.js
 */
import { WeatherProvider } from '../base.js';

export class WeatherAPIProvider extends WeatherProvider {
  constructor({ proxyBase='https://hubmeteoacr.brm-laser-veronese.workers.dev', fetchImpl=globalThis.fetch }={}){
    super('weatherapi', 'WeatherAPI');
    this.proxyBase=proxyBase;
    this.fetchImpl=fetchImpl;
  }
  async fetchObservation(lat, lon){
    const res=await this.fetchImpl(`${this.proxyBase}/wapi/current.json?q=${lat},${lon}&lang=ro&aqi=yes`);
    if(!res.ok) throw new Error(`WAPI HTTP ${res.status}`);
    const data=await res.json();
    if(!data||!data.current||!data.location) throw new Error('WAPI invalid response');
    this.markOnline();
    return {
      source:'WeatherAPI',
      sourceType:'model',
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      pressure: data.current.pressure_mb,
      windKph: data.current.wind_kph,
      windDir: data.current.wind_dir,
      condition: data.current.condition?.text,
      uv: data.current.uv,
      visKm: data.current.vis_km,
      aqi: data.current.air_quality,
      location: data.location,
      raw:data,
    };
  }
  async search(query){
    const res=await this.fetchImpl(`${this.proxyBase}/wapi/search.json?q=${encodeURIComponent(query)}`);
    if(!res.ok) return [];
    const cities=await res.json();
    return (Array.isArray(cities)?cities:[]).slice(0,5).map(c=>({ name:c.name, region:c.region, country:c.country, lat:c.lat, lon:c.lon }));
  }
  async fetchForecast(lat, lon, days=3){
    const res=await this.fetchImpl(`${this.proxyBase}/wapi/forecast.json?q=${lat},${lon}&days=${days}&lang=ro&aqi=yes`);
    if(!res.ok) throw new Error(`WAPI forecast HTTP ${res.status}`);
    const data=await res.json();
    this.markOnline();
    return data;
  }
}
export default WeatherAPIProvider;
