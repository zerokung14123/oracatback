const CACHE_VERSION = '2026-05-27-05';
const STATIC_CACHE = `oracat-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `oracat-runtime-${CACHE_VERSION}`;

const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/privacy.html',
  '/terms.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/css/style.css',
  '/js/config.js',
  '/js/v2-runtime-config.js',
  '/js/firebase-data.js',
  '/js/google-api.js',
  '/js/google-oauth-v2.js',
  '/js/queue.js',
  '/js/booking-document.js',
  '/js/revenue.js',
  '/js/tax-calculator.js',
  '/js/cookie-consent.js',
  '/js/app.js',
  '/js/pwa.js',
  '/assets/brand/oracat-logo.png',
  '/assets/icons/oracat-icon-192.png',
  '/assets/icons/oracat-icon-512.png',
  '/assets/icons/oracat-maskable-512.png'
];

const BYPASS_PREFIXES = [
  '/api/',
  '/.netlify/functions/'
];

const STATIC_FILE_PATTERN = /\.(?:css|js|json|webmanifest|png|jpg|jpeg|svg|webp|ico|woff2?)$/i;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL_URLS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }

    const expectedCaches = new Set([STATIC_CACHE, RUNTIME_CACHE]);
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(cacheName => cacheName.startsWith('oracat-') && !expectedCaches.has(cacheName))
        .map(cacheName => caches.delete(cacheName))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS_PREFIXES.some(prefix => url.pathname.startsWith(prefix))) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (STATIC_FILE_PATTERN.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function handleNavigation(event) {
  try {
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) return preloadResponse;

    const networkResponse = await fetch(event.request);
    if (networkResponse?.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(event.request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedPage = await caches.match(event.request);
    return cachedPage || caches.match('/offline.html');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then(response => {
      if (response?.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse || Response.error());

  return cachedResponse || networkResponsePromise;
}
