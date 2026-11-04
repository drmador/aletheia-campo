// Service worker: guarda la APP (no los datos) para que abra sin cobertura.
// Al publicar una versión nueva, sube el número de VERSION.
const VERSION = 'app-v1.1.0';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/estilo.css',
  'js/app.js', 'js/config.js', 'js/almacen.js', 'js/auth.js', 'js/graph.js',
  'js/logica.js', 'js/operaciones.js', 'js/bloqueo.js', 'js/vistas.js', 'js/campos.js',
  'icons/icono.svg', 'icons/icono-192.png', 'icons/icono-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const n of await caches.keys()) if (n.startsWith('app-') && n !== VERSION) await caches.delete(n);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // OneDrive, Microsoft: nunca se guardan aquí
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    // La página principal: siempre la de la caché (la vuelta de Microsoft lleva ?code=…)
    const clave = e.request.mode === 'navigate' ? 'index.html' : e.request;
    const guardada = await c.match(clave, { ignoreSearch: e.request.mode === 'navigate' });
    if (guardada) return guardada;
    return fetch(e.request);
  })());
});
