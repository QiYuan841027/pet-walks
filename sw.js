const CACHE_NAME = 'petwalker-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
  );
  self.clients.claim();
});

// Fetch with offline fallback
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '宠步';
  const options = {
    body: data.body || '你有新的订单消息',
    icon: './icon-192.png',
    badge: './icon-96.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('./index.html?tab=orders')
  );
});

// Periodic background sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-orders') {
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(clients => {
        clients.forEach(client => client.postMessage({type: 'sync-orders'}));
      })
    );
  }
});

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      clients.matchAll({type: 'window'}).then(clients => {
        clients.forEach(client => client.postMessage({type: 'bg-sync'}));
      })
    );
  }
});

// Background fetch
self.addEventListener('backgroundfetchsuccess', event => {
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(clients => {
      clients.forEach(client => client.postMessage({
        type: 'bg-fetch-done',
        id: event.registration.id
      }));
    })
  );
});

self.addEventListener('backgroundfetchfail', event => {
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(clients => {
      clients.forEach(client => client.postMessage({
        type: 'bg-fetch-fail',
        id: event.registration.id
      }));
    })
  );
});