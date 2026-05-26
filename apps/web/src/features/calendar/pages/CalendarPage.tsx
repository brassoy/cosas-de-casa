/**
 * Página principal del calendario.
 *
 * Organiza:
 *   - Vista mensual (CalendarGrid)
 *   - Vista agenda (AgendaView)
 *   - Panel de día seleccionado (DayEventsPanel)
 *   - Modal crear/editar evento (CalendarEventModal)
 *
 * Zona horaria: todos los eventos se reciben como ISO UTC; se muestran en hora
 * local del navegador. Las fechas enviadas al backend son ISO UTC calculadas
 * a partir de la hora local del usuario.
 */

import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyMembers } from '@/features/family/hooks/useFamily';
import { useCalendarEvents } from '../hooks/useCalendar';
import { useCalendarStore } from '../store/calendar.store';
import { CalendarGrid } from '../components/CalendarGrid';
import { AgendaView } from '../components/AgendaView';
import { DayEventsPanel } from '../components/DayEventsPanel';
import { CalendarEventModal } from '../components/CalendarEventModal';
import type { CalendarEventDto } from '../types';

export function CalendarPage() {
  const { familyId } = useParams({ strict: false }) as { familyId?: string };
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const resolvedFamilyId = familyId ?? activeFamily?.id;

  // ── Estado del store ────────────────────────────────────────────────────────
  const viewYear = useCalendarStore((s) => s.viewYear);
  const viewMonth = useCalendarStore((s) => s.viewMonth);
  const activeView = useCalendarStore((s) => s.activeView);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const goToPrevMonth = useCalendarStore((s) => s.goToPrevMonth);
  const goToNextMonth = useCalendarStore((s) => s.goToNextMonth);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const setActiveView = useCalendarStore((s) => s.setActiveView);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);

  // ── Estado local de modales ─────────────────────────────────────────────────
  const [editingEvent, setEditingEvent] = useState<CalendarEventDto | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDayPanel, setShowDayPanel] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date | null>(null);

  // ── Datos ───────────────────────────────────────────────────────────────────
  const { data: events = [], isLoading, error } = useCalendarEvents(
    resolvedFamilyId,
    viewYear,
    viewMonth,
  );
  const { data: members = [] } = useFamilyMembers(resolvedFamilyId);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleDayClick(date: Date) {
    setSelectedDate(date);
    setShowDayPanel(true);
  }

  function handleEventClick(event: CalendarEventDto) {
    setEditingEvent(event);
    setShowDayPanel(false);
    setShowEventModal(true);
  }

  function handleNewEventFromDay(date: Date) {
    setNewEventDate(date);
    setEditingEvent(null);
    setShowDayPanel(false);
    setShowEventModal(true);
  }

  function handleNewEvent() {
    setNewEventDate(null);
    setEditingEvent(null);
    setShowEventModal(true);
  }

  function handleCloseModal() {
    setShowEventModal(false);
    setEditingEvent(null);
    setNewEventDate(null);
  }

  function handleCloseDayPanel() {
    setShowDayPanel(false);
  }

  if (!resolvedFamilyId) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* ── Cabecera de página ── */}
      <header style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>📅 Calendario</h1>

        <div style={styles.headerActions}>
          {/* Selector de vista */}
          <div style={styles.viewToggle} role="group" aria-label="Cambiar vista">
            <button
              type="button"
              onClick={() => setActiveView('month')}
              style={{
                ...styles.viewBtn,
                ...(activeView === 'month' ? styles.viewBtnActive : {}),
              }}
              aria-pressed={activeView === 'month'}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setActiveView('agenda')}
              style={{
                ...styles.viewBtn,
                ...(activeView === 'agenda' ? styles.viewBtnActive : {}),
              }}
              aria-pressed={activeView === 'agenda'}
            >
              Agenda
            </button>
          </div>

          <button type="button" onClick={handleNewEvent} style={styles.btnPrimary}>
            + Nuevo evento
          </button>
        </div>
      </header>

      {/* ── Estados de carga y error ── */}
      {isLoading && <p style={styles.muted}>Cargando eventos…</p>}

      {error && (
        <p role="alert" style={styles.errorBanner}>
          No se han podido cargar los eventos.
        </p>
      )}

      {/* ── Vista mensual ── */}
      {activeView === 'month' && (
        <CalendarGrid
          year={viewYear}
          month={viewMonth}
          events={events}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
          onPrev={goToPrevMonth}
          onNext={goToNextMonth}
          onToday={goToToday}
        />
      )}

      {/* ── Vista agenda ── */}
      {activeView === 'agenda' && (
        <AgendaView
          events={events}
          onEventClick={handleEventClick}
          onNewEvent={handleNewEvent}
        />
      )}

      {/* ── Panel de día seleccionado ── */}
      {showDayPanel && selectedDate && (
        <DayEventsPanel
          date={selectedDate}
          events={events}
          members={members}
          onEventClick={handleEventClick}
          onNewEvent={handleNewEventFromDay}
          onClose={handleCloseDayPanel}
        />
      )}

      {/* ── Modal crear / editar evento ── */}
      {showEventModal && (
        <CalendarEventModal
          familyId={resolvedFamilyId}
          year={viewYear}
          month={viewMonth}
          members={members}
          event={editingEvent}
          initialDate={newEventDate}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
  },
  pageTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
  },
  viewToggle: {
    display: 'flex',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  viewBtn: {
    padding: 'var(--space-2) var(--space-4)',
    border: 'none',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  viewBtnActive: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
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
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
