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

// Handle Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'روح الذكية', body: 'لديك إشعار جديد من تطبيق روح!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'روح الذكية', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: 'https://lh3.googleusercontent.com/d/1p79NP1wGo5nAmDpGLV3xHvWbC1DJfZdZ',
    badge: 'https://lh3.googleusercontent.com/d/1p79NP1wGo5nAmDpGLV3xHvWbC1DJfZdZ',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'افتح التطبيق' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      let targetUrl = (notification.data && notification.data.url) ? notification.data.url : '/';
      
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

