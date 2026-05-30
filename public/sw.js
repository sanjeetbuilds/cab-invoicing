/* eslint-disable no-restricted-globals */
/**
 * EasyBills service worker — minimal, intentional.
 *
 * Scope: speed up repeat visits and the home-screen launch by caching
 * the static asset bundle. Do NOT cache:
 *   - API routes (/api/*)        — server data must be fresh
 *   - Server-rendered HTML       — these read DB state per request
 *   - Auth endpoints (/auth/*)   — never cache anything session-aware
 * Cache-first only for clearly static resources (the JS / CSS / font
 * chunks Next.js fingerprints with content hashes, plus the PWA
 * icons). For everything else, network-first.
 *
 * Bump CACHE_VERSION when shipping a breaking change.
 */
const CACHE_VERSION = "easybills-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Pre-cache the bare minimum so the first home-screen launch isn't a
// blank screen. Next's hashed chunks attach on demand.
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  const p = url.pathname;
  return (
    p.startsWith("/_next/static/") ||
    p.startsWith("/icons/") ||
    p.startsWith("/fonts/") ||
    p === "/manifest.json" ||
    /\.(?:js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/i.test(p)
  );
}

function isBypass(url) {
  const p = url.pathname;
  return (
    p.startsWith("/api/") ||
    p.startsWith("/auth/") ||
    p.startsWith("/sign-") ||
    p === "/sign-out"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isBypass(url)) return;

  if (isStaticAsset(url)) {
    // Cache-first for hash-fingerprinted assets — they only change when
    // the URL changes, so a cache hit is always valid.
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      })(),
    );
    return;
  }
  // Everything else: network-first, fall back to cache only on offline.
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        return fresh;
      } catch {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        throw new Error("offline + no cache");
      }
    })(),
  );
});
