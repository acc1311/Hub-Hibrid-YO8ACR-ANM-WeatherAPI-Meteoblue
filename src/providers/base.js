/**
 * src/providers/base.js
 * WeatherProvider interface — all providers must implement this
 */

export class WeatherProvider {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.status = 'UNKNOWN';
    this.lastLatencyMs = null;
    this.lastUpdate = null;
    this.failureCount = 0;
  }
  // Must be overridden:
  async fetchObservation(lat, lon) { throw new Error(`${this.id} fetchObservation not implemented`); }
  async fetchForecast(lat, lon, days=5) { throw new Error(`${this.id} fetchForecast not implemented`); }
  async fetchHourly(lat, lon) { throw new Error(`${this.id} fetchHourly not implemented`); }
  async fetchWarnings() { return []; }
  async search(query) { return []; }

  // Optional:
  async healthCheck() {
    const t0 = Date.now();
    try {
      await this.fetchObservation(47.17, 26.36);
      this.status = 'ONLINE';
      this.lastLatencyMs = Date.now()-t0;
      this.lastUpdate = new Date().toISOString();
      this.failureCount = 0;
      return { status:'ONLINE', latency:this.lastLatencyMs };
    } catch(e) {
      this.status = 'UNAVAILABLE';
      this.failureCount++;
      this.lastLatencyMs = Date.now()-t0;
      return { status:'UNAVAILABLE', error:String(e.message||e), latency:this.lastLatencyMs };
    }
  }

  markUnavailable(err) {
    this.status='UNAVAILABLE';
    this.failureCount++;
  }
  markOnline() {
    this.status='ONLINE';
    this.failureCount=0;
    this.lastUpdate=new Date().toISOString();
  }
  isAvailable() { return this.status!=='UNAVAILABLE'; }
}
