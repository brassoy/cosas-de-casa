/**
 * CalendarView — vista presentacional `springfield` (cómic pop: tinta gruesa,
 * amarillo Springfield, hard shadows con offset) del calendario.
 *
 * MISMA funcionalidad, contrato y callbacks que la vista `base`
 * (`features/calendar/views/base/CalendarView.tsx`): solo cambia la ESTÉTICA.
 * Implementa EXACTAMENTE `CalendarViewProps` de `../types`.
 *
 * Estética del kit estático `screens/themes/springfield.tsx` mediante las clases
 * `.sf-*` de `shared/theme/themes/springfield.css` (sf, sf-bangers, sf-fredoka,
 * sf-card, sf-card-y, sf-card-s, sf-btn, sf-btn-r/g/w, sf-input, sf-tag,
 * sf-sticker, sf-check, sf-zig, sf-pop, sf-wob…) y utilidades Tailwind que
 * resuelven a los tokens del theme vía `[data-theme='springfield']`
 * (bg-primary, bg-warning, bg-success, text-destructive, border-border…).
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

// ── Constantes de presentación ────────────────────────────────────────────────

const MAX_EVENTS_PER_DAY = 3;

/**
 * Paleta de acentos del theme (kit `AVATAR_COLORS`) para teñir las "viñetas" de
 * día de la agenda. Se indexa con módulo; con noUncheckedIndexedAccess se afirma
 * non-null porque el módulo garantiza un índice válido.
 */
const SF_ACCENTS = ['#ffd90f', '#70c5ff', '#f48fb1', '#7cb342', '#e53935'] as const;

