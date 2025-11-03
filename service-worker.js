const CACHE_NAME = 'lerndashboard-v44'; // ⬅️ Erhöhe diese Zahl bei jedem Update!

const urlsToCache = [
  '/',
  'index.html',
  'new-resource.html',
  'edit-resource.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// INSTALL: Alles in den Cache legen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Neue Version sofort aktivieren
  );
});

// ACTIVATE: Alte Caches löschen & sofort übernehmen
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Alte Cache-Versionen entfernen
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
                  .map(name => caches.delete(name))
      );

      // Alle Clients über das Update informieren
      const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of clientsList) {
        client.postMessage({ type: 'UPDATED' });
      }

      await self.clients.claim();
    })()
  );
});

// FETCH: Cache-first, Fallback zu Netzwerk
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// MESSAGE: Manuelle skipWaiting-Anforderung vom Client
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
