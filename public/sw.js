// Service worker mínimo: solo hace la tienda instalable. No guarda nada sin conexión
// (precios y stock cambian a cada momento), así que cada visita siempre trae lo último.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
