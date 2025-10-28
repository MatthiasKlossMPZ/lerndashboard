const CACHE_NAME = 'lerndashboard-v17'; // ← v16 → v17
  '/',
  'index.html',
  'new-resource.html',
  'manifest.json',
  'icon-192.png'
];

// INSTALL
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE – LÖSCHE ALTEN CACHE
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

// FETCH – IMMER AKTUELLE VERSION
self.addEventListener('fetch', event => {
  if (event.request.url.includes('index.html') || event.request.url.includes('new-resource.html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