function accentAt(index: number): string {
  return SF_ACCENTS[index % SF_ACCENTS.length]!;
}

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
    members,
    isLoading,
    error,
    view,
    viewYear,
    viewMonth,
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
    <div className="sf min-h-screen bg-info">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 pb-24 pt-6">
        {/* ── Cabecera de página (cartel amarillo de cómic) ── */}
        <header className="sf-card-y sf-pop relative flex flex-col gap-3 p-4">
          <span className="sf-sticker w-fit">📅 Agenda</span>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="sf-bangers text-4xl leading-none">Calendario</h1>

            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de vista (pestañas tipo etiqueta) */}
              <div role="group" aria-label="Cambiar vista" className="flex gap-2">
                {(['month', 'agenda'] as CalendarViewMode[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onChangeView(v)}
                    aria-pressed={view === v}
                    className={cn(
                      'sf-tag min-h-[34px] cursor-pointer px-4 transition-transform hover:-translate-y-px',
                      view === v
                        ? 'bg-primary text-border'
                        : 'bg-card',
                    )}
                  >
                    {v === 'month' ? 'Mes' : 'Agenda'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onNewEvent}
                className="sf-btn sf-btn-r inline-flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuevo evento
              </button>
            </div>
          </div>
        </header>

        <ScreenState isLoading={isLoading} error={error}>
          {view === 'month' ? (
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              events={events}
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
    <div className="sf-pop flex flex-col gap-3">
      {/* ── Cabecera de navegación ── */}
      <div className="flex items-center justify-between py-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Mes anterior"
          className="sf-btn sf-btn-w grid h-10 w-10 cursor-pointer place-items-center !p-0"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="sf-bangers text-3xl capitalize leading-none">
            {MONTHS_ES[month]} {year}
          </h2>
          <button type="button" onClick={onToday} className="sf-btn !px-3 !py-1.5 text-xs">
            Hoy
          </button>
        </div>
        <button
          type="button"
          onClick={onNext}
          aria-label="Mes siguiente"
          className="sf-btn sf-btn-w grid h-10 w-10 cursor-pointer place-items-center !p-0"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* ── Grid de días (dentro de una viñeta de cómic) ── */}
      <div className="sf-card p-3">
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
              className="sf-fredoka pb-1 text-center text-xs uppercase tracking-wider opacity-60"
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
                  'relative flex min-h-[84px] cursor-pointer flex-col gap-0.5 rounded-md border-2 border-border bg-background p-1.5 transition-transform hover:-translate-y-px',
                  !isCurrentMonth && 'opacity-45',
                  isToday && 'bg-warning',
                  isSelected && 'outline outline-[3px] -outline-offset-2 outline-destructive',
                )}
              >
                <span
                  className={cn(
                    'sf-fredoka flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full text-sm',
                    isToday && 'bg-card font-bold',
                    isSelected && !isToday && 'bg-destructive text-primary-foreground',
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
                      className="flex w-full items-center gap-0.5 overflow-hidden truncate rounded border-2 border-border bg-primary px-1 text-left text-[0.65rem] font-bold leading-snug text-border"
                    >
                      {!ev.allDay && (
                        <span className="shrink-0 text-[0.6rem] opacity-80">
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
      <div className="sf-card sf-pop flex flex-col items-center gap-4 p-8 text-center">
        <p className="sf-fredoka text-lg opacity-70">
          No hay eventos próximos en este mes.
        </p>
        <button type="button" onClick={onNewEvent} className="sf-btn sf-btn-r text-lg">
          Crear primer evento
        </button>
      </div>
    );
  }

  return (
    <div className="sf-pop flex flex-col gap-5">
      {groups.map((group, groupIndex) => (
        <section key={group.date.toISOString()} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h3 className="sf-bangers text-2xl capitalize leading-none">
              {dayLabel(group.date)}
            </h3>
            <div className="sf-zig flex-1 rounded" />
          </div>
          <div className="flex flex-col gap-3">
            {group.events.map((ev, eventIndex) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => onEventClick(ev)}
                aria-label={ev.title}
                className="sf-card sf-wob flex w-full items-center gap-3 p-4 text-left"
              >
                <div
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-[3px] border-border sf-bangers text-2xl"
                  style={{
                    background: accentAt(groupIndex + eventIndex),
                    boxShadow: '3px 3px 0 #1a1a1a',
                  }}
                  aria-hidden="true"
                >
                  {group.date.getDate()}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="sf-tag bg-primary text-border">
                      {ev.allDay ? 'Todo el día' : formatTime(ev.startsAt)}
                    </span>
                    {ev.location && (
                      <span className="truncate text-xs opacity-70">
                        <span aria-hidden="true">📍 </span>
                        {ev.location}
                      </span>
                    )}
                  </div>
                  <p className="sf-fredoka truncate text-lg">{ev.title}</p>
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
        className="sf mx-auto flex max-h-[70dvh] max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-card border-border bg-background"
      >
        <SheetHeader>
          <div className="sf-zig mb-2 rounded" />
          <SheetTitle className="sf-bangers text-3xl capitalize">
            {dateLabel}
          </SheetTitle>
        </SheetHeader>

        {dayEvents.length === 0 ? (
          <p className="sf-fredoka py-6 text-center text-sm opacity-70">
            No hay eventos este día.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {dayEvents.map((ev, i) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onEventClick(ev)}
                  aria-label={ev.title}
                  className="sf-card sf-wob flex w-full items-stretch gap-3 p-4 text-left"
                >
                  <div
                    className="w-2 shrink-0 rounded border-2 border-border"
                    style={{ background: accentAt(i) }}
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="sf-tag w-fit bg-primary text-border">
                      {ev.allDay ? 'Todo el día' : formatTime(ev.startsAt)}
                    </span>
                    <span className="sf-fredoka truncate text-lg">{ev.title}</span>
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

        <div className="sf-zig rounded" />
        <button
          type="button"
          onClick={() => date && onNewEvent(date)}
          className="sf-btn sf-btn-r inline-flex w-fit items-center gap-1"
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
          className="sf border-border bg-background"
        >
          <DialogHeader>
            <div className="sf-zig mb-2 rounded" />
            <DialogTitle className="sf-bangers text-3xl">
              Evento recurrente
            </DialogTitle>
            <DialogDescription className="sf-fredoka opacity-70">
              Se edita el evento original.
            </DialogDescription>
          </DialogHeader>
          <p className="sf-card p-4 text-sm opacity-80">
            Esta es una ocurrencia de un evento recurrente. Para editar o eliminar,
            modifica el evento original
            {parentEventId && (
              <>
                {' '}(id:{' '}
                <code className="sf-tag text-[0.75em]">{parentEventId}</code>)
              </>
            )}
            .
          </p>
          <DialogFooter>
            <button type="button" onClick={onClose} className="sf-btn sf-btn-w">
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
        className="sf max-h-[90dvh] overflow-y-auto border-border bg-background"
      >
        <DialogHeader>
          <div className="sf-zig mb-2 rounded" />
          <DialogTitle className="sf-bangers text-3xl">
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
              className="sf-fredoka text-xs uppercase opacity-70"
            >
              Título{' '}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </label>
            <input
              id="cal-title"
              className="sf-input"
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
            <span className="sf-fredoka text-sm">Todo el día</span>
            <input
              id="cal-allday"
              type="checkbox"
              role="switch"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="sr-only"
            />
            <span aria-hidden="true" className={cn('sf-check', allDay && 'on')} />
          </label>

          {/* Inicio y fin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="cal-start"
                className="sf-fredoka text-xs uppercase opacity-70"
              >
                Inicio
              </label>
              {allDay ? (
                <input
                  id="cal-start"
                  className="sf-input"
                  type="date"
                  value={startsAt.split('T')[0] ?? ''}
                  onChange={(e) => setStartsAt(`${e.target.value}T00:00`)}
                />
              ) : (
                <input
                  id="cal-start"
                  className="sf-input"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="cal-end"
                className="sf-fredoka text-xs uppercase opacity-70"
              >
                Fin
              </label>
              {allDay ? (
                <input
                  id="cal-end"
                  className="sf-input"
                  type="date"
                  value={(endsAt || '').split('T')[0] ?? ''}
                  onChange={(e) => setEndsAt(`${e.target.value}T23:59`)}
                />
              ) : (
                <input
                  id="cal-end"
                  className="sf-input"
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
              className="sf-fredoka text-xs uppercase opacity-70"
            >
              Descripción
            </label>
            <textarea
              id="cal-desc"
              className="sf-input"
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
              className="sf-fredoka text-xs uppercase opacity-70"
            >
              Ubicación
            </label>
            <input
              id="cal-location"
              className="sf-input"
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
              className="sf-fredoka text-xs uppercase opacity-70"
            >
              Repetición (RRULE, avanzado)
            </label>
            <textarea
              id="cal-rrule"
              className="sf-input font-mono text-sm"
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
              <p className="sf-fredoka text-xs uppercase opacity-70">Asistentes</p>
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
                        'sf-tag min-h-[34px] cursor-pointer px-3 transition-transform hover:-translate-y-px',
                        selected
                          ? 'bg-primary text-border'
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
              className="rounded-md border-[3px] border-destructive bg-destructive/10 p-3 text-sm font-bold text-destructive"
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
                className="sf-btn sf-btn-r mr-auto inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {confirmDelete ? 'Confirmar borrado' : 'Eliminar'}
              </button>
            )}
            <button type="button" onClick={onClose} className="sf-btn sf-btn-w">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="sf-btn sf-btn-g disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear evento'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
