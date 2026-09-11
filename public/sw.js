// Service worker voor Reactievergelijkingen — offline-ondersteuning.
// Strategie: cache-first voor statische assets, network-first voor de HTML,
// met fallback naar cache wanneer er geen verbinding is.

const CACHE_VERSION = "reactievergelijking-v11";

// Op localhost draait de dev-server: daar zou cache-first steeds de oude
// bundel teruggeven, waardoor wijzigingen niet zichtbaar worden.
const IS_DEV =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_VERSION)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Alleen GET verwerken.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Bypass chrome-extensies en cross-origin verzoeken (zoals analytics).
  if (url.origin !== self.location.origin) return;

  // Tijdens ontwikkelen niets onderscheppen.
  if (IS_DEV) return;

  // HTML: network-first, val terug op cache.
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Statische assets (JS, CSS, fonts, iconen): cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
