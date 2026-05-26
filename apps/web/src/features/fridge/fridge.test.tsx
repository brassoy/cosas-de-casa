/**
 * Tests de la feature fridge (Fase 2B).
 *
 * Cubre:
 *  1. FridgePage — render básico, orden por caducidad, urgencia por color
 *  2. AddFridgeItemModal — validación de nombre obligatorio, envío del formulario
 *  3. Acciones de ítem — comer / tirar / congelar llaman al endpoint correcto
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks de infraestructura ──────────────────────────────────────────────────

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}));

vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: vi.fn(
    (selector: (s: { user: { id: string } }) => unknown) =>
      selector({ user: { id: 'user-1' } }),
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
    useParams: () => ({ familyId: 'family-1' }),
  };
});

// ── Helpers de datos ──────────────────────────────────────────────────────────

/** Devuelve una fecha ISO relativa a hoy en días (0 = hoy, -1 = ayer, +3 = pasado mañana). */
function relativeDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0]!;
}

const makeFridgeItem = (overrides: Partial<{
  id: string;
  name: string;
  location: 'FRIDGE' | 'FREEZER' | 'PANTRY';
  expiryDate: string | null;
}> = {}) => ({
  id: overrides.id ?? 'item-1',
  familyId: 'family-1',
  name: overrides.name ?? 'Leche',
  quantity: '1.000',
  unit: 'l',
  location: overrides.location ?? 'FRIDGE',
  expiryDate: overrides.expiryDate !== undefined ? overrides.expiryDate : null,
  createdBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ── Spies de las mutaciones ───────────────────────────────────────────────────

const mockCreateItem = vi.fn();
const mockEat = vi.fn();
const mockThrow = vi.fn();
const mockFreeze = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();

// ── Mock de useFridge ─────────────────────────────────────────────────────────

let mockFridgeItems: ReturnType<typeof makeFridgeItem>[] = [];

vi.mock('@/features/fridge/hooks/useFridge', () => ({
  useFamilyFridge: vi.fn(() => ({
    data: mockFridgeItems,
    isLoading: false,
    error: null,
  })),
  useCreateFridgeItem: vi.fn(() => ({
    mutate: mockCreateItem,
    isPending: false,
  })),
  useUpdateFridgeItem: vi.fn(() => ({
    mutate: mockUpdate,
    isPending: false,
  })),
  useDeleteFridgeItem: vi.fn(() => ({
    mutate: mockDelete,
    isPending: false,
  })),
  useEatFridgeItem: vi.fn(() => ({
    mutate: mockEat,
    isPending: false,
  })),
  useThrowFridgeItem: vi.fn(() => ({
    mutate: mockThrow,
    isPending: false,
  })),
  useFreezeFridgeItem: vi.fn(() => ({
    mutate: mockFreeze,
    isPending: false,
  })),
  fridgeKeys: {
    all: ['fridge'],
    byFamily: (id: string) => ['fridge', 'family', id],
  },
  ApiRequestError: class extends Error {
    constructor(
      public readonly status: number,
      public readonly body: { message: string },
    ) {
      super(body.message);
    }
  },
}));

// ── Helpers de render ─────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(ui: React.ReactElement) {
  return render(<QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>);
}

// ── Importaciones bajo test ───────────────────────────────────────────────────

import { FridgePage } from './pages/FridgePage';
import { AddFridgeItemModal } from './components/AddFridgeItemModal';

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockFridgeItems = [];
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. FridgePage — render y orden por caducidad
// ─────────────────────────────────────────────────────────────────────────────

describe('FridgePage', () => {
  it('renderiza el título y el botón de añadir', () => {
    wrap(<FridgePage />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /añadir producto/i })).toBeInTheDocument();
  });

  it('muestra el mensaje vacío cuando no hay productos', () => {
    mockFridgeItems = [];
    wrap(<FridgePage />);
    expect(screen.getByText(/despensa está vacía/i)).toBeInTheDocument();
  });

  it('muestra los productos de la familia', () => {
    mockFridgeItems = [
      makeFridgeItem({ id: 'i1', name: 'Leche', expiryDate: null }),
      makeFridgeItem({ id: 'i2', name: 'Yogur', expiryDate: null }),
    ];
    wrap(<FridgePage />);
    expect(screen.getAllByText('Leche').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Yogur').length).toBeGreaterThan(0);
  });

  it('ordena los ítems: el que caduca antes aparece primero', () => {
    mockFridgeItems = [
      makeFridgeItem({ id: 'i1', name: 'Queso', expiryDate: relativeDate(10) }),
      makeFridgeItem({ id: 'i2', name: 'Leche', expiryDate: relativeDate(1) }),
      makeFridgeItem({ id: 'i3', name: 'Pasta', expiryDate: null }),
    ];
    wrap(<FridgePage />);

    const cards = screen.getAllByRole('listitem');
    // "Leche" (caduca mañana) debe aparecer antes que "Queso" (caduca en 10 días)
    const lecheIdx = cards.findIndex((c) => c.textContent?.includes('Leche'));
    const quesoIdx = cards.findIndex((c) => c.textContent?.includes('Queso'));
    expect(lecheIdx).toBeLessThan(quesoIdx);
  });

  it('muestra la sección "Consumir primero" con ítems caducados/urgentes', () => {
    mockFridgeItems = [
      makeFridgeItem({ id: 'expired', name: 'Mantequilla', expiryDate: relativeDate(-1) }),
      makeFridgeItem({ id: 'ok', name: 'Pasta', expiryDate: relativeDate(30) }),
    ];
    wrap(<FridgePage />);
    expect(screen.getByText(/consumir primero/i)).toBeInTheDocument();
    // La mantequilla caducada debe aparecer en la sección urgente
    const urgentSection = screen.getByRole('region', { name: /consumir primero/i });
    expect(within(urgentSection).getByText('Mantequilla')).toBeInTheDocument();
  });

  it('ítem caducado tiene color de error (data-urgency=expired)', () => {
    mockFridgeItems = [
      makeFridgeItem({ id: 'exp', name: 'Yogur caducado', expiryDate: relativeDate(-2) }),
    ];
    wrap(<FridgePage />);
    const expired = screen.getAllByRole('listitem').find((el) =>
      el.getAttribute('data-urgency') === 'expired',
    );
    expect(expired).toBeTruthy();
  });

  it('ítem que caduca en ≤2 días tiene urgency=warning', () => {
    mockFridgeItems = [
      makeFridgeItem({ id: 'warn', name: 'Leche próxima', expiryDate: relativeDate(1) }),
    ];
    wrap(<FridgePage />);
    const warning = screen.getAllByRole('listitem').find((el) =>
      el.getAttribute('data-urgency') === 'warning',
    );
    expect(warning).toBeTruthy();
  });

  it('ítem sin fecha de caducidad tiene urgency=none', () => {
    mockFridgeItems = [
      makeFridgeItem({ id: 'none', name: 'Arroz', expiryDate: null }),
    ];
    wrap(<FridgePage />);
    const noExpiry = screen.getAllByRole('listitem').find((el) =>
      el.getAttribute('data-urgency') === 'none',
    );
    expect(noExpiry).toBeTruthy();
  });

  it('abre el modal al pulsar "+ Añadir"', async () => {
    const user = userEvent.setup();
    wrap(<FridgePage />);
    await user.click(screen.getByRole('button', { name: /añadir producto/i }));
    expect(screen.getByRole('dialog', { name: /añadir producto/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AddFridgeItemModal — validación y envío
// ─────────────────────────────────────────────────────────────────────────────

describe('AddFridgeItemModal — validación', () => {
  const defaultProps = {
    familyId: 'family-1',
    onClose: vi.fn(),
  };

  it('muestra el campo de nombre', () => {
    wrap(<AddFridgeItemModal {...defaultProps} />);
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
  });

  it('el botón Añadir está deshabilitado cuando el nombre está vacío', () => {
    wrap(<AddFridgeItemModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /^añadir$/i })).toBeDisabled();
  });

  it('el botón Añadir se habilita al escribir un nombre', async () => {
    const user = userEvent.setup();
    wrap(<AddFridgeItemModal {...defaultProps} />);
    await user.type(screen.getByLabelText(/nombre/i), 'Leche');
    expect(screen.getByRole('button', { name: /^añadir$/i })).not.toBeDisabled();
  });

  it('llama a createItem.mutate con los datos correctos al enviar', async () => {
    const user = userEvent.setup();
    wrap(<AddFridgeItemModal {...defaultProps} />);

    await user.type(screen.getByLabelText(/nombre/i), 'Leche entera');
    await user.click(screen.getByRole('button', { name: /^añadir$/i }));

    await waitFor(() => {
      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Leche entera', location: 'FRIDGE' }),
        expect.any(Object),
      );
    });
  });

  it('incluye la ubicación seleccionada en el payload', async () => {
    const user = userEvent.setup();
    wrap(<AddFridgeItemModal {...defaultProps} />);

    await user.type(screen.getByLabelText(/nombre/i), 'Guisantes');
    await user.selectOptions(screen.getByLabelText(/ubicación/i), 'FREEZER');
    await user.click(screen.getByRole('button', { name: /^añadir$/i }));

    await waitFor(() => {
      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Guisantes', location: 'FREEZER' }),
        expect.any(Object),
      );
    });
  });

  it('incluye la fecha de caducidad cuando se rellena', async () => {
    const user = userEvent.setup();
    wrap(<AddFridgeItemModal {...defaultProps} />);

    await user.type(screen.getByLabelText(/nombre/i), 'Yogur');
    await user.type(screen.getByLabelText(/fecha de caducidad/i), '2026-06-01');
    await user.click(screen.getByRole('button', { name: /^añadir$/i }));

    await waitFor(() => {
      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({ expiryDate: '2026-06-01' }),
        expect.any(Object),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Acciones de ítem: comer / tirar / congelar
// ─────────────────────────────────────────────────────────────────────────────

describe('Acciones de ítem', () => {
  beforeEach(() => {
    mockFridgeItems = [
      makeFridgeItem({ id: 'item-1', name: 'Leche', location: 'FRIDGE', expiryDate: null }),
    ];
  });

  it('pulsar "Comer" llama a useEatFridgeItem.mutate', async () => {
    const user = userEvent.setup();
    wrap(<FridgePage />);

    await user.click(screen.getByRole('button', { name: /marcar leche como consumido/i }));

    expect(mockEat).toHaveBeenCalled();
  });

  it('pulsar "Tirar" llama a useThrowFridgeItem.mutate', async () => {
    const user = userEvent.setup();
    wrap(<FridgePage />);

    await user.click(screen.getByRole('button', { name: /tirar leche/i }));

    expect(mockThrow).toHaveBeenCalled();
  });

  it('pulsar "Congelar" llama a useFreezeFridgeItem.mutate', async () => {
    const user = userEvent.setup();
    wrap(<FridgePage />);

    await user.click(screen.getByRole('button', { name: /congelar leche/i }));

    expect(mockFreeze).toHaveBeenCalled();
  });

  it('no muestra "Congelar" para ítems ya en el congelador', () => {
    mockFridgeItems = [
      makeFridgeItem({ id: 'item-2', name: 'Helado', location: 'FREEZER', expiryDate: null }),
    ];
    wrap(<FridgePage />);

    expect(screen.queryByRole('button', { name: /congelar helado/i })).not.toBeInTheDocument();
  });
});
