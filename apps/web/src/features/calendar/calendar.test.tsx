/**
 * Tests de la feature calendar (Fase 3A).
 *
 * Cubre:
 *  1. CalendarGrid — render del grid del mes con eventos, navegación, día de hoy
 *  2. AgendaView   — renderiza eventos futuros agrupados por día
 *  3. CalendarEventModal — validación: título obligatorio, deshabilitar botón
 *  4. CalendarPage — integración: muestra eventos, navega de mes, crea evento
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
    useParams: () => ({ familyId: 'family-1' }),
  };
});

// ── Mock de useFamily ─────────────────────────────────────────────────────────

vi.mock('@/features/family/hooks/useFamily', () => ({
  useFamilyMembers: vi.fn(() => ({
    data: [
      { userId: 'user-1', displayName: 'Ana', role: 'OWNER', joinedAt: new Date().toISOString() },
      { userId: 'user-2', displayName: 'Marcos', role: 'MEMBER', joinedAt: new Date().toISOString() },
    ],
    isLoading: false,
    error: null,
  })),
}));

// ── Helpers de datos ──────────────────────────────────────────────────────────

/** Construye un CalendarEventDto (forma real del contrato) para una fecha concreta en hora local. */
function makeEvent(overrides: {
  id?: string;
  title?: string;
  year: number;
  month: number; // 1-indexed
  day: number;
  hour?: number;
  allDay?: boolean;
}) {
  const { id = 'ev-1', title = 'Reunión familiar', year, month, day, hour = 10, allDay = false } = overrides;
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
    recurrenceRule: null,
    attendees: [] as { userId: string }[],
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Spies de mutaciones ───────────────────────────────────────────────────────

const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();
const mockDeleteEvent = vi.fn();

// ── Mock de useCalendar ────────────────────────────────────────────────────────

let mockEvents: ReturnType<typeof makeEvent>[] = [];

const mockSetAttendees = vi.fn();

vi.mock('@/features/calendar/hooks/useCalendar', () => ({
  useCalendarEvents: vi.fn(() => ({
    data: mockEvents,
    isLoading: false,
    error: null,
  })),
  useCreateCalendarEvent: vi.fn(() => ({
    mutate: mockCreateEvent,
    isPending: false,
  })),
  useUpdateCalendarEvent: vi.fn(() => ({
    mutate: mockUpdateEvent,
    isPending: false,
  })),
  useSetEventAttendees: vi.fn(() => ({
    mutate: mockSetAttendees,
    isPending: false,
  })),
  useDeleteCalendarEvent: vi.fn(() => ({
    mutate: mockDeleteEvent,
    isPending: false,
  })),
  calendarKeys: {
    all: ['calendar'],
    byFamily: (id: string) => ['calendar', 'family', id],
    byMonth: (id: string, y: number, m: number) => ['calendar', 'family', id, 'month', y, m],
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

import { CalendarGrid } from './components/CalendarGrid';
import { AgendaView } from './components/AgendaView';
import { CalendarEventModal } from './components/CalendarEventModal';
import { CalendarPage } from './pages/CalendarPage';

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockEvents = [];
  // Resetear la mock de mutación de asistentes
  mockSetAttendees.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. CalendarGrid — render del grid
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarGrid — grid mensual', () => {
  const gridProps = {
    year: 2026,
    month: 4, // mayo (0-indexed)
    events: [] as ReturnType<typeof makeEvent>[],
    selectedDate: null,
    onDayClick: vi.fn(),
    onEventClick: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
  };

  it('muestra el título del mes y el año', () => {
    render(<CalendarGrid {...gridProps} />);
    expect(screen.getByText(/mayo/i)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renderiza los 7 encabezados de días (Lun…Dom)', () => {
    render(<CalendarGrid {...gridProps} />);
    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.getByText('Dom')).toBeInTheDocument();
  });

  it('renderiza al menos 28 celdas de días', () => {
    render(<CalendarGrid {...gridProps} />);
    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBeGreaterThanOrEqual(28);
  });

  it('muestra el evento en la celda del día correspondiente', () => {
    const event = makeEvent({ id: 'ev-1', title: 'Cumpleaños Ana', year: 2026, month: 5, day: 15 });
    render(<CalendarGrid {...gridProps} events={[event]} />);
    expect(screen.getByText('Cumpleaños Ana')).toBeInTheDocument();
  });

  it('llama a onDayClick al hacer clic en una celda', async () => {
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    render(<CalendarGrid {...gridProps} onDayClick={onDayClick} />);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[7]!); // primera fila de días reales

    expect(onDayClick).toHaveBeenCalledWith(expect.any(Date));
  });

  it('llama a onPrev al pulsar el botón de mes anterior', async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    render(<CalendarGrid {...gridProps} onPrev={onPrev} />);

    await user.click(screen.getByRole('button', { name: /mes anterior/i }));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it('llama a onNext al pulsar el botón de mes siguiente', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<CalendarGrid {...gridProps} onNext={onNext} />);

    await user.click(screen.getByRole('button', { name: /mes siguiente/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('el día de hoy tiene data-today=true', () => {
    const today = new Date();
    // Solo si el año/mes del grid coincide con hoy podemos comprobarlo.
    const props = { ...gridProps, year: today.getFullYear(), month: today.getMonth() };
    render(<CalendarGrid {...props} />);

    const todayCell = screen.getAllByRole('gridcell').find(
      (el) => el.getAttribute('data-today') === 'true',
    );
    expect(todayCell).toBeTruthy();
  });

  it('los días fuera del mes tienen data-outside=true', () => {
    render(<CalendarGrid {...gridProps} />);
    const outsideCells = screen.getAllByRole('gridcell').filter(
      (el) => el.getAttribute('data-outside') === 'true',
    );
    // Mayo 2026 empieza en viernes → los primeros días del grid (lun-jue) son abril
    expect(outsideCells.length).toBeGreaterThan(0);
  });

  it('el evento muestra la hora cuando no es todo-el-día', () => {
    const event = makeEvent({ id: 'ev-time', title: 'Cena', year: 2026, month: 5, day: 20, hour: 21 });
    render(<CalendarGrid {...gridProps} events={[event]} />);
    // La hora se muestra en la chip del evento
    expect(screen.getByText('Cena')).toBeInTheDocument();
  });

  it('llama a onEventClick al hacer clic en un evento del grid', async () => {
    const user = userEvent.setup();
    const onEventClick = vi.fn();
    const event = makeEvent({ id: 'ev-click', title: 'Partido', year: 2026, month: 5, day: 10 });
    render(<CalendarGrid {...gridProps} events={[event]} onEventClick={onEventClick} />);

    await user.click(screen.getByText('Partido'));
    expect(onEventClick).toHaveBeenCalledWith(event);
  });

  it('muestra "+N más" cuando hay más eventos de los visibles', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `ev-${i}`, title: `Evento ${i}`, year: 2026, month: 5, day: 12 }),
    );
    render(<CalendarGrid {...gridProps} events={events} />);
    expect(screen.getByText(/\+\d+ más/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AgendaView
// ─────────────────────────────────────────────────────────────────────────────

describe('AgendaView', () => {
  const onEventClick = vi.fn();
  const onNewEvent = vi.fn();

  it('muestra el mensaje vacío cuando no hay eventos futuros', () => {
    render(
      <AgendaView events={[]} onEventClick={onEventClick} onNewEvent={onNewEvent} />,
    );
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
    render(
      <AgendaView events={[event]} onEventClick={onEventClick} onNewEvent={onNewEvent} />,
    );
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
    render(
      <AgendaView events={[event]} onEventClick={onEventClick} onNewEvent={onNewEvent} />,
    );
    expect(screen.queryByText('Evento pasado')).not.toBeInTheDocument();
  });

  it('llama a onEventClick al pulsar un evento', async () => {
    const user = userEvent.setup();
    const future = new Date();
    future.setDate(future.getDate() + 1);
    const event = makeEvent({
      id: 'ev-click',
      title: 'Reunión',
      year: future.getFullYear(),
      month: future.getMonth() + 1,
      day: future.getDate(),
    });
    render(
      <AgendaView events={[event]} onEventClick={onEventClick} onNewEvent={onNewEvent} />,
    );
    await user.click(screen.getByText('Reunión'));
    expect(onEventClick).toHaveBeenCalledWith(event);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CalendarEventModal — validación
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarEventModal — validación', () => {
  const defaultProps = {
    familyId: 'family-1',
    year: 2026,
    month: 4,
    members: [
      { userId: 'user-1', displayName: 'Ana', role: 'OWNER' as const, joinedAt: new Date().toISOString() },
    ],
    event: null,
    initialDate: null,
    onClose: vi.fn(),
  };

  it('muestra el campo de título', () => {
    wrap(<CalendarEventModal {...defaultProps} />);
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
  });

  it('el botón "Crear evento" está deshabilitado cuando el título está vacío', () => {
    wrap(<CalendarEventModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /crear evento/i })).toBeDisabled();
  });

  it('el botón "Crear evento" se habilita al escribir un título', async () => {
    const user = userEvent.setup();
    wrap(<CalendarEventModal {...defaultProps} />);

    await user.type(screen.getByLabelText(/título/i), 'Cumpleaños');
    expect(screen.getByRole('button', { name: /crear evento/i })).not.toBeDisabled();
  });

  it('llama a createEvent.mutate con los datos correctos al enviar', async () => {
    const user = userEvent.setup();
    wrap(<CalendarEventModal {...defaultProps} />);

    await user.type(screen.getByLabelText(/título/i), 'Cena navideña');
    await user.click(screen.getByRole('button', { name: /crear evento/i }));

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cena navideña', startsAt: expect.any(String) }),
        expect.any(Object),
      );
    });
  });

  it('muestra el campo "Todo el día" y al activarlo oculta la hora', async () => {
    const user = userEvent.setup();
    wrap(<CalendarEventModal {...defaultProps} />);

    const allDayCheck = screen.getByLabelText(/todo el día/i);
    expect(allDayCheck).toBeInTheDocument();

    // Antes de marcar: el input de inicio es datetime-local
    const startBefore = screen.getByLabelText(/inicio/i);
    expect(startBefore).toHaveAttribute('type', 'datetime-local');

    await user.click(allDayCheck);

    // Después de marcar: el input de inicio es date
    const startAfter = screen.getByLabelText(/inicio/i);
    expect(startAfter).toHaveAttribute('type', 'date');
  });

  it('permite seleccionar y deseleccionar asistentes', async () => {
    const user = userEvent.setup();
    wrap(<CalendarEventModal {...defaultProps} />);

    const anaBtn = screen.getByRole('button', { name: 'Ana' });
    expect(anaBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(anaBtn);
    expect(anaBtn).toHaveAttribute('aria-pressed', 'true');

    await user.click(anaBtn);
    expect(anaBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('en modo edición muestra el botón "Guardar" en lugar de "Crear evento"', () => {
    const event = makeEvent({ id: 'ev-edit', title: 'Boda', year: 2026, month: 6, day: 1 });
    wrap(<CalendarEventModal {...defaultProps} event={event} />);
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /crear evento/i })).not.toBeInTheDocument();
  });

  it('en modo edición muestra el botón "Eliminar"', () => {
    const event = makeEvent({ id: 'ev-del', title: 'Clase de yoga', year: 2026, month: 5, day: 5 });
    wrap(<CalendarEventModal {...defaultProps} event={event} />);
    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  it('el primer click en "Eliminar" pide confirmación', async () => {
    const user = userEvent.setup();
    const event = makeEvent({ id: 'ev-confirm', title: 'Evento', year: 2026, month: 5, day: 3 });
    wrap(<CalendarEventModal {...defaultProps} event={event} />);

    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));

    // Cambia el texto a "Confirmar borrado"
    expect(screen.getByRole('button', { name: /confirmar borrado/i })).toBeInTheDocument();
    // No ha llamado a deleteEvent todavía
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it('muestra aviso de solo lectura para ocurrencias recurrentes (_occ_N)', () => {
    const occ = {
      ...makeEvent({ id: 'ev-base_occ_3', title: 'Reunión semanal', year: 2026, month: 5, day: 18 }),
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
    };
    wrap(<CalendarEventModal {...defaultProps} event={occ} />);

    expect(screen.getByRole('dialog', { name: /evento recurrente/i })).toBeInTheDocument();
    // No debe mostrar ni el botón de guardar ni el de eliminar
    expect(screen.queryByRole('button', { name: /guardar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. CalendarPage — integración
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarPage', () => {
  it('renderiza el título "Calendario"', () => {
    wrap(<CalendarPage />);
    expect(screen.getByRole('heading', { name: /calendario/i })).toBeInTheDocument();
  });

  it('muestra el botón "+ Nuevo evento"', () => {
    wrap(<CalendarPage />);
    expect(screen.getByRole('button', { name: /nuevo evento/i })).toBeInTheDocument();
  });

  it('muestra los botones de vista "Mes" y "Agenda"', () => {
    wrap(<CalendarPage />);
    expect(screen.getByRole('button', { name: /^mes$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^agenda$/i })).toBeInTheDocument();
  });

  it('muestra el grid del mes por defecto', () => {
    wrap(<CalendarPage />);
    // El grid tiene el role="grid"
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('cambia a la vista agenda al pulsar "Agenda"', async () => {
    const user = userEvent.setup();
    wrap(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: /^agenda$/i }));

    // El grid desaparece; aparece el mensaje de agenda (vacía en este caso)
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('muestra eventos del mes en el grid', () => {
    const today = new Date();
    mockEvents = [
      makeEvent({
        id: 'ev-page',
        title: 'Fiesta del colegio',
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
      }),
    ];
    wrap(<CalendarPage />);
    expect(screen.getByText('Fiesta del colegio')).toBeInTheDocument();
  });

  it('abre el modal de nuevo evento al pulsar "+ Nuevo evento"', async () => {
    const user = userEvent.setup();
    wrap(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: /nuevo evento/i }));

    expect(screen.getByRole('dialog', { name: /nuevo evento/i })).toBeInTheDocument();
  });

  it('navega al mes anterior/siguiente desde el grid', async () => {
    const user = userEvent.setup();
    wrap(<CalendarPage />);

    // Asegurar que estamos en la vista de mes
    const mesBtn = screen.getByRole('button', { name: /^mes$/i });
    await user.click(mesBtn);

    // La cabecera de navegación del grid muestra el mes actual
    const today = new Date();
    const currentMonth = today.toLocaleString('es-ES', { month: 'long' });
    // El título del mes aparece en el grid (puede ser mayo, junio, etc.)
    expect(screen.getByRole('heading', { level: 2, name: new RegExp(currentMonth, 'i') })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mes anterior/i }));

    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthName = prevMonth.toLocaleString('es-ES', { month: 'long' });
    expect(screen.getByRole('heading', { level: 2, name: new RegExp(prevMonthName, 'i') })).toBeInTheDocument();
  });

  it('cierra el modal de evento al pulsar "Cancelar"', async () => {
    const user = userEvent.setup();
    wrap(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: /nuevo evento/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
