// Ditmur Academy service worker, v2.
// Do not cache login pages, protected pages, or authentication responses.
// Those pages depend on the current session and must always reach the server.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('ditmur-academy-'))
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

// Deliberately no fetch handler: the browser handles navigation and API
// requests normally, including sign-out and the login page. Offline support
// can be added later with a network-first, auth-safe strategy.
