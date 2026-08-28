/**
 * src/providers/anm/anm-alerts.js
 * Official ANM warnings parsing — strict provenance
 */
import { cleanAnmText } from './anm-parser.js';

export const RO_JUDET_COD = {
 AB:'Alba', AG:'Argeș', AR:'Arad', B:'București', BC:'Bacău', BH:'Bihor',
 BN:'Bistrița-Năsăud', BR:'Brăila', BT:'Botoșani', BV:'Brașov', BZ:'Buzău',
 CJ:'Cluj', CL:'Călărași', CS:'Caraș-Severin', CT:'Constanța', CV:'Covasna',
 DB:'Dâmbovița', DJ:'Dolj', GJ:'Gorj', GL:'Galați', GR:'Giurgiu',
 HD:'Hunedoara', HR:'Harghita', IF:'Ilfov', IL:'Ialomița', IS:'Iași',
 MH:'Mehedinți', MM:'Maramureș', MS:'Mureș', NT:'Neamț', OT:'Olt',
 PH:'Prahova', SB:'Sibiu', SJ:'Sălaj', SM:'Satu Mare', SV:'Suceava',
 TL:'Tulcea', TM:'Timiș', TR:'Teleorman', VL:'Vâlcea', VN:'Vrancea', VS:'Vaslui'
};
function _anmNorm(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function _anmLevelFromAttrs(at){
  const c=String((at&&at.culoare)!=null?at.culoare:'').trim();
  if(c==='3')return 3;
  if(c==='2')return 2;
  if(c==='1')return 1;
  const n=String((at&&at.numeCuloare)||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(n.includes('ros'))return 3;
  if(n.includes('portocaliu'))return 2;
  if(n.includes('galben'))return 1;
  return 0;
}
function _anmCleanText(html){
  return String(html||'')
    .replace(/<img[^>]*>/gi,' ')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&#x([0-9a-f]+);/gi,(m,h)=>{try{return String.fromCodePoint(parseInt(h,16));}catch{return ' ';}})
    .replace(/&#(\d+);/g,(m,d)=>{try{return String.fromCodePoint(parseInt(d,10));}catch{return ' ';}})
    .replace(/&acirc;/gi,'\u00E2').replace(/&icirc;/gi,'\u00EE')
    .replace(/&abreve;/gi,'\u0103')
    .replace(/&scedil;/gi,'\u015F').replace(/&scaron;/gi,'\u0161')
    .replace(/&tcedil;/gi,'\u0163')
    .replace(/&nbsp;/gi,' ').replace(/&ndash;/gi,'\u2013').replace(/&mdash;/gi,'\u2014')
    .replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
    .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/[ \t]+/g,' ').replace(/\n\s+/g,'\n').trim();
}
function _anmSplitSections(mesajHtml){
  const marked=String(mesajHtml||'')
    .replace(/<img[^>]*?galben\.gif[^>]*>/gi,'\u0001GALBEN\u0001')
    .replace(/<img[^>]*?portocaliu\.gif[^>]*>/gi,'\u0001PORTOCALIU\u0001')
    .replace(/<img[^>]*?ros[uu]\.gif[^>]*>/gi,'\u0001ROSU\u0001');
  const plain=_anmCleanText(marked);
  const parts=plain.split(/\u0001\s*(GALBEN|PORTOCALIU|ROSU)\s*\u0001/i);
  const sections=[];
  if(parts.length===1){ if(parts[0]&&parts[0].trim()) sections.push({colorKey:null, body:parts[0].trim()}); }
  else { for(let i=1;i<parts.length;i+=2){ let body=(parts[i+1]||'').trim(); body=body.replace(/^MESAJ\s*\d+\s*\/\s*\d+\s*/i,''); if(body) sections.push({colorKey:parts[i].toUpperCase(), body}); else sections.push({colorKey:parts[i].toUpperCase(), body:''}); } }
  return sections;
}
function _anmField(text,re){ const m=String(text||'').match(re); return m?m[1].replace(/^[\s:\-\u2013]+/,'').replace(/\s*[;,]\s*$/,'').trim():null; }

export function parseANMWarnings(data){
  if(!data||!data.avertizare) return [];
  const list=Array.isArray(data.avertizare)?data.avertizare:[data.avertizare];
  const out=[];
  for(const item of list){
    const at=item['@attributes']||{};
    const judeteRaw=item.judet||item.Judet||item.judete||[];
    const judeteArr=Array.isArray(judeteRaw)?judeteRaw:(judeteRaw?[judeteRaw]:[]);
    const judete=judeteArr.map(j=>{
      const ja=j['@attributes']||j||{};
      return { cod:String(ja.cod||'').toUpperCase(), culoare:parseInt(String(ja.culoare!=null?ja.culoare:'0'),10)||0 };
    }).filter(j=>j.cod&&RO_JUDET_COD[j.cod]);
    const blockLevel=_anmLevelFromAttrs(at);
    const tipName=cleanAnmText(at.numeTipMesaj||'Avertizare meteorologică');
    const validFrom=at.dataAparitiei?String(at.dataAparitiei).replace('T',' '):'';
    const validUntil=at.dataExpirarii?String(at.dataExpirarii).replace('T',' '):'';
    const sections=_anmSplitSections(at.mesaj||'');
    if(!sections.length) continue;
    const judetColors=[...new Set(judete.map(j=>j.culoare).filter(c=>c>=1))];
    const multiColor=judetColors.length>1;
    const srcLabel='ANM Meteoromania — avertizare oficială' + (validUntil? ' · valabil până '+validUntil:'') + (validFrom? ' · emisă '+validFrom:'');
    for(const sec of sections){
      const lvlNum=sec.colorKey==='GALBEN'?1:sec.colorKey==='PORTOCALIU'?2:sec.colorKey==='ROSU'?3:(blockLevel||1);
      const level=lvlNum===3?'red':lvlNum===2?'orange':'yellow';
      const icon=lvlNum===3?'🔴':lvlNum===2?'🟠':'🟡';
      const colorName=lvlNum===3?'Cod Roșu':lvlNum===2?'Cod Portocaliu':'Cod Galben';
      const title=colorName+' — '+tipName;
      const body=sec.body||'';
      const interval=_anmField(body,/Interval\s+de\s+valabilitate:\s*([^\n]+)/i) || (at.intervalul && !/^conform/i.test(String(at.intervalul).trim()) ? cleanAnmText(at.intervalul).replace(/[;\s]+$/,''):null);
      const fenomene=_anmField(body,/Fenomene\s+vizate:\s*([^\n]+)/i) || (at.fenomeneVizate && !/^conform/i.test(String(at.fenomeneVizate).trim()) ? cleanAnmText(at.fenomeneVizate).replace(/[;\s]+$/,''):null);
      const zona=_anmField(body,/Zon[aă](?:le)?\s+(?:afectat[ea]?|afectate?|vizate?):\s*([^\n]+)/i) || (at.zonaAfectata && !/^conform/i.test(String(at.zonaAfectata).trim()) ? cleanAnmText(at.zonaAfectata).replace(/[;\s]+$/,''):null);
      const msgBody=body.replace(/Interval\s+de\s+valabilitate:[^\n]*/ig,'').replace(/Fenomene\s+vizate:[^\n]*/ig,'').replace(/Zon[aă](?:le)?\s+(?:afectat[ea]?|afectate?|vizate?):[^\n]*/ig,'').replace(/\n{2,}/g,'\n').trim();
      let cods=[];
      if(judete.length){ cods=multiColor ? judete.filter(j=>j.culoare===lvlNum).map(j=>j.cod) : (judetColors.length?judete.filter(j=>j.culoare>=1).map(j=>j.cod):judete.map(j=>j.cod)); }
      const counties=cods.length?cods:[]; // fallback counties extraction omitted for brevity — use cods only
      const national=cods.length>=30 || /cea mai mare parte|majoritatea|toat[aă]\s+(ț|t)ării|peste tot/i.test(msgBody);
      const msgParts=[msgBody, interval? '⏱ Valabilitate: '+interval:'', fenomene? '⚠️ Fenomene: '+fenomene:'', zona? '📍 Zonă: '+zona:''].filter(Boolean);
      out.push({
        level, icon, title, msg:msgParts.join('\n'), fenomene, interval: interval || (validUntil? 'până la '+validUntil:null), zona,
        src:srcLabel, counties, countyNames:cods.map(c=>RO_JUDET_COD[c]), national, official:true, provenance:{ source:'ANM', sourceType:'official', confidence:100 }
      });
    }
  }
  return out;
}

export function countyLevels(warnings){
  const RANK={yellow:1,orange:2,red:3};
  const lv={};
  Object.keys(RO_JUDET_COD).forEach(cod=>lv[cod]={level:null,rank:0,warnings:[]});
  const warns=Array.isArray(warnings)?warnings:[];
  warns.forEach(w=>{
    const rank=RANK[w.level]; if(!rank) return;
    let targets=[];
    if(Array.isArray(w.counties)&&w.counties.length&&RO_JUDET_COD[String(w.counties[0]).toUpperCase()]) targets=w.counties.map(c=>String(c).toUpperCase());
    else if(w.national) targets=Object.keys(lv);
    targets.forEach(cod=>{ const e=lv[cod]; if(!e) return; e.warnings.push(w); if(rank>e.rank){e.rank=rank; e.level=w.level;}});
  });
  return lv;
}
