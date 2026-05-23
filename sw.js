const CACHE = 'dnd-ficha-v25';
const ASSETS = [
  './index.html',
  './src/app.js',
  './src/wizard.js',
  './src/character_context.js',
  './src/inventory_extras.js',
  './src/extra_resources.js',
  './src/styles.css',
  './src/refresh.css',
  './src/data/classes.json',
  './src/data/backgrounds.json',
  './src/data/species.json',
  './icon.svg',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Google Fonts: stale-while-revalidate (carga rápido offline después de la primera vez)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const network = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // Para todo lo demás durante desarrollo: network-first con fallback a cache.
  // Esto evita que cambios queden atrapados en el cache antiguo.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || new Response('', { status: 503 })))
  );
});
