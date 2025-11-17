// service-worker.js
const VERSION = '1.6.16';                     // Nur hier erhöhen bei Änderungen!
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

  // WICHTIG: Aktuelle Version der Popup-Fenster mit Cache-Buster
  // → immer aktuell + trotzdem offline verfügbar!
  'new-resource.html?v=' + VERSION,
  'edit-resource.html?v=' + VERSION
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

  // 1. Immer frisch vom Netz laden (nie cachen): dynamische Anfragen
  if (requestUrl.pathname.includes('/api/') || 
      requestUrl.search.includes('v=') && requestUrl.pathname.includes('new-resource.html') ||
      requestUrl.search.includes('v=') && requestUrl.pathname.includes('edit-resource.html')) {
    // Diese Dateien werden zwar mit ?v=VERSION aufgerufen → aber wir cachen sie trotzdem oben
    // → Hier nur fallback, falls Netz da ist
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 2. Alles aus unserem Repo: Cache-first, dann Netz
  if (requestUrl.origin === new URL(REPO_PATH).origin &&
      requestUrl.pathname.startsWith(new URL(REPO_PATH).pathname)) {

    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Immer auch im Hintergrund aktualisieren (stale-while-revalidate)
            fetch(event.request).then(fresh => {
              if (fresh.ok) {
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, fresh));
              }
            }).catch(() => {});
            return cachedResponse;
          }

          // Nicht im Cache → vom Netz holen und cachen
          return fetch(event.request)
            .then(response => {
              if (response && response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
              }
              return response;
            })
            .catch(() => {
              // Offline + nicht im Cache → fallback auf index.html
              return caches.match(new URL('index.html', REPO_PATH));
            });
        })
    );
    return;
  }

  // 3. Alles andere (z. B. Google Fonts, externe Bilder) → normal weiterleiten
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});