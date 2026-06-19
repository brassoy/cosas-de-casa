import { get, set, del, clear, createStore } from 'idb-keyval';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Persistencia de la caché de TanStack Query en IndexedDB (ADR 0006,
 * offline-first). La UI de la mayoría de features (14/15) lee directamente de
 * la caché de Query: sin persistir, tras un refresh sin red se quedaban en
 * blanco. Aquí guardamos esa caché en IndexedDB para que hidrate al arrancar.
 *
 * Ojo: `shopping` NO depende de esto. Sigue siendo offline-first vía Dexie
 * (su propio outbox + sync). Esta persistencia cubre el RESTO de features.
 */

// Store dedicado dentro de IndexedDB para no pisar otras bases (Dexie usa las
// suyas). Nombre de DB y de object-store explícitos.
const queryStore = createStore('cosasdecasa-query', 'query-cache');

/**
 * Adaptador de almacenamiento asíncrono sobre idb-keyval. Cumple el contrato
 * `AsyncStorage` que espera `createAsyncStoragePersister` (getItem / setItem /
 * removeItem). El tipo no se reexporta del paquete público, así que se valida
 * estructuralmente en el punto de uso (`createIdbPersister`).
 */
export const idbStorage = {
  getItem: (key: string): Promise<string | null> =>
    get<string>(key, queryStore).then((value) => value ?? null),
  setItem: (key: string, value: string): Promise<void> => set(key, value, queryStore),
  removeItem: (key: string): Promise<void> => del(key, queryStore),
};

/** Clave única bajo la que se serializa toda la caché persistida. */
export const PERSIST_CACHE_KEY = 'cosasdecasa-query-cache';

/**
 * Versión del buster: al cambiarla se invalida y descarta toda la caché
 * persistida (útil ante cambios de forma de los datos). Súbela a mano cuando
 * un cambio rompa la compatibilidad de la caché serializada.
 */
export const PERSIST_BUSTER = 'v1';

/** Cuánto vive la caché persistida antes de descartarse al hidratar. */
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24; // 24 h

/**
 * Construye el persister asíncrono que escribe/lee la caché de Query en
 * IndexedDB. Se inyecta en `PersistQueryClientProvider`.
 */
export function createIdbPersister() {
  return createAsyncStoragePersister({
    storage: idbStorage,
    key: PERSIST_CACHE_KEY,
  });
}

/** Borra por completo la caché persistida (p. ej. al cerrar sesión). */
export function clearPersistedQueryCache(): Promise<void> {
  return clear(queryStore);
}
