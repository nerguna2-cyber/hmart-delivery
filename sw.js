// H mart Service Worker — v1
var CACHE_NAME = 'hmart-dev-v1';

// Files to cache for offline use
var CACHE_FILES = [
  '/hmart-delivery/index_dev.html'
];

// Install — cache the app shell
self.addEventListener('install', function(e) {
  console.log('[SW] Installing...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app shell');
      return cache.addAll(CACHE_FILES);
    }).then(function() {
      return self.skipWaiting(); // activate immediately
    })
  );
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim(); // take control immediately
    })
  );
});

// Fetch — serve from cache when offline
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Don't cache Apps Script API calls — always try network for these
  if(url.indexOf('script.google.com') > -1) {
    e.respondWith(fetch(e.request).catch(function() {
      // API failed — app's offline queue will handle it
      return new Response(JSON.stringify({error: 'offline'}), {
        headers: {'Content-Type': 'application/json'}
      });
    }));
    return;
  }

  // For app files — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if(cached) {
        // Serve from cache, update in background
        var networkFetch = fetch(e.request).then(function(response) {
          if(response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function() {});
        return cached;
      }
      // Not in cache — try network
      return fetch(e.request).then(function(response) {
        if(response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
