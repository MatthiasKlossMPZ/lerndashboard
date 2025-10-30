const CACHE_NAME = 'lerndashboard-v17'; // ← neue Version! 30.9.
const urlsToCache = [
  '/',
  'index.html',
  'new-resource.html',
  'manifest.json',
  'icon-192.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// INSTALL: Cache alles
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: Alte Caches löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME)
              .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH: Immer aus Cache, wenn offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
