/**
 * Vista de calendario mensual — grid 7×N con CSS nativo.
 *
 * - Semana empieza en lunes (ISO 8601)
 * - Nombres de días en español (es-ES)
 * - Resalta el día de hoy
 * - Días del mes adyacentes visibles pero atenuados
 * - Click en día → setSelectedDate
 * - Click en evento → abre modal de edición
 * - Máx. MAX_EVENTS_PER_DAY eventos visibles por celda; el resto se truncan con "+N más"
 */

import { useMemo } from 'react';
import type { CalendarEventDto } from '../types';
import {
  DAYS_ES,
  MONTHS_ES,
  getCalendarStart,
  isSameDay,
  todayLocal,
} from '../types';

const MAX_EVENTS_PER_DAY = 3;

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  events: CalendarEventDto[];
  selectedDate: Date | null;
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEventDto) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

/** Genera todas las celdas de la grilla (42 días = 6 semanas). */
function buildGridDays(year: number, month: number): Date[] {
  const start = getCalendarStart(year, month);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/** Dado un array de eventos, devuelve los que corresponden a un día concreto. */
function eventsForDay(events: CalendarEventDto[], day: Date): CalendarEventDto[] {
  return events.filter((e) => isSameDay(new Date(e.startsAt), day));
}

/** Formatea la hora del evento para mostrar en la celda del grid. */
function eventTimeLabel(event: CalendarEventDto): string {
  if (event.allDay) return '';
  const d = new Date(event.startsAt);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onDayClick,
  onEventClick,
  onPrev,
  onNext,
  onToday,
}: CalendarGridProps) {
  const gridDays = useMemo(() => buildGridDays(year, month), [year, month]);
  const todayStr = todayLocal();

  // Comprueba si hay 5 o 6 semanas en el mes (para ajustar la altura de las celdas)
  const lastDay = gridDays[gridDays.length - 1]!;
  const firstDay = gridDays[0]!;
  const weeksCount = Math.round(
    (lastDay.getTime() - firstDay.getTime()) / (7 * 24 * 60 * 60 * 1000) + 1,
  );
  void weeksCount; // usado implícitamente a través de la grilla

  return (
    <div style={styles.wrapper}>
      {/* ── Cabecera de navegación ── */}
      <div style={styles.navBar}>
        <button
          type="button"
          onClick={onPrev}
          style={styles.navBtn}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <div style={styles.navCenter}>
          <h2 style={styles.monthTitle}>
            {MONTHS_ES[month]} {year}
          </h2>
          <button type="button" onClick={onToday} style={styles.todayBtn}>
            Hoy
          </button>
        </div>
        <button
          type="button"
          onClick={onNext}
          style={styles.navBtn}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      {/* ── Grid de días ── */}
      <div style={styles.grid} role="grid" aria-label={`Calendario ${MONTHS_ES[month]} ${year}`}>
        {/* Cabecera: nombres de días */}
        {DAYS_ES.map((day) => (
          <div key={day} style={styles.dayHeader} role="columnheader" aria-label={day}>
            {day}
          </div>
        ))}

        {/* Celdas de días */}
        {gridDays.map((day) => {
          const isCurrentMonth = day.getMonth() === month;
          const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
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
              style={{
                ...styles.dayCell,
                ...(isCurrentMonth ? {} : styles.dayCellOutside),
                ...(isToday ? styles.dayCellToday : {}),
                ...(isSelected ? styles.dayCellSelected : {}),
              }}
              data-today={isToday}
              data-selected={isSelected}
              data-outside={!isCurrentMonth}
            >
              <span
                style={{
                  ...styles.dayNumber,
                  ...(isToday ? styles.dayNumberToday : {}),
                  ...(isSelected && !isToday ? styles.dayNumberSelected : {}),
                }}
              >
                {day.getDate()}
              </span>

              {/* Eventos del día */}
              <div style={styles.eventList}>
                {visibleEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    style={styles.eventChip}
                    aria-label={`Evento: ${ev.title}`}
                    title={ev.title}
                  >
                    {!ev.allDay && (
                      <span style={styles.eventTime}>{eventTimeLabel(ev)}</span>
                    )}
                    <span style={styles.eventTitle}>{ev.title}</span>
                  </button>
                ))}

                {hiddenCount > 0 && (
                  <span style={styles.moreChip}>+{hiddenCount} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  navBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-2) 0',
  },
  navCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  monthTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  todayBtn: {
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
  },
  navBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-xl)',
    cursor: 'pointer',
    lineHeight: 1,
    transition: 'background-color var(--transition-fast)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    overflow: 'hidden',
  },
  dayHeader: {
    padding: 'var(--space-2)',
    textAlign: 'center',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-surface-raised)',
    borderBottom: '1px solid var(--color-border)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  dayCell: {
    minHeight: '90px',
    padding: 'var(--space-1) var(--space-2)',
    borderRight: '1px solid var(--color-border)',
    borderBottom: '1px solid var(--color-border)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    transition: 'background-color var(--transition-fast)',
    backgroundColor: 'var(--color-surface)',
    position: 'relative',
  },
  dayCellOutside: {
    backgroundColor: 'var(--color-surface-raised)',
    opacity: 0.55,
  },
  dayCellToday: {
    backgroundColor: 'var(--color-accent-subtle)',
  },
  dayCellSelected: {
    outline: '2px solid var(--color-accent)',
    outlineOffset: '-2px',
  },
  dayNumber: {
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  dayNumberToday: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontWeight: 'var(--font-weight-bold)',
  },
  dayNumberSelected: {
    backgroundColor: 'var(--color-accent-subtle)',
    color: 'var(--color-accent)',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    overflow: 'hidden',
  },
  eventChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '1px 4px',
    borderRadius: '3px',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: '0.65rem',
    cursor: 'pointer',
    textAlign: 'left',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    width: '100%',
    maxWidth: '100%',
    lineHeight: '1.4',
  },
  eventTime: {
    flexShrink: 0,
    opacity: 0.85,
    fontSize: '0.6rem',
  },
  eventTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  moreChip: {
    fontSize: '0.65rem',
    color: 'var(--color-text-muted)',
    paddingLeft: '4px',
    lineHeight: '1.4',
  },
};
