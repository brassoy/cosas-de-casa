import { useState } from 'react';
import type { FamilyMemberDto } from '@cosasdecasa/contracts';
import { useCreateTask } from '../hooks/useTasks';
import { ApiRequestError } from '@/shared/lib/api';

interface CreateTaskModalProps {
  familyId: string;
  currentUserId: string;
  members: FamilyMemberDto[];
  onClose: () => void;
}

export function CreateTaskModal({
  familyId,
  currentUserId,
  members,
  onClose,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recommendedDate, setRecommendedDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  // Por defecto el usuario actual está seleccionado
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    currentUserId ? [currentUserId] : [],
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createTask = useCreateTask(familyId);

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('El título es obligatorio.');
      return;
    }

    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        recommendedDate: recommendedDate || undefined,
        deadlineDate: deadlineDate || undefined,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido crear la tarea.';
          setFormError(msg);
        },
      },
    );
  }

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Crear tarea"
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Nueva tarea</h2>

        <form onSubmit={(e) => { void handleSubmit(e); }} style={styles.form}>
          {/* Título */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="task-title">
              Título <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Pintar el salón"
              style={styles.input}
              maxLength={200}
              required
              autoFocus
            />
          </div>

          {/* Descripción */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="task-description">
              Descripción
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles opcionales sobre la tarea…"
              style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              maxLength={1000}
            />
          </div>

          {/* Fechas */}
          <div style={styles.dateRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="task-recommended-date">
                Fecha recomendada
              </label>
              <input
                id="task-recommended-date"
                type="date"
                value={recommendedDate}
                onChange={(e) => setRecommendedDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="task-deadline">
                Fecha límite
              </label>
              <input
                id="task-deadline"
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {/* Asignados */}
          {members.length > 0 && (
            <div style={styles.fieldGroup}>
              <p style={styles.label}>Asignados</p>
              <div style={styles.assigneeList} role="group" aria-label="Seleccionar asignados">
                {members.map((m) => {
                  const checked = assigneeIds.includes(m.userId);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleAssignee(m.userId)}
                      aria-pressed={checked}
                      style={{
                        ...styles.assigneeChip,
                        ...(checked ? styles.assigneeChipActive : {}),
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

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createTask.isPending || !title.trim()}
              style={styles.btnPrimary}
            >
              {createTask.isPending ? 'Creando…' : 'Crear tarea'}
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
    zIndex: 100,
    padding: 'var(--space-4)',
  },
  modal: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-card)',
    padding: 'var(--space-6)',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90dvh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.3))',
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
  },
  dateRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-3)',
  },
  assigneeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
  },
  assigneeChip: {
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  assigneeChipActive: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    justifyContent: 'flex-end',
    paddingTop: 'var(--space-2)',
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
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
};
