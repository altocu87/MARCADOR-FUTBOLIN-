import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Web pública (portada, «Monta tu marcador», instalador y ayuda).
 * Se publica junto a la app: la web en la raíz y la app en la carpeta «app/» (ver scripts/assemble-web.mjs).
 */
export default defineConfig({
  root: 'web',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist-web',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      // Dos páginas: la web pública y el panel de administración (en /admin/, fuera del menú y sin indexar).
      input: { web: 'web/index.html', admin: 'web/admin/index.html' },
    },
  },
  preview: { port: 4180 },
});
