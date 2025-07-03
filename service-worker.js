// Optimo_Prompt.Ai - Service Worker
const CACHE_VERSION = 'optimo-v3';
const CACHE_URLS = [
  '/',
  '/pages/index.html',
  '/pages/checkout.html',
  '/css/styles.css',
  '/js/loader.js',
  '/js/activation.js',
  '/images/logo.svg',
  '/images/icons/icon-192.png',
  '/images/icons/icon-512.png'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        console.log('Caching assets');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_VERSION) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  // Skip optimization API calls
  if (event.request.url.includes('/optimize')) return;
  
  // Cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) return cachedResponse;
        
        // Otherwise fetch from network
        return fetch(event.request).then(response => {
          // Clone response to cache
          const responseClone = response.clone();
          
          // Cache new requests
          if (event.request.method === 'GET' && 
              !event.request.url.includes('sockjs') &&
              !event.request.url.includes('hot-update')) {
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          
          return response;
        });
      }).catch(() => {
        // Fallback for failed requests
        if (event.request.mode === 'navigate') {
          return caches.match('/pages/index.html');
        }
      })
  );
});

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'optimize-queue') {
    event.waitUntil(processQueue());
  }
});

async function processQueue() {
  // Implementation for offline queue processing
}