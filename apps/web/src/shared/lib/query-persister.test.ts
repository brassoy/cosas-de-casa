import { describe, it, expect, vi, beforeEach } from 'vitest';

// idb-keyval necesita un IndexedDB real (no disponible en jsdom sin
// fake-indexeddb). Lo mockeamos para verificar que el adaptador delega bien sin
// tocar una base real.
const store = new Map<string, string>();

vi.mock('idb-keyval', () => ({
  createStore: () => ({ __fakeStore: true }),
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    store.delete(key);
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
}));

import {
  idbStorage,
  createIdbPersister,
  clearPersistedQueryCache,
  PERSIST_CACHE_KEY,
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
} from './query-persister';

describe('query-persister', () => {
  beforeEach(() => {
    store.clear();
  });

  it('expone constantes razonables de persistencia', () => {
    expect(PERSIST_CACHE_KEY).toBe('cosasdecasa-query-cache');
    expect(PERSIST_BUSTER).toBeTruthy();
    // 24 h: suficiente para hidratar tras un refresh offline-first.
    expect(PERSIST_MAX_AGE).toBe(1000 * 60 * 60 * 24);
  });

  describe('idbStorage', () => {
    it('escribe y lee a través del adaptador', async () => {
      await idbStorage.setItem('k', 'v');
      await expect(idbStorage.getItem('k')).resolves.toBe('v');
    });

    it('devuelve null cuando la clave no existe', async () => {
      await expect(idbStorage.getItem('missing')).resolves.toBeNull();
    });

    it('elimina una clave', async () => {
      await idbStorage.setItem('k', 'v');
      await idbStorage.removeItem('k');
      await expect(idbStorage.getItem('k')).resolves.toBeNull();
    });
  });

  it('createIdbPersister devuelve un persister con el contrato de TanStack', () => {
    const persister = createIdbPersister();
    expect(typeof persister.persistClient).toBe('function');
    expect(typeof persister.restoreClient).toBe('function');
    expect(typeof persister.removeClient).toBe('function');
  });

  it('clearPersistedQueryCache vacía el store', async () => {
    await idbStorage.setItem('k', 'v');
    await clearPersistedQueryCache();
    await expect(idbStorage.getItem('k')).resolves.toBeNull();
  });
});
