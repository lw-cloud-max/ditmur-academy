// Ditmur Academy PWA: network-only. Never cache accounts, exams or results.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Remove any caches left by older school service workers.
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('ditmur-academy-')).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

// A fetch handler allows browsers to recognise the app as installable, but
// navigations always use the live network. No private or public response is
// stored offline; authenticated pages and API calls are never cached.
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request));
});
