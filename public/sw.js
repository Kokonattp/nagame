// Nagame offline support: saved trips (IndexedDB) stay readable in Japan with a bad signal.
//  - app pages: network first, last good copy when offline
//  - built assets, Tabi art, map worker: cache first (file names change on every deploy)
//  - trip photos (/api/tabi/image → Wikimedia): cache first, so a viewed plan keeps its photos
//  - chat, events and other APIs: never cached (they must be live)
const VERSION = "tabi-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const PHOTOS = `${VERSION}-photos`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Thai quake/tsunami alerts from workers/quake-alert (docs/quake-alerts.md). The tag makes a
// "cancelled" message replace the warning it cancels instead of stacking under it.
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { /* malformed → generic title below */ }
  event.waitUntil(self.registration.showNotification(d.title || "Nagame", {
    body: d.body || "",
    tag: d.tag,
    renotify: Boolean(d.tag),
    requireInteraction: Boolean(d.urgent),
    vibrate: d.urgent ? [400, 200, 400, 200, 400] : undefined,
    icon: "/tabi/icon-192.png",
    badge: "/tabi/icon-192.png",
    lang: "th",
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin));
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // dev server: the worker is only registered here to test alerts — never serve stale dev chunks
  if (self.location.hostname === "localhost") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(url.pathname === "/" ? "/" : req, copy)); }
          return res;
        })
        .catch(async () => (await caches.match(req)) ?? (await caches.match("/")) ?? Response.error()),
    );
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/tabi/") || url.pathname.startsWith("/maplibre/")) {
    event.respondWith(cacheFirst(ASSETS, req));
    return;
  }
  if (url.pathname === "/api/tabi/image") event.respondWith(cacheFirst(PHOTOS, req));
});

async function cacheFirst(name, req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === "opaqueredirect" || res.type === "opaque") (await caches.open(name)).put(req, res.clone());
    return res;
  } catch {
    return Response.error();
  }
}
