// service-worker.js
const VERSION = '1.1.40';                     // Nur hier erhöhen bei Änderungen!
const CACHE_NAME = `lerndashboard-v${VERSION.replace(/\./g, '')}`;

// WICHTIG: Dynamischer Pfad mit garantiertem trailing Slash
const REPO_PATH = (() => {
  const hostname = self.location.hostname;
  const pathname = self.location.pathname;

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168.')) {
    return self.location.origin + '/';
  }
  if (pathname.includes('/lerndashboard-test/')) {
    return 'https://matthiasklossmpz.github.io/lerndashboard-test/';
  }
  if (hostname === 'matthiasklossmpz.github.io') {
    return 'https://matthiasklossmpz.github.io/lerndashboard/';
  }

  const parts = pathname.split('/').filter(p => p);
  const base = parts.length > 0 ? '/' + parts[0] + '/' : '/';
  return self.location.origin + base;
})();

console.log('SW aktiv – REPO_PATH:', REPO_PATH);
console.log('SW Version:', VERSION, '→ Cache:', CACHE_NAME);

// Dateien, die garantiert offline verfügbar sein sollen
const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'libs/jspdf.umd.min.js',
  'libs/jspdf.plugin.autotable.min.js',
  'libs/jszip.min.js',
  'libs/exceljs.min.js',
  'libs/FileSaver.min.js',
  'new-resource.html',
  'edit-resource.html'
].map(url => new URL(url, REPO_PATH).href);

// === skipWaiting bei Nachricht vom Client ===
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('SW: skipWaiting ausgelöst');
    self.skipWaiting();
  }
});

// === INSTALL ===
self.addEventListener('install', event => {
  console.log('SW Installiere Version', VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW Cache öffnen und URLs cachen...');
        return Promise.allSettled(
          urlsToCache.map(url =>
            fetch(url, { cache: 'reload' })
              .then(response => {
                if (!response.ok) throw new Error(`Status ${response.status}`);
                return cache.put(url, response);
              })
              .catch(err => console.warn('SW Cache-Fehler bei:', url, err))
          )
        );
      })
      .then(() => {
        console.log(`SW Version ${VERSION} erfolgreich installiert und gecached`);
        self.skipWaiting(); // sofort aktivieren, wenn kein alter SW läuft
      })
  );
});

// === ACTIVATE – alte Caches löschen ===
self.addEventListener('activate', event => {
  console.log('SW Aktiviere Version', VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('lerndashboard-v') && key !== CACHE_NAME)
          .map(key => {
            console.log('SW Lösche alten Cache:', key);
            return caches.delete(key);
          })
      )
    )
    .then(() => {
      console.log('SW Alte Caches bereinigt');
      return self.clients.claim();
    })
  );
});

// === FETCH ===
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Nur echte API-Anfragen immer online versuchen (falls du später mal welche hast)
  if (requestUrl.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // Alles aus unserem Repo (inkl. new-resource.html und edit-resource.html mit oder ohne Query-String)
  if (requestUrl.origin === new URL(REPO_PATH).origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          // Stale-while-revalidate: im Hintergrund updaten, falls online
          if (navigator.onLine) {
            fetch(event.request).then(fresh => {
              if (fresh.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, fresh.clone()));
            }).catch(() => {});
          }
          return cached;
        }
        // Nicht im Cache → holen und cachen (oder fallback auf index.html bei Navigation)
        return fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // Alles andere (externe Ressourcen) einfach durchreichen
  event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
});