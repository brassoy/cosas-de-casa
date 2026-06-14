/**
 * Tests Fase 1E: merge realtime en Dexie.
 *
 * Handler `applyRealtimeChange`: INSERT/UPDATE/DELETE se mergean en Dexie con
 * la lógica last-write-wins + protección de outbox 'pending'.
 *
 * Nota: el antiguo bloque `AddSuccessOverlay` (subcomponente presentacional) se
 * eliminó al migrar a las 4 themes; ese overlay vive ahora inline en cada vista
 * de `views/<theme>/ShoppingListDetailView.tsx`. La cobertura de la lógica de
 * realtime/sync (lo único de valor de esta fase) se conserva íntegra aquí.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Datos en memoria del outbox ───────────────────────────────────────────────

interface MockOutboxEntry {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  createdAt: string;
}

const mockOutboxStore: MockOutboxEntry[] = [];

// ── Mock de Dexie db ──────────────────────────────────────────────────────────

const mockItemsStore: Map<string, Record<string, unknown>> = new Map();

vi.mock('@/features/shopping/offline/db', () => ({
  db: {
    items: {
      get: vi.fn((id: string) => Promise.resolve(mockItemsStore.get(id))),
      put: vi.fn((item: Record<string, unknown>) => {
        mockItemsStore.set(item.id as string, item);
        return Promise.resolve();
      }),
      delete: vi.fn((id: string) => {
        mockItemsStore.delete(id);
        return Promise.resolve();
      }),
    },
    outbox: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([...mockOutboxStore])),
        })),
      })),
    },
  },
}));

// `useRealtimeItems` importa `supabase` a nivel de módulo; el mock evita que la
// importación real del módulo falle al hacer `vi.importActual`.
vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({})),
    })),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
}));

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockOutboxStore.length = 0;
  mockItemsStore.clear();
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// Handler realtime — merge en Dexie
// ══════════════════════════════════════════════════════════════════════════════
//
// Testeamos `applyRealtimeChange` directamente (es @internal exportada).

describe('Realtime handler — merge en Dexie', () => {
  it('INSERT remoto escribe el ítem en Dexie', async () => {
    const { db } = await import('@/features/shopping/offline/db');
    const { applyRealtimeChange } = await vi.importActual<
      typeof import('./hooks/useRealtimeItems')
    >('./hooks/useRealtimeItems');

    await applyRealtimeChange({
      eventType: 'INSERT',
      new: {
        id: 'item-remote-1',
        list_id: 'list-1',
        name: 'Tomates',
        quantity: '2.000',
        unit: 'kg',
        description: null,
        purchase_link: null,
        checked: false,
        updated_at: '2026-05-25T10:00:00.000Z',
        created_at: '2026-05-25T10:00:00.000Z',
      },
      old: {},
      schema: 'public',
      table: 'shopping_items',
      commit_timestamp: '',
      errors: [],
    });

    expect(db.items.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'item-remote-1', name: 'Tomates', listId: 'list-1' }),
    );
  });

  it('UPDATE remoto con updatedAt más reciente actualiza Dexie', async () => {
    const { db } = await import('@/features/shopping/offline/db');

    // Ítem existente con timestamp antiguo
    mockItemsStore.set('item-upd', {
      id: 'item-upd',
      listId: 'list-1',
      name: 'Leche',
      checked: false,
      updatedAt: '2026-05-24T08:00:00.000Z',
      createdAt: '2026-05-24T08:00:00.000Z',
    });

    const { applyRealtimeChange } = await vi.importActual<
      typeof import('./hooks/useRealtimeItems')
    >('./hooks/useRealtimeItems');

    await applyRealtimeChange({
      eventType: 'UPDATE',
      new: {
        id: 'item-upd',
        list_id: 'list-1',
        name: 'Leche entera',
        quantity: null,
        unit: null,
        description: null,
        purchase_link: null,
        checked: false,
        updated_at: '2026-05-25T10:00:00.000Z',
        created_at: '2026-05-24T08:00:00.000Z',
      },
      old: {},
      schema: 'public',
      table: 'shopping_items',
      commit_timestamp: '',
      errors: [],
    });

    expect(db.items.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'item-upd', name: 'Leche entera' }),
    );
  });

  it('UPDATE remoto con updatedAt más antiguo NO actualiza Dexie (last-write-wins)', async () => {
    const { db } = await import('@/features/shopping/offline/db');

    // Ítem local más reciente
    mockItemsStore.set('item-lww', {
      id: 'item-lww',
      listId: 'list-1',
      name: 'Pan local reciente',
      checked: false,
      updatedAt: '2026-05-25T12:00:00.000Z',
      createdAt: '2026-05-25T08:00:00.000Z',
    });

    const { applyRealtimeChange } = await vi.importActual<
      typeof import('./hooks/useRealtimeItems')
    >('./hooks/useRealtimeItems');

    vi.mocked(db.items.put).mockClear();

    await applyRealtimeChange({
      eventType: 'UPDATE',
      new: {
        id: 'item-lww',
        list_id: 'list-1',
        name: 'Pan viejo del servidor',
        quantity: null, unit: null, description: null, purchase_link: null,
        checked: false,
        updated_at: '2026-05-25T09:00:00.000Z', // más antiguo que el local
        created_at: '2026-05-25T08:00:00.000Z',
      },
      old: {},
      schema: 'public',
      table: 'shopping_items',
      commit_timestamp: '',
      errors: [],
    });

    expect(db.items.put).not.toHaveBeenCalled();
  });

  it('DELETE remoto elimina el ítem de Dexie', async () => {
    const { db } = await import('@/features/shopping/offline/db');
    mockItemsStore.set('item-del', { id: 'item-del', listId: 'list-1', name: 'Queso', checked: false });

    const { applyRealtimeChange } = await vi.importActual<
      typeof import('./hooks/useRealtimeItems')
    >('./hooks/useRealtimeItems');

    await applyRealtimeChange({
      eventType: 'DELETE',
      new: {},
      old: { id: 'item-del' },
      schema: 'public',
      table: 'shopping_items',
      commit_timestamp: '',
      errors: [],
    });

    expect(db.items.delete).toHaveBeenCalledWith('item-del');
  });

  it('UPDATE remoto no pisa ítems con outbox pending del mismo id', async () => {
    const { db } = await import('@/features/shopping/offline/db');

    // Hay una entrada pending para este ítem
    mockOutboxStore.push({
      seq: 99,
      type: 'toggleItem',
      payload: { itemId: 'item-pending' },
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    });

    const { applyRealtimeChange } = await vi.importActual<
      typeof import('./hooks/useRealtimeItems')
    >('./hooks/useRealtimeItems');

    vi.mocked(db.items.put).mockClear();

    await applyRealtimeChange({
      eventType: 'UPDATE',
      new: {
        id: 'item-pending',
        list_id: 'list-1',
        name: 'Artículo del servidor',
        quantity: null, unit: null, description: null, purchase_link: null,
        checked: true,
        updated_at: '2026-05-26T10:00:00.000Z',
        created_at: '2026-05-26T08:00:00.000Z',
      },
      old: {},
      schema: 'public',
      table: 'shopping_items',
      commit_timestamp: '',
      errors: [],
    });

    expect(db.items.put).not.toHaveBeenCalled();
  });
});
