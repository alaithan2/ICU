/* Minimal service worker — enables "Add to Home Screen" installability.
   Network passthrough only (no caching), so app updates are always fresh. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // A fetch handler must exist for the install prompt; requests pass through normally.
});
