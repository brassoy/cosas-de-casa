/**
 * Tests de las VISTAS presentacionales `base` de la feature shopping.
 *
 * Estrategia (convención de tandas 1 y 2, ver fridge): se testea la VISTA pura
 * (import DEFAULT + render con props), NO el container. Las vistas no tienen
 * hooks de datos, stores ni Dexie: reciben todo por props y emiten callbacks, así
 * que el test las renderiza directamente y verifica render + callbacks.
 *
 * La LÓGICA real (offline-first, dedup hook, outbox/sync, realtime, voz) se testea
 * en `shopping.test.tsx`, `shopping-phase1c.test.tsx` y `shopping-phase1e.test.tsx`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ShoppingListsView from './views/base/ShoppingListsView';
import ShoppingListDetailView from './views/base/ShoppingListDetailView';
import CozyDetailView from './views/cozy/ShoppingListDetailView';
import CozysitcomDetailView from './views/cozysitcom/ShoppingListDetailView';
import SpringfieldDetailView from './views/springfield/ShoppingListDetailView';
import type {
  ShoppingItemView,
  ShoppingListDetailViewProps,
  ShoppingListSummaryView,
  ShoppingListsViewProps,
} from './views/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ISO = '2026-06-14T10:00:00.000Z';

function makeList(over: Partial<ShoppingListSummaryView> = {}): ShoppingListSummaryView {
  return {
    id: 'list-1',
    familyId: 'family-1',
    name: 'Compra semanal',
    type: 'CUSTOM',
    updatedAt: ISO,
    createdAt: ISO,
    ...over,
  };
}

function makeItem(over: Partial<ShoppingItemView> = {}): ShoppingItemView {
  return {
    id: 'item-1',
    listId: 'list-1',
    name: 'Leche',
    checked: false,
    updatedAt: ISO,
    createdAt: ISO,
    ...over,
  };
}

function listsProps(over: Partial<ShoppingListsViewProps> = {}): ShoppingListsViewProps {
  return {
    lists: [],
    isLoading: false,
    error: null,
    isCreateOpen: false,
    isCreating: false,
    onOpenCreate: vi.fn(),
    onCloseCreate: vi.fn(),
    onOpenList: vi.fn(),
    onCreateList: vi.fn(),
    ...over,
  };
}

function detailProps(over: Partial<ShoppingListDetailViewProps> = {}): ShoppingListDetailViewProps {
  return {
    listName: 'Compra semanal',
    items: [],
    frequentItems: [],
    isLoading: false,
    error: null,
    isOffline: false,
    voiceSupported: true,
    voiceState: 'idle',
    voiceInterim: '',
    voiceError: null,
    voiceCandidates: [],
    autoMergeMessage: null,
    dedupPending: null,
    successOverlay: { visible: false, key: 0 },
    openItem: null,
    onBack: vi.fn(),
    onAddItem: vi.fn(),
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onQuickAdd: vi.fn(),
    onVoice: vi.fn(),
    onConfirmVoice: vi.fn(),
    onCancelVoice: vi.fn(),
    onConfirmDedup: vi.fn(),
    onCancelDedup: vi.fn(),
    onCloseSuccess: vi.fn(),
    onOpenItem: vi.fn(),
    onCloseItem: vi.fn(),
    onAddComment: vi.fn(),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// ShoppingListsView
// ══════════════════════════════════════════════════════════════════════════════

describe('ShoppingListsView', () => {
  it('muestra el título y el botón de crear', () => {
    render(<ShoppingListsView {...listsProps()} />);
    expect(screen.getByRole('heading', { name: /listas de la compra/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear lista/i })).toBeInTheDocument();
  });

  it('estado vacío con CTA', () => {
    render(<ShoppingListsView {...listsProps({ lists: [] })} />);
    expect(screen.getByText(/aún no tienes listas/i)).toBeInTheDocument();
  });

  it('renderiza las listas y marca la MAIN con badge', () => {
    render(
      <ShoppingListsView
        {...listsProps({
          lists: [
            makeList({ id: 'm', name: 'La casa', type: 'MAIN' }),
            makeList({ id: 'c', name: 'Vacaciones', type: 'CUSTOM' }),
          ],
        })}
      />,
    );
    expect(screen.getByText('La casa')).toBeInTheDocument();
    expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    expect(screen.getByText('Principal')).toBeInTheDocument();
  });

  it('abrir una lista llama a onOpenList con su id', async () => {
    const user = userEvent.setup();
    const onOpenList = vi.fn();
    render(
      <ShoppingListsView
        {...listsProps({ lists: [makeList({ id: 'list-9', name: 'Mercado' })], onOpenList })}
      />,
    );
    await user.click(screen.getByText('Mercado'));
    expect(onOpenList).toHaveBeenCalledWith('list-9');
  });

  it('ofrece borrar SOLO en listas CUSTOM y emite onDeleteList con su id', async () => {
    const user = userEvent.setup();
    const onDeleteList = vi.fn();
    render(
      <ShoppingListsView
        {...listsProps({
          lists: [
            makeList({ id: 'm', name: 'La casa', type: 'MAIN' }),
            makeList({ id: 'c', name: 'Vacaciones', type: 'CUSTOM' }),
          ],
          onDeleteList,
        })}
      />,
    );
    // La MAIN no expone acción de borrado; la CUSTOM sí.
    expect(screen.queryByRole('button', { name: /borrar lista la casa/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: /borrar lista vacaciones/i }));
    expect(onDeleteList).toHaveBeenCalledWith('c');
  });

  it('no muestra acción de borrado si no se pasa onDeleteList', () => {
    render(
      <ShoppingListsView
        {...listsProps({ lists: [makeList({ id: 'c', name: 'Vacaciones', type: 'CUSTOM' })] })}
      />,
    );
    expect(screen.queryByRole('button', { name: /borrar lista/i })).toBeNull();
  });

  it('crear lista: el diálogo abierto emite onCreateList con el nombre', async () => {
    const user = userEvent.setup();
    const onCreateList = vi.fn();
    render(<ShoppingListsView {...listsProps({ isCreateOpen: true, onCreateList })} />);

    const input = screen.getByLabelText(/nombre de la lista/i);
    await user.type(input, 'Cumpleaños');
    await user.click(screen.getByRole('button', { name: /^crear$/i }));
    expect(onCreateList).toHaveBeenCalledWith('Cumpleaños');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ShoppingListDetailView — render + acciones básicas
// ══════════════════════════════════════════════════════════════════════════════

describe('ShoppingListDetailView — render y acciones', () => {
  it('muestra el nombre de la lista y el formulario de añadir', () => {
    render(<ShoppingListDetailView {...detailProps({ listName: 'Lista de prueba' })} />);
    expect(screen.getByText('Lista de prueba')).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del artículo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^añadir$/i })).toBeInTheDocument();
  });

  it('muestra los ítems existentes', () => {
    render(<ShoppingListDetailView {...detailProps({ items: [makeItem({ name: 'Leche' })] })} />);
    expect(screen.getByText('Leche')).toBeInTheDocument();
  });

  it('añadir ítem llama a onAddItem con el nombre', async () => {
    const user = userEvent.setup();
    const onAddItem = vi.fn();
    render(<ShoppingListDetailView {...detailProps({ onAddItem })} />);

    await user.type(screen.getByLabelText(/nombre del artículo/i), 'Pan');
    await user.click(screen.getByRole('button', { name: /^añadir$/i }));
    expect(onAddItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pan' }));
  });

  it('marcar comprado llama a onToggle(id, true)', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({ items: [makeItem({ id: 'i1', name: 'Mantequilla' })], onToggle })}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: /marcar mantequilla como comprado/i }));
    expect(onToggle).toHaveBeenCalledWith('i1', true);
  });

  it('desmarcar comprado llama a onToggle(id, false)', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({
          items: [makeItem({ id: 'i2', name: 'Yogur', checked: true })],
          onToggle,
        })}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: /marcar yogur como pendiente/i }));
    expect(onToggle).toHaveBeenCalledWith('i2', false);
  });

  it('eliminar ítem llama a onDelete(id)', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({ items: [makeItem({ id: 'i3', name: 'Aceite' })], onDelete })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /eliminar aceite/i }));
    expect(onDelete).toHaveBeenCalledWith('i3');
  });

  it('separa pendientes y comprados', () => {
    render(
      <ShoppingListDetailView
        {...detailProps({
          items: [
            makeItem({ id: 'a', name: 'Sal', checked: false }),
            makeItem({ id: 'b', name: 'Azúcar', checked: true }),
          ],
        })}
      />,
    );
    expect(screen.getByText(/por comprar \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/comprado \(1\)/i)).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ShoppingListDetailView — sub-flujos
// ══════════════════════════════════════════════════════════════════════════════

describe('ShoppingListDetailView — frecuentes', () => {
  it('muestra chips de frecuentes y onQuickAdd al pulsar', async () => {
    const user = userEvent.setup();
    const onQuickAdd = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({ frequentItems: [{ name: 'tomates', count: 7 }], onQuickAdd })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /añadir tomates rápidamente/i }));
    expect(onQuickAdd).toHaveBeenCalledWith('tomates');
  });
});

describe('ShoppingListDetailView — offline', () => {
  it('muestra el aviso de sin conexión y deshabilita el micro', () => {
    render(<ShoppingListDetailView {...detailProps({ isOffline: true })} />);
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /añadir por voz/i })).toBeDisabled();
  });
});

describe('ShoppingListDetailView — voz', () => {
  it('pulsar el micro llama a onVoice', async () => {
    const user = userEvent.setup();
    const onVoice = vi.fn();
    render(<ShoppingListDetailView {...detailProps({ onVoice })} />);
    await user.click(screen.getByRole('button', { name: /añadir por voz/i }));
    expect(onVoice).toHaveBeenCalledOnce();
  });

  it('estado listening muestra el botón de detener', () => {
    render(<ShoppingListDetailView {...detailProps({ voiceState: 'listening' })} />);
    expect(
      screen.getByRole('button', { name: /detener reconocimiento de voz/i }),
    ).toBeInTheDocument();
  });

  it('muestra el transcript interim', () => {
    render(<ShoppingListDetailView {...detailProps({ voiceInterim: 'leche entera' })} />);
    expect(screen.getByText(/leche entera…/i)).toBeInTheDocument();
  });

  it('muestra el error de voz', () => {
    render(
      <ShoppingListDetailView {...detailProps({ voiceError: 'Permiso de micrófono denegado.' })} />,
    );
    expect(screen.getByText(/permiso de micrófono denegado/i)).toBeInTheDocument();
  });

  it('chips de voz: confirmar llama a onConfirmVoice con los seleccionados', async () => {
    const user = userEvent.setup();
    const onConfirmVoice = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({ voiceCandidates: ['leche', 'pan'], onConfirmVoice })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /añadir todos/i }));
    expect(onConfirmVoice).toHaveBeenCalledWith(['leche', 'pan']);
  });

  it('chips de voz: deseleccionar excluye del confirm', async () => {
    const user = userEvent.setup();
    const onConfirmVoice = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({ voiceCandidates: ['leche', 'pan'], onConfirmVoice })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /deseleccionar pan/i }));
    await user.click(screen.getByRole('button', { name: /añadir 1/i }));
    expect(onConfirmVoice).toHaveBeenCalledWith(['leche']);
  });
});

describe('ShoppingListDetailView — dedup (SUGGEST)', () => {
  it('muestra el diálogo cuando dedupPending no es null', () => {
    render(
      <ShoppingListDetailView
        {...detailProps({
          dedupPending: { pendingName: 'leche', candidates: [{ displayName: 'leche entera' }] },
        })}
      />,
    );
    expect(screen.getByRole('dialog', { name: /ya lo tienes/i })).toBeInTheDocument();
    expect(screen.getByText('leche entera')).toBeInTheDocument();
  });

  it('"Añadir igualmente" llama a onConfirmDedup', async () => {
    const user = userEvent.setup();
    const onConfirmDedup = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({
          dedupPending: { pendingName: 'leche', candidates: [{ displayName: 'leche entera' }] },
          onConfirmDedup,
        })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /añadir igualmente/i }));
    expect(onConfirmDedup).toHaveBeenCalledOnce();
  });
});

describe('ShoppingListDetailView — AUTO_MERGE toast', () => {
  it('muestra el mensaje de fusión', () => {
    render(
      <ShoppingListDetailView
        {...detailProps({ autoMergeMessage: '"leche" se ha fusionado con un artículo existente.' })}
      />,
    );
    expect(screen.getByText(/se ha fusionado con un artículo existente/i)).toBeInTheDocument();
  });
});

describe('ShoppingListDetailView — ItemSheet', () => {
  it('abre el Sheet con detalle y comentarios del ítem', () => {
    render(
      <ShoppingListDetailView
        {...detailProps({
          openItem: {
            item: makeItem({ name: 'Detergente', description: 'El de siempre' }),
            comments: [
              { id: 'c1', body: '¡No te olvides!', authorName: 'Ana', createdAt: ISO },
            ],
          },
        })}
      />,
    );
    expect(screen.getByText('El de siempre')).toBeInTheDocument();
    expect(screen.getByText('¡No te olvides!')).toBeInTheDocument();
    expect(screen.getByText(/comentarios \(1\)/i)).toBeInTheDocument();
  });

  it('enviar comentario llama a onAddComment con el cuerpo', async () => {
    const user = userEvent.setup();
    const onAddComment = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({
          openItem: { item: makeItem({ name: 'Detergente' }), comments: [] },
          onAddComment,
        })}
      />,
    );
    await user.type(screen.getByLabelText(/nuevo comentario/i), 'Marca X');
    await user.click(screen.getByRole('button', { name: /enviar/i }));
    expect(onAddComment).toHaveBeenCalledWith('Marca X');
  });
});

describe('ShoppingListDetailView — editar ítem', () => {
  it('muestra el botón Editar cuando hay onEditItem y un ítem abierto', () => {
    render(
      <ShoppingListDetailView
        {...detailProps({
          openItem: { item: makeItem({ id: 'i1', name: 'Detergente' }), comments: [] },
          onEditItem: vi.fn(),
        })}
      />,
    );
    expect(screen.getByRole('button', { name: /editar detergente/i })).toBeInTheDocument();
  });

  it('NO muestra el botón Editar si no se pasa onEditItem', () => {
    render(
      <ShoppingListDetailView
        {...detailProps({
          openItem: { item: makeItem({ id: 'i1', name: 'Detergente' }), comments: [] },
          onEditItem: undefined,
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /editar detergente/i })).toBeNull();
  });

  it('editar nombre, descripción y enlace y guardar emite onEditItem con los cambios', async () => {
    const user = userEvent.setup();
    const onEditItem = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({
          openItem: {
            item: makeItem({ id: 'i1', name: 'Detergente', description: 'viejo' }),
            comments: [],
          },
          onEditItem,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /editar detergente/i }));

    const nameInput = screen.getByLabelText(/nombre del artículo a editar/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Detergente líquido');

    const descInput = screen.getByLabelText(/descripción del artículo/i);
    await user.clear(descInput);
    await user.type(descInput, 'El de la marca azul');

    const linkInput = screen.getByLabelText(/enlace de compra del artículo/i);
    await user.type(linkInput, 'https://tienda.example/detergente');

    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onEditItem).toHaveBeenCalledWith('i1', {
      name: 'Detergente líquido',
      description: 'El de la marca azul',
      purchaseLink: 'https://tienda.example/detergente',
    });
  });

  it('cancelar la edición no emite onEditItem y vuelve a la vista de detalle', async () => {
    const user = userEvent.setup();
    const onEditItem = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({
          openItem: {
            item: makeItem({ id: 'i1', name: 'Detergente', description: 'visible' }),
            comments: [],
          },
          onEditItem,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /editar detergente/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onEditItem).not.toHaveBeenCalled();
    // De vuelta en lectura: la descripción se vuelve a ver y reaparece "Editar".
    expect(screen.getByText('visible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar detergente/i })).toBeInTheDocument();
  });

  it('no deja guardar con el nombre vacío', async () => {
    const user = userEvent.setup();
    const onEditItem = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({
          openItem: { item: makeItem({ id: 'i1', name: 'Detergente' }), comments: [] },
          onEditItem,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /editar detergente/i }));
    await user.clear(screen.getByLabelText(/nombre del artículo a editar/i));
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Edición de ítem — paridad entre los 4 themes (mismas props, mismo contrato)
// ══════════════════════════════════════════════════════════════════════════════

const detailViewsByTheme = [
  ['base', ShoppingListDetailView],
  ['cozy', CozyDetailView],
  ['cozysitcom', CozysitcomDetailView],
  ['springfield', SpringfieldDetailView],
] as const;

describe.each(detailViewsByTheme)('ShoppingListDetailView [%s] — editar ítem', (_theme, View) => {
  it('abrir edición, cambiar el nombre y guardar emite onEditItem', async () => {
    const user = userEvent.setup();
    const onEditItem = vi.fn();
    render(
      <View
        {...detailProps({
          openItem: { item: makeItem({ id: 'i1', name: 'Detergente' }), comments: [] },
          onEditItem,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /editar detergente/i }));

    const nameInput = screen.getByLabelText(/nombre del artículo a editar/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Lavavajillas');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onEditItem).toHaveBeenCalledWith(
      'i1',
      expect.objectContaining({ name: 'Lavavajillas' }),
    );
  });

  it('sin onEditItem no muestra el botón Editar', () => {
    render(
      <View
        {...detailProps({
          openItem: { item: makeItem({ id: 'i1', name: 'Detergente' }), comments: [] },
          onEditItem: undefined,
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /editar detergente/i })).toBeNull();
  });
});

describe('ShoppingListDetailView — success overlay', () => {
  it('aparece cuando successOverlay.visible es true', () => {
    render(
      <ShoppingListDetailView
        {...detailProps({ successOverlay: { visible: true, key: 1 } })}
      />,
    );
    expect(screen.getByLabelText('Artículo añadido')).toBeInTheDocument();
  });

  it('NO aparece cuando successOverlay.visible es false', () => {
    render(
      <ShoppingListDetailView
        {...detailProps({ successOverlay: { visible: false, key: 0 } })}
      />,
    );
    expect(screen.queryByLabelText('Artículo añadido')).toBeNull();
  });

  it('clic en el overlay llama a onCloseSuccess', async () => {
    const user = userEvent.setup();
    const onCloseSuccess = vi.fn();
    render(
      <ShoppingListDetailView
        {...detailProps({ successOverlay: { visible: true, key: 2 }, onCloseSuccess })}
      />,
    );
    await user.click(screen.getByLabelText('Artículo añadido'));
    await waitFor(() => expect(onCloseSuccess).toHaveBeenCalled());
  });
});

describe('ShoppingListDetailView — navegación', () => {
  it('el botón volver llama a onBack', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<ShoppingListDetailView {...detailProps({ onBack })} />);
    await user.click(screen.getByRole('button', { name: /volver a listas/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
