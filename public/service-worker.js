// Basic Service Worker for PWA installability

// Listener for the 'install' event - typically used for caching assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Example: Pre-cache essential assets (optional for basic installability)
  // event.waitUntil(
  //   caches.open('medhistory-cache-v1').then((cache) => {
  //     return cache.addAll([
  //       '/',
  //       '/index.html',
  //       '/styles.css',
  //       '/script.js',
  //       '/manifest.json',
  //       // Add paths to icons and other core assets if needed
  //     ]);
  //   })
  // );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// Listener for the 'activate' event - typically used for cleaning up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Example: Remove old caches (optional)
  // event.waitUntil(
  //   caches.keys().then((cacheNames) => {
  //     return Promise.all(
  //       cacheNames.map((cacheName) => {
  //         if (cacheName !== 'medhistory-cache-v1') { // Replace with your current cache name
  //           return caches.delete(cacheName);
  //         }
  //       })
  //     );
  //   })
  // );
  // Tell the active service worker to take control of the page immediately.
  return self.clients.claim();
});

// Listener for the 'fetch' event - intercepts network requests (optional for basic installability)
// This is where you'd implement offline caching strategies
self.addEventListener('fetch', (event) => {
  // console.log('Service Worker: Fetching', event.request.url);
  // Example: Cache-first strategy (optional)
  // event.respondWith(
  //   caches.match(event.request).then((response) => {
  //     return response || fetch(event.request);
  //   })
  // );
});
