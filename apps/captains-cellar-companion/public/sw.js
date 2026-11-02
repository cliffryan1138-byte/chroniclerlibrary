// Offline shell. Pages: network first, falling back to the cached app when there's no signal.
// Built files (hashed names, never change): cache first. API calls and other sites: never cached.
const CACHE = 'cellar-v2'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/apple-touch-icon.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()))
})

const put = (req, res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) } return res }

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => put('/index.html', res)).catch(() => caches.match('/index.html')))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))))
    return
  }
  e.respondWith(fetch(req).then((res) => put(req, res)).catch(() => caches.match(req)))
})
