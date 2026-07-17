/**
 * CalendarView — vista presentacional `base` (estética shadcn) del calendario.
 *
 * Porta el JSX de los componentes del kit base (Lovable `calendar.tsx`:
 * `CalendarPage` + `CalendarEventModal`) y de la feature real (`CalendarGrid`,
 * `AgendaView`, `DayEventsPanel`, `CalendarEventModal`) a las primitivas shadcn
 * de `@/shared/ui/*`, reconciliando los tipos con `CalendarEventDto` y
 * `FamilyMemberDto` reales.
 *
 * Estructura (todos los sub-flujos son presentacionales y props-driven):
 *  - CalendarGrid     — rejilla mensual 7×6 (lunes primero, día de hoy resaltado).
 *  - AgendaView       — lista de próximos eventos agrupados por día.
 *  - DayEventsPanel   — Sheet inferior con los eventos del día seleccionado.
 *  - CalendarEventModal — Dialog crear/editar (RRULE, asistentes, allDay) y aviso
 *    de SOLO LECTURA para ocurrencias recurrentes (`_occ_N`).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación. El estado de los modales/panel, el cómputo
 * del rango de mes (6 semanas), la zona horaria UTC↔local y la decisión de
 * crear/editar viven en el CONTAINER. Aquí solo se conserva estado de UI puro del
 * formulario del modal (campos en redacción), sembrado por `key` desde el padre.
 *
 * Contrato de accesibilidad preservado (lo usan container y tests):
 *  - Cabecera `heading` "Calendario", botón "+ Nuevo evento".
 *  - Botones de vista "Mes" / "Agenda" con `aria-pressed`.
 *  - Rejilla con `role="grid"`, celdas `role="gridcell"` con
 *    `data-today` / `data-selected` / `data-outside`.
 *  - Navegación "Mes anterior" / "Mes siguiente", botón "Hoy".
 *  - Modal `role="dialog"` con nombre "Nuevo evento" / "Editar evento" /
 *    "Evento recurrente"; botones "Crear evento" / "Guardar" / "Eliminar" /
 *    "Confirmar borrado" / "Cancelar"; checkbox "Todo el día".
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Switch } from '@/shared/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import {
  DAYS_ES,
  MONTHS_ES,
  formatDateLong,
  formatTime,
  getCalendarStart,
  isSameDay,
  toDatetimeLocal,
  todayLocal,
} from '../../types';
import type {
  CalendarEventDto,
  CalendarEventFormValues,
  CalendarViewMode,
  CalendarViewProps,
  FamilyMemberDto,
} from '../types';
import { routineRingClass } from '../types';
import WeekView from '../shared/WeekView';

// ── Constantes de presentación ────────────────────────────────────────────────

const MAX_EVENTS_PER_DAY = 3;

/** Genera las 42 celdas (6 semanas) de la rejilla del mes (lunes primero). */
function buildGridDays(year: number, month: number): Date[] {
  const start = getCalendarStart(year, month);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function eventsForDay(events: CalendarEventDto[], day: Date): CalendarEventDto[] {
  return events.filter((e) => isSameDay(new Date(e.startsAt), day));
}

function attendeeName(userId: string, members: FamilyMemberDto[]): string {
  return members.find((m) => m.userId === userId)?.displayName ?? userId;
}

// ── Vista principal ───────────────────────────────────────────────────────────

export default function CalendarView(props: CalendarViewProps) {
  const {
    events,
    routineDays,
    members,
    isLoading,
    error,
    view,
    viewYear,
    viewMonth,
    weekStart,
    selectedDay,
    isDayPanelOpen,
    isEventModalOpen,
    editingEvent,
    initialDate,
    isRecurringOccurrence,
    parentEventId,
    isSubmitting,
    confirmDelete,
    submitError,
    onChangeView,
    onPrevMonth,
    onNextMonth,
    onPrevWeek,
    onNextWeek,
    onToday,
    onSelectDay,
    onCloseDayPanel,
    onOpenEvent,
    onNewEvent,
    onNewEventForDay,
    onCloseEventModal,
    onSubmitEvent,
    onDeleteEvent,
  } = props;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      {/* ── Cabecera de página ── */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <h1 className="text-2xl font-bold">
          <span aria-hidden="true">📅 </span>Calendario
        </h1>

        <div className="flex items-center gap-3">
          {/* Selector de vista */}
          <div
            role="group"
            aria-label="Cambiar vista"
            className="flex overflow-hidden rounded-md border border-border text-sm"
          >
            {(['week', 'month', 'agenda'] as CalendarViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChangeView(v)}
                aria-pressed={view === v}
                className={cn(
                  'min-h-[36px] px-4 py-1.5 transition-colors',
                  view === v
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-card',
                )}
              >
                {v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Agenda'}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={onNewEvent}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Nuevo evento
          </Button>
        </div>
      </header>

      <ScreenState isLoading={isLoading} error={error}>
        {view === 'week' ? (
          <WeekView
            weekStart={weekStart}
            events={events}
            routineDays={routineDays}
            selectedDay={selectedDay}
            onSelectDay={onSelectDay}
            onEventClick={onOpenEvent}
            onNewEventForDay={onNewEventForDay}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
            onToday={onToday}
          />
        ) : view === 'month' ? (
          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            events={events}
            routineDays={routineDays}
            selectedDay={selectedDay}
            onDayClick={onSelectDay}
            onEventClick={onOpenEvent}
            onPrev={onPrevMonth}
            onNext={onNextMonth}
            onToday={onToday}
          />
        ) : (
          <AgendaView
            events={events}
            onEventClick={onOpenEvent}
            onNewEvent={onNewEvent}
          />
        )}
      </ScreenState>

      {/* ── Panel de día seleccionado (Sheet inferior) ── */}
      <DayEventsPanel
        open={Boolean(isDayPanelOpen && selectedDay)}
        date={selectedDay}
        events={events}
        members={members}
        onEventClick={onOpenEvent}
        onNewEvent={onNewEventForDay}
        onClose={onCloseDayPanel}
      />

      {/* ── Modal crear / editar evento ── */}
      {/* `key` fuerza el remontado al cambiar de evento/modo → el formulario se
          siembra con los valores correctos sin efectos de sincronización. */}
      <CalendarEventModal
        key={
          isEventModalOpen
            ? `event-${editingEvent?.id ?? 'new'}-${initialDate?.toISOString() ?? 'now'}`
            : 'event-closed'
        }
        open={Boolean(isEventModalOpen)}
        members={members}
        event={editingEvent ?? null}
        initialDate={initialDate ?? null}
        isRecurringOccurrence={Boolean(isRecurringOccurrence)}
        parentEventId={parentEventId ?? null}
        isSubmitting={isSubmitting}
        confirmDelete={confirmDelete}
        submitError={submitError}
        onClose={onCloseEventModal}
        onSubmit={onSubmitEvent}
        onDelete={onDeleteEvent}
      />
    </div>
  );
}

// ── Rejilla mensual ───────────────────────────────────────────────────────────

interface CalendarGridProps {
  year: number;
  month: number;
  events: CalendarEventDto[];
  routineDays?: CalendarViewProps['routineDays'];
  selectedDay: Date | null;
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEventDto) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function CalendarGrid({
  year,
  month,
  events,
  routineDays,
  selectedDay,
  onDayClick,
  onEventClick,
  onPrev,
  onNext,
  onToday,
}: CalendarGridProps) {
  const gridDays = useMemo(() => buildGridDays(year, month), [year, month]);
  const todayStr = todayLocal();

  return (
    <div className="flex flex-col gap-3">
      {/* ── Cabecera de navegación ── */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Mes anterior"
          className="grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-card"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold capitalize">
            {MONTHS_ES[month]} {year}
          </h2>
          <Button variant="outline" size="sm" onClick={onToday}>
            Hoy
          </Button>
        </div>
        <button
          type="button"
          onClick={onNext}
          aria-label="Mes siguiente"
          className="grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-card"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* ── Grid de días ── */}
      <div
        role="grid"
        aria-label={`Calendario ${MONTHS_ES[month]} ${year}`}
        className="grid grid-cols-7 overflow-hidden rounded-card border border-border"
      >
        {/* Cabecera: nombres de días */}
        {DAYS_ES.map((day) => (
          <div
            key={day}
            role="columnheader"
            aria-label={day}
            className="border-b border-border bg-card p-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {/* Celdas de días */}
        {gridDays.map((day) => {
          const isCurrentMonth = day.getMonth() === month;
          const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const routineInfo = routineDays?.[dateStr];
          const dayEvents = eventsForDay(events, day);
          const visibleEvents = dayEvents.slice(0, MAX_EVENTS_PER_DAY);
          const hiddenCount = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={dateStr}
              role="gridcell"
              aria-label={day.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              onClick={() => onDayClick(day)}
              data-today={isToday}
              data-selected={isSelected}
              data-outside={!isCurrentMonth}
              className={cn(
                'relative flex min-h-[90px] cursor-pointer flex-col gap-0.5 border-b border-r border-border bg-background p-1.5 transition-colors',
                !isCurrentMonth && 'bg-card opacity-55',
                isToday && 'bg-primary/10',
                routineRingClass(routineInfo),
                isSelected && 'outline outline-2 -outline-offset-2 outline-primary',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full text-sm font-medium',
                  isToday && 'bg-primary font-bold text-primary-foreground',
                  isSelected && !isToday && 'bg-primary/15 text-primary',
                )}
              >
                {day.getDate()}
              </span>

              {/* Eventos del día */}
              <div className="flex flex-col gap-px overflow-hidden">
                {visibleEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    aria-label={`Evento: ${ev.title}`}
                    title={ev.title}
                    className="flex w-full items-center gap-0.5 overflow-hidden truncate rounded bg-primary px-1 text-left text-[0.65rem] leading-snug text-primary-foreground"
                  >
                    {!ev.allDay && (
                      <span className="shrink-0 text-[0.6rem] opacity-85">
                        {formatTime(ev.startsAt)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{ev.title}</span>
                  </button>
                ))}

                {hiddenCount > 0 && (
                  <span className="pl-1 text-[0.65rem] leading-snug text-muted-foreground">
                    +{hiddenCount} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista de agenda ───────────────────────────────────────────────────────────

interface AgendaViewProps {
  events: CalendarEventDto[];
  onEventClick: (event: CalendarEventDto) => void;
  onNewEvent: () => void;
}

interface EventGroup {
  date: Date;
  events: CalendarEventDto[];
}

function groupUpcomingByDay(events: CalendarEventDto[]): EventGroup[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = [...events]
    .filter((e) => new Date(e.startsAt) >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const groups: EventGroup[] = [];
  for (const ev of upcoming) {
    const d = new Date(ev.startsAt);
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.date, d)) last.events.push(ev);
    else groups.push({ date: d, events: [ev] });
  }
  return groups;
}

function dayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(date, today)) return 'Hoy';
  if (isSameDay(date, tomorrow)) return 'Mañana';
  return formatDateLong(date.toISOString());
}

function AgendaView({ events, onEventClick, onNewEvent }: AgendaViewProps) {
  const groups = groupUpcomingByDay(events);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-center text-muted-foreground">
          No hay eventos próximos en este mes.
        </p>
        <Button onClick={onNewEvent}>Crear primer evento</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.date.toISOString()} className="flex flex-col gap-2">
          <h3 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {dayLabel(group.date)}
          </h3>
          <div className="flex flex-col gap-2">
            {group.events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => onEventClick(ev)}
                aria-label={ev.title}
                className="flex w-full items-stretch gap-3 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
              >
                <div className="w-1 shrink-0 rounded bg-primary" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-primary">
                      {ev.allDay ? 'Todo el día' : formatTime(ev.startsAt)}
                    </span>
                    {ev.location && (
                      <span className="truncate text-xs text-muted-foreground">
                        <span aria-hidden="true">📍 </span>
                        {ev.location}
                      </span>
                    )}
                  </div>
                  <p className="truncate font-medium">{ev.title}</p>
                  {ev.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {ev.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Panel de eventos de un día (Sheet inferior) ───────────────────────────────

interface DayEventsPanelProps {
  open: boolean;
  date: Date | null;
  events: CalendarEventDto[];
  members: FamilyMemberDto[];
  onEventClick: (event: CalendarEventDto) => void;
  onNewEvent: (date: Date) => void;
  onClose: () => void;
}

function DayEventsPanel({
  open,
  date,
  events,
  members,
  onEventClick,
  onNewEvent,
  onClose,
}: DayEventsPanelProps) {
  const dayEvents = date
    ? events
        .filter((e) => isSameDay(new Date(e.startsAt), date))
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    : [];

  const dateLabel = date
    ? date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        aria-label={date ? `Eventos del ${dateLabel}` : 'Eventos del día'}
        className="mx-auto flex max-h-[70dvh] max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-card"
      >
        <SheetHeader>
          <SheetTitle className="capitalize">{dateLabel}</SheetTitle>
        </SheetHeader>

        {dayEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay eventos este día.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {dayEvents.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onEventClick(ev)}
                  aria-label={ev.title}
                  className="flex w-full items-stretch gap-3 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="w-1 shrink-0 rounded bg-primary" aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-xs font-semibold text-primary">
                      {ev.allDay ? 'Todo el día' : formatTime(ev.startsAt)}
                    </span>
                    <span className="truncate font-medium">{ev.title}</span>
                    {ev.location && (
                      <span className="text-xs text-muted-foreground">
                        <span aria-hidden="true">📍 </span>
                        {ev.location}
                      </span>
                    )}
                    {ev.attendees.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        <span aria-hidden="true">👥 </span>
                        {ev.attendees.map((a) => attendeeName(a.userId, members)).join(', ')}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border pt-2">
          <Button onClick={() => date && onNewEvent(date)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Nuevo evento
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Modal crear / editar evento ───────────────────────────────────────────────

interface CalendarEventModalProps {
  open: boolean;
  members: FamilyMemberDto[];
  event: CalendarEventDto | null;
  initialDate: Date | null;
  isRecurringOccurrence: boolean;
  parentEventId: string | null;
  isSubmitting?: boolean;
  confirmDelete?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (values: CalendarEventFormValues) => void;
  onDelete: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "YYYY-MM-DDTHH:mm" en hora local para el valor por defecto del input. */
function defaultDatetime(d: Date, offsetHours = 0): string {
  const copy = new Date(d);
  copy.setHours(copy.getHours() + offsetHours, 0, 0, 0);
  return `${copy.getFullYear()}-${pad(copy.getMonth() + 1)}-${pad(copy.getDate())}T${pad(copy.getHours())}:${pad(copy.getMinutes())}`;
}

function CalendarEventModal({
  open,
  members,
  event,
  initialDate,
  isRecurringOccurrence,
  parentEventId,
  isSubmitting,
  confirmDelete,
  submitError,
  onClose,
  onSubmit,
  onDelete,
}: CalendarEventModalProps) {
  const isEdit = Boolean(event);
  const base = initialDate ?? new Date();

  // Estado de formulario LOCAL (UI pura): se siembra con `key` desde el padre al
  // abrir, por eso no hace falta sincronizar con efectos.
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startsAt, setStartsAt] = useState(
    event ? toDatetimeLocal(event.startsAt) : defaultDatetime(base),
  );
  const [endsAt, setEndsAt] = useState(
    event ? toDatetimeLocal(event.endsAt ?? event.startsAt) : defaultDatetime(base, 1),
  );
  const [recurrenceRule, setRecurrenceRule] = useState(event?.recurrenceRule ?? '');
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    event?.attendees.map((a) => a.userId) ?? [],
  );

  function toggleAttendee(userId: string) {
    setAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  const canSubmit = title.trim().length > 0 && Boolean(startsAt) && !isSubmitting;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startsAt,
      endsAt: endsAt || undefined,
      allDay,
      recurrenceRule: recurrenceRule.trim() || undefined,
      attendeeIds,
    });
  }

  // ── Ocurrencia recurrente: SOLO LECTURA ──
  if (isRecurringOccurrence) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent aria-label="Evento recurrente">
          <DialogHeader>
            <DialogTitle>Evento recurrente</DialogTitle>
            <DialogDescription>Se edita el evento original.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta es una ocurrencia de un evento recurrente. Para editar o eliminar,
            modifica el evento original
            {parentEventId && (
              <>
                {' '}(id: <code className="text-[0.75em]">{parentEventId}</code>)
              </>
            )}
            .
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-label={isEdit ? 'Editar evento' : 'Nuevo evento'}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="cal-title">
              Título{' '}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </Label>
            <Input
              id="cal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Reunión de familia"
              maxLength={200}
              required
              autoFocus
            />
          </div>

          {/* Todo el día */}
          <label htmlFor="cal-allday" className="flex items-center justify-between">
            <span className="text-sm">Todo el día</span>
            <Switch id="cal-allday" checked={allDay} onCheckedChange={setAllDay} />
          </label>

          {/* Inicio y fin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-start">Inicio</Label>
              {allDay ? (
                <Input
                  id="cal-start"
                  type="date"
                  value={startsAt.split('T')[0] ?? ''}
                  onChange={(e) => setStartsAt(`${e.target.value}T00:00`)}
                />
              ) : (
                <Input
                  id="cal-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-end">Fin</Label>
              {allDay ? (
                <Input
                  id="cal-end"
                  type="date"
                  value={(endsAt || '').split('T')[0] ?? ''}
                  onChange={(e) => setEndsAt(`${e.target.value}T23:59`)}
                />
              ) : (
                <Input
                  id="cal-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="cal-desc">Descripción</Label>
            <Textarea
              id="cal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles opcionales…"
              maxLength={1000}
              rows={3}
            />
          </div>

          {/* Ubicación */}
          <div className="space-y-1.5">
            <Label htmlFor="cal-location">Ubicación</Label>
            <Input
              id="cal-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="p. ej. Casa de los abuelos"
              maxLength={500}
            />
          </div>

          {/* Repetición (RRULE) */}
          <div className="space-y-1.5">
            <Label htmlFor="cal-rrule">Repetición (RRULE, avanzado)</Label>
            <Textarea
              id="cal-rrule"
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value)}
              placeholder="FREQ=WEEKLY;BYDAY=MO,WE"
              maxLength={500}
              rows={2}
              className="font-mono text-sm"
            />
          </div>

          {/* Asistentes */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Asistentes</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const selected = attendeeIds.includes(m.userId);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleAttendee(m.userId)}
                      className={cn(
                        'min-h-[36px] rounded-full border px-3 py-1 text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-card',
                      )}
                    >
                      {m.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {submitError && (
            <p
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError}
            </p>
          )}

          <DialogFooter className="flex-wrap">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={isSubmitting}
                className="mr-auto"
              >
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                {confirmDelete ? 'Confirmar borrado' : 'Eliminar'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
