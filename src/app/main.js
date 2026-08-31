/**
 * src/app/main.js — Entry point for modular frontend (ESM)
 * Keeps backwards compat: re-exports legacy globals via window.Hub* where needed.
 */
import { weatherEngine } from '../weather/weather-engine.js';
import { fuseField, modelConsensusStats, weightedMedian, robustWeightedMean, detectOutliers } from '../fusion/fusion-engine.js';
import { confidenceBand } from '../fusion/confidence-engine.js';
import { AnmProvider } from '../providers/anm/anm-client.js';
import { alertEngine } from '../alerts/alert-engine.js';
import { healthRegistry } from '../core/health.js';
import { isRomania } from '../../config/regions.js';
import { modelSkillDB } from '../verification/model-skill.js';
import { verificationStore } from '../weather/verification.js';
import { dynamicWeights } from '../verification/dynamic-weighting.js';

// Expose for debugging and for legacy inline script interop
if(typeof window!=='undefined'){
  window.HubWeatherEngine = weatherEngine;
  window.HubFusion = { fuseField, modelConsensusStats, weightedMedian, robustWeightedMean, detectOutliers, dynamicWeights };
  window.HubConfidence = { confidenceBand };
  window.HubAnmProvider = AnmProvider;
  window.HubAlertEngine = alertEngine;
  window.HubHealth = healthRegistry;
  window.HubModelSkill = modelSkillDB;
  window.HubVerification = verificationStore;
  window.HubIsRomania = isRomania;
  // Legacy inline scripts execute in the classic-script scope, so expose the helper globally too.
  window.isRomania = isRomania;
  console.log('%c🌤️ Hub Meteo PRO — modular core loaded','color:#4f46e5;font-weight:800');
  function refreshEngineHealth(){
    try {
      const healthScore = {};
      for (const p of healthRegistry.snapshot()) {
        healthScore[p.id] = p.status === 'ONLINE' ? 100 : p.status === 'STALE' ? 65 : p.status === 'FALLBACK' ? 50 : p.status === 'UNKNOWN' ? 80 : 25;
      }
      weatherEngine.providerHealth = healthScore;
    } catch {}
  }
  refreshEngineHealth();
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
  setInterval(() => { refreshEngineHealth(); updateProHeader(); }, 60000);
  // expose for inline script
  window.HubUpdateProHeader=updateProHeader;
}

export { weatherEngine, fuseField, modelConsensusStats, confidenceBand, AnmProvider, alertEngine, healthRegistry, isRomania };
