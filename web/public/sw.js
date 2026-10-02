// Service worker mínimo de la web: permite que el navegador ofrezca «Instalar» la app desde la portada.
// No guarda nada en caché (la app instalada usa el suyo, en app/sw.js).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
