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
  },
  preview: { port: 4180 },
});
