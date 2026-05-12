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

const CACHE_VERSION = '1.1.62';                    // ← Bei jedem Update hochzählen!
const CACHE_NAME = `lerndashboard-v${CACHE_VERSION}`;

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/edit-resource.html',
    '/new-resource.html',
    '/manifest.json',

    // Styles
    '/src/styles/main.css',

    // Kern-Module
    '/src/main.js',
    '/src/state.js',
    '/src/resources.js',
    '/src/stats.js',
    '/src/levelMode.js',

    // UI Module
    '/src/ui/filters.js',
    '/src/ui/modals.js',
    '/src/ui/newResource.js',
    '/src/ui/editResource.js',
    '/src/ui/import.js',
    '/src/ui/version.js',

    // Export Module
    '/src/export/index.js',

    // Utils
    '/src/utils/helpers.js',

    // Bibliotheken
    '/libs/jspdf.umd.min.js',
    '/libs/jspdf.plugin.autotable.min.js',
    '/libs/exceljs.min.js',
    '/libs/FileSaver.min.js',

    // Assets
    '/icon-192.png',
    '/icon-512.png',
    '/icon-maskable-192.png',
    '/icon-maskable-512.png',
    '/schule_in_mv.png'
];

// ==================== INSTALL – Precache aller wichtigen Dateien ====================
self.addEventListener('install', event => {
    console.log(`🚀 Service Worker v${CACHE_VERSION} wird installiert...`);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Precache wird gestartet...');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => {
                console.log('✅ Precache erfolgreich abgeschlossen');
                return self.skipWaiting();
            })
    );
});

// ==================== ACTIVATE – Alte Caches löschen + Clients übernehmen ====================
self.addEventListener('activate', event => {
    console.log(`✅ Service Worker v${CACHE_VERSION} aktiviert`);

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Lösche alten Cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('👥 Clients.claim() – neue Version übernimmt sofort');
            return self.clients.claim();
        })
    );
});

// ==================== FETCH – Intelligente Strategie ====================
self.addEventListener('fetch', event => {
    if (event.request.mode === 'navigate') {
        // HTML-Seiten: Network First mit Fallback auf index.html
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Alle anderen Ressourcen: Cache First
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            });
        })
    );
});

// ==================== Update-Benachrichtigung ====================
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('⏭️ SKIP_WAITING erhalten – aktiviere neuen SW');
        self.skipWaiting()
            .then(() => self.clients.claim())
            .then(() => console.log('✅ skipWaiting + clients.claim() erfolgreich'));
    }
});

console.log(`📦 Service Worker v${CACHE_VERSION} geladen und bereit`);