/**
 * src/i18n/catalog.js
 * JSON translation catalogs — future-proof architecture.
 * Currently wraps the legacy LANG object but exposes async loader for JSON catalogs.
 */
const SUPPORTED = ['ro','en','it','fr','de','es','hu'];
let current='ro';

export function normalizeLang(l){ return SUPPORTED.includes(l)?l:'ro'; }
export function getCurrentLang(){ return current; }
export function setCurrentLang(l){ current=normalizeLang(l); localStorage.setItem('hub_lang', current); document.documentElement.lang=current; }

export async function loadCatalog(lang){
  const l=normalizeLang(lang);
  try{
    const res=await fetch(`./src/i18n/locales/${l}.json`);
    if(res.ok){ const json=await res.json(); return json; }
  }catch{}
  return null;
}

export function t(key, params={}){
  // fallback to global LANG if available
  try{
    if(typeof window!=='undefined' && window.LANG && window.LANG[current] && window.LANG[current][key]!=null){
      let v=window.LANG[current][key];
      if(Array.isArray(v)) return v;
      if(typeof v==='string'){
        Object.entries(params).forEach(([k,val])=>{ v=v.replace(`{${k}}`, String(val)); });
        return v;
      }
      return v;
    }
  }catch{}
  return key;
}
export default { normalizeLang, getCurrentLang, setCurrentLang, loadCatalog, t };
