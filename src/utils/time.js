/**
 * src/utils/time.js
 */
export function to24h(str) {
  if (!str) return '--';
  const m = String(str).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return str;
  let h = parseInt(m[1],10);
  const min=m[2], ap=m[3].toUpperCase();
  if (ap==='AM' && h===12) h=0;
  if (ap==='PM' && h!==12) h+=12;
  return String(h).padStart(2,'0')+':'+min;
}

export function parseTimeToMinutes(str) {
  const m = String(str).match(/(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  let h=parseInt(m[1],10), min=parseInt(m[2],10);
  if (str.match(/PM/i) && h!==12) h+=12;
  if (str.match(/AM/i) && h===12) h=0;
  return h*60+min;
}

export function observationAgeMs(observationTimeStr) {
  if (!observationTimeStr) return null;
  // ANM format: "24-04-2026 ora 06:00" or ISO
  let d = null;
  const m = String(observationTimeStr).match(/(\d{2})-(\d{2})-(\d{4})\s+ora\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const [, dd, mm, yyyy, hh, mi] = m;
    d = new Date(`${yyyy}-${mm}-${dd}T${hh.padStart(2,'0')}:${mi}:00+02:00`);
  } else {
    d = new Date(observationTimeStr);
  }
  if (!d || isNaN(d.getTime())) return null;
  return Date.now() - d.getTime();
}

export function formatAge(ms) {
  if (ms==null || !Number.isFinite(ms)) return '—';
  const mins = Math.round(ms/60000);
  if (mins < 60) return `${mins} min`;
  const h=Math.floor(mins/60), m=mins%60;
  return `${h}h ${m}min`;
}

export function modelRunLabel(isoOrHour) {
  if (!isoOrHour) return null;
  const d = new Date(isoOrHour);
  if (!isNaN(d.getTime())) return `${String(d.getUTCHours()).padStart(2,'0')}Z`;
  return String(isoOrHour);
}
