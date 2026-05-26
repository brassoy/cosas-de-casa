import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Escuchar en todas las interfaces para que el host (p. ej. Windows sobre
    // WSL2) pueda acceder, no solo localhost del propio WSL.
    host: true,
    proxy: {
      // El navegador del host no siempre alcanza el puerto 3000 de un proceso
      // node en WSL2 (sí llega a Vite). Reenviamos /api al backend DESDE el
      // servidor de Vite, que sí lo alcanza dentro de WSL. Así el navegador
      // solo habla con el mismo origen (5173) y se evita el cross-port.
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  // El .env vive en la raíz del monorepo (compartido con la API), no en apps/web.
  envDir: resolve(__dirname, '../..'),
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Cosas de Casa',
        short_name: 'CosasDeCasa',
        description: 'Gestiona todo lo de tu hogar: listas de la compra, tareas y más',
        theme_color: '#2563eb',
        background_color: '#2563eb',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        lang: 'es-ES',
        categories: ['lifestyle', 'productivity'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // El service worker se verifica con `vite preview` (build de producción),
      // no en el dev server: en dev es ruidoso y poco fiel. Por eso queda desactivado.
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
});
