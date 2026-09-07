/* Public offline shell only. Bump VERSION whenever a precached asset changes. */
const VERSION = "v2";
const CACHE_PREFIX = "moda-pwa-shell-";
const CACHE_NAME = CACHE_PREFIX + VERSION;
const OFFLINE = "/offline.html";
const ASSETS = [
  OFFLINE,
  "/pwa/offline.css",
  "/pwa/offline.js",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/icon-maskable-512.png",
  "/pwa/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Fetch without cookies; never cache redirects, errors or opaque responses.
      const entries = await Promise.all(
        ASSETS.map(async (asset) => {
          const response = await fetch(
            new Request(asset, {
              credentials: "omit",
              cache: "reload",
              redirect: "error",
            }),
          );
          if (!response.ok || response.type === "opaque")
            throw new Error("Offline shell unavailable");
          return [asset, response];
        }),
      );
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        entries.map(([asset, response]) => cache.put(asset, response)),
      );
    })(),
  );
  // No skipWaiting: a new version must not interrupt an open checkout.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all(
        (await caches.keys())
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!url.search && ASSETS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(url.pathname)) ?? fetch(request);
      })(),
    );
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(OFFLINE)) ?? Response.error();
        }
      })(),
    );
  }
  // No runtime caching, background sync or POST replay. API, RSC and private
  // responses always go to the network, including when a user changes accounts.
});
