const CACHE_NAME = "ekhaya-price-checker-v1";
const APP_PATH = "/price-checker/";
const APP_SHELL = [APP_PATH, "/price-checker/manifest.webmanifest", "/price-checker/app-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("ekhaya-price-checker-") && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== "GET") return;

  if (request.mode === "navigate") {
    if (url.pathname !== APP_PATH && url.pathname !== "/price-checker") return;
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(APP_PATH, response.clone()));
        return response;
      }).catch(() => caches.match(APP_PATH))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      }))
    );
  }
});
