// Service worker: guarda una copia de la APP (no de los datos) para que abra sin cobertura.
// Con conexión siempre usa la versión más nueva publicada; sin conexión, la copia guardada.
const VERSION = 'app-v1.2.0';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/estilo.css',
  'js/app.js', 'js/config.js', 'js/almacen.js', 'js/auth.js', 'js/graph.js',
  'js/logica.js', 'js/operaciones.js', 'js/bloqueo.js', 'js/vistas.js', 'js/campos.js',
  'icons/icono.svg', 'icons/icono-192.png', 'icons/icono-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS.map((a) => new Request(a, { cache: 'reload' })))));
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
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // OneDrive y Microsoft: nunca se guardan aquí
  const navegacion = e.request.mode === 'navigate';
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    // La página principal se guarda siempre como index.html (la vuelta de Microsoft lleva ?code=…)
    const clave = navegacion ? new Request(new URL('index.html', self.registration.scope)) : new Request(url.origin + url.pathname);
    try {
      // 1.º Con conexión: la versión publicada más reciente (comprobando con GitHub, sin caché del navegador)
      const r = await fetch(navegacion ? clave : e.request, { cache: 'no-cache' });
      if (r.ok) { c.put(clave, r.clone()); return r; }
      throw new Error('HTTP ' + r.status);
    } catch {
      // 2.º Sin conexión: la copia guardada
      const guardada = await c.match(clave);
      if (guardada) return guardada;
      return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
