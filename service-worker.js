// WordForge Service Worker — caches app shell for offline support
const CACHE_NAME = 'wordforge-v3';

// Core files to cache on install
const PRECACHE = [
    '/',
    '/index.html',
    '/daily.html',
    '/duel.html',
    '/challenge.html',
    '/party.html',
    '/style.css',
    '/script.js',
    '/shared.js',
    '/words.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install — precache app shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch — serve from cache, fall back to network
// Network-first for API calls, cache-first for static assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always fetch from network for API calls and socket connections
    if (
        url.hostname.includes('railway.app') ||
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('dictionaryapi.dev') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com')
    ) {
        return; // let browser handle — no caching for external resources
    }

    // Cache-first for local static assets
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Cache successful GET responses for local files
                if (
                    response.ok &&
                    event.request.method === 'GET' &&
                    url.hostname === self.location.hostname
                ) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback — return index.html for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
