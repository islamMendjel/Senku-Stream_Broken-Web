const CACHE = 'senku-stream-v1';

// App shell — files to cache on install
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
];

// ── Install: cache app shell ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch strategy ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // For TMDB API calls and external embeds → always network, no caching
  if (
    url.hostname.includes('themoviedb.org') ||
    url.hostname.includes('image.tmdb.org') ||
    url.hostname.includes('2embed') ||
    url.hostname.includes('vidsrc') ||
    url.hostname.includes('embed.su') ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('fonts.googleapis') ||
    url.hostname.includes('fonts.gstatic')
  ) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // For app shell files → cache-first, fallback to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache new valid responses
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
