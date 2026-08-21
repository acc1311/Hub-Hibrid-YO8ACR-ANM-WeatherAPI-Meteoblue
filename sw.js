/* ============================================================
   Hub Meteo PRO — Service Worker (PWA)
   Strategie: network-first pentru pagină și API, cache-first
   pentru iconițe și resurse statice.
   ============================================================ */
const CACHE_NAME = 'hub-meteo-v2';
const WORKER_BASE = 'https://hubmeteoacr.brm-laser-veronese.workers.dev';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API-uri externe (worker Cloudflare, Open-Meteo, hărți) — network-first cu fallback cache
  if (url.hostname !== location.hostname && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    event.respondWith(
      fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Resurse locale — network-first, fallback cache
  event.respondWith(
    fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});

/* ============================================================
   WEB PUSH — alerte meteo ANM (funcționează și cu app închisă)
   Push-ul e „tickle" (fără payload): SW-ul își ia datele proaspete
   direct de la worker, ca notificarea să conțină mereu realitatea.
   ============================================================ */
const LEVEL_ICON = { red: '🔴', orange: '🟠', yellow: '🟡' };

async function showAlertNotifications() {
  let warnings = [];
  try {
    const res = await fetch(WORKER_BASE + '/anm-warnings', { cache: 'no-store' });
    const data = await res.json();
    const list = data && data.avertizare ? (Array.isArray(data.avertizare) ? data.avertizare : [data.avertizare]) : [];
    warnings = list.map((item) => {
      const at = (item && item['@attributes']) || {};
      const culoare = String(at.culoare || '');
      return {
        level: culoare === '3' ? 'red' : culoare === '2' ? 'orange' : 'yellow',
        title: (culoare === '3' ? 'Cod Roșu — ' : culoare === '2' ? 'Cod Portocaliu — ' : 'Cod Galben — ') + (at.numeTipMesaj || 'Avertizare meteorologică'),
        msg: String(at.mesaj || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220),
        exp: at.dataExpirarii || ''
      };
    });
  } catch (e) {
    await self.registration.showNotification('Hub Meteo PRO', {
      body: 'Au apărut modificări la avertizările meteo. Deschide aplicația pentru detalii.',
      icon: './icons/icon-192.png', tag: 'hub-meteo-tickle'
    });
    return;
  }
  // doar avertizări severe produc notificare separată; galbenul e rezumat
  const severe = warnings.filter((w) => w.level === 'red' || w.level === 'orange');
  if (severe.length) {
    for (const w of severe) {
      await self.registration.showNotification('Hub Meteo PRO · ' + LEVEL_ICON[w.level] + ' ' + w.title, {
        body: w.msg + (w.exp ? '\nValabil până: ' + w.exp.replace('T', ' ') : ''),
        icon: './icons/icon-192.png',
        tag: 'hub-anm-' + w.title,
        requireInteraction: w.level === 'red'
      });
    }
  } else if (warnings.length) {
    await self.registration.showNotification('Hub Meteo PRO · 🟡 Avertizări ANM active', {
      body: warnings.length + ' avertizare/avertizări cod galben în vigoare. Apasă pentru detalii.',
      icon: './icons/icon-192.png', tag: 'hub-anm-yellow'
    });
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(showAlertNotifications());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('./');
    })
  );
});