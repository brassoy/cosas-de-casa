/**
 * Tests de la vista presentacional `base` de la feature fridge (Fase 2, theme base).
 *
 * Se testea la VISTA pura `FridgeListView` (import default + render con props),
 * NO el container: el container delega en `ThemeView` y su registry se compone en
 * otra fase. Los tests del antiguo container/modales se reubican aquí contra la
 * vista presentacional.
 *
 * Cubre:
 *  1. Render básico — título, botón de añadir, listado, vacío.
 *  2. Orden por caducidad — la vista respeta el orden recibido (precalculado en
 *     el container) y pinta `data-urgency` con la urgencia precalculada.
 *  3. Sección "Consumir primero" — visible solo con filter=ALL.
 *  4. Diálogo de añadir — abrir, validación de nombre, payload de `onAdd`.
 *  5. Acciones de ítem — tirar / congelar / eliminar / editar.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FridgeListView from './views/base/FridgeListView';
import { getExpiryUrgency, urgencyLabel } from './types';
import type { FridgeListItem, FridgeListViewProps } from './views/types';

// ── Helpers de datos ──────────────────────────────────────────────────────────

/** Fecha (YYYY-MM-DD) relativa a hoy en días, en hora LOCAL.
 * Debe ser consistente con getExpiryUrgency, que interpreta 'YYYY-MM-DD' como
 * medianoche local. Usar toISOString() (UTC) desfasaba el día cerca de medianoche
 * y hacía el test flaky por zona horaria. */
function relativeDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Construye un FridgeListItem con la urgencia precalculada (como hace el container). */
function makeItem(
  overrides: Partial<{
    id: string;
    name: string;
    location: 'FRIDGE' | 'FREEZER' | 'PANTRY' | 'DISCARDED';
    expiryDate: string | null;
    quantity: string | null;
    unit: string | null;
  }> = {},
): FridgeListItem {
  const expiryDate = overrides.expiryDate !== undefined ? overrides.expiryDate : null;
  const urgency = getExpiryUrgency(expiryDate);
  return {
    id: overrides.id ?? 'item-1',
    familyId: 'family-1',
    name: overrides.name ?? 'Leche',
    quantity: overrides.quantity !== undefined ? overrides.quantity : '1',
    unit: overrides.unit !== undefined ? overrides.unit : 'l',
    location: overrides.location ?? 'FRIDGE',
    expiryDate,
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    urgency,
    urgencyLabel: urgencyLabel(urgency, expiryDate),
  };
}

// ── Spies de callbacks ────────────────────────────────────────────────────────

const onChangeFilter = vi.fn();
const onOpenAdd = vi.fn();
const onOpenEdit = vi.fn();
const onCloseDialogs = vi.fn();
const onAdd = vi.fn();
const onUpdate = vi.fn();
const onDelete = vi.fn();
const onThrow = vi.fn();
const onFreeze = vi.fn();

function baseProps(overrides: Partial<FridgeListViewProps> = {}): FridgeListViewProps {
  return {
    items: [],
    isLoading: false,
    error: null,
    locationFilter: 'ALL',
    isAddOpen: false,
    editingItem: null,
    isSubmitting: false,
    submitError: null,
    onChangeFilter,
    onOpenAdd,
    onOpenEdit,
    onCloseDialogs,
    onAdd,
    onUpdate,
    onDelete,
    onThrow,
    onFreeze,
    ...overrides,
  };
}

