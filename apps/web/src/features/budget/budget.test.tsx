/**
 * Tests de la feature budget (vistas presentacionales `base`).
 *
 * Tras la migración a themes, el render vive en las vistas presentacionales
 * `views/base/*View` (props in / callbacks out). Los containers
 * (`ReceiptsPage`/`ReceiptDetailPage`/`SpendPage`) solo cablean la lógica real
 * (queries, máquina de captura, OCR, mutaciones) y delegan en `ThemeView`. Por
 * eso los tests de UI apuntan directamente a las vistas.
 *
 * Cubre:
 *  1. ReceiptsView       — cabecera, vacío, listado, captura/OCR 503, alta manual, editor.
 *  2. ReceiptDraftEditor — pre-relleno, total calculado, añadir línea, guardar/cancelar.
 *  3. ReceiptDetailView  — resumen, líneas, editar (abre editor), borrar.
 *  4. SpendView          — total, barras por categoría/mes, sin datos, role=progressbar.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  ReceiptDto,
  ReceiptSummaryDto,
  SpendSummaryDto,
} from './contracts';
import type {
  ReceiptsViewProps,
  ReceiptDetailViewProps,
  SpendViewProps,
} from './views/types';

import ReceiptsView from './views/base/ReceiptsView';
import ReceiptDraftEditor from './views/base/ReceiptDraftEditor';
import ReceiptDetailView from './views/base/ReceiptDetailView';
import SpendView from './views/base/SpendView';

// ── Factories ──────────────────────────────────────────────────────────────────

const MOCK_RECEIPTS: ReceiptSummaryDto[] = [
  {
    id: 'r1',
    merchant: 'Mercadona',
    purchasedAt: '2026-05-20T10:00:00Z',
    total: 45.5,
    currency: 'EUR',
    status: 'confirmed',
    lineCount: 3,
  },
];

const MOCK_RECEIPT: ReceiptDto = {
  id: 'r-abc',
  familyId: 'fam-1',
  merchant: 'Lidl',
  purchasedAt: '2026-05-20',
  total: 2,
  currency: 'EUR',
  status: 'draft',
  lines: [
    { id: 'l1', description: 'Leche', lineTotal: 1.2, category: 'groceries' },
    { id: 'l2', description: 'Pan', lineTotal: 0.8, category: 'groceries' },
  ],
  createdBy: 'user-1',
  createdAt: '2026-05-20T10:00:00Z',
};

const MOCK_SUMMARY: SpendSummaryDto = {
  total: 200,
  currency: 'EUR',
  byCategory: [
    { category: 'groceries', total: 150 },
    { category: 'household', total: 50 },
  ],
  byMonth: [
    { month: '2026-05', total: 120 },
    { month: '2026-04', total: 80 },
  ],
};

// ── Helpers de render ──────────────────────────────────────────────────────────

function renderReceipts(overrides: Partial<ReceiptsViewProps> = {}) {
  const props: ReceiptsViewProps = {
    receipts: [],
    isLoading: false,
    error: null,
    capture: { phase: 'idle' },
    captureError: null,
    isSavingDraft: false,
    onCapture: vi.fn(),
    onManualEntry: vi.fn(),
    onCancelCapture: vi.fn(),
    onSaveDraft: vi.fn(),
    onOpen: vi.fn(),
    onDelete: vi.fn(),
    onGoSpend: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ReceiptsView {...props} />) };
}

function renderDetail(overrides: Partial<ReceiptDetailViewProps> = {}) {
  const props: ReceiptDetailViewProps = {
    receipt: MOCK_RECEIPT,
    isEditing: false,
    isLoading: false,
    error: null,
    isSaving: false,
    isDeleting: false,
    onBack: vi.fn(),
    onToggleEdit: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ReceiptDetailView {...props} />) };
}

function renderSpend(overrides: Partial<SpendViewProps> = {}) {
  const props: SpendViewProps = {
    summary: MOCK_SUMMARY,
    isLoading: false,
    error: null,
    onBack: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<SpendView {...props} />) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ReceiptsView
// ─────────────────────────────────────────────────────────────────────────────

describe('ReceiptsView', () => {
  it('renderiza el título y el botón de capturar', () => {
    renderReceipts();
    expect(screen.getByText('Tickets y gasto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capturar ticket/i })).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay tickets', () => {
    renderReceipts({ receipts: [] });
    expect(screen.getByText(/aún no hay tickets registrados/i)).toBeInTheDocument();
  });

  it('muestra la lista de tickets', () => {
    renderReceipts({ receipts: MOCK_RECEIPTS });
    expect(screen.getByText('Mercadona')).toBeInTheDocument();
    expect(screen.getByText('45,50 €')).toBeInTheDocument();
  });

  it('tiene un input de fichero con accept=image/* y capture=environment', () => {
    renderReceipts();
    const fileInput = screen.getByLabelText(/seleccionar imagen del ticket/i);
    expect(fileInput).toHaveAttribute('accept', 'image/*');
    expect(fileInput).toHaveAttribute('capture', 'environment');
  });

  it('emite onCapture al seleccionar un archivo', async () => {
    const onCapture = vi.fn();
    const user = userEvent.setup();
    renderReceipts({ onCapture });

    const fileInput = screen.getByLabelText(/seleccionar imagen del ticket/i);
    await user.upload(fileInput, new File(['img'], 'ticket.jpg', { type: 'image/jpeg' }));

    expect(onCapture).toHaveBeenCalledTimes(1);
  });

  it('muestra "Procesando…" y deshabilita el botón mientras extrae', () => {
    renderReceipts({ capture: { phase: 'extracting' } });
    expect(screen.getByRole('button', { name: /capturar ticket/i })).toBeDisabled();
    expect(screen.getByText(/procesando/i)).toBeInTheDocument();
  });

  it('muestra el aviso de IA no disponible (503) con "Alta manual" y "Cancelar"', () => {
    renderReceipts({ capture: { phase: 'ai-unavailable' } });
    expect(screen.getByText(/la ia no está disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/recargar la clave de minimax/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /alta manual/i })).toBeInTheDocument();
  });

  it('emite onManualEntry al pulsar "Alta manual"', async () => {
    const onManualEntry = vi.fn();
    const user = userEvent.setup();
    renderReceipts({ capture: { phase: 'ai-unavailable' }, onManualEntry });
    await user.click(screen.getByRole('button', { name: /alta manual/i }));
    expect(onManualEntry).toHaveBeenCalled();
  });

  it('renderiza el editor de borrador a pantalla completa en fase draft', () => {
    renderReceipts({
      capture: {
        phase: 'draft',
        draft: { currency: 'EUR', lines: [{ description: 'Café', lineTotal: 3, category: 'groceries' }] },
      },
    });
    expect(screen.getByRole('main', { name: /editor de ticket/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Café')).toBeInTheDocument();
  });

  it('renderiza el editor en fase manual con borrador vacío', () => {
    renderReceipts({ capture: { phase: 'manual', draft: { lines: [], currency: 'EUR' } } });
    expect(screen.getByRole('main', { name: /editor de ticket/i })).toBeInTheDocument();
  });

  it('muestra el botón "Ver gasto"', () => {
    renderReceipts();
    expect(screen.getByRole('button', { name: /ver gasto/i })).toBeInTheDocument();
  });

  it('emite onDelete al pulsar el botón de eliminar de una fila', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderReceipts({ receipts: MOCK_RECEIPTS, onDelete });
    await user.click(screen.getByRole('button', { name: /eliminar ticket mercadona/i }));
    expect(onDelete).toHaveBeenCalledWith('r1');
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

  function renderEditor(overrides: Partial<React.ComponentProps<typeof ReceiptDraftEditor>> = {}) {
    const props = {
      draft: defaultDraft,
      isSaving: false,
      onSave: vi.fn(),
      onCancel: vi.fn(),
      ...overrides,
    };
    return { props, ...render(<ReceiptDraftEditor {...props} />) };
  }

  it('pre-rellena el campo merchant con el valor del borrador', () => {
    renderEditor();
    expect(screen.getByDisplayValue('Lidl')).toBeInTheDocument();
  });

  it('muestra los artículos del borrador', () => {
    renderEditor();
    expect(screen.getByDisplayValue('Leche')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pan')).toBeInTheDocument();
  });

  it('calcula el total como suma de los importes de las líneas', () => {
    renderEditor();
    // total = 1.2 + 0.8 = 2,00 €
    expect(screen.getByText('2,00 €')).toBeInTheDocument();
  });

  it('puede añadir un nuevo artículo', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: /añadir artículo/i }));
    const inputs = screen.getAllByLabelText(/descripción del artículo/i);
    expect(inputs).toHaveLength(3);
  });

  it('llama a onSave con el CreateReceiptInput completo al guardar', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderEditor({ onSave });
    await user.click(screen.getByRole('button', { name: /guardar ticket/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant: 'Lidl',
        purchasedAt: '2026-05-20',
        total: 2,
        currency: 'EUR',
        lines: expect.arrayContaining([
          expect.objectContaining({ description: 'Leche', category: 'groceries' }),
        ]),
      }),
    );
  });

  it('llama a onCancel al pulsar "Cancelar"', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderEditor({ onCancel });
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('el botón Guardar está deshabilitado si no hay artículos y se habilita al añadir', async () => {
    const user = userEvent.setup();
    renderEditor({ draft: { ...defaultDraft, lines: [] } });
    expect(screen.getByRole('button', { name: /guardar ticket/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /añadir artículo/i }));
    expect(screen.getByRole('button', { name: /guardar ticket/i })).not.toBeDisabled();
  });

  it('respeta el title y el saveLabel personalizados (modo edición)', () => {
    renderEditor({ title: 'Editar ticket', saveLabel: 'Guardar cambios' });
    expect(screen.getByText('Editar ticket')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ReceiptDetailView
// ─────────────────────────────────────────────────────────────────────────────

describe('ReceiptDetailView', () => {
  it('muestra el establecimiento, el total y el badge de borrador', () => {
    renderDetail();
    expect(screen.getByText('Lidl')).toBeInTheDocument();
    expect(screen.getByText('2,00 €')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
  });

  it('muestra las líneas con su categoría', () => {
    renderDetail();
    expect(screen.getByText('Leche')).toBeInTheDocument();
    expect(screen.getByText('Pan')).toBeInTheDocument();
    expect(screen.getAllByText('Supermercado').length).toBeGreaterThan(0);
  });

  it('emite onToggleEdit al pulsar "Editar"', async () => {
    const onToggleEdit = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onToggleEdit });
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(onToggleEdit).toHaveBeenCalled();
  });

  it('emite onBack al pulsar "‹ Tickets"', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onBack });
    await user.click(screen.getByRole('button', { name: /tickets/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('emite onDelete al pulsar "Borrar ticket"', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderDetail({ onDelete });
    await user.click(screen.getByRole('button', { name: /borrar ticket/i }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('en modo edición muestra el editor de borrador sembrado con el ticket', () => {
    renderDetail({ isEditing: true });
    expect(screen.getByRole('main', { name: /editor de ticket/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lidl')).toBeInTheDocument();
    expect(screen.getByText('Editar ticket')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SpendView
// ─────────────────────────────────────────────────────────────────────────────

describe('SpendView', () => {
  it('renderiza el título de la página', () => {
    renderSpend();
    expect(screen.getByText('Resumen de gasto')).toBeInTheDocument();
  });

  it('muestra el total formateado en euros', () => {
    renderSpend({ summary: { total: 123.45, currency: 'EUR', byCategory: [], byMonth: [] } });
    expect(screen.getByText('123,45 €')).toBeInTheDocument();
  });

  it('renderiza las barras por categoría con sus etiquetas', () => {
    renderSpend();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Hogar')).toBeInTheDocument();
  });

  it('renderiza las barras por mes', () => {
    renderSpend();
    expect(screen.getByText(/mayo.*2026/i)).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay datos', () => {
    renderSpend({ summary: { total: 0, currency: 'EUR', byCategory: [], byMonth: [] } });
    expect(screen.getByText(/no hay datos de gasto/i)).toBeInTheDocument();
  });

  it('las barras tienen role=progressbar', () => {
    renderSpend();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });

  it('emite onBack al pulsar "‹ Tickets"', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    renderSpend({ onBack });
    await user.click(screen.getByRole('button', { name: /tickets/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('muestra el estado de carga (no muestra el total)', () => {
    renderSpend({ isLoading: true });
    expect(screen.queryByText('200,00 €')).not.toBeInTheDocument();
  });
});
