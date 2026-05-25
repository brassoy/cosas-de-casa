/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// ─── Precache assets injected by vite-plugin-pwa ───────────────────────────
// __WB_MANIFEST is replaced at build time with the list of precached assets.
precacheAndRoute(self.__WB_MANIFEST);

// Remove outdated caches from previous SW versions
cleanupOutdatedCaches();

// ─── App shell fallback for SPA navigation ─────────────────────────────────
// Any navigation request not matched by precache falls back to index.html
const appShellHandler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(appShellHandler, {
  // Exclude API calls from the SPA fallback
  denylist: [/^\/api\//],
});
registerRoute(navigationRoute);

// ─── API calls: network-first, fall back to cache ─────────────────────────
// Cubre llamadas a la misma origin (/api/...) y al servidor externo (VITE_API_URL).
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/') ||
    url.hostname === self.location.hostname ||
    url.port === '3000',
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
  }),
);

// ─── Static assets (images, fonts): cache-first ───────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets',
  }),
);

// ─── JS/CSS chunks not in precache: stale-while-revalidate ────────────────
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'js-css-cache',
  }),
);

// ─── SW lifecycle ──────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
