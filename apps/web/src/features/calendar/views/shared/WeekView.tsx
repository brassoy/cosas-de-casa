/**
 * WeekView — vista SEMANAL compartida por los 4 themes.
 *
 * A diferencia de la rejilla mensual (7×6, pensada para escritorio), la semana se
 * pinta como 7 secciones de día APILADAS en vertical: en móvil se lee mucho mejor
 * que una cuadrícula. Cada día lista sus eventos (hora + título) y ofrece un "+"
 * para crear uno en ese día. Cabecera propia con navegación semana a semana.
 *
 * Es theme-agnóstica: usa las mismas clases con tokens semánticos (border-border,
 * bg-card, bg-primary, text-primary, text-muted-foreground, rounded-card…) que el
 * resto del calendario, así que se adapta sola a los 4 themes vía CSS vars. Por
 * eso los 4 `CalendarView` importan ESTE mismo componente en lugar de duplicarlo.
 *
 * Presentacional puro: props in / callbacks out (igual que `CalendarView`).
 */

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import {
  daysOfWeek,
  formatTime,
  formatWeekRange,
  isSameDay,
  todayLocal,
} from '../../types';
import type { CalendarEventDto, CalendarViewProps } from '../types';
import { routineRingClass } from '../types';

interface WeekViewProps {
  /** Lunes de la semana visible. */
  weekStart: Date;
  events: CalendarEventDto[];
  routineDays?: CalendarViewProps['routineDays'];
  selectedDay: Date | null;
  onSelectDay: (date: Date) => void;
  onEventClick: (event: CalendarEventDto) => void;
  onNewEventForDay: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

function ymd(day: Date): string {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

function eventsForDay(events: CalendarEventDto[], day: Date): CalendarEventDto[] {
  return events
    .filter((e) => isSameDay(new Date(e.startsAt), day))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export default function WeekView({
  weekStart,
  events,
  routineDays,
  selectedDay,
  onSelectDay,
  onEventClick,
  onNewEventForDay,
  onPrevWeek,
  onNextWeek,
  onToday,
}: WeekViewProps) {
  const days = daysOfWeek(weekStart);
  const todayStr = todayLocal();

  return (
    <div className="flex flex-col gap-3">
      {/* ── Cabecera de navegación semanal ── */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Semana anterior"
          className="grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-card"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold capitalize">{formatWeekRange(weekStart)}</h2>
          <Button variant="outline" size="sm" onClick={onToday}>
            Hoy
          </Button>
        </div>
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Semana siguiente"
          className="grid h-9 w-9 place-items-center rounded-md border border-border hover:bg-card"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* ── 7 días apilados ── */}
      <div className="flex flex-col gap-2">
        {days.map((day) => {
          const dateStr = ymd(day);
          const isToday = dateStr === todayStr;
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const routineInfo = routineDays?.[dateStr];
          const dayEvents = eventsForDay(events, day);
          const weekday = day.toLocaleDateString('es-ES', { weekday: 'long' });
          const dayAria = day.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });

          return (
            <section
              key={dateStr}
              data-today={isToday}
              data-selected={isSelected}
              className={cn(
                'overflow-hidden rounded-card border border-border bg-background',
                routineRingClass(routineInfo),
                isToday && 'border-primary',
                isSelected && 'outline outline-2 -outline-offset-2 outline-primary',
              )}
            >
              {/* Cabecera del día: nº + nombre (abre el panel) + "+" (nuevo evento) */}
              <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-label={dayAria}
                  className="flex min-w-0 items-center gap-2 text-left"
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold',
                      isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className="truncate text-sm font-medium capitalize">{weekday}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNewEventForDay(day)}
                  aria-label={`Nuevo evento el ${dayAria}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-background"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Eventos del día */}
              {dayEvents.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Sin eventos</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {dayEvents.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => onEventClick(ev)}
                        aria-label={`Evento: ${ev.title}`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-card"
                      >
                        <span className="w-14 shrink-0 text-xs font-semibold text-primary">
                          {ev.allDay ? 'Todo' : formatTime(ev.startsAt)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{ev.title}</span>
                        {ev.location && (
                          <span aria-hidden="true" className="shrink-0 text-xs">
                            📍
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
