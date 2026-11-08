/* Blockfall service worker: caches the game so it plays offline.
   Network-first, so a newer index.html is picked up whenever you're online. */
const CACHE = 'blockfall-v1';
const CORE = ['./', './index.html'];

self.addEventListener('install', e => {
  // Cache each core URL on its own so one missing path doesn't fail the install.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('blockfall-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then(r =>
          r || (req.mode === 'navigate'
            ? caches.match('./index.html').then(p => p || caches.match('./'))
            : Response.error())))
  );
});
