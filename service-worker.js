/**
 * Lerndashboard - Service Worker
 *
 * Copyright (c) 2025-2026 Matthias Kloss
 *
 * This project is licensed under the MIT License.
 * See the LICENSE file for details.
 */

// ================================================
// Service Worker für Lerndashboard (PWA)
// ================================================

/**
 * Optimierte Version für GitHub Pages + Subpfad
 */

const VERSION = '1.1.68';                     // ← Immer hochzählen!
const CACHE_NAME = `lerndashboard-v${VERSION.replace(/\./g, '')}`;

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

console.log('SW aktiv – REPO_PATH:', REPO_PATH, 'Version:', VERSION);

// Dateien zum Cachen
const urlsToCache = [
  './', 'index.html', 'manifest.json',
  'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png',
  'libs/jspdf.umd.min.js', 'libs/jspdf.plugin.autotable.min.js',
  'libs/jszip.min.js', 'libs/exceljs.min.js', 'libs/FileSaver.min.js',
  'new-resource.html', 'edit-resource.html'
].map(url => new URL(url, REPO_PATH).href);

// ==================== MESSAGE (vom Client) ====================
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('SW: SKIP_WAITING erhalten');
    self.skipWaiting()
      .then(() => self.clients.claim())
      .then(() => console.log('SW: skipWaiting + clients.claim() erfolgreich'));
  }
});

// ==================== INSTALL ====================
self.addEventListener('install', event => {
  console.log(`SW Installiere Version ${VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW Cache wird befüllt...');
        return Promise.allSettled(
          urlsToCache.map(url =>
            fetch(url, { cache: 'reload' })
              .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return cache.put(url, response);
              })
              .catch(err => console.warn('Cache-Fehler bei:', url, err))
          )
        );
      })
      .then(() => {
        console.log(`SW Version ${VERSION} installiert`);
        // skipWaiting hier nur, wenn kein Controller vorhanden
        if (!self.registration.waiting) self.skipWaiting();
      })
  );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', event => {
  console.log(`SW Aktiviere Version ${VERSION}`);
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
    .then(() => {
    console.log('🎉 SW vollständig aktiv und übernimmt alle Clients');
})
  );
});

// ==================== FETCH ====================
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Spezielle PDF-Behandlung (immer frisch holen)
  if (requestUrl.pathname.includes('Bedienungsanleitung_LernDashboard.pdf')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(fresh => {
          if (fresh && fresh.ok) {
            const cloned = fresh.clone();           // ← Korrektur
            caches.open(CACHE_NAME).then(c => c.put(event.request, cloned));
          }
          return fresh;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Interne Anfragen (Cache-First + Background Update)
  if (requestUrl.origin === new URL(REPO_PATH).origin) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Cache-Hit → zurückgeben + im Hintergrund aktualisieren
        if (cachedResponse) {
          if (navigator.onLine) {
            fetch(event.request)
              .then(freshResponse => {
                if (freshResponse && freshResponse.ok) {
                  const cloned = freshResponse.clone();
                  caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                }
              })
              .catch(() => {}); 
          }
          return cachedResponse;
        }

        // Cache-Miss → normal holen und cachen
        return fetch(event.request).then(freshResponse => {
          if (freshResponse && freshResponse.ok) {
            const cloned = freshResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return freshResponse;
        }).catch(err => {
          console.warn('Fetch fehlgeschlagen:', event.request.url, err);
          if (event.request.mode === 'navigate') {
            return caches.match('index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // Externe Ressourcen (z. B. Fonts, etc.)
  event.respondWith(
    fetch(event.request).catch(() => new Response('Offline', { status: 503 }))
  );
});