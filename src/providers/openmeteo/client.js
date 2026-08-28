/**
 * src/providers/openmeteo/client.js
 * Open-Meteo provider — ICON-D2 / ICON-EU / ECMWF Ensemble
 * Fusion logic lives in fusion-engine; this client only fetches + normalizes per model.
 */
import { WeatherProvider } from '../base.js';

const OM_BASE = 'https://api.open-meteo.com/v1/forecast';
const OM_ENSEMBLE = 'https://ensemble-api.open-meteo.com/v1/ensemble';

function toFinite(v){ if(v==null||v==='')return null; const n=Number(v); return Number.isFinite(n)?n:null; }
function buildMap(arr){ const out={}; (arr||[]).forEach((t,i)=>{out[t]=i;}); return out; }
function seriesValue(arr, idx){ return Array.isArray(arr)&&idx>=0&&arr[idx]!=null?arr[idx]:null; }
function avgMembers(container, base){
  if(!container) return null;
  if(Array.isArray(container[base])&&container[base].some(v=>v!=null)) return container[base];
  const keys=Object.keys(container).filter(k=>k.startsWith(base+'_member'));
  if(!keys.length) return null;
  const len=container[keys[0]].length;
  const avg=[];
  for(let i=0;i<len;i++){ let sum=0,count=0; keys.forEach(k=>{ const v=container[k]&&container[k][i]; if(v!=null&&!Number.isNaN(v)){sum+=v;count++;}}); avg.push(count?parseFloat((sum/count).toFixed(2)):null); }
  return avg;
}
function memberPrecipProbability(container, base, th=0.1){
  if(!container) return null;
  const keys=Object.keys(container).filter(k=>k.startsWith(base+'_member'));
  if(!keys.length) return null;
  const len=container[keys[0]].length;
  const prob=[];
  for(let i=0;i<len;i++){ let wet=0,total=0; keys.forEach(k=>{ const v=container[k]&&container[k][i]; if(v!=null&&!Number.isNaN(v)){total++; if(v>=th) wet++;}}); prob.push(total?Math.round(wet/total*100):null); }
  return prob.some(p=>p!=null)?prob:null;
}

export class OpenMeteoProvider extends WeatherProvider {
  constructor({ model='icon_eu', fetchImpl=globalThis.fetch }={}){
    super(`openmeteo_${model}`, `Open-Meteo ${model}`);
    this.model=model;
    this.fetchImpl=fetchImpl;
  }

  async fetchForecast(lat, lon, days=5){
    const params=new URLSearchParams({
      latitude: Number(lat).toFixed(4), longitude: Number(lon).toFixed(4),
      models: this.model,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,precipitation,cloud_cover,visibility,is_day,dew_point_2m',
      hourly: 'temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure,cloud_cover,visibility,snow_depth,cape,uv_index',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,precipitation_probability_max,precipitation_probability_min,sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max',
      wind_speed_unit:'kmh', temperature_unit:'celsius', precipitation_unit:'mm',
      timezone:'Europe/Bucharest', forecast_days:String(days), forecast_hours:String(days*24),
    });
    if(this.model==='icon_eu') params.set('minutely_15','precipitation');
    const res=await this.fetchImpl(`${OM_BASE}?${params}`);
    if(!res.ok) throw new Error(`Open-Meteo ${this.model} HTTP ${res.status}`);
    const data=await res.json();
    this.markOnline();
    return { model:this.model, raw:data, current:data.current||null, hourly:data.hourly||null, daily:data.daily||null, minutely_15:data.minutely_15||null };
  }

