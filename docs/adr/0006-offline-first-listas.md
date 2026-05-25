# ADR-0006: Offline-first para la lista de la compra (Dexie + outbox)

**Fecha:** 2026-05-26
**Estado:** Aceptado

## Contexto y problema

La lista de la compra se usa **en el supermercado**, donde la conexión suele ser mala o
inexistente. Si la app depende de la red para leer o marcar ítems, falla justo cuando más se usa.

## Decisión

**Offline-first**: el navegador es la fuente de verdad local.

- **Dexie (IndexedDB)** guarda listas, ítems y comentarios localmente. La UI **lee siempre de
  Dexie** con `useLiveQuery` (re-render reactivo), nunca directamente de la API.
- **Mutaciones optimistas**: escribir en Dexie actualiza la UI al instante y encola la operación
  en una tabla `outbox`.
- **Motor de sincronización**: cuando hay conexión (evento `online` + reintentos con backoff), un
  _replay_ envía el `outbox` a la API en orden y borra las operaciones confirmadas. Ante 409/404
  marca conflicto y reconcilia con un _re-fetch_ de la lista afectada. Estrategia de conflicto:
  **last-write-wins** por `updatedAt` (suficiente para Fase 1).
- **Service worker** (Workbox, `injectManifest`): `NetworkFirst` para GET de la API, `CacheFirst`
  para assets, y _fallback_ del _app shell_ offline. Se verifica con `vite preview` (build), no en dev.

## Consecuencias

**A favor**

- La lista funciona sin red: añadir/marcar es instantáneo y se sincroniza al volver la conexión.
- Desacopla la UI de la latencia/disponibilidad de la API.

**En contra / trade-offs**

- Complejidad de sincronización y resolución de conflictos. LWW es simple y puede perder ediciones
  concurrentes; si hace falta, se evolucionará a merges/CRDT en una fase posterior.
- El `Background Sync` no está en todos los navegadores → usamos el evento `online` como _fallback_
  universal.

## Notas de implementación

`apps/web/src/features/shopping/offline/` (`db.ts`, `sync.ts`). La UI lee con `useLiveQuery`; el
catálogo de operaciones del `outbox` cubre add/toggle/createList/deleteItem/addComment.
