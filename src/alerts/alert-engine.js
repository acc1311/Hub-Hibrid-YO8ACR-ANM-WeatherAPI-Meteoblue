/**
 * src/alerts/alert-engine.js
 * Alert Engine — YO8ACR Weather Hub PRO
 * Two levels: OFFICIAL (ANM) and DERIVED (Hub thresholds)
 * Never mix visual hierarchy: OFFICIAL always above DERIVED.
 */

import { ALERT_THRESHOLDS } from '../../config/thresholds.js';

export const ALERT_LEVEL = { YELLOW:'yellow', ORANGE:'orange', RED:'red' };
export const ALERT_KIND = { OFFICIAL:'official', DERIVED:'derived' };

function levelRank(level){
  return level==='red'?3:level==='orange'?2:1;
}

export function severityScore({ official, intensity, proximity, durationH, probability, impact, confidence }){
  // 0-100
  let s=0;
  if(official) s+=30;
  if(intensity!=null) s+= Math.min(25, intensity*0.25);
  if(proximity!=null) s+= Math.max(0, 15 - proximity*0.1); // closer = higher
  if(durationH!=null) s+= Math.min(10, durationH*1.2);
  if(probability!=null) s+= probability*0.15;
  if(impact!=null) s+= Math.min(15, impact);
  if(confidence!=null) s+= (confidence-50)*0.05;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export class AlertEngine {
  constructor(){}

  // Official alerts are already parsed via anm-alerts; just enrich with severity
  enrichOfficial(alerts){
    return alerts.map(a=> ({
      ...a,
      kind: ALERT_KIND.OFFICIAL,
      severity: severityScore({ official:true, intensity: a.level==='red'?95:a.level==='orange'?70:45, confidence:98 }),
      badge: a.level==='red'?'🔴 OFICIAL ANM':a.level==='orange'?'🟠 OFICIAL ANM':'🟡 OFICIAL ANM',
    }));
  }

  deriveAlerts(omData){
    if(!omData||!omData.current||!omData.hourly) return [];
    const alerts=[];
    const omc=omData.current, omh=omData.hourly, omd=omData.daily;
    const start=omData.nowIdx||0;
    const push=a=>alerts.push(a);
    const maxNext=(arr,hours)=>{
      let best=null, idx=-1;
      for(let i=start;i<Math.min(start+hours, arr.length);i++){
        const v=arr[i]; if(v!=null&&(best==null||v>best)){best=v; idx=i;}
      }
      return { value:best, idx };
    };

    // Wind gusts
    if(typeof omc.wind_gusts_10m==='number'){
      if(omc.wind_gusts_10m>=ALERT_THRESHOLDS.gust.red) push({ level:'red', icon:'🌪️', title:'Rafale extreme', msg:`Rafale ${omc.wind_gusts_10m.toFixed(0)} km/h`, src:'Hub Derived — ICON-D2/EU', kind:ALERT_KIND.DERIVED, severity: severityScore({ intensity: omc.wind_gusts_10m, probability:85, confidence:78 }) });
      else if(omc.wind_gusts_10m>=ALERT_THRESHOLDS.gust.orange) push({ level:'orange', icon:'💨', title:'Vânt puternic', msg:`Rafale ${omc.wind_gusts_10m.toFixed(0)} km/h`, src:'Hub Derived — ICON-D2/EU', kind:ALERT_KIND.DERIVED, severity: severityScore({ intensity: omc.wind_gusts_10m, probability:75, confidence:72 }) });
      else if(omc.wind_gusts_10m>=ALERT_THRESHOLDS.gust.yellow) push({ level:'yellow', icon:'💨', title:'Atenționare vânt', msg:`Rafale ${omc.wind_gusts_10m.toFixed(0)} km/h`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity: 45 });
    }
    // Precip
    if(omh.precipitation){
      const maxP=maxNext(omh.precipitation,24);
      if(maxP.value!=null){
        if(maxP.value>=ALERT_THRESHOLDS.rain.red) push({ level:'red', icon:'🌊', title:'Ploaie torențială', msg:`${maxP.value.toFixed(1)} mm/h`, src:'Hub Derived — ICON-D2/EU/ECMWF', kind:ALERT_KIND.DERIVED, severity:88 });
        else if(maxP.value>=ALERT_THRESHOLDS.rain.orange) push({ level:'orange', icon:'🌧️', title:'Ploaie intensă', msg:`${maxP.value.toFixed(1)} mm/h`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:68 });
        else if(maxP.value>=ALERT_THRESHOLDS.rain.yellow) push({ level:'yellow', icon:'🌦️', title:'Ploaie moderată', msg:`${maxP.value.toFixed(1)} mm/h`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:50 });
      }
    }
    // CAPE
    if(omh.cape){
      const maxC=maxNext(omh.cape,6);
      if(maxC.value!=null){
        if(maxC.value>=ALERT_THRESHOLDS.cape.red) push({ level:'red', icon:'⛈️', title:'Instabilitate extremă CAPE', msg:`${Math.round(maxC.value)} J/kg`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:90 });
        else if(maxC.value>=ALERT_THRESHOLDS.cape.orange) push({ level:'orange', icon:'⛈️', title:'CAPE ridicat', msg:`${Math.round(maxC.value)} J/kg`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:70 });
        else if(maxC.value>=ALERT_THRESHOLDS.cape.yellow) push({ level:'yellow', icon:'⚡', title:'Instabilitate convectivă', msg:`${Math.round(maxC.value)} J/kg`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:48 });
      }
    }
    // UV
    const uvNow=omh.uv_index?omh.uv_index[start]:null;
    const uvMax=omd&&omd.uv_index_max?omd.uv_index_max[0]:null;
    const uvVal= typeof uvMax==='number'?uvMax:(typeof uvNow==='number'?uvNow:null);
    if(uvVal!=null){
      if(uvVal>=11) push({ level:'red', icon:'☀️', title:'UV Extrem', msg:`Indice UV ${uvVal.toFixed(1)}`, src:'Hub Derived — ECMWF', kind:ALERT_KIND.DERIVED, severity:85 });
      else if(uvVal>=8) push({ level:'orange', icon:'🕶️', title:'UV Foarte ridicat', msg:`Indice UV ${uvVal.toFixed(1)}`, src:'Hub Derived — ECMWF', kind:ALERT_KIND.DERIVED, severity:68 });
      else if(uvVal>=6) push({ level:'yellow', icon:'🧴', title:'UV Ridicat', msg:`Indice UV ${uvVal.toFixed(1)}`, src:'Hub Derived — ECMWF', kind:ALERT_KIND.DERIVED, severity:52 });
    }
    // Temperature extremes
    if(omd&&omd.temperature_2m_max&&omd.temperature_2m_min){
      const tMax=omd.temperature_2m_max[0], tMin=omd.temperature_2m_min[0];
      if(typeof tMax==='number'){
        if(tMax>=40) push({ level:'red', icon:'🌡️', title:'Caniculă extremă', msg:`Maxima ${tMax.toFixed(0)}°C`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:92 });
        else if(tMax>=36) push({ level:'orange', icon:'🌡️', title:'Caniculă', msg:`Maxima ${tMax.toFixed(0)}°C`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:72 });
        else if(tMax>=33) push({ level:'yellow', icon:'☀️', title:'Căldură accentuată', msg:`Maxima ${tMax.toFixed(0)}°C`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:50 });
      }
      if(typeof tMin==='number'){
        if(tMin<=-20) push({ level:'red', icon:'🥶', title:'Ger extrem', msg:`Minima ${tMin.toFixed(0)}°C`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:90 });
        else if(tMin<=-10) push({ level:'orange', icon:'🥶', title:'Ger puternic', msg:`Minima ${tMin.toFixed(0)}°C`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:70 });
        else if(tMin<=-3) push({ level:'yellow', icon:'❄️', title:'Îngheț nocturn', msg:`Minima ${tMin.toFixed(0)}°C`, src:'Hub Derived', kind:ALERT_KIND.DERIVED, severity:48 });
      }
    }
    return alerts;
  }

  combine(official, derived){
    const all=[...official, ...derived];
    const rank={ red:0, orange:1, yellow:2 };
    const seen=new Set();
    all.sort((a,b)=> rank[a.level]-rank[b.level] || (b.severity||0)-(a.severity||0));
    return all.filter(a=>{
      const key=a.title.slice(0,28);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0,10).map(a=> ({
      ...a,
      badge: a.kind===ALERT_KIND.OFFICIAL ? (a.level==='red'?'🔴 OFICIAL ANM':a.level==='orange'?'🟠 OFICIAL ANM':'🟡 OFICIAL ANM') : (a.level==='red'?'🔴 HUB DERIVED':a.level==='orange'?'🟠 HUB DERIVED':'🟡 HUB DERIVED'),
      why: `De ce? Rafale ${a.msg||'—'}, prag ${ALERT_THRESHOLDS.wind.yellow}-${ALERT_THRESHOLDS.wind.red}, confidence ${a.severity||'—'}%`
    }));
  }

  whyThisAlert(alert){
    return {
      title: alert.title,
      level: alert.level,
      kind: alert.kind,
      severity: alert.severity,
      thresholds: ALERT_THRESHOLDS,
      explanation: alert.why || `Severitate ${alert.severity}/100 — oficial:${alert.kind===ALERT_KIND.OFFICIAL} — ${alert.msg||''}`,
    };
  }
}
export const alertEngine = new AlertEngine();
export default alertEngine;
