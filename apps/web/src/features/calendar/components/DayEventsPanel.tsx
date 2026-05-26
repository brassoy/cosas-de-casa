/**
 * Panel lateral / modal de eventos de un día concreto.
 * Se abre al hacer click en un día del grid.
 * Permite ver los eventos del día y crear uno nuevo.
 */

import type { FamilyMemberDto } from '@cosasdecasa/contracts';
import type { CalendarEventDto } from '../types';
import { formatTime, isSameDay } from '../types';

interface DayEventsPanelProps {
  date: Date;
  events: CalendarEventDto[];
  members: FamilyMemberDto[];
  onEventClick: (event: CalendarEventDto) => void;
  onNewEvent: (date: Date) => void;
  onClose: () => void;
}

/** Devuelve el nombre del miembro por su userId. */
function attendeeName(userId: string, members: FamilyMemberDto[]): string {
  return members.find((m) => m.userId === userId)?.displayName ?? userId;
}

export function DayEventsPanel({
  date,
  events,
  members,
  onEventClick,
  onNewEvent,
  onClose,
}: DayEventsPanelProps) {
  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.startsAt), date))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const dateLabel = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  // Capitaliza el primer carácter
  const dateTitle = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Eventos del ${dateLabel}`}
    >
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div style={styles.header}>
          <h2 style={styles.title}>{dateTitle}</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Cerrar panel">
            ✕
          </button>
        </div>

        {/* Lista de eventos */}
        {dayEvents.length === 0 ? (
          <p style={styles.empty}>No hay eventos este día.</p>
        ) : (
          <ul style={styles.eventList}>
            {dayEvents.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onEventClick(ev)}
                  style={styles.eventItem}
                  aria-label={ev.title}
                >
                  <div style={styles.eventAccent} />
                  <div style={styles.eventBody}>
                    <span style={styles.eventTime}>
                      {ev.allDay ? 'Todo el día' : formatTime(ev.startsAt)}
                    </span>
                    <span style={styles.eventTitle}>{ev.title}</span>
                    {ev.location && (
                      <span style={styles.eventLocation}>📍 {ev.location}</span>
                    )}
                    {ev.attendees.length > 0 && (
                      <span style={styles.eventAttendees}>
                        👥 {ev.attendees.map((a) => attendeeName(a.userId, members)).join(', ')}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Acción */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={() => onNewEvent(date)}
            style={styles.btnPrimary}
          >
            + Nuevo evento
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 'var(--z-modal)' as unknown as number,
  },
  panel: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
    padding: 'var(--space-6)',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '70dvh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
    flex: 1,
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
  },
  empty: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
    textAlign: 'center',
    padding: 'var(--space-6) 0',
  },
  eventList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  eventItem: {
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
  eventBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  eventTime: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-accent)',
  },
  eventTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eventLocation: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  eventAttendees: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
  },
  footer: {
    paddingTop: 'var(--space-2)',
    borderTop: '1px solid var(--color-border)',
  },
  btnPrimary: {
    padding: 'var(--space-2) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
};
