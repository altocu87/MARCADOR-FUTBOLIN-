import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Genera sw.js con la lista exacta de archivos de la compilación para que la app
 * arranque sin conexión (PC, móvil o servida desde un ESP32 sin Internet).
 */
function offlineServiceWorker(): Plugin {
  return {
    name: 'marcador-offline-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = ['./', ...Object.keys(bundle).map((f) => `./${f}`)];
      const statics = ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
      const precache = [...new Set([...files, ...statics.map((f) => `./${f}`)])].filter((f) => f !== './sw.js');
      const version = Date.now().toString(36);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `// Generado al compilar: caché para uso sin conexión.
const CACHE = 'marcador-v3-${version}';
const PRECACHE = ${JSON.stringify(precache)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Página: red primero (para recibir actualizaciones) y caché si no hay conexión.
    e.respondWith(fetch(req).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`,
      });
    },
  };
}

export default defineConfig({
  // Rutas relativas: funciona en la raíz, en una subcarpeta o servida desde una placa ESP32.
  base: './',
  plugins: [react(), offlineServiceWorker()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
