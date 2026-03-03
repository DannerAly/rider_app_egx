const CACHE = 'rider-egx-v1';

const APP_SHELL = [
  '/rider',
  '/rider/history',
];

// Instalación: cachea el shell de la rider app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Si falla la precarga, continuamos igual
      });
    })
  );
  self.skipWaiting();
});

// Activación: limpia cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: estrategia Network First para todo
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptamos requests del mismo origen
  if (url.origin !== location.origin) return;

  // APIs: siempre red, sin caché
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // App shell y páginas: Network first, fallback a caché
  event.respondWith(
    fetch(request)
      .then(response => {
        // Guardar respuesta en caché si es válida
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin conexión: intentar desde caché
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // Fallback a página /rider para rutas no cacheadas
          if (url.pathname.startsWith('/rider')) {
            return caches.match('/rider');
          }
        });
      })
  );
});
