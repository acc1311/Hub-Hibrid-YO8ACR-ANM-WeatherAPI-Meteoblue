/* ============================================================
   Hub Meteo PRO – Service Worker v5 (YO8ACR PRO)
   Strategie:
   - HTML: network-first, fallback cache, then offline shell
   - API (worker + open-meteo): stale-while-revalidate (1-2 min)
   - Static: cache-first
   ============================================================ */
const CACHE_NAME = 'hub-meteo-v5';
const PRECACHE = [
  './',
  './index.html',
  './js/app-logic.js',
  './src/app/main.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];
const WORKER_BASE = 'https://hubmeteoacr.brm-laser-veronese.workers.dev';

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event)=>{
  const url=new URL(event.request.url);
  const isApi = url.hostname.includes('open-meteo.com') || url.hostname.includes('open-meteo') || url.hostname.includes('air-quality-api') || url.hostname.includes('archive-api') || url.hostname.includes('geocoding-api') || url.hostname.includes('rainviewer.com') || url.hostname.includes('workers.dev') || url.pathname.startsWith('/anm') || url.pathname.startsWith('/wapi') || url.pathname.startsWith('/mb');
  // API: stale-while-revalidate
  if(isApi || (url.hostname!==location.hostname && url.hostname!=='localhost' && url.hostname!=='127.0.0.1')){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const cached=await cache.match(event.request);
      const fetchPromise=fetch(event.request).then(res=>{
        if(res.ok) cache.put(event.request, res.clone()).catch(()=>{});
        return res;
      }).catch(()=>null);
      if(cached) {
        // update in background
        fetchPromise.catch(()=>{});
        return cached;
      }
      const res=await fetchPromise;
      if(res) return res;
      // fallback to shell for navigation
      return cached || caches.match('./index.html');
    })());
    return;
  }
  // Local navigations: network-first
  event.respondWith(
    fetch(event.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(event.request, copy)).catch(()=>{});
      return res;
    }).catch(()=> caches.match(event.request).then(cached=> cached || caches.match('./index.html')))
  );
});

/* ============================================================
   WEB PUSH – alerte meteo ANM
   ============================================================ */
const LEVEL_ICON={ red:'🔴', orange:'🟠', yellow:'🟡' };
async function showAlertNotifications(){
  let warnings=[];
  try{
    const res=await fetch(WORKER_BASE + '/anm-warnings', { cache:'no-store' });
    const data=await res.json();
    const list=data&&data.avertizare ? (Array.isArray(data.avertizare)?data.avertizare:[data.avertizare]) : [];
    warnings=list.map(item=>{
      const at=(item&&item['@attributes'])||{};
      const culoare=String(at.culoare||'');
      return {
        level:culoare==='3'?'red':culoare==='2'?'orange':'yellow',
        title:(culoare==='3'?'Cod Roșu — ':culoare==='2'?'Cod Portocaliu — ':'Cod Galben — ')+(at.numeTipMesaj||'Avertizare meteorologică'),
        msg:String(at.mesaj||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,220),
        exp:at.dataExpirarii||''
      };
    });
  }catch{
    await self.registration.showNotification('Hub Meteo PRO',{
      body:'Au apărut modificări la avertizările meteo. Deschide aplicația pentru detalii.',
      icon:'./icons/icon-192.png', tag:'hub-meteo-tickle'
    });
    return;
  }
  const severe=warnings.filter(w=>w.level==='red'||w.level==='orange');
  if(severe.length){
    for(const w of severe){
      await self.registration.showNotification('Hub Meteo PRO — '+LEVEL_ICON[w.level]+' '+w.title,{
        body:w.msg+(w.exp?'\nValabil până: '+w.exp.replace('T',' '):''),
        icon:'./icons/icon-192.png', tag:'hub-anm-'+w.title, requireInteraction:w.level==='red'
      });
    }
  } else if(warnings.length){
    await self.registration.showNotification('Hub Meteo PRO — ⚠️ Avertizări ANM active',{
      body:warnings.length+' avertizare/avertizări cod galben în vigoare. Apasă pentru detalii.',
      icon:'./icons/icon-192.png', tag:'hub-anm-yellow'
    });
  }
}
self.addEventListener('push', (event)=>{ event.waitUntil(showAlertNotifications()); });
self.addEventListener('notificationclick', (event)=>{
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(clientList=>{
      for(const client of clientList){ if('focus' in client) return client.focus(); }
      return self.clients.openWindow('./');
    })
  );
});
self.addEventListener('message', (event)=>{
  if(event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});
