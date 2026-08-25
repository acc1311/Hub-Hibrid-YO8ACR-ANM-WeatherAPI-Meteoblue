/* ================================================================
   Hub Meteo PRO — Pure application logic (no DOM dependencies)
   Extracted from index.html so it can be linted & unit-tested.
   Loaded as a classic script BEFORE the inline app script; every
   function is exported globally and via CommonJS for tests.
   ================================================================ */
(function (global) {
  'use strict';

  /* ── XSS protection ─────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── ANM text helpers ───────────────────────────────────────── */
  function cleanAnmText(str) {
    if (!str) return '';
    return String(str)
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ').trim();
  }

  function anmVal(field) {
    if (!field) return null;
    const clean = String(field).trim().toLowerCase();
    return (clean === 'indisponibil' || clean === '' || clean === '-') ? null : field;
  }

  /* ── Time ───────────────────────────────────────────────────── */
  function to24h(str) {
    if (!str) return '--';
    const m = String(str).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return str;
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ap = m[3].toUpperCase();
    if (ap === 'AM' && h === 12) h = 0;
    if (ap === 'PM' && h !== 12) h += 12;
    return String(h).padStart(2, '0') + ':' + min;
  }

  /* ── Geometry ───────────────────────────────────────────────── */
  function degToCompass(deg) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSV', 'SV', 'VSV', 'V', 'VNV', 'NV', 'NNV'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  /* ── Thermodynamics ─────────────────────────────────────────── */
  function calcDewPoint(tempC, humidity) {
    tempC = Number(tempC);
    humidity = Number(humidity);
    if (!Number.isFinite(tempC) || !Number.isFinite(humidity) || humidity <= 0) return null;
    humidity = Math.min(100, Math.max(1, humidity));
    const a = 17.27, b = 237.7;
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
    const dew = (b * alpha) / (a - alpha);
    return Number.isFinite(dew) ? parseFloat(dew.toFixed(1)) : null;
  }

  function calcApparentTemp(tempC, windKph, humidity) {
    tempC = Number(tempC);
    windKph = Number(windKph);
    humidity = Number(humidity);
    if (!Number.isFinite(tempC)) return null;
    if (Number.isFinite(windKph) && tempC <= 10 && windKph > 4.8) {
      const wc = 13.12 + 0.6215 * tempC - 11.37 * Math.pow(windKph, 0.16) + 0.3965 * tempC * Math.pow(windKph, 0.16);
      return Number.isFinite(wc) ? parseFloat(wc.toFixed(1)) : tempC;
    }
    if (Number.isFinite(humidity) && tempC >= 27 && humidity >= 40) {
      const tF = tempC * 9 / 5 + 32;
      const hiF = -42.379 + 2.04901523 * tF + 10.14333127 * humidity - 0.22475541 * tF * humidity
        - 0.00683783 * tF * tF - 0.05481717 * humidity * humidity
        + 0.00122874 * tF * tF * humidity + 0.00085282 * tF * humidity * humidity
        - 0.00000199 * tF * tF * humidity * humidity;
      return Number.isFinite(hiF) ? parseFloat(((hiF - 32) * 5 / 9).toFixed(1)) : tempC;
    }
    return parseFloat(tempC.toFixed(1));
  }

  /* Indice Căldură (Heat Index / ITU) — Rothfusz, °C */
  function calcHeatIndex(tempC, relHumidity) {
    if (tempC == null || relHumidity == null) return null;
    tempC = Number(tempC);
    relHumidity = Number(relHumidity);
    if (!Number.isFinite(tempC) || !Number.isFinite(relHumidity)) return null;
    if (tempC < 27 || relHumidity < 40) return parseFloat(tempC.toFixed(1));
    const tF = tempC * 9 / 5 + 32;
    const hiF = -42.379 + 2.04901523 * tF + 10.14333127 * relHumidity
      - 0.22475541 * tF * relHumidity
      - 0.00683783 * tF * tF - 0.05481717 * relHumidity * relHumidity
      + 0.00122874 * tF * tF * relHumidity + 0.00085282 * tF * relHumidity * relHumidity
      - 0.00000199 * tF * tF * relHumidity * relHumidity;
    if (!Number.isFinite(hiF)) return parseFloat(tempC.toFixed(1));
    return parseFloat(((hiF - 32) * 5 / 9).toFixed(1));
  }

  /* ── ANM parsers ────────────────────────────────────────────── */
  /* Format ANM vânt: "1.8 m/s, directia : VSV" */
  function parseAnmWind(vantRaw) {
    if (!vantRaw || vantRaw === 'indisponibil') {
      return { speedMs: null, speedKmh: null, direction: null };
    }
    const s = String(vantRaw);
    const speedMatch = s.match(/([\d.]+)\s*m\/s/i);
    const dirMatch = s.match(/(?:directia\s*[:\s]+)([A-ZĂÎȘȚ]+)/i)
      || s.match(/:\s*([A-ZĂÎȘȚ]+)\s*$/i)
      || s.match(/\b([A-Z]{2,4})\b/);
    const speedMs = speedMatch ? parseFloat(speedMatch[1]) : null;
    const direction = dirMatch ? dirMatch[1].toUpperCase() : null;
    return {
      speedMs: speedMs,
      speedKmh: speedMs !== null ? parseFloat((speedMs * 3.6).toFixed(1)) : null,
      direction: direction
    };
  }

  /* Format ANM presiune: "970.5 mb, in scadere" */
  function parseAnmPressure(presiunetext) {
    if (!presiunetext || presiunetext === 'indisponibil') {
      return { value: null, unit: null, trend: null, display: 'N/A' };
    }
    const txt0 = String(presiunetext);
    const numMatch = txt0.match(/([\d.]+)/);
    const value = numMatch ? parseFloat(numMatch[1]) : null;
    const unitMatch = txt0.match(/(mb|hPa)/i);
    const unit = unitMatch ? unitMatch[1].toLowerCase() : 'mb';
    let trend = '';
    const norm = txt0.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('scadere')) trend = '\u2193';
    else if (norm.includes('crestere')) trend = '\u2191';
    else if (norm.includes('stabil') || norm.includes('stationara') || norm.includes('variabila')) trend = '\u2192';
    const mmHg = value !== null ? (value * 0.75006).toFixed(0) : null;
    const display = value !== null
      ? `${value} ${unit} (${mmHg} mmHg) ${trend}`
      : cleanAnmText(presiunetext);
    return { value, unit, trend, mmHg, display };
  }

  /* ── Numeric series helpers (model fusion) ──────────────────── */
  function _isNum(v) {
    return typeof v === 'number' && Number.isFinite(v);
  }
  function _toFiniteNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function _seriesValue(arr, idx) {
    return Array.isArray(arr) && idx >= 0 && arr[idx] != null ? arr[idx] : null;
  }
  function _buildTimeMap(arr) {
    const out = {};
    (arr || []).forEach((t, i) => { out[t] = i; });
    return out;
  }
  function _avgMembers(container, base) {
    if (!container) return null;
    if (Array.isArray(container[base]) && container[base].some(v => v != null)) return container[base];
    const keys = Object.keys(container).filter(k => k.startsWith(base + '_member'));
    if (!keys.length) return null;
    const len = container[keys[0]].length;
    const avg = [];
    for (let i = 0; i < len; i++) {
      let sum = 0, count = 0;
      keys.forEach(k => {
        const v = container[k] && container[k][i];
        if (v != null && !Number.isNaN(v)) { sum += v; count++; }
      });
      avg.push(count ? parseFloat((sum / count).toFixed(2)) : null);
    }
    return avg;
  }

  /* Probabilitatea precipitațiilor derivată din spread-ul ensemble:
     % membri cu precipitații ≥ prag (default 0.1 mm/h). */
  function memberPrecipProbability(container, base, threshold) {
    threshold = threshold == null ? 0.1 : threshold;
    if (!container) return null;
    const keys = Object.keys(container).filter(k => k.startsWith(base + '_member'));
    if (!keys.length) return null;
    const len = container[keys[0]].length;
    const prob = [];
    for (let i = 0; i < len; i++) {
      let wet = 0, total = 0;
      keys.forEach(k => {
        const v = container[k] && container[k][i];
        if (v != null && !Number.isNaN(v)) { total++; if (v >= threshold) wet++; }
      });
      prob.push(total ? Math.round((wet / total) * 100) : null);
    }
    return prob.some(p => p != null) ? prob : null;
  }

  /* Probabilitate max precipitații pentru restul zilei curente */
  function _maxPrecipToday(hourlyObj, startIdx, todayStr) {
    if (!hourlyObj || !hourlyObj.precipitation_probability || !hourlyObj.time) return null;
    const arr = hourlyObj.precipitation_probability;
    const times = hourlyObj.time;
    let max = null;
    const si = startIdx >= 0 ? startIdx : 0;
    for (let i = si; i < times.length; i++) {
      const ts = String(times[i] || '');
      if (todayStr && !ts.startsWith(todayStr)) break;
      const v = arr[i];
      if (v != null && (max === null || v > max)) max = v;
    }
    return max;
  }

  /* Probabilitate zilnică afișată: % model sau estimată din cantitate */
  function _dailyPrecipProbability(prob, mm) {
    const p = _toFiniteNumber(prob);
    const amount = _toFiniteNumber(mm);
    if (p !== null && p > 0) return Math.round(Math.min(100, Math.max(0, p)));
    if (amount === null || amount <= 0) return 0;
    if (amount >= 20) return 95;
    if (amount >= 10) return 85;
    if (amount >= 5) return 70;
    if (amount >= 1) return 55;
    return 35;
  }

  /* ── Consens modele ─────────────────────────────────────────── */
  function computeConsensus(values) {
    const vals = (values || []).filter(v => typeof v === 'number' && Number.isFinite(v));
    const n = vals.length;
    if (!n) return { n: 0, tot: (values || []).length, spread: null };
    const spread = n > 1 ? parseFloat((Math.max.apply(null, vals) - Math.min.apply(null, vals)).toFixed(1)) : 0;
    return { n, tot: (values || []).length, spread };
  }

  /* ── SAFE FETCH — timeout + retry + AbortController ─────────── */
  async function safeFetch(url, options, opts) {
    options = options || {};
    opts = opts || {};
    const timeout = opts.timeout || 12000;
    const retries = opts.retries == null ? 1 : opts.retries;
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      try {
        const res = await fetch(url, Object.assign({}, options, { signal: ctrl.signal }));
        clearTimeout(timer);
        if (!res.ok && attempt < retries && res.status >= 500) {
          await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        return res;
      } catch (e) {
        clearTimeout(timer);
        lastErr = e;
        if (attempt < retries) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    throw lastErr || new Error('safeFetch failed');
  }

  /* ── Validare coordonate "lat,lon" ──────────────────────────── */
  function parseCoordinateInput(str) {
    const m = String(str || '').trim().match(/^(-?\d{1,2}(?:\.\d{1,6})?)\s*,\s*(-?\d{1,3}(?:\.\d{1,6})?)$/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { lat, lon };
  }

  /* ── Unități vânt ───────────────────────────────────────────── */
  const WIND_UNITS = { kmh: 1, ms: 1 / 3.6, mph: 1 / 1.609344, kn: 1 / 1.852 };
  function convertWindFromKmh(kmh, unit) {
    const f = WIND_UNITS[unit] || 1;
    return Number(kmh) * f;
  }
  function windUnitLabel(unit) {
    return ({ kmh: 'km/h', ms: 'm/s', mph: 'mph', kn: 'kn' })[unit] || 'km/h';
  }
  function formatWind(kmh, unit, digits) {
    if (kmh == null || isNaN(Number(kmh))) return '--';
    const d = digits == null ? 1 : digits;
    return convertWindFromKmh(Number(kmh), unit).toFixed(d) + ' ' + windUnitLabel(unit);
  }

  /* ── Beaufort ───────────────────────────────────────────────── */
  const BEAUFORT = [
    { max: 1,   ro: 'Calm',            en: 'Calm' },
    { max: 6,   ro: 'Adiere',          en: 'Light air' },
    { max: 12,  ro: 'Briza usoara',    en: 'Light breeze' },
    { max: 20,  ro: 'Briza moderata',  en: 'Gentle breeze' },
    { max: 29,  ro: 'Vant moderat',    en: 'Moderate breeze' },
    { max: 39,  ro: 'Vant proaspat',   en: 'Fresh breeze' },
    { max: 50,  ro: 'Vant tare',       en: 'Strong breeze' },
    { max: 62,  ro: 'Aproape furtuna', en: 'Near gale' },
    { max: 75,  ro: 'Furtuna',         en: 'Gale' },
    { max: 89,  ro: 'Furtuna severa',  en: 'Severe gale' },
    { max: 103, ro: 'Viscol',          en: 'Storm' },
    { max: 117, ro: 'Viscol violent',  en: 'Violent storm' },
    { max: 999, ro: 'Uragan',          en: 'Hurricane' }
  ];
  function beaufortScale(kmh, lang) {
    const idx = BEAUFORT.findIndex(x => kmh <= x.max);
    const bf = idx >= 0 ? idx : 12;
    const row = BEAUFORT[bf];
    return `Bf ${bf} — ${row[lang] || row.ro}`;
  }

  /* ── Global exports (browser globals + CommonJS) ────────────── */
  const api = {
    escapeHtml, cleanAnmText, anmVal, to24h, degToCompass,
    calcDewPoint, calcApparentTemp, parseAnmWind, parseAnmPressure,
    _isNum, _toFiniteNumber, _seriesValue, _buildTimeMap, _avgMembers,
    memberPrecipProbability, _dailyPrecipProbability, _maxPrecipToday, computeConsensus,
    safeFetch, parseCoordinateInput,
    convertWindFromKmh, windUnitLabel, formatWind, WIND_UNITS, beaufortScale, BEAUFORT, calcHeatIndex
  };
  Object.keys(api).forEach(k => { global[k] = api[k]; });
  global.HubLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
