/**
 * Tests de la feature shopping.
 *
 * Estrategia: mockeamos el hook useShopping directamente para que los
 * componentes reciban datos síncronos. Verificamos que las mutaciones
 * llaman a enqueue (testeamos el contrato visible, no los internos de Dexie).
 *
 * Outbox/sync se testean por separado con vi.importActual para acceder a la
 * implementación real con el db mockeado.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks de infraestructura ──────────────────────────────────────────────────

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
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

// ── Datos en memoria del outbox (compartidos con db mock) ─────────────────────

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
      get: vi.fn(() => Promise.resolve(undefined)),
      put: vi.fn(() => Promise.resolve()),
      update: vi.fn(() => Promise.resolve(1)),
      delete: vi.fn(() => Promise.resolve()),
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
        })),
      })),
    },
    transaction: vi.fn(async (_m: string, _t: unknown[], cb: () => Promise<void>) => cb()),
  },
}));

// ── Mocks hoisted del hook de shopping ───────────────────────────────────────
// Mockeamos el hook completo para que el componente reciba datos síncronos.

const { mockToggleItem, mockAddItem, mockDeleteItem } = vi.hoisted(() => ({
  mockToggleItem: vi.fn(async () => {}),
  mockAddItem: vi.fn(async () => {}),
  mockDeleteItem: vi.fn(async () => {}),
}));

// Estado de los items que los tests controlan
type ItemState = {
  id: string;
  listId: string;
  name: string;
  quantity?: number;
  unit?: string;
  description?: string;
  purchaseLink?: string;
  checked: boolean;
  updatedAt: string;
  createdAt: string;
};

let mockedList: { id: string; familyId: string; name: string; type: 'MAIN' | 'CUSTOM'; updatedAt: string; createdAt: string } | null = null;
let mockedItems: ItemState[] = [];

vi.mock('@/features/shopping/hooks/useShopping', () => ({
  useShoppingListDetail: vi.fn(() => ({
    list: mockedList,
    items: mockedItems,
    loading: false,
  })),
  useShoppingLists: vi.fn(() => ({ lists: [], loading: false })),
  useAddItem: vi.fn(() => ({ addItem: mockAddItem })),
  useToggleItem: vi.fn(() => ({ toggleItem: mockToggleItem })),
  useDeleteItem: vi.fn(() => ({ deleteItem: mockDeleteItem })),
  useItemComments: vi.fn(() => ({ comments: [] })),
  useAddComment: vi.fn(() => ({ addComment: vi.fn(async () => {}) })),
  useCreateList: vi.fn(() => ({ createList: vi.fn(async () => {}) })),
  useAddItemWithDedup: vi.fn(() => ({
    addItemWithDedup: mockAddItem,
    dedupState: null,
    confirmDedup: vi.fn(async () => {}),
    cancelDedup: vi.fn(),
    autoMergeMessage: null,
    showSuccessOverlay: false,
    successCount: 0,
    hideSuccessOverlay: vi.fn(),
  })),
}));

vi.mock('@/features/shopping/store/shopping.store', () => ({
  useShoppingStore: vi.fn((selector: (s: { openItemId: string | null; openItem: (id: string) => void; closeItem: () => void }) => unknown) =>
    selector({ openItemId: null, openItem: vi.fn(), closeItem: vi.fn() }),
  ),
}));

// ── Mock de enqueue (para test de Outbox) ─────────────────────────────────────

vi.mock('@/features/shopping/hooks/useRealtimeItems', () => ({
  useRealtimeItems: vi.fn(),
}));

const { mockEnqueue } = vi.hoisted(() => ({ mockEnqueue: vi.fn(async () => {}) }));

vi.mock('@/features/shopping/offline/sync', () => ({
  seedFromApi: vi.fn(async () => {}),
  seedListDetail: vi.fn(async () => {}),
  enqueue: mockEnqueue,
  replayOutbox: vi.fn(async () => {}),
}));

// ── Mock de la capa API (para tests del hook real) ────────────────────────────

const { mockApiPost, mockApiPatch } = vi.hoisted(() => ({
  mockApiPost: vi.fn(async () => ({})),
  mockApiPatch: vi.fn(async () => ({})),
}));

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn(async () => []),
    post: mockApiPost,
    patch: mockApiPatch,
    delete: vi.fn(async () => ({})),
  },
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

// ── Importación bajo test ─────────────────────────────────────────────────────

import { ListDetailPage } from './pages/ListDetailPage';

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockedList = null;
  mockedItems = [];
  mockOutboxStore.length = 0;
  seqCounter = 0;
  vi.clearAllMocks();
  mockToggleItem.mockResolvedValue(undefined);
  mockAddItem.mockResolvedValue(undefined);
  mockDeleteItem.mockResolvedValue(undefined);
  mockEnqueue.mockResolvedValue(undefined);
});

// ── 1. ListDetailPage ─────────────────────────────────────────────────────────

describe('ListDetailPage', () => {
  it('renderiza el formulario de añadir artículo', () => {
    mockedList = {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Lista de prueba',
      type: 'CUSTOM',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    wrap(<ListDetailPage />);
    expect(screen.getByLabelText(/nombre del artículo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /añadir/i })).toBeInTheDocument();
  });

  it('muestra el nombre de la lista', () => {
    mockedList = {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Lista de prueba',
      type: 'CUSTOM',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    wrap(<ListDetailPage />);
    expect(screen.getByText('Lista de prueba')).toBeInTheDocument();
  });

  it('muestra los ítems existentes', () => {
    mockedList = {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Lista',
      type: 'CUSTOM',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockedItems = [
      {
        id: 'item-1',
        listId: 'list-1',
        name: 'Leche',
        checked: false,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
    wrap(<ListDetailPage />);
    expect(screen.getByText('Leche')).toBeInTheDocument();
  });

  it('añadir ítem llama a addItem con el nombre correcto', async () => {
    const user = userEvent.setup();
    mockedList = {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Lista',
      type: 'CUSTOM',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    wrap(<ListDetailPage />);

    const input = screen.getByLabelText(/nombre del artículo/i);
    await user.type(input, 'Pan');
    await user.click(screen.getByRole('button', { name: /añadir/i }));

    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith(
        'list-1',
        expect.objectContaining({ name: 'Pan' }),
      );
    });
  });

  it('marcar comprado llama a toggleItem con checked=true', async () => {
    const user = userEvent.setup();
    mockedList = {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Lista',
      type: 'CUSTOM',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockedItems = [
      {
        id: 'item-toggle',
        listId: 'list-1',
        name: 'Mantequilla',
        checked: false,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
    wrap(<ListDetailPage />);

    const checkbox = screen.getByRole('button', {
      name: /marcar mantequilla como comprado/i,
    });
    await user.click(checkbox);

    await waitFor(() => {
      expect(mockToggleItem).toHaveBeenCalledWith('item-toggle', true);
    });
  });

  it('desmarcar comprado llama a toggleItem con checked=false', async () => {
    const user = userEvent.setup();
    mockedList = {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Lista',
      type: 'CUSTOM',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockedItems = [
      {
        id: 'item-uncheck',
        listId: 'list-1',
        name: 'Yogur',
        checked: true,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
    wrap(<ListDetailPage />);

    const checkbox = screen.getByRole('button', {
      name: /marcar yogur como pendiente/i,
    });
    await user.click(checkbox);

    await waitFor(() => {
      expect(mockToggleItem).toHaveBeenCalledWith('item-uncheck', false);
    });
  });

  it('eliminar ítem llama a deleteItem', async () => {
    const user = userEvent.setup();
    mockedList = {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Lista',
      type: 'CUSTOM',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockedItems = [
      {
        id: 'item-del',
        listId: 'list-1',
        name: 'Aceite',
        checked: false,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
    wrap(<ListDetailPage />);

    const deleteBtn = screen.getByRole('button', { name: /eliminar aceite/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteItem).toHaveBeenCalledWith('item-del');
    });
  });
});

// ── 2. Outbox / sync real ─────────────────────────────────────────────────────

describe('Outbox', () => {
  it('enqueue añade una entrada al outbox con status pending', async () => {
    const { enqueue: realEnqueue } = await vi.importActual<
      typeof import('./offline/sync')
    >('./offline/sync');
    const { db } = await import('@/features/shopping/offline/db');

    await realEnqueue('addItem', { listId: 'list-1', name: 'Queso' });

    expect(db.outbox.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'addItem',
        status: 'pending',
        attempts: 0,
        payload: expect.objectContaining({ listId: 'list-1', name: 'Queso' }),
      }),
    );
    expect(mockOutboxStore).toHaveLength(1);
    expect(mockOutboxStore[0]).toMatchObject({ type: 'addItem', status: 'pending' });
  });

  it('replayOutbox envía ops pendientes al servidor y las elimina al éxito', async () => {
    // api.patch está mockeado (vi.mock @/shared/lib/api arriba).
    // toggleItem usa api.patch, así que verificamos ese mock.
    mockApiPatch.mockResolvedValueOnce({});
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    mockOutboxStore.push({
      seq: 1,
      type: 'toggleItem',
      payload: { itemId: 'item-1', checked: true },
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    });

    const { db } = await import('@/features/shopping/offline/db');
    const { replayOutbox: realReplay } = await vi.importActual<
      typeof import('./offline/sync')
    >('./offline/sync');

    await realReplay();

    expect(mockApiPatch).toHaveBeenCalled();
    expect(db.outbox.delete).toHaveBeenCalledWith(1);
  });
});

// ── 3. useAddItemWithDedup (hook real) ────────────────────────────────────────
//
// Estos tests ejercen la implementación real del hook con la api mockeada.
// Verifican el comportamiento correcto tras el fix del bug de duplicación:
//  - SUGGEST sin forceAdd → needsConfirmation=true, NO escribe en Dexie
//  - ADD_NEW → escribe el ítem del servidor en Dexie
//  - forceAdd online → POST directo sin outbox, escribe ítem del servidor

describe('useAddItemWithDedup (hook real)', () => {
  beforeEach(() => {
    // mockReset limpia también las resoluciones programadas con mockResolvedValueOnce
    mockApiPost.mockReset();
    mockApiPatch.mockReset();
    mockEnqueue.mockReset();
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  it('SUGGEST sin forceAdd → needsConfirmation=true, NO llama a db.items.put', async () => {
    // Simulamos que la API devuelve SUGGEST (sin item, con candidates)
    mockApiPost.mockResolvedValueOnce({
      decision: 'SUGGEST',
      candidates: [{ id: 'cat-1', displayName: 'leche', frequency: 3 }],
    });

    const { db } = await import('@/features/shopping/offline/db');
    const { useAddItemWithDedup } = await vi.importActual<
      typeof import('./hooks/useShopping')
    >('./hooks/useShopping');

    const { result } = renderHook(() => useAddItemWithDedup());

    let returnValue: { needsConfirmation: boolean } | undefined;
    await act(async () => {
      returnValue = await result.current.addItemWithDedup('list-1', { name: 'leche desnatada' });
    });

    expect(returnValue).toEqual({ needsConfirmation: true });
    expect(result.current.dedupState).toMatchObject({
      listId: 'list-1',
      itemData: { name: 'leche desnatada' },
      existingName: 'leche',
    });
    expect(db.items.put).not.toHaveBeenCalled();
  });

  it('ADD_NEW → needsConfirmation=false, escribe el ítem del servidor en Dexie', async () => {
    const serverItem = {
      id: 'srv-item-1',
      listId: 'list-1',
      name: 'Pan',
      checked: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    mockApiPost.mockResolvedValueOnce({
      decision: 'ADD_NEW',
      item: serverItem,
    });

    const { db } = await import('@/features/shopping/offline/db');
    const { useAddItemWithDedup } = await vi.importActual<
      typeof import('./hooks/useShopping')
    >('./hooks/useShopping');

    const { result } = renderHook(() => useAddItemWithDedup());

    let returnValue: { needsConfirmation: boolean } | undefined;
    await act(async () => {
      returnValue = await result.current.addItemWithDedup('list-1', { name: 'Pan' });
    });

    expect(returnValue).toEqual({ needsConfirmation: false });
    expect(db.items.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'srv-item-1', name: 'Pan', listId: 'list-1' }),
    );
    // No debe haber encolado nada en el outbox (path online directo)
    expect(db.outbox.add).not.toHaveBeenCalled();
  });

  it('forceAdd=true online → POST con forceAdd, escribe ítem del servidor, SIN outbox', async () => {
    const serverItem = {
      id: 'srv-item-2',
      listId: 'list-1',
      name: 'leche desnatada',
      checked: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    mockApiPost.mockResolvedValueOnce({
      decision: 'ADD_NEW',
      item: serverItem,
    });

    const { db } = await import('@/features/shopping/offline/db');
    const { useAddItemWithDedup } = await vi.importActual<
      typeof import('./hooks/useShopping')
    >('./hooks/useShopping');

    const { result } = renderHook(() => useAddItemWithDedup());

    let returnValue: { needsConfirmation: boolean } | undefined;
    await act(async () => {
      returnValue = await result.current.addItemWithDedup(
        'list-1',
        { name: 'leche desnatada' },
        { forceAdd: true },
      );
    });

    expect(returnValue).toEqual({ needsConfirmation: false });
    // El POST debe incluir forceAdd:true
    expect(mockApiPost).toHaveBeenCalledWith(
      '/lists/list-1/items',
      expect.objectContaining({ name: 'leche desnatada', forceAdd: true }),
    );
    // El ítem del servidor se escribe en Dexie
    expect(db.items.put).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'srv-item-2', name: 'leche desnatada' }),
    );
    // NO debe haber entrada en el outbox (add forzado online es POST directo)
    expect(db.outbox.add).not.toHaveBeenCalled();
  });

  it('offline → escritura en Dexie + outbox con forceAdd=true (sin POST inmediato)', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    const { db } = await import('@/features/shopping/offline/db');
    const { useAddItemWithDedup } = await vi.importActual<
      typeof import('./hooks/useShopping')
    >('./hooks/useShopping');

    const { result } = renderHook(() => useAddItemWithDedup());

    let returnValue: { needsConfirmation: boolean } | undefined;
    await act(async () => {
      returnValue = await result.current.addItemWithDedup('list-1', { name: 'Queso' });
    });

    expect(returnValue).toEqual({ needsConfirmation: false });
    // Escribe en Dexie de forma optimista
    expect(db.items.put).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Queso', listId: 'list-1', checked: false }),
    );
    // Encola con forceAdd=true
    expect(mockEnqueue).toHaveBeenCalledWith(
      'addItem',
      expect.objectContaining({ name: 'Queso', listId: 'list-1', forceAdd: true }),
    );
    // NO llama a la API directamente
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});
