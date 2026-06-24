/**
 * Tests de la feature plans (vistas presentacionales `base`).
 *
 * Tras la migración a themes, el render vive en las vistas presentacionales
 * `views/base/*View` (props in / callbacks out). Los containers
 * (`PlansPage`/`CreatePlanPage`/`PlanDetailPage`) solo cablean la lógica real y
 * delegan en `ThemeView`, cuyo registry se compone en otra fase. Por eso los
 * tests de UI apuntan directamente a las vistas, que es donde está la lógica de
 * presentación.
 *
 * Cubre:
 *  1. PlansView      — cabecera, estado vacío, listado, estados de cada plan, error, callbacks.
 *  2. CreatePlanView — render del formulario, validación de submit, emisión de valores, cancelar.
 *  3. PlanDetailView — cabecera, RSVP, participantes, chat (vacío + envío), compartir/eliminar owner-only.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { PlanDto, PlanSummaryDto, PlanMessageDto, SavedPlaceDto } from './contracts';
import type { FriendFamilyDto } from '@cosasdecasa/contracts';
import type { PlansViewProps, CreatePlanViewProps, PlanDetailViewProps } from './views/types';

import PlansView from './views/base/PlansView';
import CreatePlanView from './views/base/CreatePlanView';
import PlanDetailView from './views/base/PlanDetailView';

// ── Factories ──────────────────────────────────────────────────────────────────

const MOCK_PLANS: PlanSummaryDto[] = [
  {
    id: 'plan-1',
    title: 'Barbacoa en el parque',
    status: 'proposed',
    ownerFamilyId: 'fam-1',
    participantCount: 3,
    scheduledAt: '2026-06-15T12:00:00Z',
    placeName: 'Parque del Retiro',
  },
  {
    id: 'plan-2',
    title: 'Cine el sábado',
    status: 'confirmed',
    ownerFamilyId: 'fam-1',
    participantCount: 2,
  },
];

const MOCK_PLAN: PlanDto = {
  id: 'plan-abc',
  title: 'Barbacoa en el parque',
  description: 'Una tarde estupenda con amigos',
  status: 'proposed',
  ownerFamilyId: 'fam-1',
  createdBy: 'user-me',
  participants: [
    { userId: 'user-me', displayName: 'Yo', status: 'going' },
    { userId: 'user-other', displayName: 'Otro', status: 'maybe' },
  ],
  sharedWithFamilyIds: [],
  createdAt: '2026-05-26T00:00:00Z',
  place: { name: 'Parque del Retiro', address: 'Madrid' },
  scheduledAt: '2026-06-15T12:00:00Z',
};

const MOCK_FRIEND_FAMILIES: FriendFamilyDto[] = [
  { linkId: 'link-1', familyId: 'fam-2', familyName: 'Familia López', since: '2026-01-01T00:00:00Z' },
];

const MOCK_MESSAGES: PlanMessageDto[] = [
  {
    id: 'msg-1',
    planId: 'plan-abc',
    userId: 'user-other',
    displayName: 'Otro',
    body: 'Hola desde el chat',
    createdAt: '2026-05-26T10:00:00Z',
  },
];

const MOCK_SAVED_PLACES: SavedPlaceDto[] = [
  { id: 'place-1', name: 'Parque del Retiro', address: 'Madrid' },
  { id: 'place-2', name: 'Bar Manolo' },
];

// `Element.prototype.scrollIntoView` (que usa el auto-scroll del chat) lo
// polirrellena el `test-setup.ts` global, así que aquí no hace falta stubbearlo.

// ── Helpers de render ──────────────────────────────────────────────────────────

function renderPlans(overrides: Partial<PlansViewProps> = {}) {
  const props: PlansViewProps = {
    plans: [],
    isLoading: false,
    error: null,
    onCreate: vi.fn(),
    onOpen: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<PlansView {...props} />) };
}

function renderCreate(overrides: Partial<CreatePlanViewProps> = {}) {
  const props: CreatePlanViewProps = {
    savedPlaces: [],
    isSubmitting: false,
    error: null,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    onAutofill: vi.fn().mockResolvedValue({}),
    isAutofilling: false,
    ...overrides,
  };
  return { props, ...render(<CreatePlanView {...props} />) };
}

function renderDetail(overrides: Partial<PlanDetailViewProps> = {}) {
  const props: PlanDetailViewProps = {
    plan: MOCK_PLAN,
    messages: [],
    currentUserId: 'user-me',
    isOwner: true,
    friendFamilies: MOCK_FRIEND_FAMILIES,
    isLoading: false,
    error: null,
    messagesLoading: false,
    isSavingRsvp: false,
    isSharing: false,
    isSendingMessage: false,
    isDeleting: false,
    rsvpError: null,
    shareError: null,
    deleteError: null,
    savedPlaces: MOCK_SAVED_PLACES,
    isUpdating: false,
    updateError: null,
    isDeletingPlace: false,
    deletePlaceError: null,
    onBack: vi.fn(),
    onRsvp: vi.fn(),
    onShare: vi.fn(),
    onSendMessage: vi.fn(),
    onLoadOlderMessages: vi.fn(),
    onDelete: vi.fn(),
    onUpdatePlan: vi.fn(),
    onDeletePlace: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<PlanDetailView {...props} />) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PlansView
// ─────────────────────────────────────────────────────────────────────────────

describe('PlansView', () => {
  it('muestra el encabezado y el botón de nuevo plan', () => {
    renderPlans();
    expect(screen.getByRole('heading', { name: /planes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nuevo plan/i })).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay planes', () => {
    renderPlans({ plans: [] });
    expect(screen.getByText(/no hay planes todavía/i)).toBeInTheDocument();
  });

  it('lista los planes de la familia', () => {
    renderPlans({ plans: MOCK_PLANS });
    expect(screen.getByText('Barbacoa en el parque')).toBeInTheDocument();
    expect(screen.getByText('Cine el sábado')).toBeInTheDocument();
  });

  it('muestra el estado de cada plan', () => {
    renderPlans({ plans: MOCK_PLANS });
    expect(screen.getByText('Propuesto')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('muestra error cuando la carga falla', () => {
    renderPlans({ error: 'No se han podido cargar los planes. Inténtalo de nuevo.' });
    expect(screen.getByText(/no se han podido cargar los planes/i)).toBeInTheDocument();
  });

  it('llama onCreate al pulsar "Nuevo plan"', async () => {
    const user = userEvent.setup();
    const { props } = renderPlans();
    await user.click(screen.getByRole('button', { name: /nuevo plan/i }));
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it('llama onOpen con el id del plan al pulsar una tarjeta', async () => {
    const user = userEvent.setup();
    const { props } = renderPlans({ plans: MOCK_PLANS });
    await user.click(screen.getByText('Barbacoa en el parque'));
    expect(props.onOpen).toHaveBeenCalledWith('plan-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CreatePlanView
// ─────────────────────────────────────────────────────────────────────────────

describe('CreatePlanView', () => {
  it('muestra el formulario de creación de plan', () => {
    renderCreate();
    expect(screen.getByRole('heading', { name: /nuevo plan/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
  });

  it('deshabilita "Crear plan" si el título está vacío', () => {
    renderCreate();
    expect(screen.getByRole('button', { name: /crear plan/i })).toBeDisabled();
  });

  it('emite los valores del formulario al crear el plan', async () => {
    const user = userEvent.setup();
    const { props } = renderCreate();

    await user.type(screen.getByLabelText(/título/i), 'Barbacoa del verano');
    await user.click(screen.getByRole('button', { name: /crear plan/i }));

    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Barbacoa del verano' }),
    );
  });

  it('emite el lugar manual con savePlace cuando se rellena y se marca', async () => {
    const user = userEvent.setup();
    const { props } = renderCreate();

    await user.type(screen.getByLabelText(/título/i), 'Cañas');
    await user.type(screen.getByLabelText(/nombre/i), 'La Latina');
    // El checkbox de "Guardar este lugar" solo aparece tras rellenar el nombre.
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /crear plan/i }));

    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cañas',
        place: { name: 'La Latina', address: undefined },
        savePlace: true,
      }),
    );
  });

  it('muestra el mensaje de error recibido por props', () => {
    renderCreate({ error: 'El título del plan es obligatorio.' });
    expect(screen.getByText(/título del plan es obligatorio/i)).toBeInTheDocument();
  });

  it('llama onCancel al pulsar volver', async () => {
    const user = userEvent.setup();
    const { props } = renderCreate();
    await user.click(screen.getByRole('button', { name: /planes/i }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PlanDetailView
// ─────────────────────────────────────────────────────────────────────────────

describe('PlanDetailView', () => {
  it('muestra los detalles del plan', () => {
    renderDetail();
    expect(screen.getByRole('heading', { name: 'Barbacoa en el parque' })).toBeInTheDocument();
    expect(screen.getByText('Una tarde estupenda con amigos')).toBeInTheDocument();
  });

  it('muestra los botones RSVP', () => {
    renderDetail();
    expect(screen.getByRole('button', { name: 'Voy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quizá' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No voy' })).toBeInTheDocument();
  });

  it('llama onRsvp con el estado seleccionado', async () => {
    const user = userEvent.setup();
    const { props } = renderDetail();
    await user.click(screen.getByRole('button', { name: 'Quizá' }));
    expect(props.onRsvp).toHaveBeenCalledWith('maybe');
  });

  it('muestra los participantes con su estado', () => {
    renderDetail();
    expect(screen.getByText('Yo')).toBeInTheDocument();
    expect(screen.getByText('Otro')).toBeInTheDocument();
  });

  it('muestra el estado vacío del chat cuando no hay mensajes', () => {
    renderDetail({ messages: [] });
    expect(screen.getByText(/aún no hay mensajes/i)).toBeInTheDocument();
  });

  it('pinta los mensajes recibidos por props', () => {
    renderDetail({ messages: MOCK_MESSAGES });
    expect(screen.getByText('Hola desde el chat')).toBeInTheDocument();
  });

  it('llama onSendMessage al enviar un mensaje', async () => {
    const user = userEvent.setup();
    const { props } = renderDetail();
    await user.type(screen.getByPlaceholderText(/escribe un mensaje/i), 'Mi mensaje');
    await user.click(screen.getByRole('button', { name: /enviar mensaje/i }));
    expect(props.onSendMessage).toHaveBeenCalledWith('Mi mensaje');
  });

  it('no muestra "cargar mensajes antiguos" cuando no hay más histórico', () => {
    renderDetail({ messages: MOCK_MESSAGES, hasMoreMessages: false });
    expect(
      screen.queryByRole('button', { name: /cargar mensajes antiguos/i }),
    ).not.toBeInTheDocument();
  });

  it('muestra "cargar mensajes antiguos" cuando hay más histórico y emite el callback', async () => {
    const user = userEvent.setup();
    const { props } = renderDetail({ messages: MOCK_MESSAGES, hasMoreMessages: true });

    const btn = screen.getByRole('button', { name: /cargar mensajes antiguos/i });
    expect(btn).toBeInTheDocument();

    await user.click(btn);
    expect(props.onLoadOlderMessages).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el botón y muestra "cargando…" mientras carga mensajes antiguos', () => {
    renderDetail({
      messages: MOCK_MESSAGES,
      hasMoreMessages: true,
      isLoadingOlderMessages: true,
    });
    expect(screen.getByRole('button', { name: /cargando…/i })).toBeDisabled();
  });

  it('muestra el botón de eliminar para el owner', () => {
    renderDetail({ isOwner: true });
    expect(screen.getByRole('button', { name: /eliminar plan/i })).toBeInTheDocument();
  });

  it('oculta compartir y eliminar para quien no es owner', () => {
    renderDetail({ isOwner: false });
    expect(screen.queryByRole('button', { name: /eliminar plan/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/compartir con familia amiga/i)).not.toBeInTheDocument();
  });

  it('pide confirmación de dos toques antes de eliminar', async () => {
    const user = userEvent.setup();
    const { props } = renderDetail();

    const deleteBtn = screen.getByRole('button', { name: /eliminar plan/i });
    await user.click(deleteBtn);

    // Primer toque: no elimina, pide confirmación.
    expect(props.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /seguro\? pulsa de nuevo/i })).toBeInTheDocument();

    // Segundo toque: elimina.
    await user.click(screen.getByRole('button', { name: /seguro\? pulsa de nuevo/i }));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('muestra la sección de compartir para el owner con familias amigas', () => {
    renderDetail({ isOwner: true, friendFamilies: MOCK_FRIEND_FAMILIES });
    const section = screen.getByText(/compartir con familia amiga/i);
    expect(section).toBeInTheDocument();
  });

  it('no muestra compartir si no hay familias amigas candidatas', () => {
    renderDetail({ isOwner: true, friendFamilies: [] });
    expect(screen.queryByText(/compartir con familia amiga/i)).not.toBeInTheDocument();
  });

  it('muestra el error de RSVP cuando se recibe por props', () => {
    renderDetail({ rsvpError: 'No se ha podido guardar tu respuesta.' });
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => within(a).queryByText(/no se ha podido guardar tu respuesta/i))).toBe(
      true,
    );
  });

  // ── Editar plan ───────────────────────────────────────────────────────────

  it('muestra el botón de editar solo para el owner', () => {
    renderDetail({ isOwner: true });
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
  });

  it('oculta editar para quien no es owner', () => {
    renderDetail({ isOwner: false });
    expect(screen.queryByRole('button', { name: /^editar$/i })).not.toBeInTheDocument();
  });

  it('abre el formulario de edición con los valores del plan', async () => {
    const user = userEvent.setup();
    renderDetail({ isOwner: true });
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('heading', { name: /editar plan/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/título/i)).toHaveValue('Barbacoa en el parque');
  });

  it('emite onUpdatePlan con solo los campos cambiados al guardar', async () => {
    const user = userEvent.setup();
    const { props } = renderDetail({ isOwner: true });

    await user.click(screen.getByRole('button', { name: /editar/i }));
    const titleInput = screen.getByLabelText(/título/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Barbacoa renovada');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(props.onUpdatePlan).toHaveBeenCalledWith({ title: 'Barbacoa renovada' });
  });

  it('cierra la edición sin emitir al cancelar', async () => {
    const user = userEvent.setup();
    const { props } = renderDetail({ isOwner: true });

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(props.onUpdatePlan).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: /editar plan/i })).not.toBeInTheDocument();
  });

  it('muestra el error de edición recibido por props', async () => {
    const user = userEvent.setup();
    renderDetail({ isOwner: true, updateError: 'No se ha podido guardar los cambios.' });
    await user.click(screen.getByRole('button', { name: /editar/i }));
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => within(a).queryByText(/no se ha podido guardar los cambios/i))).toBe(
      true,
    );
  });

  // ── Borrar lugar guardado ─────────────────────────────────────────────────

  it('lista los lugares guardados para el owner', () => {
    renderDetail({ isOwner: true });
    expect(screen.getByRole('heading', { name: /lugares guardados/i })).toBeInTheDocument();
    // "Bar Manolo" (sin dirección) solo aparece en la sección de lugares
    // guardados; "Parque del Retiro" también está en la cabecera del plan.
    expect(screen.getByText('Bar Manolo')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /borrar lugar parque del retiro/i }),
    ).toBeInTheDocument();
  });

  it('oculta los lugares guardados para quien no es owner', () => {
    renderDetail({ isOwner: false });
    expect(screen.queryByRole('heading', { name: /lugares guardados/i })).not.toBeInTheDocument();
  });

  it('pide confirmación y emite onDeletePlace al confirmar', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { props } = renderDetail({ isOwner: true });

    await user.click(screen.getByRole('button', { name: /borrar lugar parque del retiro/i }));

    expect(confirmSpy).toHaveBeenCalledWith('¿Seguro que quieres borrar este lugar?');
    expect(props.onDeletePlace).toHaveBeenCalledWith('place-1');
    confirmSpy.mockRestore();
  });

  it('no emite onDeletePlace si se cancela la confirmación', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { props } = renderDetail({ isOwner: true });

    await user.click(screen.getByRole('button', { name: /borrar lugar bar manolo/i }));

    expect(props.onDeletePlace).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('no muestra lugares guardados si la lista está vacía', () => {
    renderDetail({ isOwner: true, savedPlaces: [] });
    expect(screen.queryByRole('heading', { name: /lugares guardados/i })).not.toBeInTheDocument();
  });
});
