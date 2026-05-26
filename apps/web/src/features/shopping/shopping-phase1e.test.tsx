/**
 * Tests Fase 1E: overlay al añadir + merge realtime en Dexie.
 *
 * Tres bloques:
 *  1. AddSuccessOverlay — muestra frase, respeta prefers-reduced-motion, se cierra solo.
 *  2. ListDetailPage + overlay — aparece tras añadir un ítem con éxito.
 *  3. useRealtimeItems handler — INSERT/UPDATE/DELETE se mergean en Dexie con
 *     la lógica last-write-wins + protección de outbox 'pending'.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Infraestructura compartida con shopping.test.tsx ─────────────────────────

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        cb?.('SUBSCRIBED');
        return {};
      }),
    })),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: vi.fn(
    (selector: (s: { user: { id: string; email: string; user_metadata: Record<string, unknown> } }) => unknown) =>
      selector({ user: { id: 'user-1', email: 'test@example.com', user_metadata: {} } }),
  ),
}));

vi.mock('@/features/family/store/family.store', () => ({
  useFamilyStore: vi.fn(
    (selector: (s: { activeFamily: { id: string; name: string } | null }) => unknown) =>
      selector({ activeFamily: { id: 'family-1', name: 'Mi familia' } }),
  ),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ familyId: 'family-1', listId: 'list-1' }),
  };
});

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
let seqCounter = 0;

// ── Mock de Dexie db ──────────────────────────────────────────────────────────

const mockItemsStore: Map<string, Record<string, unknown>> = new Map();

vi.mock('@/features/shopping/offline/db', () => ({
  db: {
    lists: {
      get: vi.fn(() => Promise.resolve(undefined)),
      put: vi.fn(() => Promise.resolve()),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
          primaryKeys: vi.fn(() => Promise.resolve([])),
        })),
      })),
      bulkDelete: vi.fn(() => Promise.resolve()),
    },
    items: {
      get: vi.fn((id: string) => Promise.resolve(mockItemsStore.get(id))),
      put: vi.fn((item: Record<string, unknown>) => {
        mockItemsStore.set(item.id as string, item);
        return Promise.resolve();
      }),
      update: vi.fn(() => Promise.resolve(1)),
      delete: vi.fn((id: string) => {
        mockItemsStore.delete(id);
        return Promise.resolve();
      }),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
          primaryKeys: vi.fn(() => Promise.resolve([])),
          sortBy: vi.fn(() => Promise.resolve([])),
        })),
      })),
      bulkDelete: vi.fn(() => Promise.resolve()),
    },
    comments: {
      put: vi.fn(() => Promise.resolve()),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          sortBy: vi.fn(() => Promise.resolve([])),
        })),
      })),
    },
    outbox: {
      add: vi.fn((entry: Omit<MockOutboxEntry, 'seq'>) => {
        seqCounter++;
        mockOutboxStore.push({ ...entry, seq: seqCounter });
        return Promise.resolve(seqCounter);
      }),
      delete: vi.fn((seq: number) => {
        const idx = mockOutboxStore.findIndex((e) => e.seq === seq);
        if (idx !== -1) mockOutboxStore.splice(idx, 1);
        return Promise.resolve();
      }),
      update: vi.fn((seq: number, patch: Record<string, unknown>) => {
        const entry = mockOutboxStore.find((e) => e.seq === seq);
        if (entry) Object.assign(entry, patch);
        return Promise.resolve(1);
      }),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          sortBy: vi.fn(() => Promise.resolve([...mockOutboxStore])),
          toArray: vi.fn(() => Promise.resolve([...mockOutboxStore])),
        })),
      })),
    },
    transaction: vi.fn(async (_m: string, _t: unknown[], cb: () => Promise<void>) => cb()),
  },
}));

// ── Mocks de hooks para ListDetailPage ───────────────────────────────────────

const { mockAddItemWithDedup } = vi.hoisted(() => ({
  mockAddItemWithDedup: vi.fn(async () => ({ needsConfirmation: false })),
}));

let overlayVisible = false;

vi.mock('@/features/shopping/hooks/useShopping', () => ({
  useShoppingListDetail: vi.fn(() => ({
    list: { id: 'list-1', familyId: 'family-1', name: 'Lista test', type: 'CUSTOM', updatedAt: '', createdAt: '' },
    items: [],
    loading: false,
  })),
  useShoppingLists: vi.fn(() => ({ lists: [], loading: false })),
  useAddItem: vi.fn(() => ({ addItem: vi.fn(async () => {}) })),
  useToggleItem: vi.fn(() => ({ toggleItem: vi.fn(async () => {}) })),
  useDeleteItem: vi.fn(() => ({ deleteItem: vi.fn(async () => {}) })),
  useItemComments: vi.fn(() => ({ comments: [] })),
  useAddComment: vi.fn(() => ({ addComment: vi.fn(async () => {}) })),
  useCreateList: vi.fn(() => ({ createList: vi.fn(async () => {}) })),
  useAddItemWithDedup: vi.fn(() => ({
    addItemWithDedup: mockAddItemWithDedup,
    dedupState: null,
    confirmDedup: vi.fn(async () => {}),
    cancelDedup: vi.fn(),
    autoMergeMessage: null,
    showSuccessOverlay: overlayVisible,
    successCount: 0,
    hideSuccessOverlay: vi.fn(() => { overlayVisible = false; }),
  })),
}));

vi.mock('@/features/shopping/store/shopping.store', () => ({
  useShoppingStore: vi.fn((selector: (s: { openItemId: string | null; openItem: (id: string) => void; closeItem: () => void }) => unknown) =>
    selector({ openItemId: null, openItem: vi.fn(), closeItem: vi.fn() }),
  ),
}));

vi.mock('@/features/shopping/offline/sync', () => ({
  seedFromApi: vi.fn(async () => {}),
  seedListDetail: vi.fn(async () => {}),
  enqueue: vi.fn(async () => {}),
  replayOutbox: vi.fn(async () => {}),
}));

vi.mock('@/features/shopping/hooks/useFrequentItems', () => ({
  useFrequentItems: vi.fn(() => ({ items: [], loading: false })),
}));

vi.mock('@/features/shopping/hooks/useRealtimeItems', () => ({
  useRealtimeItems: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(ui: React.ReactElement) {
  return render(<QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>);
}

// ── Importaciones ─────────────────────────────────────────────────────────────

import { AddSuccessOverlay } from './components/AddSuccessOverlay';
import { ListDetailPage } from './pages/ListDetailPage';
import * as shoppingHooks from './hooks/useShopping';

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockOutboxStore.length = 0;
  mockItemsStore.clear();
  seqCounter = 0;
  overlayVisible = false;
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. AddSuccessOverlay
// ══════════════════════════════════════════════════════════════════════════════

describe('AddSuccessOverlay', () => {
  it('no renderiza nada cuando visible=false', () => {
    const { container } = render(
      <AddSuccessOverlay visible={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra una frase del config cuando visible=true', async () => {
    const { ONADD_PHRASES } = await import('./config/onadd.config');
    render(<AddSuccessOverlay visible={true} onClose={vi.fn()} />);

    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();

    // La frase que muestra debe estar en el array de frases configuradas.
    const phrase = status.querySelector('p');
    expect(phrase).not.toBeNull();
    expect(ONADD_PHRASES).toContain(phrase!.textContent);
  });

  it('muestra el enlace de LinkedIn', () => {
    render(<AddSuccessOverlay visible={true} onClose={vi.fn()} />);
    const link = screen.getByRole('link', { name: /linkedin/i });
    expect(link).toBeInTheDocument();
  });

  it('llama a onClose tras el timeout de 2s', async () => {
    const onClose = vi.fn();
    render(<AddSuccessOverlay visible={true} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('respeta prefers-reduced-motion: sin gif ni emoji animado, solo la frase', async () => {
    // Simula prefers-reduced-motion: reduce
    const mediaQueryMock = vi.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, 'matchMedia', { value: mediaQueryMock, writable: true });

    const { ONADD_PHRASES } = await import('./config/onadd.config');
    render(<AddSuccessOverlay visible={true} onClose={vi.fn()} />);

    const phrase = screen.getByRole('status').querySelector('p');
    expect(phrase).not.toBeNull();
    expect(ONADD_PHRASES).toContain(phrase!.textContent);

    // No debe haber ningún <img> (gif)
    expect(screen.queryByRole('img')).toBeNull();

    // Restaurar
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      writable: true,
    });
  });

  it('llama a onClose al hacer clic en el overlay', () => {
    const onClose = vi.fn();
    render(<AddSuccessOverlay visible={true} onClose={onClose} />);

    const container = screen.getByRole('status');
    fireEvent.click(container);
    expect(onClose).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. ListDetailPage — overlay aparece al añadir
// ══════════════════════════════════════════════════════════════════════════════

describe('ListDetailPage — overlay al añadir', () => {
  it('el overlay aparece cuando showSuccessOverlay es true', () => {
    vi.mocked(shoppingHooks.useAddItemWithDedup).mockReturnValueOnce({
      addItemWithDedup: mockAddItemWithDedup,
      dedupState: null,
      confirmDedup: vi.fn(async () => {}),
      cancelDedup: vi.fn(),
      autoMergeMessage: null,
      showSuccessOverlay: true,
      successCount: 1,
      hideSuccessOverlay: vi.fn(),
    });

    wrap(<ListDetailPage />);

    // El overlay tiene aria-label="Artículo añadido"
    expect(screen.getByLabelText('Artículo añadido')).toBeInTheDocument();
  });

  it('el overlay NO aparece cuando showSuccessOverlay es false', () => {
    vi.mocked(shoppingHooks.useAddItemWithDedup).mockReturnValueOnce({
      addItemWithDedup: mockAddItemWithDedup,
      dedupState: null,
      confirmDedup: vi.fn(async () => {}),
      cancelDedup: vi.fn(),
      autoMergeMessage: null,
      showSuccessOverlay: false,
      successCount: 0,
      hideSuccessOverlay: vi.fn(),
    });

    wrap(<ListDetailPage />);
    expect(screen.queryByLabelText('Artículo añadido')).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Handler realtime — merge en Dexie
// ══════════════════════════════════════════════════════════════════════════════
//
// Testeamos `applyRealtimeChange` directamente (es @internal exportada).
// El módulo useRealtimeItems está mockeado a nivel de suite (necesario para
// ListDetailPage), pero `vi.importActual` permite importar la implementación real.

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