  async fetchEnsemble(lat, lon, days=5){
    const latS=Number(lat).toFixed(4), lonS=Number(lon).toFixed(4);
    const ensParams=new URLSearchParams({
      latitude:latS, longitude:lonS, models:'ecmwf_ifs025',
      hourly:'temperature_2m,dew_point_2m,apparent_temperature,precipitation,cape,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure,cloud_cover,visibility',
      daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant',
      timezone:'Europe/Bucharest', forecast_days:String(days), forecast_hours:String(days*24),
    });
    const uvParams=new URLSearchParams({
      latitude:latS, longitude:lonS, models:'ecmwf_ifs025', hourly:'uv_index', daily:'uv_index_max',
      timezone:'Europe/Bucharest', forecast_days:String(days), forecast_hours:String(days*24),
    });
    const [ensRes, uvRes]=await Promise.all([ this.fetchImpl(`${OM_ENSEMBLE}?${ensParams}`), this.fetchImpl(`${OM_BASE}?${uvParams}`) ]);
    if(!ensRes.ok) throw new Error(`ECMWF ENS HTTP ${ensRes.status}`);
    const ens=await ensRes.json();
    const uv=uvRes.ok?await uvRes.json():null;
    const hourly=ens.hourly||{}, daily=ens.daily||{};
    const outHourly={
      time:hourly.time||[],
      temperature_2m:avgMembers(hourly,'temperature_2m'),
      dew_point_2m:avgMembers(hourly,'dew_point_2m'),
      apparent_temperature:avgMembers(hourly,'apparent_temperature'),
      precipitation:avgMembers(hourly,'precipitation'),
      precipitation_probability:memberPrecipProbability(hourly,'precipitation',0.1),
      cape:avgMembers(hourly,'cape'),
      weather_code:avgMembers(hourly,'weather_code'),
      wind_speed_10m:avgMembers(hourly,'wind_speed_10m'),
      wind_gusts_10m:avgMembers(hourly,'wind_gusts_10m'),
      wind_direction_10m:avgMembers(hourly,'wind_direction_10m'),
      surface_pressure:avgMembers(hourly,'surface_pressure'),
      cloud_cover:avgMembers(hourly,'cloud_cover'),
      visibility:avgMembers(hourly,'visibility'),
      uv_index: uv&&uv.hourly?uv.hourly.uv_index:null,
    };
    const outDaily={
      time:daily.time||[],
      weather_code:avgMembers(daily,'weather_code'),
      temperature_2m_max:avgMembers(daily,'temperature_2m_max'),
      temperature_2m_min:avgMembers(daily,'temperature_2m_min'),
      precipitation_sum:avgMembers(daily,'precipitation_sum'),
      precipitation_probability_max:avgMembers(daily,'precipitation_probability_max'),
      wind_speed_10m_max:avgMembers(daily,'wind_speed_10m_max'),
      wind_direction_10m_dominant:avgMembers(daily,'wind_direction_10m_dominant'),
      uv_index_max: uv&&uv.daily?uv.daily.uv_index_max:null,
    };
    this.markOnline();
    return { model:'ecmwf_ensemble', raw:{ensemble:ens, uv}, hourly:outHourly, daily:outDaily };
  }

  // Multi-model composite (like fetchOpenMeteoAll but via providers)
  async fetchComposite(lat, lon){
    const d2 = new OpenMeteoProvider({ model:'icon_d2', fetchImpl:this.fetchImpl });
    const eu = new OpenMeteoProvider({ model:'icon_eu', fetchImpl:this.fetchImpl });
    const ec = this.model==='ecmwf_ifs025' ? this : new OpenMeteoProvider({ model:'ecmwf_ifs025', fetchImpl:this.fetchImpl });
    const results=await Promise.allSettled([
      d2.fetchForecast(lat,lon,5).catch(()=>null),
      eu.fetchForecast(lat,lon,5).catch(()=>null),
      ec.fetchEnsemble(lat,lon,5).catch(()=>null),
    ]);
    const v = r=> r.status==='fulfilled'?r.value:null;
    const d2v=v(results[0]), euv=v(results[1]), ecv=v(results[2]);
    if(!d2v&&!euv&&!ecv) return null;
    // Build fused hourly/daily similar to legacy — but delegate to fusion-engine for actual fusion
    // Return raw composite for fusion-engine to process
    return { d2:d2v, eu:euv, ecmwf:ecv };
  }
}
export default OpenMeteoProvider;
