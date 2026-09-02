/* Service worker de RedLink.

   Estrategia:
   · HTML y navegación → red primero, caché solo como respaldo sin señal.
     Así una versión nueva se ve de inmediato, sin quedar atrapado en una
     copia vieja.
   · Archivos con hash (/assets/) → caché primero, son inmutables.
   · Los datos de Firestore no pasan por acá: tienen su propia caché
     persistente en IndexedDB.

   Al subir una versión nueva basta con cambiar VERSION: el worker viejo se
   descarta junto con sus cachés. */

const VERSION = 'v2';
const CACHE = `redlink-${VERSION}`;
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Navegación: red primero. Si no hay señal, se sirve el shell guardado. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copia));
          return res;
        })
        .catch(() => caches.match('/index.html').then((hit) => hit ?? Response.error()))
    );
    return;
  }

  /* Archivos con hash: caché primero. */
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok && url.pathname.startsWith('/assets/')) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
    )
  );
});
