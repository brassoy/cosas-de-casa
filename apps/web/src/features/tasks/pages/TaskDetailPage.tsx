import { useState, useRef } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyMembers } from '@/features/family/hooks/useFamily';
import {
  useTaskDetail,
  useUpdateTask,
  useUpdateTaskAssignees,
  useUploadTaskPhoto,
  useGenerateShoppingList,
} from '../hooks/useTasks';
import { ApiRequestError } from '@/shared/lib/api';
import { PhotoGallery } from '../components/PhotoGallery';
import { TASK_STATUS_LABELS } from '../types';
import type { TaskStatus } from '../types';

export function TaskDetailPage() {
  const { taskId } = useParams({ from: '/tasks/$taskId' });
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const familyId = activeFamily?.id ?? '';

  const { data: task, isLoading, error } = useTaskDetail(taskId);
  const { data: members = [] } = useFamilyMembers(familyId);

  const updateTask = useUpdateTask(taskId, familyId);
  const updateAssignees = useUpdateTaskAssignees(taskId, familyId);
  const uploadPhoto = useUploadTaskPhoto(taskId, familyId);
  const generateList = useGenerateShoppingList(taskId);

  // Formulario de edición — campos controlados inicializados desde la tarea
  const [editMode, setEditMode] = useState(false);
  // Usamos refs para los campos del formulario para evitar setState en effects.
  // El formulario se reinicializa mediante la prop `key` cuando cambia el taskId.
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const recommendedDateRef = useRef<HTMLInputElement>(null);
  const deadlineRef = useRef<HTMLInputElement>(null);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  // assigneeIds se inicializa la primera vez que llega la tarea mediante
  // la prop `defaultValue` en el formulario y el flag `initialized`.
  const [assigneesInitialized, setAssigneesInitialized] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Inicializar assigneeIds una única vez cuando llega la tarea
  if (task && !assigneesInitialized) {
    setAssigneesInitialized(true);
    setAssigneeIds(task.assignees.map((a) => a.userId));
  }

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function handleStatusChange(newStatus: TaskStatus) {
    updateTask.mutate({ status: newStatus });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    const newTitle = titleRef.current?.value.trim() ?? '';
    if (!newTitle) {
      setEditError('El título es obligatorio.');
      return;
    }
    // Actualizar campos de la tarea (sin asignados)
    updateTask.mutate(
      {
        title: newTitle,
        description: descriptionRef.current?.value.trim() || undefined,
        recommendedDate: recommendedDateRef.current?.value || undefined,
        deadlineDate: deadlineRef.current?.value || undefined,
      },
      {
        onSuccess: () => {
          // Actualizar asignados por separado si hay alguno seleccionado
          if (assigneeIds.length > 0) {
            updateAssignees.mutate(
              { assigneeIds },
              {
                onSuccess: () => setEditMode(false),
                onError: (err) => {
                  const msg =
                    err instanceof ApiRequestError
                      ? err.body.message
                      : 'No se han podido actualizar los asignados.';
                  setEditError(msg);
                },
              },
            );
          } else {
            setEditMode(false);
          }
        },
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido guardar la tarea.';
          setEditError(msg);
        },
      },
    );
  }

  function handlePhotoUpload(file: File) {
    setUploadError(null);
    uploadPhoto.mutate(file, {
      onError: (err) => {
        setUploadError(err.message ?? 'Error al subir la foto.');
      },
    });
  }

  function handleGenerateList() {
    setGenerateError(null);
    generateList.mutate(undefined, {
      onSuccess: (res) => {
        void navigate({
          to: '/family/$familyId/lists/$listId',
          params: { familyId, listId: res.id },
        });
      },
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido generar la lista.';
        setGenerateError(msg);
      },
    });
  }

  if (isLoading) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>Cargando tarea…</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div style={styles.center}>
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          No se ha podido cargar la tarea.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Cabecera */}
      <header style={styles.pageHeader}>
        <button
          type="button"
          onClick={() =>
            void navigate({
              to: '/family/$familyId/tasks',
              params: { familyId },
            })
          }
          style={styles.btnBack}
          aria-label="Volver a tareas"
        >
          ← Tareas
        </button>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          style={styles.btnSecondary}
        >
          {editMode ? 'Cancelar edición' : 'Editar'}
        </button>
      </header>

      {/* Título y estado */}
      {!editMode ? (
        <section style={styles.section}>
          <h2 style={styles.taskTitle}>{task.title}</h2>
          {task.description && (
            <p style={styles.taskDesc}>{task.description}</p>
          )}

          <div style={styles.metaRow}>
            {task.recommendedDate && (
              <span style={styles.metaChip}>
                Recomendada: {new Date(task.recommendedDate).toLocaleDateString('es-ES')}
              </span>
            )}
            {task.deadlineDate && (
              <span style={styles.metaChip}>
                Límite: {new Date(task.deadlineDate).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>

          {task.assignees.length > 0 && (
            <p style={styles.assigneeLabel}>
              Asignados:{' '}
              <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                {task.assignees.map((a) => a.displayName).join(', ')}
              </span>
            </p>
          )}
        </section>
      ) : (
        /* Formulario de edición — uncontrolled con defaultValue para evitar
           setState en effect; se reinicializa con key={task.id + 'edit'} */
        <form
          key={task.id + '-edit'}
          onSubmit={(e) => { void handleSaveEdit(e); }}
          style={styles.editForm}
        >
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="edit-title">
              Título
            </label>
            <input
              id="edit-title"
              type="text"
              ref={titleRef}
              defaultValue={task.title}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="edit-description">
              Descripción
            </label>
            <textarea
              id="edit-description"
              ref={descriptionRef}
              defaultValue={task.description ?? ''}
              style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={styles.dateRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="edit-recommended-date">
                Fecha recomendada
              </label>
              <input
                id="edit-recommended-date"
                type="date"
                ref={recommendedDateRef}
                defaultValue={task.recommendedDate ?? ''}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="edit-deadline">
                Fecha límite
              </label>
              <input
                id="edit-deadline"
                type="date"
                ref={deadlineRef}
                defaultValue={task.deadlineDate ?? ''}
                style={styles.input}
              />
            </div>
          </div>

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

          {editError && (
            <p role="alert" style={styles.error}>
              {editError}
            </p>
          )}

          <button
            type="submit"
            disabled={updateTask.isPending}
            style={styles.btnPrimary}
          >
            {updateTask.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {/* Cambiar estado */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Estado</h3>
        <div style={styles.statusRow} role="group" aria-label="Cambiar estado">
          {(['OPEN', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              disabled={updateTask.isPending}
              aria-pressed={task.status === s}
              style={{
                ...styles.statusBtn,
                ...(task.status === s ? styles.statusBtnActive : {}),
              }}
            >
              {TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      {/* Galería de fotos */}
      <PhotoGallery
        photos={task.photos}
        onUpload={handlePhotoUpload}
        isUploading={uploadPhoto.isPending}
        uploadError={uploadError}
      />

      {/* Generar lista de la compra */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Lista de la compra</h3>
        <p style={styles.hint}>
          Crea una lista de la compra a partir de esta tarea para comprar lo que necesitas.
        </p>
        <button
          type="button"
          onClick={handleGenerateList}
          disabled={generateList.isPending}
          style={styles.btnGenerate}
        >
          {generateList.isPending ? 'Generando…' : 'Generar lista de la compra'}
        </button>
        {generateError && (
          <p role="alert" style={styles.error}>
            {generateError}
          </p>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '640px',
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
  },
  btnBack: {
    background: 'none',
    border: 'none',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
    padding: 0,
  },
  taskTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  taskDesc: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-2)',
  },
  metaChip: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px var(--space-2)',
  },
  assigneeLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-4)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  statusRow: {
    display: 'flex',
    gap: 'var(--space-2)',
    flexWrap: 'wrap',
  },
  statusBtn: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  statusBtnActive: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontWeight: 'var(--font-weight-semibold)',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-4)',
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
  },
  assigneeChipActive: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
  },
  hint: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  btnGenerate: {
    alignSelf: 'flex-start',
    padding: 'var(--space-2) var(--space-6)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  btnPrimary: {
    alignSelf: 'flex-start',
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
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
