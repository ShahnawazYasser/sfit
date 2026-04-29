const CACHE_NAME = 'sfit-v3';

// Relative paths — resolve correctly whether hosted at / or /sfit/
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
  // config.js intentionally excluded — local only, never committed
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Don't intercept Supabase — let the browser handle it directly
  if (url.hostname.includes('supabase.co')) return;

  // Network-first for CDN scripts, with a real fallback Response
  if (url.hostname.includes('jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request)
            .then(cached => cached || new Response('/* offline */', {
              status: 503,
              headers: { 'Content-Type': 'application/javascript' }
            }))
        )
    );
    return;
  }

  // Cache-first for everything else; only cache successful responses
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});
