/**
 * src/core/observability.js
 * Provider metrics — latency, failure rate, cache hit, fallback count, schema failure, forecast disagreement
 */
export class Observability {
  constructor(){
    this.metrics={ provider:{}, cache:{ hits:0, misses:0 }, fusion:{ disagreement:0 } };
  }
  recordLatency(provider, ms){ const m=this.metrics.provider[provider]||(this.metrics.provider[provider]={}); m.latencyMs=ms; m.lastAt=Date.now(); }
  recordFailure(provider, err){ const m=this.metrics.provider[provider]||(this.metrics.provider[provider]={}); m.failures=(m.failures||0)+1; m.lastError=String(err); }
  recordCacheHit(){ this.metrics.cache.hits++; }
  recordCacheMiss(){ this.metrics.cache.misses++; }
  recordFallback(provider){ const m=this.metrics.provider[provider]||(this.metrics.provider[provider]={}); m.fallbacks=(m.fallbacks||0)+1; }
  recordDisagreement(spread){ this.metrics.fusion.disagreement=spread; }
  dump(){ return JSON.parse(JSON.stringify(this.metrics)); }
}
export const observability = new Observability();
export default observability;
