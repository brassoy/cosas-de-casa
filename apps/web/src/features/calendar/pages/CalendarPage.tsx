/**
 * CalendarPage — CONTAINER de la pantalla de calendario.
 *
 * Cablea la lógica real (queries + mutaciones + store Zustand + zona horaria +
 * recurrencia) UNA sola vez y delega el render en `ThemeView`, que monta la vista
 * presentacional del theme activo (con fallback a `base`).
 *
 * Responsabilidades que viven AQUÍ (no en la vista):
 *  - `useCalendarEvents` (query por rango de mes) + guard de familia activa.
 *  - Estado de la vista en Zustand (`useCalendarStore`): vista month/agenda, mes
 *    visible, día seleccionado, navegación de meses.
 *  - Estado de los sub-flujos (panel de día, modal de evento, edición vs creación,
 *    fecha inicial, confirmación de borrado de dos toques, errores de mutación).
 *  - Recurrencia: detecta ocurrencias `_occ_N` (`isOccurrenceId`) → marca
 *    `isRecurringOccurrence` y resuelve el `parentEventId` para que la vista las
 *    muestre en SOLO LECTURA.
 *  - Zona horaria: convierte los valores locales del formulario (`datetime-local`)
 *    a ISO UTC antes de mutar, y separa el payload de PATCH/POST del de
 *    asistentes (PUT /attendees).
 *  - Mutaciones: crear (POST), actualizar (PATCH + PUT /attendees), borrar
 *    (DELETE optimista). El modal se cierra SOLO al éxito; en error se mantiene
 *    abierto mostrando `submitError`.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyMembers } from '@/features/family/hooks/useFamily';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import { useDetailedRoutines } from '@/features/routines/hooks/useRoutines';
import {
  buildRoutineByEventId,
  buildRoutineDayMap,
  routinesToVirtualEvents,
} from '@/features/routines/lib/calendarOverlay';
import { isRoutineEventId } from '@/features/routines/types';
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useSetEventAttendees,
  useDeleteCalendarEvent,
} from '../hooks/useCalendar';
import { useRealtimeCalendar } from '../hooks/useRealtimeCalendar';
import { useCalendarStore } from '../store/calendar.store';
import { getCalendarEnd, getCalendarStart, isOccurrenceId, parentEventId } from '../types';
import type { CalendarEventDto } from '../types';
import type {
  CalendarEventFormValues,
  CalendarViewProps,
} from '../views/types';

// ── Helpers de zona horaria ────────────────────────────────────────────────────

/**
 * Convierte un valor local del input (`datetime-local` "YYYY-MM-DDTHH:mm", o
 * "YYYY-MM-DD" cuando es todo el día) a ISO UTC.
 *  - allDay: ignora la hora y usa el inicio del día en UTC.
 *  - normal: el `datetime-local` se interpreta como hora local del navegador.
 */
function toISO(value: string, useAllDay: boolean): string {
  if (useAllDay) {
    const datePart = value.split('T')[0]!;
    return new Date(`${datePart}T00:00:00.000Z`).toISOString();
  }
  return new Date(value).toISOString();
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.body.message : fallback;
}

