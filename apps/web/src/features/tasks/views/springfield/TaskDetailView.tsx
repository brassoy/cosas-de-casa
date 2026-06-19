/**
 * TaskDetailView — vista presentacional `springfield` del detalle de tarea.
 *
 * MISMA funcionalidad y contrato que la vista base (`../base/TaskDetailView`):
 * mismos props, callbacks y sub-flujos (editor controlado + galería de fotos +
 * cambio de estado + generar lista). SOLO cambia la estética al theme "Cómic pop
 * / Springfield" (bordes gruesos de tinta, hard shadows offset, colores planos
 * saturados, Bangers/Fredoka/Nunito), reutilizando las clases `.sf-*` de
 * `shared/theme/themes/springfield.css`.
 *
 * Reconciliación del formulario de edición (igual que base): formulario
 * controlado como estado de UI local, reinicializado vía `key` al cambiar la
 * tarea o reabrir la edición. El guardado emite `onSave(values)`; los asignados
 * se reemplazan con `onSetAssignees(ids)` por separado, solo si cambiaron.
 *
 * Sub-flujos presentacionales (props-driven):
 *  - `TaskEditor` — editor de campos + asignados, estado de UI local controlado.
 *  - `PhotoGallery` — recibe `photos` con `url` pública YA resuelta; la subida
 *    con compresión la maneja el container vía `onUploadPhoto(file)`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación, sin Supabase.
 */

import { useRef, useState } from 'react';
import { ImagePlus, ListPlus, Loader2, Trash2, X } from 'lucide-react';
import { Checkbox } from '@/shared/ui/checkbox';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import { TASK_STATUS_LABELS } from '../../types';
import type {
  TaskStatus,
  FamilyMemberDto,
  TaskPhotoView,
  TaskDetailViewProps,
} from '../types';

const STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'DONE'];

/** Banner de error con estética del theme (viñeta roja, texto inverso). */
function ErrorNote({ message }: { message: string }) {
  return (
    <div className="sf-card !bg-error text-text-inverse !p-3 text-sm font-bold" role="alert">
      {message}
    </div>
  );
}

