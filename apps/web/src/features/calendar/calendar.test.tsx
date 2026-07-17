/**
 * Tests de la feature calendar (theme base).
 *
 * Se testea la VISTA pura `CalendarView` (import default + render con props), NO
 * el container: el container solo cablea hooks reales y delega en `ThemeView`.
 *
 * Cubre:
 *  1. Rejilla mensual — render del mes con eventos, navegación, día de hoy,
 *     días fuera de mes, "+N más", clicks (día / evento).
 *  2. Agenda — eventos futuros agrupados, oculta pasados, click en evento.
 *  3. Modal de evento — validación (título obligatorio), allDay cambia el input,
 *     asistentes toggle, modo edición (Guardar/Eliminar), borrado de dos toques,
 *     ocurrencia recurrente en SOLO LECTURA.
 *  4. Cabecera — título, botón nuevo evento, selector de vista, callbacks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// jsdom no implementa ResizeObserver. El `Switch` de Radix (usado en el modal de
// evento para "Todo el día") lo necesita al montarse; lo polirrellenamos local.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;
}

import CalendarView from './views/base/CalendarView';
import type { CalendarEventDto, CalendarViewProps, FamilyMemberDto } from './views/types';

// ── Helpers de datos ──────────────────────────────────────────────────────────

/** Construye un CalendarEventDto real para una fecha concreta en hora local. */
function makeEvent(overrides: {
  id?: string;
  title?: string;
  year: number;
  month: number; // 1-indexed
  day: number;
  hour?: number;
  allDay?: boolean;
  recurrenceRule?: string | null;
}): CalendarEventDto {
  const {
    id = 'ev-1',
    title = 'Reunión familiar',
    year,
    month,
    day,
    hour = 10,
    allDay = false,
    recurrenceRule = null,
  } = overrides;
  const startsAt = new Date(year, month - 1, day, hour, 0, 0).toISOString();
  const endsAt = new Date(year, month - 1, day, hour + 1, 0, 0).toISOString();
  return {
    id,
    familyId: 'family-1',
    title,
    description: null,
    location: null,
    startsAt,
    endsAt,
    allDay,
    recurrenceRule,
    attendees: [],
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const MEMBERS: FamilyMemberDto[] = [
  { userId: 'user-1', displayName: 'Ana', role: 'OWNER', joinedAt: new Date().toISOString() },
  { userId: 'user-2', displayName: 'Marcos', role: 'MEMBER', joinedAt: new Date().toISOString() },
];

/** Props base de la vista, con callbacks espía sobreescribibles. */
function baseProps(overrides: Partial<CalendarViewProps> = {}): CalendarViewProps {
  return {
    events: [],
    members: MEMBERS,
    isLoading: false,
    error: null,
    view: 'month',
    viewYear: 2026,
    viewMonth: 4, // mayo (0-indexed)
    weekStart: new Date(2026, 4, 11),
    selectedDay: null,
    isDayPanelOpen: false,
    isEventModalOpen: false,
    editingEvent: null,
    initialDate: null,
    isRecurringOccurrence: false,
    parentEventId: null,
    isSubmitting: false,
    confirmDelete: false,
    submitError: null,
    onChangeView: vi.fn(),
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onPrevWeek: vi.fn(),
    onNextWeek: vi.fn(),
    onToday: vi.fn(),
    onSelectDay: vi.fn(),
    onCloseDayPanel: vi.fn(),
    onOpenEvent: vi.fn(),
    onNewEvent: vi.fn(),
    onNewEventForDay: vi.fn(),
    onCloseEventModal: vi.fn(),
    onSubmitEvent: vi.fn(),
    onDeleteEvent: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Rejilla mensual
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarView — rejilla mensual', () => {
  it('muestra el título del mes y el año', () => {
    render(<CalendarView {...baseProps()} />);
    expect(screen.getByText(/mayo/i)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renderiza los 7 encabezados de días (Lun…Dom)', () => {
    render(<CalendarView {...baseProps()} />);
    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.getByText('Dom')).toBeInTheDocument();
  });

  it('renderiza al menos 28 celdas de días', () => {
    render(<CalendarView {...baseProps()} />);
    expect(screen.getAllByRole('gridcell').length).toBeGreaterThanOrEqual(28);
  });

  it('muestra el evento en la celda del día correspondiente', () => {
    const event = makeEvent({ id: 'ev-1', title: 'Cumpleaños Ana', year: 2026, month: 5, day: 15 });
    render(<CalendarView {...baseProps({ events: [event] })} />);
    expect(screen.getByText('Cumpleaños Ana')).toBeInTheDocument();
  });

  it('llama a onSelectDay al hacer clic en una celda', async () => {
    const user = userEvent.setup();
    const onSelectDay = vi.fn();
    render(<CalendarView {...baseProps({ onSelectDay })} />);

    await user.click(screen.getAllByRole('gridcell')[7]!);
    expect(onSelectDay).toHaveBeenCalledWith(expect.any(Date));
  });

  it('llama a onPrevMonth al pulsar el botón de mes anterior', async () => {
    const user = userEvent.setup();
    const onPrevMonth = vi.fn();
    render(<CalendarView {...baseProps({ onPrevMonth })} />);

    await user.click(screen.getByRole('button', { name: /mes anterior/i }));
    expect(onPrevMonth).toHaveBeenCalledOnce();
  });

  it('llama a onNextMonth al pulsar el botón de mes siguiente', async () => {
    const user = userEvent.setup();
    const onNextMonth = vi.fn();
    render(<CalendarView {...baseProps({ onNextMonth })} />);

    await user.click(screen.getByRole('button', { name: /mes siguiente/i }));
    expect(onNextMonth).toHaveBeenCalledOnce();
  });

  it('el día de hoy tiene data-today=true', () => {
    const today = new Date();
    render(
      <CalendarView
        {...baseProps({ viewYear: today.getFullYear(), viewMonth: today.getMonth() })}
      />,
    );
    const todayCell = screen
      .getAllByRole('gridcell')
      .find((el) => el.getAttribute('data-today') === 'true');
    expect(todayCell).toBeTruthy();
  });

  it('los días fuera del mes tienen data-outside=true', () => {
    render(<CalendarView {...baseProps()} />);
    const outside = screen
      .getAllByRole('gridcell')
      .filter((el) => el.getAttribute('data-outside') === 'true');
    expect(outside.length).toBeGreaterThan(0);
  });

  it('llama a onOpenEvent al hacer clic en un evento del grid', async () => {
    const user = userEvent.setup();
    const onOpenEvent = vi.fn();
    const event = makeEvent({ id: 'ev-click', title: 'Partido', year: 2026, month: 5, day: 10 });
    render(<CalendarView {...baseProps({ events: [event], onOpenEvent })} />);

    await user.click(screen.getByText('Partido'));
    expect(onOpenEvent).toHaveBeenCalledWith(event);
  });

  it('muestra "+N más" cuando hay más eventos de los visibles', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `ev-${i}`, title: `Evento ${i}`, year: 2026, month: 5, day: 12 }),
    );
    render(<CalendarView {...baseProps({ events })} />);
    expect(screen.getByText(/\+\d+ más/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Agenda
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarView — agenda', () => {
  it('muestra el mensaje vacío cuando no hay eventos futuros', () => {
    render(<CalendarView {...baseProps({ view: 'agenda' })} />);
    expect(screen.getByText(/no hay eventos próximos/i)).toBeInTheDocument();
  });

  it('muestra los eventos futuros agrupados', () => {
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const event = makeEvent({
      id: 'ev-future',
      title: 'Excursión al parque',
      year: future.getFullYear(),
      month: future.getMonth() + 1,
      day: future.getDate(),
    });
    render(<CalendarView {...baseProps({ view: 'agenda', events: [event] })} />);
    expect(screen.getByText('Excursión al parque')).toBeInTheDocument();
  });

  it('no muestra eventos pasados', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const event = makeEvent({
      id: 'ev-past',
      title: 'Evento pasado',
      year: past.getFullYear(),
      month: past.getMonth() + 1,
      day: past.getDate(),
    });
    render(<CalendarView {...baseProps({ view: 'agenda', events: [event] })} />);
    expect(screen.queryByText('Evento pasado')).not.toBeInTheDocument();
  });

  it('llama a onOpenEvent al pulsar un evento de la agenda', async () => {
    const user = userEvent.setup();
    const onOpenEvent = vi.fn();
    const future = new Date();
    future.setDate(future.getDate() + 1);
    const event = makeEvent({
      id: 'ev-click',
      title: 'Reunión',
      year: future.getFullYear(),
      month: future.getMonth() + 1,
      day: future.getDate(),
    });
    render(<CalendarView {...baseProps({ view: 'agenda', events: [event], onOpenEvent })} />);

    await user.click(screen.getByText('Reunión'));
    expect(onOpenEvent).toHaveBeenCalledWith(event);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Modal de evento
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarView — modal de evento', () => {
  it('muestra el campo de título cuando el modal está abierto', () => {
    render(<CalendarView {...baseProps({ isEventModalOpen: true })} />);
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
  });

  it('el botón "Crear evento" está deshabilitado con el título vacío', () => {
    render(<CalendarView {...baseProps({ isEventModalOpen: true })} />);
    expect(screen.getByRole('button', { name: /crear evento/i })).toBeDisabled();
  });

  it('el botón "Crear evento" se habilita al escribir un título', async () => {
    const user = userEvent.setup();
    render(<CalendarView {...baseProps({ isEventModalOpen: true })} />);

    await user.type(screen.getByLabelText(/título/i), 'Cumpleaños');
    expect(screen.getByRole('button', { name: /crear evento/i })).not.toBeDisabled();
  });

  it('llama a onSubmitEvent con los datos del formulario al enviar', async () => {
    const user = userEvent.setup();
    const onSubmitEvent = vi.fn();
    render(<CalendarView {...baseProps({ isEventModalOpen: true, onSubmitEvent })} />);

    await user.type(screen.getByLabelText(/título/i), 'Cena navideña');
    await user.click(screen.getByRole('button', { name: /crear evento/i }));

    expect(onSubmitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cena navideña',
        startsAt: expect.any(String),
        allDay: false,
        attendeeIds: [],
      }),
    );
  });

  it('muestra "Todo el día" y al activarlo el input de inicio pasa a tipo date', async () => {
    const user = userEvent.setup();
    render(<CalendarView {...baseProps({ isEventModalOpen: true })} />);

    const allDay = screen.getByLabelText(/todo el día/i);
    expect(allDay).toBeInTheDocument();
    expect(screen.getByLabelText(/inicio/i)).toHaveAttribute('type', 'datetime-local');

    await user.click(allDay);
    expect(screen.getByLabelText(/inicio/i)).toHaveAttribute('type', 'date');
  });

  it('permite seleccionar y deseleccionar asistentes', async () => {
    const user = userEvent.setup();
    render(<CalendarView {...baseProps({ isEventModalOpen: true })} />);

    const anaBtn = screen.getByRole('button', { name: 'Ana' });
    expect(anaBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(anaBtn);
    expect(anaBtn).toHaveAttribute('aria-pressed', 'true');

    await user.click(anaBtn);
    expect(anaBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('expone un campo RRULE de repetición', () => {
    render(<CalendarView {...baseProps({ isEventModalOpen: true })} />);
    expect(screen.getByLabelText(/repetición/i)).toBeInTheDocument();
  });

  it('en modo edición muestra "Guardar" en lugar de "Crear evento"', () => {
    const event = makeEvent({ id: 'ev-edit', title: 'Boda', year: 2026, month: 6, day: 1 });
    render(<CalendarView {...baseProps({ isEventModalOpen: true, editingEvent: event })} />);
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /crear evento/i })).not.toBeInTheDocument();
  });

  it('en modo edición muestra el botón "Eliminar"', () => {
    const event = makeEvent({ id: 'ev-del', title: 'Clase de yoga', year: 2026, month: 5, day: 5 });
    render(<CalendarView {...baseProps({ isEventModalOpen: true, editingEvent: event })} />);
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  it('el botón eliminar llama a onDeleteEvent (la confirmación la lleva el container)', async () => {
    const user = userEvent.setup();
    const onDeleteEvent = vi.fn();
    const event = makeEvent({ id: 'ev-confirm', title: 'Evento', year: 2026, month: 5, day: 3 });
    render(
      <CalendarView {...baseProps({ isEventModalOpen: true, editingEvent: event, onDeleteEvent })} />,
    );

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));
    expect(onDeleteEvent).toHaveBeenCalledOnce();
  });

  it('muestra "Confirmar borrado" cuando confirmDelete=true', () => {
    const event = makeEvent({ id: 'ev-c', title: 'Evento', year: 2026, month: 5, day: 3 });
    render(
      <CalendarView
        {...baseProps({ isEventModalOpen: true, editingEvent: event, confirmDelete: true })}
      />,
    );
    expect(screen.getByRole('button', { name: /confirmar borrado/i })).toBeInTheDocument();
  });

  it('muestra aviso de solo lectura para ocurrencias recurrentes (_occ_N)', () => {
    const occ = makeEvent({
      id: 'ev-base_occ_3',
      title: 'Reunión semanal',
      year: 2026,
      month: 5,
      day: 18,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
    });
    render(
      <CalendarView
        {...baseProps({
          isEventModalOpen: true,
          editingEvent: occ,
          isRecurringOccurrence: true,
          parentEventId: 'ev-base',
        })}
      />,
    );

    expect(screen.getByRole('dialog', { name: /evento recurrente/i })).toBeInTheDocument();
    expect(screen.getByText(/se edita el evento original/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /guardar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it('muestra submitError cuando una mutación falla', () => {
    const event = makeEvent({ id: 'ev-err', title: 'X', year: 2026, month: 5, day: 3 });
    render(
      <CalendarView
        {...baseProps({
          isEventModalOpen: true,
          editingEvent: event,
          submitError: 'No se ha podido guardar el evento.',
        })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/no se ha podido guardar/i);
  });

  it('llama a onCloseEventModal al pulsar "Cancelar"', async () => {
    const user = userEvent.setup();
    const onCloseEventModal = vi.fn();
    render(<CalendarView {...baseProps({ isEventModalOpen: true, onCloseEventModal })} />);

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCloseEventModal).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cabecera y selector de vista
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarView — cabecera', () => {
  it('renderiza el título "Calendario"', () => {
    render(<CalendarView {...baseProps()} />);
    expect(screen.getByRole('heading', { name: /calendario/i })).toBeInTheDocument();
  });

  it('muestra el botón "Nuevo evento" y llama a onNewEvent', async () => {
    const user = userEvent.setup();
    const onNewEvent = vi.fn();
    render(<CalendarView {...baseProps({ onNewEvent })} />);

    const btn = screen.getByRole('button', { name: /nuevo evento/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onNewEvent).toHaveBeenCalledOnce();
  });

  it('muestra los botones de vista "Mes" y "Agenda" y llama a onChangeView', async () => {
    const user = userEvent.setup();
    const onChangeView = vi.fn();
    render(<CalendarView {...baseProps({ onChangeView })} />);

    expect(screen.getByRole('button', { name: /^mes$/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^agenda$/i }));
    expect(onChangeView).toHaveBeenCalledWith('agenda');
  });

  it('muestra el grid del mes cuando view=month', () => {
    render(<CalendarView {...baseProps({ view: 'month' })} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('oculta el grid cuando view=agenda', () => {
    render(<CalendarView {...baseProps({ view: 'agenda' })} />);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('incluye el botón de vista "Semana"', () => {
    render(<CalendarView {...baseProps()} />);
    expect(screen.getByRole('button', { name: /^semana$/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Vista semanal
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarView — semana', () => {
  // WeekView pinta 7 días consecutivos desde `weekStart` (no fuerza el lunes).
  const weekStart = new Date(2026, 4, 11); // 11–17 de mayo de 2026

  it('renderiza los 7 días de la semana (todos sin eventos)', () => {
    render(<CalendarView {...baseProps({ view: 'week', weekStart })} />);
    expect(screen.getAllByText(/sin eventos/i)).toHaveLength(7);
  });

  it('no muestra la rejilla mensual en vista semana', () => {
    render(<CalendarView {...baseProps({ view: 'week', weekStart })} />);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('muestra un evento en su día dentro de la semana', () => {
    const event = makeEvent({ id: 'ev-w', title: 'Médico', year: 2026, month: 5, day: 13 });
    render(<CalendarView {...baseProps({ view: 'week', weekStart, events: [event] })} />);
    expect(screen.getByText('Médico')).toBeInTheDocument();
  });

  it('navega entre semanas con los botones anterior/siguiente', async () => {
    const user = userEvent.setup();
    const onPrevWeek = vi.fn();
    const onNextWeek = vi.fn();
    render(
      <CalendarView {...baseProps({ view: 'week', weekStart, onPrevWeek, onNextWeek })} />,
    );

    await user.click(screen.getByRole('button', { name: /semana anterior/i }));
    expect(onPrevWeek).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: /semana siguiente/i }));
    expect(onNextWeek).toHaveBeenCalledOnce();
  });
});
