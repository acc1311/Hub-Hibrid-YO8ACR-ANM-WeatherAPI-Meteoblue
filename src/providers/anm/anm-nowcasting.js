/** Normalize official ANM nowcasting bridge responses; preserves all messages and provenance. */
const levelRank={yellow:1,orange:2,red:3};
export function normalizeAnmNowcasting(payload){
  const items=Array.isArray(payload?.items)?payload.items:[];
  return items.map((item,index)=>({
    id:item.id||`anm-nowcast-${index}-${item.issuedAt||payload?.fetchedAt||''}`,
    level:['yellow','orange','red'].includes(item.level)?item.level:'yellow', title:item.title||'ANM Nowcasting',
    issuedAt:item.issuedAt||null, validFrom:item.validFrom||null, validUntil:item.validUntil||null,
    area:item.area||null, phenomena:item.phenomena||null, official:item.official!==false,
    source:'ANM', sourceType:'official-nowcasting', fetchedAt:payload?.fetchedAt||null,
  })).sort((a,b)=>levelRank[b.level]-levelRank[a.level]);
}
export function activeAnmNowcasting(items, nowMs=Date.now()){
  return (items||[]).filter(x=>{
    const until=Date.parse(x.validUntil||'');
    return !Number.isFinite(until) || until>=nowMs-5*60*1000;
  });
}
