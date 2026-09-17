// Hand-rolled service worker — no Workbox/next-pwa. Deliberately uses
// runtime caching rather than a build-time precache manifest: Next's
// static export hashes every asset filename per build, and a hand-rolled
// SW has no build step to generate a matching precache list from. So
// instead: cache-as-you-go. The first online visit populates the cache;
// every visit after that (online or off) can be served from it.
//
// Supabase requests are never intercepted here — they're a different
// origin, and the offline-write story for those lives in lib/db.ts +
// lib/sync.ts (a Dexie queue flushed on reconnect), not in the SW's
// fetch handler. Conflating "cache the app shell" with "queue failed
// writes" in one service worker gets muddy fast; keeping them separate
// is the whole reason this stays readable.

const CACHE_NAME = "polaris-field-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GETs — everything else (Supabase API calls,
  // POST/PUT/DELETE) passes straight through untouched.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  const isNavigation = event.request.mode === "navigate";

  event.respondWith(
    isNavigation ? networkFirst(event.request) : cacheFirst(event.request)
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? cache.match("/");
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return cached;
  }
}