export default function TaskDetailView(props: TaskDetailViewProps) {
  const {
    task,
    isEditing,
    members,
    isLoading,
    error,
    isSaving,
    editError,
    isUpdatingStatus,
    uploadingPhoto,
    uploadError,
    isGeneratingList,
    generateError,
    isDeleting,
    deleteError,
    isDeletingPhoto,
    onBack,
    onToggleEdit,
    onSave,
    onSetAssignees,
    onSetStatus,
    onUploadPhoto,
    onDeletePhoto,
    onDeleteTask,
    onGenerateShoppingList,
  } = props;

  return (
    <ScreenState isLoading={isLoading} error={error}>
      <div className="sf sf-dot min-h-[80dvh] space-y-4 px-5 py-8">
        {/* Cabecera: volver + viñeta amarilla + título Bangers + estado. */}
        <div className="sf-card-y p-4 relative sf-pop">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={onBack}
              className="sf-sticker cursor-pointer"
              aria-label="Volver a tareas"
            >
              ← Tareas
            </button>
            <button
              type="button"
              className="sf-btn sf-btn-w !py-1.5 !px-3 text-xs"
              onClick={onToggleEdit}
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
          </div>
          <div className="flex items-end justify-between gap-3">
            <h1 className="sf-bangers text-4xl leading-none min-w-0">{task.title}</h1>
            <span className={cn('sf-tag shrink-0', STATUS_TAG[task.status])}>
              {TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
        </div>

        {!isEditing ? (
          <section className="sf-card p-4 space-y-3">
            {task.description && <p className="opacity-80">{task.description}</p>}
            {(task.recommendedDate || task.deadlineDate) && (
              <div className="flex flex-wrap gap-2">
                {task.recommendedDate && (
                  <span className="sf-tag bg-info text-text">
                    Recomendada: {new Date(task.recommendedDate).toLocaleDateString('es-ES')}
                  </span>
                )}
                {task.deadlineDate && (
                  <span className="sf-tag bg-warning text-text">
                    Límite: {new Date(task.deadlineDate).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
            )}
            {task.assignees.length > 0 && (
              <div>
                <p className="sf-fredoka text-xs uppercase opacity-70 mb-1">Asignada</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.assignees.map((a, i) => (
                    <span key={a.userId} className={cn('sf-tag', avatarColor(i))}>
                      {a.displayName ?? '—'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          /* La key fuerza un remount limpio del editor al reabrir/cambiar tarea,
             reinicializando el estado controlado desde la tarea actual. */
          <TaskEditor
            key={`${task.id}-edit`}
            initialTitle={task.title}
            initialDescription={task.description ?? ''}
            initialRecommendedDate={task.recommendedDate ?? ''}
            initialDeadlineDate={task.deadlineDate ?? ''}
            initialAssigneeIds={task.assignees.map((a) => a.userId)}
            members={members}
            isSaving={isSaving}
            error={editError}
            onSave={onSave}
            onSetAssignees={onSetAssignees}
          />
        )}

        {/* Estado: segmentado de cómic (amarillo cuando activo). */}
        <section className="sf-card p-4 space-y-2">
          <p className="sf-bangers text-xl">Estado</p>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Cambiar estado">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSetStatus(s)}
                disabled={isUpdatingStatus}
                aria-pressed={task.status === s}
                className={cn(
                  'sf-btn !px-2 text-xs min-h-[44px] cursor-pointer disabled:opacity-50',
                  task.status === s ? 'sf-btn-g' : 'sf-btn-w',
                )}
              >
                {TASK_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        {/* Fotos */}
        <PhotoGallery
          photos={task.photos}
          uploadingPhoto={uploadingPhoto}
          uploadError={uploadError}
          isDeletingPhoto={isDeletingPhoto}
          onUploadPhoto={onUploadPhoto}
          onDeletePhoto={onDeletePhoto}
        />

        {/* Generar lista de la compra */}
        <section className="sf-card p-4 space-y-2">
          <p className="sf-bangers text-xl">Lista de la compra</p>
          <p className="text-sm opacity-70">
            Crea una lista de la compra a partir de esta tarea para comprar lo que necesitas.
          </p>
          <button
            type="button"
            className="sf-btn sf-btn-r w-full flex items-center justify-center gap-1.5 disabled:opacity-50"
            onClick={onGenerateShoppingList}
            disabled={isGeneratingList}
          >
            <ListPlus className="h-4 w-4" />
            {isGeneratingList ? 'Generando…' : 'Generar lista de la compra'}
          </button>
          {generateError && <ErrorNote message={generateError} />}
        </section>

        {/* Zona peligrosa: borrar tarea (viñeta roja). */}
        {onDeleteTask && (
          <section className="sf-card p-4 space-y-2">
            <p className="sf-bangers text-xl text-error">¡Cuidado!</p>
            <button
              type="button"
              className="sf-btn sf-btn-r w-full flex items-center justify-center gap-1.5 disabled:opacity-50"
              onClick={onDeleteTask}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Borrando…' : 'Borrar tarea'}
            </button>
            {deleteError && <ErrorNote message={deleteError} />}
          </section>
        )}
      </div>
    </ScreenState>
  );
}

/** Color de fondo del `sf-tag` de estado, por estado (paleta plana del cómic). */
const STATUS_TAG: Record<TaskStatus, string> = {
  OPEN: 'bg-error text-text-inverse',
  IN_PROGRESS: 'bg-warning text-text',
  DONE: 'bg-success text-text-inverse',
};

/**
 * Paleta de colores de cómic para los tags de asignados. Se indexa por posición
 * (`i % len`); con `noUncheckedIndexedAccess` el acceso es `T|undefined`, por eso
 * este helper devuelve siempre `string`.
 */
const AVATAR_COLORS = ['bg-accent', 'bg-info', 'bg-error', 'bg-success'] as const;
function avatarColor(i: number): string {
  return AVATAR_COLORS[i % AVATAR_COLORS.length]!;
}

// ── Sub-flujo presentacional: editor de tarea (controlado, estética springfield) ─

interface TaskEditorProps {
  initialTitle: string;
  initialDescription: string;
  initialRecommendedDate: string;
  initialDeadlineDate: string;
  initialAssigneeIds: string[];
  members: FamilyMemberDto[];
  isSaving?: boolean;
  error?: string | null;
  onSave: TaskDetailViewProps['onSave'];
  onSetAssignees: TaskDetailViewProps['onSetAssignees'];
}

function TaskEditor({
  initialTitle,
  initialDescription,
  initialRecommendedDate,
  initialDeadlineDate,
  initialAssigneeIds,
  members,
  isSaving,
  error,
  onSave,
  onSetAssignees,
}: TaskEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [recommendedDate, setRecommendedDate] = useState(initialRecommendedDate);
  const [deadlineDate, setDeadlineDate] = useState(initialDeadlineDate);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialAssigneeIds);
  // Para no reemplazar asignados si el usuario no los tocó (paridad container:
  // el endpoint de assignees exige min 1; solo lo llamamos si hay cambio).
  const initialRef = useRef(initialAssigneeIds.slice().sort().join(','));

  function toggleAssignee(userId: string, checked: boolean) {
    setAssigneeIds((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId),
    );
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      recommendedDate: recommendedDate || undefined,
      deadlineDate: deadlineDate || undefined,
    });
    const current = assigneeIds.slice().sort().join(',');
    if (current !== initialRef.current && assigneeIds.length > 0) {
      onSetAssignees(assigneeIds);
    }
  }

  return (
    <form
      className="sf-card p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="edit-title" className="sf-fredoka text-xs uppercase opacity-70">
          Título
        </label>
        <input
          id="edit-title"
          className="sf-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="edit-description" className="sf-fredoka text-xs uppercase opacity-70">
          Descripción
        </label>
        <textarea
          id="edit-description"
          className="sf-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label htmlFor="edit-recommended" className="sf-fredoka text-xs uppercase opacity-70">
            Recomendada
          </label>
          <input
            id="edit-recommended"
            className="sf-input"
            type="date"
            value={recommendedDate}
            onChange={(e) => setRecommendedDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="edit-deadline" className="sf-fredoka text-xs uppercase opacity-70">
            Límite
          </label>
          <input
            id="edit-deadline"
            className="sf-input"
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
          />
        </div>
      </div>
      {members.length > 0 && (
        <div className="space-y-1.5">
          <label className="sf-fredoka text-xs uppercase opacity-70">Asignar a</label>
          <div className="space-y-1" role="group" aria-label="Seleccionar asignados">
            {members.map((m) => (
              <label
                key={m.userId}
                className="flex items-center gap-2 text-sm cursor-pointer min-h-[36px]"
              >
                <Checkbox
                  checked={assigneeIds.includes(m.userId)}
                  onCheckedChange={(c) => toggleAssignee(m.userId, c === true)}
                />
                {m.displayName}
              </label>
            ))}
          </div>
        </div>
      )}
      {error && <ErrorNote message={error} />}
      <button
        type="submit"
        className="sf-btn sf-btn-g w-full disabled:opacity-50"
        disabled={!title.trim() || isSaving}
      >
        {isSaving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}

// ── Sub-flujo presentacional: galería de fotos (estética springfield) ─────────

interface PhotoGalleryProps {
  photos: TaskPhotoView[];
  uploadingPhoto?: boolean;
  uploadError?: string | null;
  isDeletingPhoto?: boolean;
  onUploadPhoto: (file: File) => void;
  onDeletePhoto?: (photoId: string) => void;
}

function PhotoGallery({
  photos,
  uploadingPhoto,
  uploadError,
  isDeletingPhoto,
  onUploadPhoto,
  onDeletePhoto,
}: PhotoGalleryProps) {
  return (
    <section className="sf-card p-4 space-y-2">
      <p className="sf-bangers text-xl">Fotos</p>

      {uploadError && <ErrorNote message={uploadError} />}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative">
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sf-card !p-0 aspect-square overflow-hidden block"
              aria-label="Ver foto de la tarea"
            >
              <img
                src={photo.url}
                alt="Foto de la tarea"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </a>
            {onDeletePhoto && (
              <button
                type="button"
                onClick={() => onDeletePhoto(photo.id)}
                disabled={isDeletingPhoto}
                aria-label="Borrar foto"
                className="absolute -right-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full bg-error text-text-inverse border-2 border-text shadow-[2px_2px_0_var(--color-text)] cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        <label className="sf-card !shadow-none aspect-square border-dashed grid place-items-center cursor-pointer hover:bg-accent-subtle transition-colors">
          {uploadingPhoto ? (
            <Loader2 className="h-5 w-5 motion-safe:animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            aria-label="Seleccionar imagen"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadPhoto(f);
              // Limpia el input para volver a seleccionar el mismo fichero.
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </section>
  );
}
