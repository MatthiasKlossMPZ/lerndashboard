// service-worker.js
const VERSION = '1.5.3.81';  // Erhöhe bei jedem Update!
const CACHE_NAME = `lerndashboard-v${VERSION.replace(/\./g, '')}`;
const REPO_PATH = 'https://matthiasklossmpz.github.io/lerndashboard-test/';

const urlsToCache = [
  './',
  'index.html',
  'new-resource.html',
  'edit-resource.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'libs/jspdf.umd.min.js',
  'libs/jspdf.plugin.autotable.min.js',
  'libs/jszip.min.js',
  'libs/exceljs.min.js',
  'libs/FileSaver.min.js'
];

// === skipWaiting ===
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('skipWaiting()');
    self.skipWaiting();
  }
});

// === INSTALL === (DEIN BLOCK IST PERFEKT!)
// @ts-nocheck  
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Hier: return erforderlich!
        return Promise.allSettled(
          urlsToCache.map(url =>
            fetch(url, { cache: 'reload' })
              .then(r => {
                if (r.ok) return cache.put(url, r);
              })
              .catch(() => {})
          )
        );
      })
      .then(() => {
        console.log(`SW v${VERSION} installiert`);
        // KEIN skipWaiting() hier → Benutzer muss klicken!
      })
  );
});

// === ACTIVATE ===
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('lerndashboard-v') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
    .then(() => self.clients.claim())
  );
});

// === FETCH ===
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Nur eigene Ressourcen
  if (url.origin === location.origin || url.href.includes('/lerndashboard-test/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
        return cached; // CACHE ZUERST!
        }

        return fetch(event.request).then(response => {
          // Nur cachebare Antworten
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone(); // ZUERST KLONEN
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone).catch(err => {
                console.warn('Cache put failed:', err);
              });
            });
          }
          return response; // Dann zurückgeben
        }).catch(() => {
          return caches.match('index.html');
        });
      })
    );
  }
});