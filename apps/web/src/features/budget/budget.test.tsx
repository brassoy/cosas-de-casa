/**
 * Tests de la feature budget (Fase 4A).
 *
 * Cubre:
 *  1. ReceiptsPage — render básico, captura con OCR, manejo de 503, alta manual.
 *  2. ReceiptDraftEditor — edición de borrador, cálculo de total.
 *  3. SpendPage — render de barras por categoría y mes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    useParams: () => ({ familyId: 'family-1', receiptId: 'receipt-1' }),
  };
});

// ── Mock de browser-image-compression ────────────────────────────────────────

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File) => file),
}));

// ── Mock de useBudget ─────────────────────────────────────────────────────────
// Nota: vi.mock se hoist — no puede referenciar variables top-level.
// Usamos vi.fn() por defecto y luego mockReturnValue en cada test.

vi.mock('@/features/budget/hooks/useBudget', () => {
  class ApiRequestError extends Error {
    constructor(
      public readonly status: number,
      public readonly body: { message: string },
    ) {
      super(body.message);
      this.name = 'ApiRequestError';
    }
  }

  return {
    useFamilyReceipts: vi.fn(() => ({ data: [], isLoading: false, error: null })),
    useReceiptDetail: vi.fn(() => ({ data: null, isLoading: false, error: null })),
    useSpendSummary: vi.fn(() => ({ data: null, isLoading: false, error: null })),
    useExtractReceipt: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isPending: false,
    })),
    useCreateReceipt: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useUpdateReceipt: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useDeleteReceipt: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    })),
    compressImageToBase64: vi.fn(async () => 'base64data'),
    budgetKeys: {
      all: ['budget'],
      receiptsByFamily: (id: string) => ['budget', 'receipts', id],
      receiptDetail: (id: string) => ['budget', 'receipt', id],
      spendSummary: (id: string) => ['budget', 'spend-summary', id],
    },
    ApiRequestError,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(ui: React.ReactElement) {
  return render(<QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>);
}

// ── Importaciones bajo test ───────────────────────────────────────────────────

import { ReceiptsPage } from './pages/ReceiptsPage';
import { ReceiptDraftEditor } from './components/ReceiptDraftEditor';
import { SpendPage } from './pages/SpendPage';
import * as useBudgetModule from './hooks/useBudget';

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Restaurar los mocks a su estado por defecto
  (useBudgetModule.useFamilyReceipts as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
  (useBudgetModule.useExtractReceipt as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  (useBudgetModule.useCreateReceipt as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  (useBudgetModule.useDeleteReceipt as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  });
  (useBudgetModule.useSpendSummary as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. ReceiptsPage
// ─────────────────────────────────────────────────────────────────────────────

describe('ReceiptsPage', () => {
  it('renderiza el título y el botón de capturar', () => {
    wrap(<ReceiptsPage />);
    expect(screen.getByText('Tickets y gasto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capturar ticket/i })).toBeInTheDocument();
  });

  it('muestra mensaje vacío cuando no hay tickets', () => {
    wrap(<ReceiptsPage />);
    expect(screen.getByText(/no hay tickets registrados/i)).toBeInTheDocument();
  });

  it('muestra la lista de tickets', () => {
    (useBudgetModule.useFamilyReceipts as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: 'r1',
          merchant: 'Mercadona',
          purchasedAt: '2026-05-20T10:00:00Z',
          total: 45.5,
          currency: 'EUR',
          status: 'confirmed',
          lineCount: 3,
        },
      ],
      isLoading: false,
      error: null,
    });
    wrap(<ReceiptsPage />);
    expect(screen.getByText('Mercadona')).toBeInTheDocument();
  });

  it('muestra el aviso de IA no disponible cuando extract devuelve 503', async () => {
    (useBudgetModule.useExtractReceipt as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(
        Object.assign(new Error('503'), { status: 503, body: { message: 'Unavailable' } }),
      ),
      isPending: false,
    });

    const user = userEvent.setup();
    wrap(<ReceiptsPage />);

    const fileInput = screen.getByLabelText(/seleccionar imagen del ticket/i);
    await user.upload(fileInput, new File(['img'], 'ticket.jpg', { type: 'image/jpeg' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/la ia no está disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/recargar la clave de minimax/i)).toBeInTheDocument();
  });

  it('el botón "Alta manual" aparece cuando la IA no está disponible y abre el editor', async () => {
    (useBudgetModule.useExtractReceipt as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(
        Object.assign(new Error('503'), { status: 503, body: { message: 'Unavailable' } }),
      ),
      isPending: false,
    });

    const user = userEvent.setup();
    wrap(<ReceiptsPage />);

    const fileInput = screen.getByLabelText(/seleccionar imagen del ticket/i);
    await user.upload(fileInput, new File(['img'], 'ticket.jpg', { type: 'image/jpeg' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /alta manual/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /alta manual/i }));

    await waitFor(() => {
      expect(screen.getByRole('main', { name: /editor de ticket/i })).toBeInTheDocument();
    });
  });

  it('tiene un input de fichero con accept=image/* y capture=environment', () => {
    wrap(<ReceiptsPage />);
    const fileInput = screen.getByLabelText(/seleccionar imagen del ticket/i);
    expect(fileInput).toHaveAttribute('accept', 'image/*');
    expect(fileInput).toHaveAttribute('capture', 'environment');
  });

  it('muestra el enlace "Ver gasto"', () => {
    wrap(<ReceiptsPage />);
    expect(screen.getByRole('button', { name: /ver gasto/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ReceiptDraftEditor
// ─────────────────────────────────────────────────────────────────────────────

describe('ReceiptDraftEditor', () => {
  const defaultDraft = {
    merchant: 'Lidl',
    purchasedAt: '2026-05-20',
    currency: 'EUR',
    lines: [
      { description: 'Leche', lineTotal: 1.2, category: 'groceries' as const },
      { description: 'Pan', lineTotal: 0.8, category: 'groceries' as const },
    ],
  };

  const defaultProps = {
    draft: defaultDraft,
    isSaving: false,
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it('pre-rellena el campo merchant con el valor del borrador', () => {
    wrap(<ReceiptDraftEditor {...defaultProps} />);
    expect(screen.getByDisplayValue('Lidl')).toBeInTheDocument();
  });

  it('muestra los artículos del borrador', () => {
    wrap(<ReceiptDraftEditor {...defaultProps} />);
    expect(screen.getByDisplayValue('Leche')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pan')).toBeInTheDocument();
  });

  it('calcula el total como suma de los importes de las líneas', () => {
    wrap(<ReceiptDraftEditor {...defaultProps} />);
    // total = 1.2 + 0.8 = 2.00 €
    expect(screen.getByText('2,00 €')).toBeInTheDocument();
  });

  it('puede añadir un nuevo artículo', async () => {
    const user = userEvent.setup();
    wrap(<ReceiptDraftEditor {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /añadir artículo/i }));

    const inputs = screen.getAllByLabelText(/descripción del artículo/i);
    expect(inputs).toHaveLength(3);
  });

  it('llama a onSave con los datos correctos al pulsar "Guardar ticket"', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    wrap(<ReceiptDraftEditor {...defaultProps} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /guardar ticket/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant: 'Lidl',
        total: 2,
        currency: 'EUR',
        lines: expect.arrayContaining([
          expect.objectContaining({ description: 'Leche' }),
        ]),
      }),
    );
  });

  it('llama a onCancel al pulsar "Cancelar"', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    wrap(<ReceiptDraftEditor {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('el botón Guardar está deshabilitado si no hay artículos', async () => {
    const user = userEvent.setup();
    wrap(
      <ReceiptDraftEditor
        {...defaultProps}
        draft={{ ...defaultDraft, lines: [] }}
      />,
    );

    expect(screen.getByRole('button', { name: /guardar ticket/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /añadir artículo/i }));

    expect(screen.getByRole('button', { name: /guardar ticket/i })).not.toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SpendPage
// ─────────────────────────────────────────────────────────────────────────────

describe('SpendPage', () => {
  it('renderiza el título de la página', () => {
    (useBudgetModule.useSpendSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { total: 0, currency: 'EUR', byCategory: [], byMonth: [] },
      isLoading: false,
      error: null,
    });
    wrap(<SpendPage />);
    expect(screen.getByText('Resumen de gasto')).toBeInTheDocument();
  });

  it('muestra el total formateado en euros', () => {
    (useBudgetModule.useSpendSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { total: 123.45, currency: 'EUR', byCategory: [], byMonth: [] },
      isLoading: false,
      error: null,
    });
    wrap(<SpendPage />);
    expect(screen.getByText('123,45 €')).toBeInTheDocument();
  });

  it('renderiza las barras por categoría', () => {
    (useBudgetModule.useSpendSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        total: 200,
        currency: 'EUR',
        byCategory: [
          { category: 'groceries', total: 150 },
          { category: 'household', total: 50 },
        ],
        byMonth: [],
      },
      isLoading: false,
      error: null,
    });
    wrap(<SpendPage />);
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Hogar')).toBeInTheDocument();
  });

  it('renderiza las barras por mes', () => {
    (useBudgetModule.useSpendSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        total: 100,
        currency: 'EUR',
        byCategory: [],
        byMonth: [
          { month: '2026-05', total: 60 },
          { month: '2026-04', total: 40 },
        ],
      },
      isLoading: false,
      error: null,
    });
    wrap(<SpendPage />);
    expect(screen.getByText(/mayo.*2026/i)).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay datos', () => {
    (useBudgetModule.useSpendSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { total: 0, currency: 'EUR', byCategory: [], byMonth: [] },
      isLoading: false,
      error: null,
    });
    wrap(<SpendPage />);
    expect(screen.getByText(/no hay datos de gasto/i)).toBeInTheDocument();
  });

  it('las barras tienen role=progressbar', () => {
    (useBudgetModule.useSpendSummary as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        total: 100,
        currency: 'EUR',
        byCategory: [{ category: 'groceries', total: 100 }],
        byMonth: [],
      },
      isLoading: false,
      error: null,
    });
    wrap(<SpendPage />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThan(0);
  });
});
