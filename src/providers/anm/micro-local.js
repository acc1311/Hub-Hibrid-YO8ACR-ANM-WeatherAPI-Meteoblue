/**
 * src/providers/anm/micro-local.js
 * Micro-local correction: ANM station + elevation + model grid + spatial interpolation
 * Marks result as observed|derived|modelled|blended
 */
import { haversineKm } from '../../utils/geo.js';

export function microLocalCorrection({ stationTemp, stationElevM, targetElevM, modelGridTemp, distanceKm }){
  let temp=stationTemp;
  let flags=[];
  let type='observed';
  if(targetElevM!=null && stationElevM!=null && stationTemp!=null){
    const lapse=-0.0065; // °C/m
    const delta=(targetElevM - stationElevM)*lapse;
    temp = stationTemp + delta;
    flags.push(`elevation:${delta.toFixed(1)}C`);
    type='derived';
  }
  if(modelGridTemp!=null && stationTemp!=null){
    // blend 70% station (elevation-corrected) + 30% model if distant
    if(distanceKm!=null && distanceKm>10){
      const wStation=Math.max(0.4, 0.8 - distanceKm*0.01);
      temp = temp*wStation + modelGridTemp*(1-wStation);
      flags.push(`spatial:${(1-wStation).toFixed(2)} model`);
      type='blended';
    }
  } else if(modelGridTemp!=null && stationTemp==null){
    temp=modelGridTemp;
    type='modelled';
    flags.push('no station');
  }
  return { value: temp!=null? +temp.toFixed(1):null, type, flags, distanceKm };
}
