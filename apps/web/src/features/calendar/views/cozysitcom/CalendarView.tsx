/**
 * CalendarView — vista presentacional `cozysitcom` (sitcom retro 70s: madera,
 * mostaza y crema) del calendario.
 *
 * MISMA funcionalidad, contrato y callbacks que la vista `base`
 * (`features/calendar/views/base/CalendarView.tsx`): solo cambia la ESTÉTICA.
 * Implementa EXACTAMENTE `CalendarViewProps` de `../types`.
 *
 * Estética del kit estático `screens/themes/cozysitcom.tsx` mediante las clases
 * `.cz-*` de `shared/theme/themes/cozysitcom.css` (cz-frame, cz-wood, cz-serif,
 * cz-stripe, cz-btn-*, cz-input, cz-tag, cz-stamp, cz-pop, cz-wallpaper…) y
 * utilidades Tailwind que resuelven a los tokens del theme vía
 * `[data-theme='cozysitcom']`.
 *
 * Sub-flujos (todos presentacionales, props-driven, copiados del base y
 * reestilizados):
 *  - CalendarGrid       — rejilla mensual 7×6 (lunes primero, hoy resaltado).
 *  - AgendaView         — lista de próximos eventos agrupados por día.
 *  - DayEventsPanel     — Sheet inferior con los eventos del día seleccionado.
 *  - CalendarEventModal — Dialog crear/editar (RRULE, asistentes, allDay) y aviso
 *    de SOLO LECTURA para ocurrencias recurrentes (`_occ_N`).
 *
 * Se reutilizan los shells shadcn `Dialog`/`Sheet` (portal, focus-trap, escape,
 * a11y) y se reestiliza SOLO su contenido: misma robustez, look del theme.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación. Estado de UI local del formulario sembrado
 * por `key` desde el padre.
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
    <div className="cz cz-wallpaper min-h-screen">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 pb-24 pt-6">
        {/* ── Cabecera de página (cintillo de madera + cinta) ── */}
        <header className="cz-pop flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <div className="cz-wood inline-flex w-fit items-center">
                <span className="cz-serif text-sm">en directo</span>
              </div>
              <h1 className="cz-serif text-4xl leading-none">
                <span aria-hidden="true">📅 </span>Calendario
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de vista (pestañas tipo etiqueta) */}
              <div
                role="group"
                aria-label="Cambiar vista"
                className="flex gap-2"
              >
                {(['week', 'month', 'agenda'] as CalendarViewMode[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onChangeView(v)}
                    aria-pressed={view === v}
                    className={cn(
                      'cz-tag min-h-[36px] cursor-pointer px-4 transition-transform hover:-translate-y-px',
                      view === v
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card',
                    )}
                  >
                    {v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Agenda'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onNewEvent}
                className="cz-btn-denim inline-flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuevo evento
              </button>
            </div>
          </div>
          <div className="cz-stripe" />
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
    <div className="cz-pop flex flex-col gap-3">
      {/* ── Cabecera de navegación ── */}
      <div className="flex items-center justify-between py-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Mes anterior"
          className="cz-btn-ghost grid h-10 w-10 cursor-pointer place-items-center !p-0"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="cz-serif text-2xl capitalize leading-none">
            {MONTHS_ES[month]} {year}
          </h2>
          <button type="button" onClick={onToday} className="cz-btn-mustard text-xs">
            Hoy
          </button>
        </div>
        <button
          type="button"
          onClick={onNext}
          aria-label="Mes siguiente"
          className="cz-btn-ghost grid h-10 w-10 cursor-pointer place-items-center !p-0"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* ── Grid de días (dentro de un marco de madera) ── */}
      <div className="cz-frame">
        <div
          role="grid"
          aria-label={`Calendario ${MONTHS_ES[month]} ${year}`}
          className="grid grid-cols-7 gap-1"
        >
          {/* Cabecera: nombres de días */}
          {DAYS_ES.map((day) => (
            <div
              key={day}
              role="columnheader"
              aria-label={day}
              className="cz-serif pb-1 text-center text-xs font-bold uppercase tracking-wider opacity-60"
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
                  'relative flex min-h-[84px] cursor-pointer flex-col gap-0.5 rounded-md border border-border bg-background p-1.5 transition-colors',
                  !isCurrentMonth && 'opacity-50',
                  isToday && 'border-warning bg-warning/15',
                  routineRingClass(routineInfo),
                  isSelected && 'outline outline-2 -outline-offset-2 outline-destructive',
                )}
              >
                <span
                  className={cn(
                    'cz-serif flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full text-sm',
                    isToday && 'bg-warning font-bold text-foreground',
                    isSelected && !isToday && 'bg-destructive/15 text-destructive',
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
                      className="flex w-full items-center gap-0.5 overflow-hidden truncate rounded bg-primary px-1 text-left text-[0.65rem] font-bold leading-snug text-primary-foreground"
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
                    <span className="pl-1 text-[0.65rem] font-bold leading-snug opacity-60">
                      +{hiddenCount} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
      <div className="cz-frame cz-pop flex flex-col items-center gap-4 py-12 text-center">
        <p className="cz-serif text-lg opacity-70">
          No hay eventos próximos en este mes.
        </p>
        <button type="button" onClick={onNewEvent} className="cz-btn-denim">
          Crear primer evento
        </button>
      </div>
    );
  }

  return (
    <div className="cz-pop flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.date.toISOString()} className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h3 className="cz-serif text-xl capitalize leading-none">
              {dayLabel(group.date)}
            </h3>
            <div className="cz-stripe flex-1" />
          </div>
          <div className="flex flex-col gap-3">
            {group.events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => onEventClick(ev)}
                aria-label={ev.title}
                className="cz-frame flex w-full items-stretch gap-3 text-left transition-transform hover:-translate-y-px"
              >
                <div
                  className="w-1.5 shrink-0 rounded bg-warning"
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="cz-tag bg-primary text-primary-foreground">
                      {ev.allDay ? 'Todo el día' : formatTime(ev.startsAt)}
                    </span>
                    {ev.location && (
                      <span className="truncate text-xs opacity-70">
                        <span aria-hidden="true">📍 </span>
                        {ev.location}
                      </span>
                    )}
                  </div>
                  <p className="cz-serif truncate text-lg">{ev.title}</p>
                  {ev.description && (
                    <p className="line-clamp-2 text-sm opacity-70">
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
        className="cz mx-auto flex max-h-[70dvh] max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-card border-border bg-background"
      >
        <SheetHeader>
          <div className="cz-stripe mb-2" />
          <SheetTitle className="cz-serif text-2xl capitalize">
            {dateLabel}
          </SheetTitle>
        </SheetHeader>

        {dayEvents.length === 0 ? (
          <p className="cz-serif py-6 text-center text-sm opacity-70">
            No hay eventos este día.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {dayEvents.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onEventClick(ev)}
                  aria-label={ev.title}
                  className="cz-frame flex w-full items-stretch gap-3 text-left transition-transform hover:-translate-y-px"
                >
                  <div
                    className="w-1.5 shrink-0 rounded bg-warning"
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="cz-tag w-fit bg-primary text-primary-foreground">
                      {ev.allDay ? 'Todo el día' : formatTime(ev.startsAt)}
                    </span>
                    <span className="cz-serif truncate text-lg">{ev.title}</span>
                    {ev.location && (
                      <span className="text-xs opacity-70">
                        <span aria-hidden="true">📍 </span>
                        {ev.location}
                      </span>
                    )}
                    {ev.attendees.length > 0 && (
                      <span className="text-xs opacity-70">
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

        <div className="cz-divider" />
        <button
          type="button"
          onClick={() => date && onNewEvent(date)}
          className="cz-btn-denim inline-flex w-fit items-center gap-1"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo evento
        </button>
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
        <DialogContent
          aria-label="Evento recurrente"
          className="cz border-border bg-background"
        >
          <DialogHeader>
            <div className="cz-stripe mb-2" />
            <DialogTitle className="cz-serif text-2xl">
              Evento recurrente
            </DialogTitle>
            <DialogDescription className="opacity-70">
              Se edita el evento original.
            </DialogDescription>
          </DialogHeader>
          <p className="cz-frame text-sm opacity-80">
            Esta es una ocurrencia de un evento recurrente. Para editar o eliminar,
            modifica el evento original
            {parentEventId && (
              <>
                {' '}(id:{' '}
                <code className="cz-tag text-[0.75em]">{parentEventId}</code>)
              </>
            )}
            .
          </p>
          <DialogFooter>
            <button type="button" onClick={onClose} className="cz-btn-ghost">
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-label={isEdit ? 'Editar evento' : 'Nuevo evento'}
        className="cz max-h-[90dvh] overflow-y-auto border-border bg-background"
      >
        <DialogHeader>
          <div className="cz-stripe mb-2" />
          <DialogTitle className="cz-serif text-2xl">
            {isEdit ? 'Editar evento' : 'Nuevo evento'}
          </DialogTitle>
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
            <label
              htmlFor="cal-title"
              className="text-xs font-bold uppercase opacity-70"
            >
              Título{' '}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </label>
            <input
              id="cal-title"
              className="cz-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Reunión de familia"
              maxLength={200}
              required
              autoFocus
            />
          </div>

          {/* Todo el día */}
          <label
            htmlFor="cal-allday"
            className="flex cursor-pointer items-center justify-between"
          >
            <span className="text-sm font-bold">Todo el día</span>
            <input
              id="cal-allday"
              type="checkbox"
              role="switch"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn('cz-check', allDay && 'on')}
            />
          </label>

          {/* Inicio y fin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="cal-start"
                className="text-xs font-bold uppercase opacity-70"
              >
                Inicio
              </label>
              {allDay ? (
                <input
                  id="cal-start"
                  className="cz-input"
                  type="date"
                  value={startsAt.split('T')[0] ?? ''}
                  onChange={(e) => setStartsAt(`${e.target.value}T00:00`)}
                />
              ) : (
                <input
                  id="cal-start"
                  className="cz-input"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="cal-end"
                className="text-xs font-bold uppercase opacity-70"
              >
                Fin
              </label>
              {allDay ? (
                <input
                  id="cal-end"
                  className="cz-input"
                  type="date"
                  value={(endsAt || '').split('T')[0] ?? ''}
                  onChange={(e) => setEndsAt(`${e.target.value}T23:59`)}
                />
              ) : (
                <input
                  id="cal-end"
                  className="cz-input"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label
              htmlFor="cal-desc"
              className="text-xs font-bold uppercase opacity-70"
            >
              Descripción
            </label>
            <textarea
              id="cal-desc"
              className="cz-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles opcionales…"
              maxLength={1000}
              rows={3}
            />
          </div>

          {/* Ubicación */}
          <div className="space-y-1.5">
            <label
              htmlFor="cal-location"
              className="text-xs font-bold uppercase opacity-70"
            >
              Ubicación
            </label>
            <input
              id="cal-location"
              className="cz-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="p. ej. Casa de los abuelos"
              maxLength={500}
            />
          </div>

          {/* Repetición (RRULE) */}
          <div className="space-y-1.5">
            <label
              htmlFor="cal-rrule"
              className="text-xs font-bold uppercase opacity-70"
            >
              Repetición (RRULE, avanzado)
            </label>
            <textarea
              id="cal-rrule"
              className="cz-input font-mono text-sm"
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value)}
              placeholder="FREQ=WEEKLY;BYDAY=MO,WE"
              maxLength={500}
              rows={2}
            />
          </div>

          {/* Asistentes */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase opacity-70">Asistentes</p>
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
                        'cz-tag min-h-[36px] cursor-pointer px-3 transition-transform hover:-translate-y-px',
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card',
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
              className="rounded-md border-2 border-dashed border-destructive bg-destructive/10 p-3 text-sm font-bold text-destructive"
            >
              {submitError}
            </p>
          )}

          <DialogFooter className="flex-wrap gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isSubmitting}
                className="cz-btn-garnet mr-auto inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {confirmDelete ? 'Confirmar borrado' : 'Eliminar'}
              </button>
            )}
            <button type="button" onClick={onClose} className="cz-btn-ghost">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="cz-btn-denim disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear evento'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