function renderView(overrides: Partial<FridgeListViewProps> = {}) {
  return render(<FridgeListView {...baseProps(overrides)} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Render básico
// ─────────────────────────────────────────────────────────────────────────────

describe('FridgeListView — render', () => {
  it('renderiza el título y el botón de añadir', () => {
    renderView();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /añadir producto/i })).toBeInTheDocument();
  });

  it('muestra el mensaje vacío cuando no hay productos', () => {
    renderView({ items: [] });
    expect(screen.getByText(/despensa está vacía/i)).toBeInTheDocument();
  });

  it('muestra los productos de la familia', () => {
    renderView({
      items: [
        makeItem({ id: 'i1', name: 'Leche', expiryDate: null }),
        makeItem({ id: 'i2', name: 'Yogur', expiryDate: null }),
      ],
    });
    expect(screen.getAllByText('Leche').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Yogur').length).toBeGreaterThan(0);
  });

  it('ofrece un chip de filtro "Tirado" (DISCARDED)', () => {
    renderView();
    expect(screen.getByRole('button', { name: /tirado/i })).toBeInTheDocument();
  });

  it('"Todo" no muestra los productos tirados (DISCARDED)', () => {
    renderView({
      locationFilter: 'ALL',
      items: [
        makeItem({ id: 'i1', name: 'Leche', expiryDate: null }),
        makeItem({ id: 'i2', name: 'Pan tirado', location: 'DISCARDED', expiryDate: null }),
      ],
    });
    expect(screen.getAllByText('Leche').length).toBeGreaterThan(0);
    expect(screen.queryByText('Pan tirado')).not.toBeInTheDocument();
  });

  it('el filtro "Tirado" muestra solo los productos tirados', () => {
    renderView({
      locationFilter: 'DISCARDED',
      items: [
        makeItem({ id: 'i1', name: 'Leche', location: 'FRIDGE', expiryDate: null }),
        makeItem({ id: 'i2', name: 'Pan tirado', location: 'DISCARDED', expiryDate: null }),
      ],
    });
    expect(screen.getByText('Pan tirado')).toBeInTheDocument();
    expect(screen.queryByText('Leche')).not.toBeInTheDocument();
  });

  it('respeta el orden recibido: el que caduca antes aparece primero', () => {
    // El container ordena; la vista pinta en ese orden.
    renderView({
      items: [
        makeItem({ id: 'i2', name: 'Leche', expiryDate: relativeDate(1) }),
        makeItem({ id: 'i1', name: 'Queso', expiryDate: relativeDate(10) }),
        makeItem({ id: 'i3', name: 'Pasta', expiryDate: null }),
      ],
    });
    const cards = screen.getAllByRole('listitem');
    const lecheIdx = cards.findIndex((c) => c.textContent?.includes('Leche'));
    const quesoIdx = cards.findIndex((c) => c.textContent?.includes('Queso'));
    expect(lecheIdx).toBeLessThan(quesoIdx);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Urgencia precalculada → data-urgency
// ─────────────────────────────────────────────────────────────────────────────

describe('FridgeListView — urgencia', () => {
  it('ítem caducado tiene data-urgency=expired', () => {
    renderView({ items: [makeItem({ id: 'exp', name: 'Yogur', expiryDate: relativeDate(-2) })] });
    const expired = screen
      .getAllByRole('listitem')
      .find((el) => el.querySelector('[data-urgency="expired"]'));
    expect(expired).toBeTruthy();
  });

  it('ítem que caduca en ≤2 días tiene data-urgency=warning', () => {
    renderView({ items: [makeItem({ id: 'w', name: 'Leche', expiryDate: relativeDate(1) })] });
    const warning = screen
      .getAllByRole('listitem')
      .find((el) => el.querySelector('[data-urgency="warning"]'));
    expect(warning).toBeTruthy();
  });

  it('ítem sin fecha de caducidad tiene data-urgency=none', () => {
    renderView({ items: [makeItem({ id: 'n', name: 'Arroz', expiryDate: null })] });
    const none = screen
      .getAllByRole('listitem')
      .find((el) => el.querySelector('[data-urgency="none"]'));
    expect(none).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sección "Consumir primero"
// ─────────────────────────────────────────────────────────────────────────────

describe('FridgeListView — Consumir primero', () => {
  it('muestra la sección con ítems caducados/urgentes cuando filter=ALL', () => {
    renderView({
      items: [
        makeItem({ id: 'expired', name: 'Mantequilla', expiryDate: relativeDate(-1) }),
        makeItem({ id: 'ok', name: 'Pasta', expiryDate: relativeDate(30) }),
      ],
    });
    const urgentSection = screen.getByRole('region', { name: /consumir primero/i });
    expect(within(urgentSection).getByText('Mantequilla')).toBeInTheDocument();
  });

  it('NO muestra la sección urgente cuando el filtro no es ALL', () => {
    renderView({
      locationFilter: 'FRIDGE',
      items: [makeItem({ id: 'expired', name: 'Mantequilla', expiryDate: relativeDate(-1) })],
    });
    expect(screen.queryByRole('region', { name: /consumir primero/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Diálogo de añadir
// ─────────────────────────────────────────────────────────────────────────────

describe('FridgeListView — diálogo añadir', () => {
  it('pulsar "+ Añadir" llama a onOpenAdd', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('button', { name: /añadir producto/i }));
    expect(onOpenAdd).toHaveBeenCalled();
  });

  it('con isAddOpen abre el diálogo "Añadir producto"', () => {
    renderView({ isAddOpen: true });
    expect(screen.getByRole('dialog', { name: /añadir producto/i })).toBeInTheDocument();
  });

  it('el botón Añadir está deshabilitado con el nombre vacío', () => {
    renderView({ isAddOpen: true });
    expect(screen.getByRole('button', { name: /^añadir$/i })).toBeDisabled();
  });

  it('llama a onAdd con name y location al enviar', async () => {
    const user = userEvent.setup();
    renderView({ isAddOpen: true });

    await user.type(screen.getByLabelText(/nombre/i), 'Leche entera');
    await user.click(screen.getByRole('button', { name: /^añadir$/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Leche entera', location: 'FRIDGE' }),
      );
    });
  });

  it('incluye la fecha de caducidad cuando se rellena', async () => {
    const user = userEvent.setup();
    renderView({ isAddOpen: true });

    await user.type(screen.getByLabelText(/nombre/i), 'Yogur');
    await user.type(screen.getByLabelText(/fecha de caducidad/i), '2026-06-01');
    await user.click(screen.getByRole('button', { name: /^añadir$/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ expiryDate: '2026-06-01' }));
    });
  });

  it('muestra submitError dentro del diálogo abierto', () => {
    renderView({ isAddOpen: true, submitError: 'No se ha podido añadir el producto.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/no se ha podido añadir/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Acciones de ítem
// ─────────────────────────────────────────────────────────────────────────────

describe('FridgeListView — acciones', () => {
  function withMilk() {
    return renderView({
      items: [makeItem({ id: 'item-1', name: 'Leche', location: 'FRIDGE', expiryDate: null })],
    });
  }

  it('pulsar "Tirar" llama a onThrow con el id', async () => {
    const user = userEvent.setup();
    withMilk();
    await user.click(screen.getByRole('button', { name: /tirar leche/i }));
    expect(onThrow).toHaveBeenCalledWith('item-1');
  });

  it('pulsar "Congelar" llama a onFreeze con el id', async () => {
    const user = userEvent.setup();
    withMilk();
    await user.click(screen.getByRole('button', { name: /congelar leche/i }));
    expect(onFreeze).toHaveBeenCalledWith('item-1');
  });

  it('pulsar "Eliminar" llama a onDelete con el id', async () => {
    const user = userEvent.setup();
    withMilk();
    await user.click(screen.getByRole('button', { name: /eliminar leche/i }));
    expect(onDelete).toHaveBeenCalledWith('item-1');
  });

  it('pulsar "Editar" llama a onOpenEdit con el ítem', async () => {
    const user = userEvent.setup();
    withMilk();
    await user.click(screen.getByRole('button', { name: /editar leche/i }));
    expect(onOpenEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }));
  });

  it('no muestra "Congelar" para ítems ya en el congelador', () => {
    renderView({
      items: [makeItem({ id: 'item-2', name: 'Helado', location: 'FREEZER', expiryDate: null })],
    });
    expect(screen.queryByRole('button', { name: /congelar helado/i })).not.toBeInTheDocument();
  });

  it('NO muestra el botón "Comer" en las filas', () => {
    withMilk();
    expect(
      screen.queryByRole('button', { name: /marcar leche como consumido/i }),
    ).not.toBeInTheDocument();
  });
});
