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
 * Lerndashboard - Service Worker (zuverlässiges Update-Verhalten)
 */

const VERSION = '1.1.84';                     // ← Bei jedem Deploy hochzählen!
const CACHE_NAME = `lerndashboard-v${VERSION.replace(/\./g, '')}`;

const REPO_PATH = (() => {
  const hostname = self.location.hostname;
  const pathname = self.location.pathname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168.')) {
    return self.location.origin + '/';
  }
  if (pathname.includes('/lerndashboard-test/')) return 'https://matthiasklossmpz.github.io/lerndashboard-test/';
  if (hostname === 'matthiasklossmpz.github.io') return 'https://matthiasklossmpz.github.io/lerndashboard/';
  const parts = pathname.split('/').filter(p => p);
  return self.location.origin + (parts.length > 0 ? '/' + parts[0] + '/' : '/');
})();

console.log('SW aktiv – REPO_PATH:', REPO_PATH, 'Version:', VERSION);

// Wichtige Dateien, die immer frisch geholt werden sollen
const urlsToCache = [
  './', 'index.html', 'manifest.json', 'service-worker.js',
  'src/main.js', 'src/state.js', 'src/resources.js', 'src/stats.js',
  'src/ui/filters.js', 'src/ui/modals.js', /* bei Bedarf weitere src/*.js */
  'new-resource.html', 'edit-resource.html',
  'icon-192.png', 'icon-512.png', 'schule_in_mv.png'
].map(url => new URL(url, REPO_PATH).href);

// ==================== INSTALL + ACTIVATE (unverändert, aber robust) ====================
self.addEventListener('install', event => {
  console.log(`SW Installiere Version ${VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW Cache wird befüllt...');
      return Promise.allSettled(urlsToCache.map(url =>
        fetch(url, { cache: 'reload' }).then(r => r.ok ? cache.put(url, r) : Promise.reject())
      ));
    }).then(() => {
      console.log(`SW Version ${VERSION} installiert`);
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  console.log(`SW Aktiviere Version ${VERSION}`);
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k.startsWith('lerndashboard-v') && k !== CACHE_NAME)
        .map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ==================== FETCH – JETZT NETWORK-FIRST FÜR KRITISCHE DATEIEN ====================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // PDF immer frisch
  if (url.pathname.includes('Bedienungsanleitung_LernDashboard.pdf')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Für HTML, JS und Service Worker → Network-First (wichtig für Updates!)
  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('service-worker.js')) {

    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .then(fresh => {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return fresh;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Alles andere: Cache-First mit Background-Update (Offline-Optimierung)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(fresh => {
        if (fresh && fresh.ok) {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return fresh;
      });
    })
  );
});