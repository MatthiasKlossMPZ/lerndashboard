const VERSION = '1.0.11'; // ← Erhöhe 
const CACHE_NAME = `lerndashboard-v${VERSION.replace(/\./g, '')}`;

// DYNAMISCHER PFAD – FIX: IMMER TRAILING SLASH!
const REPO_PATH = (() => {
  const hostname = self.location.hostname;
  const pathname = self.location.pathname;

  // 1. Lokal (dev)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return self.location.origin + '/';
  }

  // 2. Test-Repo (explizit)
  if (pathname.includes('/lerndashboard-test/')) {
    return 'https://matthiasklossmpz.github.io/lerndashboard-test/';
  }

  // 3. Live-Repo: Wenn pathname = '/' oder leer → /lerndashboard/
  if (hostname === 'matthiasklossmpz.github.io' && (pathname === '/' || pathname === '')) {
    return 'https://matthiasklossmpz.github.io/lerndashboard/';
  }

  // 4. Allgemein: Erster Ordner nach / (z. B. /lerndashboard/)
  const parts = pathname.split('/').filter(p => p);
  let path = parts.length > 0 ? '/' + parts[0] + '/' : '/';

  // 5. Fallback
  return self.location.origin + path;
})();

console.log('SW geladen: REPO_PATH =', REPO_PATH); // Debug: Sollte IMMER mit '/' enden!

const urlsToCache = [
  './',  // ← Root
  'index.html',
  'new-resource.html',
  'edit-resource.html',
  'manifest.json',
  'icon-192.png',      // ← Jetzt korrekt: /lerndashboard-test/icon-192.png
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'libs/jspdf.umd.min.js',
  'libs/jspdf.plugin.autotable.min.js',
  'libs/jszip.min.js',
  'libs/exceljs.min.js',
  'libs/FileSaver.min.js'
].map(url => new URL(url, REPO_PATH).href);

console.log('Zu cachende URLs (erste 5):', urlsToCache.slice(0, 5)); // Debug: Prüfe Slashing!

// === skipWaiting ===
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('skipWaiting()');
    self.skipWaiting();
  }
});

// === INSTALL ===
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          urlsToCache.map(url =>
            fetch(url, { cache: 'reload' })
              .then(r => {
                if (r.ok) {
                  console.log('Gecacht:', url); // Debug: Erfolge sehen
                  return cache.put(url, r);
                } else {
                  console.warn('Fetch fehlgeschlagen (', r.status, '):', url);
                }
              })
              .catch(err => console.warn('Fetch failed for', url, err))
          )
        );
      })
      .then(() => {
        console.log(`SW v${VERSION} installiert – ${urlsToCache.length} URLs gecacht`);
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
  if (url.origin === self.location.origin && url.pathname.startsWith(new URL(REPO_PATH).pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone).catch(err => {
                console.warn('Cache put failed:', err);
              });
            });
          }
          return response;
        }).catch(err => {
          console.warn('Fetch error, fallback to index:', err);
          return caches.match(new URL('./index.html', REPO_PATH));
        });
      })
    );
  }
});