// ── Container ─────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const { familyId } = useParams({ strict: false }) as { familyId?: string };
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const resolvedFamilyId = familyId ?? activeFamily?.id;
  const navigate = useNavigate();

  // ── Estado del store (vista, mes visible, día seleccionado) ──
  const viewYear = useCalendarStore((s) => s.viewYear);
  const viewMonth = useCalendarStore((s) => s.viewMonth);
  const weekStart = useCalendarStore((s) => s.weekStart);
  const activeView = useCalendarStore((s) => s.activeView);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const goToPrevMonth = useCalendarStore((s) => s.goToPrevMonth);
  const goToNextMonth = useCalendarStore((s) => s.goToNextMonth);
  const goToPrevWeek = useCalendarStore((s) => s.goToPrevWeek);
  const goToNextWeek = useCalendarStore((s) => s.goToNextWeek);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const setActiveView = useCalendarStore((s) => s.setActiveView);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);

  // ── Estado de los sub-flujos ──
  const [editingEvent, setEditingEvent] = useState<CalendarEventDto | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Datos ──
  const { data: events = [], isLoading, error } = useCalendarEvents(
    resolvedFamilyId,
    viewYear,
    viewMonth,
  );
  const { data: members = [] } = useFamilyMembers(resolvedFamilyId);

  // ── Overlay de rutinas (solo lectura) sobre el rango visible del grid ──
  // Las asignaciones se proyectan como eventos "fijados" con id sintético
  // `routine_<assignmentId>` y cada día cubierto por una rutina lleva un ring
  // sutil (dos colores alternos separan una semana de la siguiente).
  const gridFromYMD = getCalendarStart(viewYear, viewMonth).toLocaleDateString('sv-SE');
  const gridToYMD = getCalendarEnd(viewYear, viewMonth).toLocaleDateString('sv-SE');
  const { data: gridRoutines = [] } = useDetailedRoutines(
    resolvedFamilyId,
    gridFromYMD,
    gridToYMD,
  );
  const mergedEvents = useMemo(
    () => [...events, ...routinesToVirtualEvents(gridRoutines)],
    [events, gridRoutines],
  );
  const routineDays = useMemo(() => buildRoutineDayMap(gridRoutines), [gridRoutines]);
  const routineByEventId = useMemo(
    () => buildRoutineByEventId(gridRoutines),
    [gridRoutines],
  );

  // Realtime: refresca los eventos cuando otro miembro crea/edita/borra.
  useRealtimeCalendar(resolvedFamilyId);

  // ── Mutaciones (instanciadas una vez; el id del editado viaja en cada hook) ──
  // Las ocurrencias `_occ_N` son de solo lectura: no se mutan, así que el id
  // baked-in solo importa para eventos reales (no ocurrencias).
  const fid = resolvedFamilyId ?? '';
  const editingId = editingEvent?.id ?? '';
  const createEvent = useCreateCalendarEvent(fid, viewYear, viewMonth);
  const updateEvent = useUpdateCalendarEvent(editingId, fid, viewYear, viewMonth);
  const setAttendees = useSetEventAttendees(editingId, fid, viewYear, viewMonth);
  const deleteEvent = useDeleteCalendarEvent(editingId, fid, viewYear, viewMonth);

  const isSubmitting =
    createEvent.isPending ||
    updateEvent.isPending ||
    setAttendees.isPending ||
    deleteEvent.isPending;

  // ── Recurrencia: ocurrencia abierta → solo lectura ──
  const isRecurringOccurrence = Boolean(editingEvent && isOccurrenceId(editingEvent.id));
  const parentId = editingEvent ? parentEventId(editingEvent.id) : null;

  // ── Handlers de apertura / cierre ──
  function handleSelectDay(date: Date) {
    setSelectedDate(date);
    setShowDayPanel(true);
  }

  function handleOpenEvent(event: CalendarEventDto) {
    // Los eventos de rutina son de solo lectura: navegan a su rutina.
    if (isRoutineEventId(event.id)) {
      const routineId = routineByEventId.get(event.id);
      if (routineId && resolvedFamilyId) {
        void navigate({
          to: '/family/$familyId/routines/$routineId',
          params: { familyId: resolvedFamilyId, routineId },
        });
      }
      return;
    }
    setEditingEvent(event);
    setNewEventDate(null);
    setConfirmDelete(false);
    setSubmitError(null);
    setShowDayPanel(false);
    setShowEventModal(true);
  }

  function handleNewEventForDay(date: Date) {
    setNewEventDate(date);
    setEditingEvent(null);
    setConfirmDelete(false);
    setSubmitError(null);
    setShowDayPanel(false);
    setShowEventModal(true);
  }

  function handleNewEvent() {
    setNewEventDate(null);
    setEditingEvent(null);
    setConfirmDelete(false);
    setSubmitError(null);
    setShowEventModal(true);
  }

  function handleCloseModal() {
    setShowEventModal(false);
    setEditingEvent(null);
    setNewEventDate(null);
    setConfirmDelete(false);
    setSubmitError(null);
  }

  // ── Guardado: crea o actualiza según haya evento en edición ──
  function handleSubmitEvent(values: CalendarEventFormValues) {
    setSubmitError(null);

    const startsAtISO = toISO(values.startsAt, values.allDay);
    const endsAtISO = values.endsAt
      ? values.allDay
        ? toISO(`${values.endsAt.split('T')[0]!}T23:59`, true)
        : toISO(values.endsAt, false)
      : undefined;

    if (editingEvent) {
      // PATCH solo acepta campos de UpdateEventInput (sin attendeeIds).
      updateEvent.mutate(
        {
          title: values.title,
          description: values.description ?? null,
          location: values.location ?? null,
          startsAt: startsAtISO,
          endsAt: endsAtISO ?? null,
          allDay: values.allDay,
          recurrenceRule: values.recurrenceRule ?? null,
        },
        {
          onSuccess: () => {
            // Los asistentes se actualizan con PUT /attendees por separado.
            setAttendees.mutate(
              { attendeeIds: values.attendeeIds },
              {
                onSuccess: () => handleCloseModal(),
                onError: (err) =>
                  setSubmitError(
                    toMessage(err, 'No se han podido actualizar los asistentes.'),
                  ),
              },
            );
          },
          onError: (err) =>
            setSubmitError(toMessage(err, 'No se ha podido guardar el evento.')),
        },
      );
    } else {
      createEvent.mutate(
        {
          title: values.title,
          description: values.description,
          location: values.location,
          startsAt: startsAtISO,
          endsAt: endsAtISO,
          allDay: values.allDay,
          recurrenceRule: values.recurrenceRule,
          attendeeIds: values.attendeeIds.length > 0 ? values.attendeeIds : undefined,
        },
        {
          onSuccess: () => handleCloseModal(),
          onError: (err) =>
            setSubmitError(toMessage(err, 'No se ha podido crear el evento.')),
        },
      );
    }
  }

  // ── Borrado de dos toques ──
  function handleDeleteEvent() {
    if (!editingEvent) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteEvent.mutate(undefined, { onSuccess: () => handleCloseModal() });
  }

  const props: CalendarViewProps = {
    events: mergedEvents,
    members,
    routineDays,
    isLoading,
    error: error ? 'No se han podido cargar los eventos.' : null,
    view: activeView,
    viewYear,
    viewMonth,
    weekStart,
    selectedDay: selectedDate,
    isDayPanelOpen: showDayPanel,
    isEventModalOpen: showEventModal,
    editingEvent,
    initialDate: newEventDate,
    isRecurringOccurrence,
    parentEventId: parentId,
    isSubmitting,
    confirmDelete,
    submitError,
    onChangeView: setActiveView,
    onPrevMonth: goToPrevMonth,
    onNextMonth: goToNextMonth,
    onPrevWeek: goToPrevWeek,
    onNextWeek: goToNextWeek,
    onToday: goToToday,
    onSelectDay: handleSelectDay,
    onCloseDayPanel: () => setShowDayPanel(false),
    onOpenEvent: handleOpenEvent,
    onNewEvent: handleNewEvent,
    onNewEventForDay: handleNewEventForDay,
    onCloseEventModal: handleCloseModal,
    onSubmitEvent: handleSubmitEvent,
    onDeleteEvent: handleDeleteEvent,
  };

  if (!resolvedFamilyId) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60dvh',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return <ThemeView screen="calendar" props={props} />;
}
