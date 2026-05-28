const CACHE_NAME = 'rouh-pwa-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://lh3.googleusercontent.com/d/1p79NP1wGo5nAmDpGLV3xHvWbC1DJfZdZ'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle standard GET requests and skip browser extensions or non-http protocols
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Skip dynamic backend API endpoints programmatically
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Network-First with quick timeout for the SPA shell, caching updates gracefully
  event.respondWith(
    new Promise((resolve) => {
      // Set a short timeout for network fetch to prevent hanging in "white screen" on slow connections
      const timeoutId = setTimeout(() => {
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            resolve(cachedResponse);
          }
        });
      }, 1200);

      fetch(event.request)
        .then((networkResponse) => {
          clearTimeout(timeoutId);
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          resolve(networkResponse);
        })
        .catch(() => {
          clearTimeout(timeoutId);
          caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              resolve(cachedResponse);
            } else if (event.request.mode === 'navigate') {
              // Fallback to offline index page
              caches.match('/index.html').then((fallback) => {
                resolve(fallback);
              });
            } else {
              resolve(new Response('Offline', { status: 503, statusText: 'Offline' }));
            }
          });
        });
    })
  );
});
