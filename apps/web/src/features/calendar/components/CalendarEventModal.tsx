/**
 * Modal de creación/edición de eventos del calendario.
 *
 * Props:
 *   familyId    — familia activa
 *   year/month  — mes visible (para invalidar la query correcta)
 *   members     — miembros de la familia (para seleccionar asistentes)
 *   event       — si se pasa, modo edición; si no, modo creación
 *   initialDate — fecha para pre-rellenar el campo startAt (modo creación)
 *   onClose     — callback de cierre
 */

import { useState } from 'react';
import type { FamilyMemberDto } from '@cosasdecasa/contracts';
import { ApiRequestError } from '@/shared/lib/api';
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useSetEventAttendees,
  useDeleteCalendarEvent,
} from '../hooks/useCalendar';
import type { CalendarEventDto } from '../types';
import { toDatetimeLocal, isOccurrenceId, parentEventId } from '../types';

interface CalendarEventModalProps {
  familyId: string;
  year: number;
  month: number;
  members: FamilyMemberDto[];
  event?: CalendarEventDto | null;
  initialDate?: Date | null;
  onClose: () => void;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Devuelve "YYYY-MM-DDTHH:mm" para el valor por defecto del campo datetime-local. */
function defaultDatetime(d: Date, offsetHours = 0): string {
  const copy = new Date(d);
  copy.setHours(copy.getHours() + offsetHours, 0, 0, 0);
  return `${copy.getFullYear()}-${pad(copy.getMonth() + 1)}-${pad(copy.getDate())}T${pad(copy.getHours())}:${pad(copy.getMinutes())}`;
}

export function CalendarEventModal({
  familyId,
  year,
  month,
  members,
  event,
  initialDate,
  onClose,
}: CalendarEventModalProps) {
  // Ocurrencias expandidas (_occ_N) son de solo lectura: no se editan ni borran
  // directamente. Se redirige al usuario a operar sobre el evento padre.
  const isOccurrence = Boolean(event && isOccurrenceId(event.id));
  const isEdit = Boolean(event);

  // ── Estado del formulario ─────────────────────────────────────────────────

  const now = initialDate ?? new Date();

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startsAt, setStartsAt] = useState(
    event ? toDatetimeLocal(event.startsAt) : defaultDatetime(now),
  );
  const [endsAt, setEndsAt] = useState(
    event ? toDatetimeLocal(event.endsAt ?? event.startsAt) : defaultDatetime(now, 1),
  );
  // attendees viene como { userId }[] — convertimos a string[] para la UI
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    event?.attendees.map((a) => a.userId) ?? [],
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Hooks de mutación ────────────────────────────────────────────────────

  const createEvent = useCreateCalendarEvent(familyId, year, month);
  const updateEvent = useUpdateCalendarEvent(event?.id ?? '', familyId, year, month);
  const setAttendees = useSetEventAttendees(event?.id ?? '', familyId, year, month);
  const deleteEvent = useDeleteCalendarEvent(event?.id ?? '', familyId, year, month);

  const isPending =
    createEvent.isPending ||
    updateEvent.isPending ||
    setAttendees.isPending ||
    deleteEvent.isPending;

  // ── Handlers ─────────────────────────────────────────────────────────────

