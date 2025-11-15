const VERSION = '1.0.6';
const CACHE_NAME = `lerndashboard-v${VERSION.replace(/\./g, '')}`;

const REPO_PATH = (() => {
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    return self.location.origin + '/';
  }
  if (self.location.pathname.includes('/lerndashboard-test/')) {
    return 'https://matthiasklossmpz.github.io/lerndashboard-test/';
  }
  const parts = self.location.pathname.split('/').filter(Boolean);
  return parts.length > 0 
    ? self.location.origin + '/' + parts[0] + '/' 
    : self.location.origin + '/';
})();

const urlsToCache = [
  './', 'index.html', 'new-resource.html', 'edit-resource.html',
  'manifest.json', 'icon-192.png', 'icon-512.png',
  'icon-maskable-192.png', 'icon-maskable-512.png',
  'libs/jspdf.umd.min.js', 'libs/jspdf.plugin.autotable.min.js',
  'libs/jszip.min.js', 'libs/exceljs.min.js', 'libs/FileSaver.min.js'
].map(url => new URL(url, REPO_PATH).href);

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
                if (r.ok) return cache.put(url, r);
              })
              .catch(() => {})
          )
        );
      })
      .then(() => {
        console.log(`SW v${VERSION} installiert`);
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
  if (url.href.startsWith(REPO_PATH)) {
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
        }).catch(() => {
          return caches.match(new URL('./index.html', REPO_PATH));
        });
      })
    );
  }
});