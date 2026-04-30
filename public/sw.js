/**
 * SOS Service Worker
 *
 * This worker intentionally does not cache app shell or Next.js chunks.
 * Previous cache-first static behavior could mix stale chunks with fresh HTML
 * after deploys and trigger the client error boundary on the public landing page.
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', () => {
  // Let the browser/network handle every request. Do not respond from cache.
});
