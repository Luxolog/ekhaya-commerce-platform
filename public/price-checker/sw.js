const CACHE_NAME = "ekhaya-price-checker-v2";
const APP_PATH = "/price-checker/";
const OFFLINE_PATH = "/price-checker/offline.html";
const APP_SHELL = [
  OFFLINE_PATH,
  "/price-checker/manifest.webmanifest",
  "/price-checker/app-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("ekhaya-price-checker-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept cross-origin requests, non-GET requests, or API traffic.
  if (url.origin !== self.location.origin || request.method !== "GET") return;
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/functions/")) return;

  if (request.mode === "navigate") {
    if (url.pathname !== APP_PATH && url.pathname !== "/price-checker") return;

    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPage = await caches.match(APP_PATH);
        if (cachedPage) return cachedPage;
        return (await caches.match(OFFLINE_PATH)) || Response.error();
      })
    );
    return;
  }

  // Cache only immutable Next.js build assets. Never cache seller data or API responses.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
          }
          return response;
        });
      })
    );
  }
});
