// Minimal offline shell: cache the app shell on install, serve cache-first for same-origin GETs.
const CACHE = 'cellar-v1'
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/index.html']))))
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone()
    caches.open(CACHE).then((c) => c.put(e.request, copy))
    return res
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html'))))
})
