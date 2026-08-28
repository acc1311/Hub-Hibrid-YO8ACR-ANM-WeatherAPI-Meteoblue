/**
 * src/utils/units.js
 * Re-export + extra helpers
 */
export * from '../../config/units.js';

export function calcDewPoint(tempC, humidity) {
  tempC=Number(tempC); humidity=Number(humidity);
  if (!Number.isFinite(tempC) || !Number.isFinite(humidity) || humidity<=0) return null;
  humidity=Math.min(100,Math.max(1,humidity));
  const a=17.27,b=237.7;
  const alpha=((a*tempC)/(b+tempC))+Math.log(humidity/100);
  const dew=(b*alpha)/(a-alpha);
  return Number.isFinite(dew) ? parseFloat(dew.toFixed(1)) : null;
}

export function calcHeatIndex(tempC, rh) {
  if (tempC==null||rh==null) return null;
  tempC=Number(tempC); rh=Number(rh);
  if (!Number.isFinite(tempC)||!Number.isFinite(rh)) return null;
  if (tempC<27||rh<40) return parseFloat(tempC.toFixed(1));
  const tF=tempC*9/5+32;
  const hiF=-42.379+2.04901523*tF+10.14333127*rh-0.22475541*tF*rh-0.00683783*tF*tF-0.05481717*rh*rh+0.00122874*tF*tF*rh+0.00085282*tF*rh*rh-0.00000199*tF*tF*rh*rh;
  if (!Number.isFinite(hiF)) return parseFloat(tempC.toFixed(1));
  return parseFloat(((hiF-32)*5/9).toFixed(1));
}

export function calcApparentTemp(tempC, windKph, humidity) {
  tempC=Number(tempC); windKph=Number(windKph); humidity=Number(humidity);
  if (!Number.isFinite(tempC)) return null;
  if (Number.isFinite(windKph) && tempC<=10 && windKph>4.8) {
    const wc=13.12+0.6215*tempC-11.37*Math.pow(windKph,0.16)+0.3965*tempC*Math.pow(windKph,0.16);
    return Number.isFinite(wc)?parseFloat(wc.toFixed(1)):tempC;
  }
  if (Number.isFinite(humidity) && tempC>=27 && humidity>=40) {
    const tF=tempC*9/5+32;
    const hiF=-42.379+2.04901523*tF+10.14333127*humidity-0.22475541*tF*humidity-0.00683783*tF*tF-0.05481717*humidity*humidity+0.00122874*tF*tF*humidity+0.00085282*tF*humidity*humidity-0.00000199*tF*tF*humidity*humidity;
    return Number.isFinite(hiF)?parseFloat(((hiF-32)*5/9).toFixed(1)):tempC;
  }
  return parseFloat(tempC.toFixed(1));
}
