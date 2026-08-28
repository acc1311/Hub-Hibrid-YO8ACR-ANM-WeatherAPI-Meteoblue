/**
 * src/app/main.js — Entry point for modular frontend (ESM)
 * Keeps backwards compat: re-exports legacy globals via window.Hub* where needed.
 */
import { weatherEngine } from '../weather/weather-engine.js';
import { fuseField, modelConsensusStats } from '../fusion/fusion-engine.js';
import { confidenceBand } from '../fusion/confidence-engine.js';
import { AnmProvider } from '../providers/anm/anm-client.js';
import { alertEngine } from '../alerts/alert-engine.js';
import { healthRegistry } from '../core/health.js';
import { isRomania } from '../../config/regions.js';

// Expose for debugging and for legacy inline script interop
if(typeof window!=='undefined'){
  window.HubWeatherEngine = weatherEngine;
  window.HubFusion = { fuseField, modelConsensusStats };
  window.HubConfidence = { confidenceBand };
  window.HubAnmProvider = AnmProvider;
  window.HubAlertEngine = alertEngine;
  window.HubHealth = healthRegistry;
  window.HubIsRomania = isRomania;
  console.log('%c🌤️ Hub Meteo PRO — modular core loaded','color:#4f46e5;font-weight:800');
  // PRO header live update
  function updateProHeader(){
    try{
      const c = (typeof currentCoords !== 'undefined' ? currentCoords : {lat:47.17,lon:26.36});
      const mode = weatherEngine.decideMode(c.lat, c.lon);
      const badge=document.getElementById('pro-mode-badge');
      if(badge) badge.textContent=mode.badge;
      const upd=document.getElementById('pro-updated');
      if(upd) upd.textContent='Actualizat '+new Date().toLocaleTimeString('ro-RO',{hour:'2-digit',minute:'2-digit'});
    }catch{}
  }
  updateProHeader();
  setInterval(updateProHeader, 60000);
  // expose for inline script
  window.HubUpdateProHeader=updateProHeader;
}

export { weatherEngine, fuseField, modelConsensusStats, confidenceBand, AnmProvider, alertEngine, healthRegistry, isRomania };
