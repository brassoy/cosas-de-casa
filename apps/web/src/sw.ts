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

// ─── Rutas de Supabase servidas por Kong en el MISMO dominio (/auth, /rest,
// /realtime, /storage). NO son del SPA: deben ir SIEMPRE a la red, nunca al app-shell
// ni interceptadas por el SW. Si el SW sirviera el app-shell para una navegación de
// nivel superior a /auth/v1/authorize (login con Google), el router no conocería esa
// ruta → "Página no encontrada" y el OAuth nunca llegaría al proveedor (bug clásico
// PWA + OAuth). Cubre además los redirects 302/303 del callback de OAuth y el realtime.
const SUPABASE_PREFIXES = ['/auth/', '/rest/', '/realtime/', '/storage/'];
const isSupabasePath = (pathname: string): boolean =>
  SUPABASE_PREFIXES.some((p) => pathname.startsWith(p));

// ─── App shell fallback for SPA navigation ─────────────────────────────────
// Any navigation request not matched by precache falls back to index.html
const appShellHandler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(appShellHandler, {
  // Excluye nuestra API (/api) y las rutas del backend Supabase del fallback del SPA.
  denylist: [/^\/api\//, ...SUPABASE_PREFIXES.map((p) => new RegExp('^' + p))],
});
registerRoute(navigationRoute);

// ─── API calls: network-first, fall back to cache ─────────────────────────
// Cubre llamadas a la misma origin (/api/...) y al servidor externo (VITE_API_URL).
registerRoute(
  ({ url }) =>
    // Nunca interceptar las rutas de Supabase (Kong): van directas a la red para no
    // romper el OAuth (302/303) ni el canal de realtime. /api (NestJS) sí se cachea.
    !isSupabasePath(url.pathname) &&
    (url.pathname.startsWith('/api/') ||
      url.hostname === self.location.hostname ||
      url.port === '3000'),
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

// ─── Push notifications ─────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  let title = 'Cosas de Casa';
  let body = 'Tienes una nueva notificación.';
  let icon = '/icons/icon-192.png';

  if (event.data) {
    try {
      const data = event.data.json() as {
        title?: string;
        body?: string;
        icon?: string;
      };
      title = data.title ?? title;
      body = data.body ?? body;
      icon = data.icon ?? icon;
    } catch {
      // Si el payload no es JSON válido, usamos los valores por defecto.
      body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/icon-192.png',
      tag: 'cosasdecasa',
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return (client as WindowClient).focus();
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      }),
  );
});

// ─── SW lifecycle ──────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