  function toggleAttendee(userId: string) {
    setAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function buildISOFromDatetimeLocal(value: string, useAllDay: boolean): string {
    // Para allDay ignoramos la hora y usamos el inicio del día en UTC
    if (useAllDay) {
      const [datePart] = value.split('T');
      return new Date(`${datePart!}T00:00:00.000Z`).toISOString();
    }
    // El input datetime-local no tiene zona horaria: se interpreta como local
    return new Date(value).toISOString();
  }

  function validate(): boolean {
    if (!title.trim()) {
      setFormError('El título es obligatorio.');
      return false;
    }
    if (!startsAt) {
      setFormError('La fecha de inicio es obligatoria.');
      return false;
    }
    const start = new Date(startsAt);
    if (endsAt) {
      const end = new Date(endsAt);
      if (!allDay && end <= start) {
        setFormError('La fecha de fin debe ser posterior a la de inicio.');
        return false;
      }
    }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    const startsAtISO = buildISOFromDatetimeLocal(startsAt, allDay);
    const endsAtISO = endsAt
      ? allDay
        ? buildISOFromDatetimeLocal(endsAt.split('T')[0]! + 'T23:59', allDay)
        : buildISOFromDatetimeLocal(endsAt, false)
      : undefined;

    if (isEdit && event) {
      // PATCH solo acepta campos de UpdateEventInput (sin attendeeIds)
      const updatePayload = {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        startsAt: startsAtISO,
        endsAt: endsAtISO ?? null,
        allDay,
      };
      updateEvent.mutate(updatePayload, {
        onSuccess: () => {
          // Si los asistentes cambiaron, actualizarlos con PUT /attendees
          setAttendees.mutate(
            { attendeeIds },
            {
              onSuccess: () => onClose(),
              onError: (err) => {
                setFormError(
                  err instanceof ApiRequestError
                    ? err.body.message
                    : 'No se han podido actualizar los asistentes.',
                );
              },
            },
          );
        },
        onError: (err) => {
          setFormError(
            err instanceof ApiRequestError ? err.body.message : 'No se ha podido guardar el evento.',
          );
        },
      });
    } else {
      const createPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startsAt: startsAtISO,
        endsAt: endsAtISO,
        allDay,
        attendeeIds: attendeeIds.length > 0 ? attendeeIds : undefined,
      };
      createEvent.mutate(createPayload, {
        onSuccess: () => onClose(),
        onError: (err) => {
          setFormError(
            err instanceof ApiRequestError ? err.body.message : 'No se ha podido crear el evento.',
          );
        },
      });
    }
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteEvent.mutate(undefined, { onSuccess: () => onClose() });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Las ocurrencias expandidas no se pueden editar ni borrar directamente.
  if (isOccurrence && event) {
    const pid = parentEventId(event.id);
    return (
      <div
        style={styles.overlay}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Evento recurrente"
      >
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h2 style={styles.modalTitle}>Evento recurrente</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Esta es una ocurrencia de un evento recurrente. Para editar o eliminar, modifica el
            evento original (id: <code style={{ fontSize: '0.75em' }}>{pid}</code>).
          </p>
          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Editar evento' : 'Nuevo evento'}
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>{isEdit ? 'Editar evento' : 'Nuevo evento'}</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Título */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="cal-title">
              Título{' '}
              <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>
                *
              </span>
            </label>
            <input
              id="cal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Reunión de familia"
              style={styles.input}
              maxLength={200}
              required
              autoFocus
            />
          </div>

          {/* Todo el día */}
          <div style={styles.checkboxRow}>
            <input
              id="cal-allday"
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="cal-allday" style={styles.checkboxLabel}>
              Todo el día
            </label>
          </div>

          {/* Inicio y fin */}
          <div style={styles.twoCol}>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="cal-start">
                Inicio
              </label>
              {allDay ? (
                <input
                  id="cal-start"
                  type="date"
                  value={startsAt.split('T')[0] ?? ''}
                  onChange={(e) => setStartsAt(e.target.value + 'T00:00')}
                  style={styles.input}
                />
              ) : (
                <input
                  id="cal-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  style={styles.input}
                />
              )}
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="cal-end">
                Fin
              </label>
              {allDay ? (
                <input
                  id="cal-end"
                  type="date"
                  value={(endsAt ?? '').split('T')[0] ?? ''}
                  onChange={(e) => setEndsAt(e.target.value + 'T23:59')}
                  style={styles.input}
                />
              ) : (
                <input
                  id="cal-end"
                  type="datetime-local"
                  value={endsAt ?? ''}
                  onChange={(e) => setEndsAt(e.target.value)}
                  style={styles.input}
                />
              )}
            </div>
          </div>

          {/* Descripción */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="cal-desc">
              Descripción
            </label>
            <textarea
              id="cal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles opcionales…"
              style={{ ...styles.input, minHeight: '72px', resize: 'vertical' }}
              maxLength={1000}
              rows={3}
            />
          </div>

          {/* Ubicación */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="cal-location">
              Ubicación
            </label>
            <input
              id="cal-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="p. ej. Casa de los abuelos"
              style={styles.input}
              maxLength={200}
            />
          </div>

          {/* Asistentes */}
          {members.length > 0 && (
            <div style={styles.fieldGroup}>
              <p style={styles.label}>Asistentes</p>
              <div style={styles.attendeesRow}>
                {members.map((m) => {
                  const selected = attendeeIds.includes(m.userId);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleAttendee(m.userId)}
                      style={{
                        ...styles.attendeeChip,
                        ...(selected ? styles.attendeeChipActive : {}),
                      }}
                    >
                      {m.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {formError && (
            <p role="alert" style={styles.error}>
              {formError}
            </p>
          )}

          {/* Acciones */}
          <div style={styles.actions}>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                style={{ ...styles.btnDanger, marginRight: 'auto' }}
              >
                {confirmDelete ? 'Confirmar borrado' : 'Eliminar'}
              </button>
            )}
            <button type="button" onClick={onClose} style={styles.btnSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending || !title.trim()} style={styles.btnPrimary}>
              {isPending ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 'var(--z-modal)' as unknown as number,
    padding: 'var(--space-4)',
  },
  modal: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-6)',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90dvh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    boxShadow: 'var(--shadow-lg)',
  },
  modalTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  label: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  input: {
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-3)',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  attendeesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
  },
  attendeeChip: {
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  attendeeChipActive: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
    paddingTop: 'var(--space-2)',
    flexWrap: 'wrap',
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
  btnSecondary: {
    padding: 'var(--space-2) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  btnDanger: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-error)',
    backgroundColor: 'transparent',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
};
