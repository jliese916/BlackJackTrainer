"use strict";

const CACHE = "casa-let-it-ride-v31";
const ASSETS = [
  "./index.html",
  "./styles.css?v=31",
  "./strategy-engine.js?v=31",
  "./app.js?v=31",
  "./manifest.webmanifest",
  "./jefe-crest.svg",
  "./favicon-64.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function cacheResponse(request, response, cacheKey = request) {
  if (!response || !response.ok) return response;
  const copy = response.clone();
  caches.open(CACHE).then(cache => cache.put(cacheKey, copy)).catch(() => {});
  return response;
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then(cached => {
        const network = fetch(event.request)
          .then(response => cacheResponse(event.request, response, "./index.html"))
          .catch(() => null);
        return cached || network;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => cacheResponse(event.request, response))
        .catch(() => cached);
    })
  );
});
