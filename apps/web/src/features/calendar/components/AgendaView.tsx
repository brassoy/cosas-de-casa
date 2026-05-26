/**
 * Vista de agenda — lista de próximos eventos a partir de hoy.
 * Agrupa los eventos por día y los muestra en orden cronológico.
 */

import type { CalendarEventDto } from '../types';
import { formatDateLong, formatTime, isSameDay } from '../types';

interface AgendaViewProps {
  events: CalendarEventDto[];
  onEventClick: (event: CalendarEventDto) => void;
  onNewEvent: () => void;
}

interface EventGroup {
  date: Date;
  events: CalendarEventDto[];
}

/** Agrupa los eventos futuros por día (hora local), a partir de hoy. */
function groupEventsByDay(events: CalendarEventDto[]): EventGroup[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Filtrar solo eventos futuros (startsAt >= hoy) y ordenar
  const upcoming = [...events]
    .filter((e) => new Date(e.startsAt) >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const groups: EventGroup[] = [];
  for (const ev of upcoming) {
    const d = new Date(ev.startsAt);
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.date, d)) {
      last.events.push(ev);
    } else {
      groups.push({ date: d, events: [ev] });
    }
  }
  return groups;
}

/** Etiqueta relativa del día: "Hoy", "Mañana" o la fecha larga. */
function dayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameDay(date, today)) return 'Hoy';
  if (isSameDay(date, tomorrow)) return 'Mañana';
  return formatDateLong(date.toISOString());
}

function EventRow({
  event,
  onClick,
}: {
  event: CalendarEventDto;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={styles.eventRow} aria-label={event.title}>
      <div style={styles.eventAccent} />
      <div style={styles.eventContent}>
        <div style={styles.eventMeta}>
          {event.allDay ? (
            <span style={styles.eventTime}>Todo el día</span>
          ) : (
            <span style={styles.eventTime}>{formatTime(event.startsAt)}</span>
          )}
          {event.location && (
            <span style={styles.eventLocation}>📍 {event.location}</span>
          )}
        </div>
        <p style={styles.eventTitle}>{event.title}</p>
        {event.description && (
          <p style={styles.eventDesc}>{event.description}</p>
        )}
      </div>
    </button>
  );
}

export function AgendaView({ events, onEventClick, onNewEvent }: AgendaViewProps) {
  const groups = groupEventsByDay(events);

  if (groups.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyText}>No hay eventos próximos en este mes.</p>
        <button type="button" onClick={onNewEvent} style={styles.btnPrimary}>
          Crear primer evento
        </button>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {groups.map((group) => (
        <section key={group.date.toISOString()} style={styles.dayGroup}>
          <h3 style={styles.dayLabel}>{dayLabel(group.date)}</h3>
          <div style={styles.dayEvents}>
            {group.events.map((ev) => (
              <EventRow key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
  },
  dayGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  dayLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    paddingBottom: 'var(--space-1)',
    borderBottom: '1px solid var(--color-border)',
  },
  dayEvents: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  eventRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface-raised)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background-color var(--transition-fast)',
  },
  eventAccent: {
    width: '4px',
    borderRadius: '2px',
    backgroundColor: 'var(--color-accent)',
    flexShrink: 0,
  },
  eventContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    flex: 1,
    minWidth: 0,
  },
  eventMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  eventTime: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-accent)',
  },
  eventLocation: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eventTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eventDesc: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  } as React.CSSProperties,
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-12) 0',
  },
  emptyText: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-base)',
    textAlign: 'center',
  },
  btnPrimary: {
    padding: 'var(--space-2) var(--space-6)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
};
