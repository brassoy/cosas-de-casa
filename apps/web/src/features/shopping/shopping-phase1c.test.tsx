/**
 * Tests de la Fase 1C: voz, artículos frecuentes y confirmación de dedup.
 *
 * Estrategia:
 * - VoiceAddButton: mocks de useVoiceRecognition y la llamada a /ai/extract-items.
 * - FrequentItemsBar: test de renderizado y click.
 * - DedupConfirmDialog: test de renderizado y acciones.
 * - Integración: useAddItemWithDedup con decisiones ADD_NEW, AUTO_MERGE y SUGGEST.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FrequentItemBarEntry } from '@/features/shopping/hooks/useFrequentItems';

// ── Mocks de infraestructura (idénticos al fichero shopping.test.tsx) ─────────

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      }),
    },
  },
}));

vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: vi.fn(
    (
      selector: (s: {
        user: { id: string; email: string; user_metadata: Record<string, unknown> };
      }) => unknown,
    ) =>
      selector({
        user: { id: 'user-1', email: 'test@example.com', user_metadata: {} },
      }),
  ),
}));

vi.mock('@/features/family/store/family.store', () => ({
  useFamilyStore: vi.fn(
    (
      selector: (s: {
        activeFamily: { id: string; name: string } | null;
      }) => unknown,
    ) => selector({ activeFamily: { id: 'family-1', name: 'Mi familia' } }),
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
        equals: vi.fn(() => ({ sortBy: vi.fn(() => Promise.resolve([])) })),
      })),
    },
    outbox: {
      add: vi.fn(() => Promise.resolve(1)),
      delete: vi.fn(() => Promise.resolve()),
      update: vi.fn(() => Promise.resolve(1)),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          sortBy: vi.fn(() => Promise.resolve([])),
        })),
      })),
    },
    transaction: vi.fn(
      async (_m: string, _t: unknown[], cb: () => Promise<void>) => cb(),
    ),
  },
}));

vi.mock('@/features/shopping/offline/sync', () => ({
  seedFromApi: vi.fn(async () => {}),
  seedListDetail: vi.fn(async () => {}),
  enqueue: vi.fn(async () => {}),
  replayOutbox: vi.fn(async () => {}),
}));

vi.mock('@/features/shopping/store/shopping.store', () => ({
  useShoppingStore: vi.fn(
    (
      selector: (s: {
        openItemId: string | null;
        openItem: (id: string) => void;
        closeItem: () => void;
      }) => unknown,
    ) =>
      selector({
        openItemId: null,
        openItem: vi.fn(),
        closeItem: vi.fn(),
      }),
  ),
}));

// ── Mock de hooks de shopping ─────────────────────────────────────────────────

const mockAddItemWithDedup = vi.fn(async () => ({ needsConfirmation: false }));
const mockConfirmDedup = vi.fn(async () => {});
const mockCancelDedup = vi.fn();

vi.mock('@/features/shopping/hooks/useShopping', () => ({
  useShoppingListDetail: vi.fn(() => ({
    list: {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Lista de prueba',
      type: 'CUSTOM',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
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
    confirmDedup: mockConfirmDedup,
    cancelDedup: mockCancelDedup,
    autoMergeMessage: null,
  })),
}));

// ── Mock de useFrequentItems ──────────────────────────────────────────────────

let mockFrequentItems: FrequentItemBarEntry[] = [];
let mockFrequentLoading = false;

vi.mock('@/features/shopping/hooks/useFrequentItems', () => ({
  useFrequentItems: vi.fn(() => ({
    items: mockFrequentItems,
    loading: mockFrequentLoading,
  })),
}));

// ── Mock de useVoiceRecognition ───────────────────────────────────────────────

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

let mockVoiceSupported = true;
let mockVoiceState: VoiceState = 'idle';
let mockInterimTranscript = '';
let mockVoiceErrorMessage: string | null = null;
const mockVoiceStart = vi.fn();
const mockVoiceStop = vi.fn();

// Guardamos la referencia al callback para poder invocarlo en tests
let capturedOnFinalTranscript: ((t: string) => void) | null = null;

vi.mock('@/features/shopping/hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: vi.fn((onFinalTranscript: (t: string) => void) => {
    capturedOnFinalTranscript = onFinalTranscript;
    return {
      supported: mockVoiceSupported,
      state: mockVoiceState,
      interimTranscript: mockInterimTranscript,
      start: mockVoiceStart,
      stop: mockVoiceStop,
      errorMessage: mockVoiceErrorMessage,
    };
  }),
}));

// ── Mock de api ───────────────────────────────────────────────────────────────

const { mockApiPost } = vi.hoisted(() => ({
  mockApiPost: vi.fn(async () => ({ items: ['leche', 'pan'] })),
}));

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn(async () => []),
    post: mockApiPost,
    patch: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function wrap(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>,
  );
}

// ── Importaciones bajo test ───────────────────────────────────────────────────

import { VoiceAddButton } from './components/VoiceAddButton';
import { FrequentItemsBar } from './components/FrequentItemsBar';
import { DedupConfirmDialog } from './components/DedupConfirmDialog';
import { ListDetailPage } from './pages/ListDetailPage';
import * as shoppingHooks from '@/features/shopping/hooks/useShopping';

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockVoiceSupported = true;
  mockVoiceState = 'idle';
  mockInterimTranscript = '';
  mockVoiceErrorMessage = null;
  capturedOnFinalTranscript = null;
  mockFrequentItems = [];
  mockFrequentLoading = false;
  mockAddItemWithDedup.mockResolvedValue({ needsConfirmation: false });
  mockConfirmDedup.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    writable: true,
    configurable: true,
  });
});

// ── 1. VoiceAddButton ─────────────────────────────────────────────────────────

describe('VoiceAddButton', () => {
  it('muestra el botón de micrófono cuando la API está soportada', () => {
    wrap(<VoiceAddButton onAddItems={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /añadir por voz/i }),
    ).toBeInTheDocument();
  });

  it('muestra mensaje de fallback cuando la Web Speech API no está soportada', () => {
    mockVoiceSupported = false;
    wrap(<VoiceAddButton onAddItems={vi.fn()} />);
    expect(
      screen.getByText(/tu navegador no es compatible/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /añadir por voz/i }),
    ).not.toBeInTheDocument();
  });

  it('el botón está deshabilitado cuando está offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    wrap(<VoiceAddButton onAddItems={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /añadir por voz/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });

  it('pulsar el botón llama a start del reconocimiento', async () => {
    const user = userEvent.setup();
    wrap(<VoiceAddButton onAddItems={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /añadir por voz/i }));
    expect(mockVoiceStart).toHaveBeenCalledOnce();
  });

  it('muestra el texto interim durante el reconocimiento', () => {
    mockVoiceState = 'listening';
    mockInterimTranscript = 'leche entera';
    wrap(<VoiceAddButton onAddItems={vi.fn()} />);
    expect(screen.getByText(/"leche entera…"/i)).toBeInTheDocument();
  });

  it('muestra chips de confirmación tras obtener ítems extraídos', async () => {
    mockApiPost.mockResolvedValueOnce({ items: ['leche', 'pan'] });
    const onAddItems = vi.fn(async () => {});
    wrap(<VoiceAddButton onAddItems={onAddItems} />);

    // Simular transcript final
    await act(async () => {
      capturedOnFinalTranscript?.('necesito leche y pan');
    });

    await waitFor(() => {
      expect(screen.getByText('leche')).toBeInTheDocument();
      expect(screen.getByText('pan')).toBeInTheDocument();
    });
  });

  it('al confirmar los chips seleccionados llama a onAddItems', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValueOnce({ items: ['leche', 'pan'] });
    const onAddItems = vi.fn(async () => {});
    wrap(<VoiceAddButton onAddItems={onAddItems} />);

    await act(async () => {
      capturedOnFinalTranscript?.('necesito leche y pan');
    });

    await waitFor(() => screen.getByText('leche'));
    await user.click(screen.getByRole('button', { name: /añadir todos/i }));

    await waitFor(() => {
      expect(onAddItems).toHaveBeenCalledWith(['leche', 'pan']);
    });
  });

  it('deseleccionar un chip lo excluye de la confirmación', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValueOnce({ items: ['leche', 'pan'] });
    const onAddItems = vi.fn(async () => {});
    wrap(<VoiceAddButton onAddItems={onAddItems} />);

    await act(async () => {
      capturedOnFinalTranscript?.('necesito leche y pan');
    });

    await waitFor(() => screen.getByText('leche'));

    // Deseleccionar 'pan'
    await user.click(screen.getByRole('button', { name: /deseleccionar pan/i }));
    await user.click(screen.getByRole('button', { name: /añadir 1/i }));

    await waitFor(() => {
      expect(onAddItems).toHaveBeenCalledWith(['leche']);
    });
  });

  it('muestra error de voz cuando errorMessage no es nulo', () => {
    mockVoiceErrorMessage = 'Permiso de micrófono denegado.';
    wrap(<VoiceAddButton onAddItems={vi.fn()} />);
    expect(screen.getByText(/permiso de micrófono denegado/i)).toBeInTheDocument();
  });

  it('muestra error de extracción si el POST /ai/extract-items falla', async () => {
    mockApiPost.mockRejectedValueOnce(new Error('Network error'));
    wrap(<VoiceAddButton onAddItems={vi.fn()} />);

    await act(async () => {
      capturedOnFinalTranscript?.('quiero algo');
    });

    await waitFor(() => {
      expect(
        screen.getByText(/no se ha podido extraer los artículos/i),
      ).toBeInTheDocument();
    });
  });
});

// ── 2. FrequentItemsBar ───────────────────────────────────────────────────────

describe('FrequentItemsBar', () => {
  it('no renderiza nada si no hay artículos frecuentes', () => {
    const { container } = wrap(
      <FrequentItemsBar items={[]} loading={false} onAdd={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('no renderiza nada mientras carga', () => {
    const { container } = wrap(
      <FrequentItemsBar
        items={[{ name: 'leche', count: 5 }]}
        loading={true}
        onAdd={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra los chips de artículos frecuentes', () => {
    wrap(
      <FrequentItemsBar
        items={[
          { name: 'leche', count: 10 },
          { name: 'pan', count: 8 },
        ]}
        loading={false}
        onAdd={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /añadir leche rápidamente/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /añadir pan rápidamente/i }),
    ).toBeInTheDocument();
  });

  it('pulsar un chip llama a onAdd con el nombre del artículo', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(async () => {});
    wrap(
      <FrequentItemsBar
        items={[{ name: 'leche', count: 10 }]}
        loading={false}
        onAdd={onAdd}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: /añadir leche rápidamente/i }),
    );
    expect(onAdd).toHaveBeenCalledWith('leche');
  });
});

// ── 3. DedupConfirmDialog ─────────────────────────────────────────────────────

describe('DedupConfirmDialog', () => {
  it('muestra el nombre del artículo existente', () => {
    wrap(
      <DedupConfirmDialog
        existingName="leche entera"
        newItemName="leche"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/"leche entera"/i)).toBeInTheDocument();
  });

  it('muestra el nombre del artículo nuevo cuando difiere del existente', () => {
    wrap(
      <DedupConfirmDialog
        existingName="leche entera"
        newItemName="leche desnatada"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/"leche desnatada"/i)).toBeInTheDocument();
  });

  it('pulsar "Añadir igualmente" llama a onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => {});
    wrap(
      <DedupConfirmDialog
        existingName="leche entera"
        newItemName="leche"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: /añadir igualmente/i }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('pulsar "Cancelar" llama a onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    wrap(
      <DedupConfirmDialog
        existingName="leche entera"
        newItemName="leche"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('pulsar el overlay llama a onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { container } = wrap(
      <DedupConfirmDialog
        existingName="leche entera"
        newItemName="leche"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    // El overlay es el primer div del dialog
    const overlay = container.firstChild as HTMLElement;
    await user.click(overlay);
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

// ── 4. Integración: ListDetailPage con dedup ──────────────────────────────────

describe('ListDetailPage — dedup integration', () => {
  it('muestra el diálogo de dedup cuando dedupState no es null', () => {
    vi.mocked(shoppingHooks.useAddItemWithDedup).mockReturnValueOnce({
      addItemWithDedup: mockAddItemWithDedup,
      dedupState: {
        listId: 'list-1',
        itemData: { name: 'leche' },
        existingName: 'leche entera',
      },
      confirmDedup: mockConfirmDedup,
      cancelDedup: mockCancelDedup,
      autoMergeMessage: null,
    });

    wrap(<ListDetailPage />);
    expect(screen.getByRole('dialog', { name: /artículo similar/i })).toBeInTheDocument();
    expect(screen.getByText(/"leche entera"/)).toBeInTheDocument();
  });

  it('muestra el toast de auto_merge cuando autoMergeMessage no es null', () => {
    vi.mocked(shoppingHooks.useAddItemWithDedup).mockReturnValueOnce({
      addItemWithDedup: mockAddItemWithDedup,
      dedupState: null,
      confirmDedup: mockConfirmDedup,
      cancelDedup: mockCancelDedup,
      autoMergeMessage: '"leche" se ha fusionado con un artículo existente.',
    });

    wrap(<ListDetailPage />);
    expect(
      screen.getByText(/se ha fusionado con un artículo existente/i),
    ).toBeInTheDocument();
  });

  it('los artículos frecuentes aparecen en la página', () => {
    mockFrequentItems = [{ name: 'tomates', count: 7 }];
    wrap(<ListDetailPage />);
    expect(
      screen.getByRole('button', { name: /añadir tomates rápidamente/i }),
    ).toBeInTheDocument();
  });
});
