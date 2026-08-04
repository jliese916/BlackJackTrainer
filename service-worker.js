"use strict";

const CACHE_NAME = "el-jefe-blackjack-v26";
const APP_SHELL = [
  "./index.html",
  "./styles.css?v=26",
  "./app.js?v=26",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./og-blackjack.png",
  "./favicon-64.png",
  "./jefe-crest.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function cacheResponse(request, response, cacheKey = request) {
  if (!response || !response.ok) return response;
  const copy = response.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, copy)).catch(() => {});
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
