// Service Worker for Electrical Survey App PWA
const CACHE_PREFIX = 'electrical-survey';
const CACHE_VERSION = 'v7.8';
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/konva@9/konva.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

function isAppShellRequest(request) {
  const url = new URL(request.url);
  if (request.mode === 'navigate') return true;
  if (url.origin !== self.location.origin) return false;

  return (
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.webmanifest')
  );
}

// Install event: Cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      console.log('Service Worker: Caching assets');
      await cache.addAll(CORE_ASSETS.map((asset) => new Request(asset, { cache: 'reload' })));
    } catch (error) {
      console.warn('Service Worker: Some assets failed to cache', error);
    }

    // Activate new worker immediately to reduce stale app versions.
    await self.skipWaiting();
  })());
});

// Listen for message to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
          console.log('Service Worker: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
        return Promise.resolve();
      })
    );

    await self.clients.claim();
  })());
});

// Fetch event:
// - App shell files: network-first (get latest on deploy), cache fallback offline.
// - Other files: cache-first with network fallback.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  if (isAppShellRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Offline - Content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        })
    );
    return;
  }

  // Cache-first strategy for non-app-shell assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }

          // Cache successful responses
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // If offline and not in cache, return offline page or error
          console.log('Service Worker: Request failed, offline:', request.url);
          return new Response('Offline - Content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
    })
  );
});

console.log('Service Worker: Loaded');
