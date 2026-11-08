// Service Worker for offline caching
const CACHE_NAME = 'rvr-portfolio-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/404.html',
  '/writeup.html',
  '/config.js',
  '/script.js',
  '/writeup.js',
  '/styles.css',
  '/assets/favicon.svg',
  '/assets/og-image.svg',
  '/robots.txt',
  '/sitemap.xml',
  '/feed.xml',
  '/security.txt',
];

self.addEventListener('install', (event) => {
  // Bypass Google Fonts (CORS-blocked from SW; they load normally in HTML)
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Third-party requests (fonts, analytics) go straight to the network
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  const isHtml = event.request.headers.get('accept')?.includes('text/html');
  const isAsset = url.pathname.startsWith('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  if (isHtml) {
    // ALWAYS network-first for HTML, never serve stale
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else if (isAsset) {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
      )
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
