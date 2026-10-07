/**
 * Lerndashboard - Service Worker
 *
 * Copyright (c) 2025-2026 Matthias Kloss
 *
 * This project is licensed under the MIT License.
 * See the LICENSE file for details.
 */

const VERSION = '1.1.109';
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

const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'new-resource.html',
  'edit-resource.html',
  'src/main.js',
  'src/state.js',
  'src/resources.js',
  'src/stats.js',
  'src/levelMode.js',
  'src/styles/main.css',
  'src/utils/helpers.js',
  'src/export/index.js',
  'src/ui/filters.js',
  'src/ui/modals.js',
  'src/ui/import.js',
  'src/ui/version.js',
  'src/ui/newResource.js',
  'src/ui/editResource.js',
  'libs/jspdf.umd.min.js',
  'libs/jspdf.plugin.autotable.min.js',
  'libs/exceljs.min.js',
  'libs/FileSaver.min.js',
  'libs/jszip.min.js',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'docs/Niveaustufen_3.pdf',
  'src/config/profiles.js',
].map(url => new URL(url, REPO_PATH).href);

self.addEventListener('install', event => {
  console.log(`SW Installiere Version ${VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const results = await Promise.allSettled(urlsToCache.map(url =>
        fetch(url, { cache: 'reload' }).then(response => {
          if (!response.ok) throw new Error(`${response.status} ${url}`);
          return cache.put(url, response);
        })
      ));
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error('Precache fehlgeschlagen:', urlsToCache[index], result.reason);
        }
      });
    }).then(() => self.skipWaiting())
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

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  const fromCache = () => caches.match(event.request, { ignoreSearch: true });

  if (url.pathname.includes('/docs/') && url.pathname.endsWith('.pdf')) {
    event.respondWith(
      fetch(event.request).then(fresh => {
        if (fresh && fresh.ok) {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return fresh;
      }).catch(fromCache)
    );
    return;
  }

  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request).then(fresh => {
        if (fresh && fresh.ok) {
          const clone = fresh.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return fresh;
      }).catch(fromCache)
    );
    return;
  }

  event.respondWith(
  fromCache().then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(fresh => {
      if (fresh && fresh.ok) {
        const clone = fresh.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return fresh;
    }).catch(() => cached || Response.error());
  })
);
});