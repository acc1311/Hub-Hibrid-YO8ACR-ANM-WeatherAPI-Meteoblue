/**
 * src/storage/favorites.js
 */
export class FavoritesStore {
  constructor(key='hub_favorites_v2', max=8){
    this.key=key; this.max=max;
  }
  load(){
    try{ const v=JSON.parse(localStorage.getItem(this.key)||'null'); return Array.isArray(v)?v:[]; }catch{return [];}
  }
  save(list){ try{ localStorage.setItem(this.key, JSON.stringify(list.slice(0,this.max))); }catch{} }
  add(item){
    const list=this.load();
    if(list.some(f=> Math.abs(f.lat-item.lat)<0.01 && Math.abs(f.lon-item.lon)<0.01 )) return list;
    list.unshift(item);
    this.save(list.slice(0,this.max));
    return this.load();
  }
  remove(id){ const list=this.load().filter(f=>f.id!==id); this.save(list); return list; }
  has(lat,lon){ return this.load().some(f=> Math.abs(f.lat-lat)<0.01 && Math.abs(f.lon-lon)<0.01); }
}
export const favoritesStore = new FavoritesStore();
export default favoritesStore;
