/**
 * TaskDetailView — vista presentacional `cozy` del detalle de tarea.
 *
 * MISMA funcionalidad y contrato que la vista base (`../base/TaskDetailView`):
 * mismos props, callbacks y sub-flujos (editor controlado + galería de fotos +
 * cambio de estado + generar lista). SOLO cambia la estética al theme "Cuaderno
 * de papel manuscrito" (papel crema pautado, tinta marrón, bolígrafo azul, notas
 * con cinta/chinchetas, casillas a mano, sello de estado inclinado, fuentes
 * Caveat/Patrick Hand), reutilizando las clases `.ck-*` de
 * `shared/theme/themes/cozy.css`.
 *
 * Reconciliación del formulario de edición (igual que base): formulario
 * controlado como estado de UI local, reinicializado vía `key` al cambiar la
 * tarea o reabrir la edición. El guardado emite `onSave(values)`; los asignados
 * se reemplazan con `onSetAssignees(ids)` por separado, solo si cambiaron.
 *
 * Sub-flujos presentacionales (props-driven):
 *  - `TaskEditor` — editor de campos + asignados, estado de UI local controlado.
 *  - `PhotoGallery` — recibe `photos` con `url` pública YA resuelta por el
 *    container; la subida con compresión la maneja el container vía
 *    `onUploadPhoto(file)`.
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

/** Paleta de chinchetas/avatares del tablón (manuscrita). Indexada por posición. */
const PINS = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'] as const;
function pinColor(i: number): string {
  return PINS[i % PINS.length]!;
}

/** Inicial segura para el avatar (displayName del asignado es nullable). */
function initial(name: string | null): string {
  return name?.trim().charAt(0).toUpperCase() ?? '?';
}

/** Aviso de error como nota de tinta granate (papel con borde rojo). */
function ErrorNote({ message }: { message: string }) {
  return (
    <div className="ck-card !p-3 text-sm font-bold text-destructive" role="alert">
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
      <div className="ck ck-page min-h-[80dvh] space-y-5 px-5 py-8">
        {/* Cabecera: volver manuscrito + editar. */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="ck-marker text-xl text-primary cursor-pointer"
            aria-label="Volver a tareas"
          >
            ← volver
          </button>
          <button type="button" className="ck-btn !text-base !py-1 !px-4" onClick={onToggleEdit}>
            {isEditing ? 'cancelar' : 'editar'}
          </button>
        </div>

        {!isEditing ? (
          <section className="text-center relative">
            <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
            <h1 className="ck-marker text-4xl leading-none mt-1 text-primary">{task.title}</h1>
            {task.description && <p className="text-base mt-2 opacity-80">{task.description}</p>}
            <div className="mt-2">
              <span className="ck-stamp">{TASK_STATUS_LABELS[task.status]}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {task.recommendedDate && (
                <span className="ck-tag">
                  Recomendada: {new Date(task.recommendedDate).toLocaleDateString('es-ES')}
                </span>
              )}
              {task.deadlineDate && (
                <span className="ck-tag">
                  Límite: {new Date(task.deadlineDate).toLocaleDateString('es-ES')}
                </span>
              )}
            </div>
            {task.assignees.length > 0 && (
              <div className="ck-card p-4 mt-4 text-left">
                <span className="ck-tape" />
                <p className="ck-marker text-xl text-primary">asignada a</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {task.assignees.map((a, i) => (
                    <span
                      key={a.userId}
                      className="h-10 w-10 grid place-items-center rounded-full text-white ck-marker text-xl"
                      style={{ background: pinColor(i) }}
                      title={a.displayName ?? undefined}
                    >
                      {initial(a.displayName)}
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

        {/* Estado: botonera segmentada con estética de tablón. */}
        <section className="space-y-2">
          <p className="ck-marker text-2xl text-primary">estado</p>
          <div
            className="grid grid-cols-3 gap-2"
            role="group"
            aria-label="Cambiar estado"
          >
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSetStatus(s)}
                disabled={isUpdatingStatus}
                aria-pressed={task.status === s}
                className={cn(
                  'ck-btn !text-base min-h-[44px] cursor-pointer disabled:opacity-50',
                  task.status === s && 'ck-btn-blue',
                )}
              >
                {TASK_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </section>

        {/* Fotos pegadas con cinta. */}
        <PhotoGallery
          photos={task.photos}
          uploadingPhoto={uploadingPhoto}
          uploadError={uploadError}
          isDeletingPhoto={isDeletingPhoto}
          onUploadPhoto={onUploadPhoto}
          onDeletePhoto={onDeletePhoto}
        />

        {/* Generar lista de la compra. */}
        <section className="space-y-2 border-t border-dashed border-[#d9c79a] pt-4">
          <p className="ck-marker text-2xl text-primary">lista de la compra</p>
          <p className="text-base opacity-80">
            Crea una lista de la compra a partir de esta tarea para comprar lo que necesitas.
          </p>
          <button
            type="button"
            className="ck-btn ck-btn-red w-full inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            onClick={onGenerateShoppingList}
            disabled={isGeneratingList}
          >
            <ListPlus className="h-4 w-4" />
            {isGeneratingList ? 'generando…' : 'generar lista de la compra'}
          </button>
          {generateError && <ErrorNote message={generateError} />}
        </section>

        {/* Zona peligrosa: tachar la entrada del diario. */}
        {onDeleteTask && (
          <section className="space-y-2 border-t border-dashed border-[#d9c79a] pt-4">
            <p className="ck-marker text-2xl text-destructive">tachar tarea</p>
            <button
              type="button"
              className="ck-btn ck-btn-red w-full inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              onClick={onDeleteTask}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'borrando…' : 'borrar tarea'}
            </button>
            {deleteError && <ErrorNote message={deleteError} />}
          </section>
        )}
      </div>
    </ScreenState>
  );
}

// ── Sub-flujo presentacional: editor de tarea (controlado, estética cozy) ──────

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
      className="ck-card p-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <span className="ck-tape" />
      <div className="space-y-1.5">
        <label htmlFor="edit-title" className="ck-marker text-xl text-primary">
          título
        </label>
        <input
          id="edit-title"
          className="ck-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="edit-description" className="ck-marker text-xl text-primary">
          descripción
        </label>
        <textarea
          id="edit-description"
          className="ck-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label htmlFor="edit-recommended" className="ck-marker text-xl text-primary">
            recomendada
          </label>
          <input
            id="edit-recommended"
            className="ck-input"
            type="date"
            value={recommendedDate}
            onChange={(e) => setRecommendedDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="edit-deadline" className="ck-marker text-xl text-primary">
            límite
          </label>
          <input
            id="edit-deadline"
            className="ck-input"
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
          />
        </div>
      </div>
      {members.length > 0 && (
        <div className="space-y-1.5">
          <label className="ck-marker text-xl text-primary">asignar a</label>
          <div className="space-y-1" role="group" aria-label="Seleccionar asignados">
            {members.map((m) => (
              <label
                key={m.userId}
                className="flex items-center gap-2 text-base cursor-pointer min-h-[36px]"
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
        className="ck-btn ck-btn-blue disabled:opacity-50"
        disabled={!title.trim() || isSaving}
      >
        {isSaving ? 'guardando…' : 'guardar cambios'}
      </button>
    </form>
  );
}

// ── Sub-flujo presentacional: galería de fotos pegadas con cinta ───────────────

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
    <section className="space-y-2 border-t border-dashed border-[#d9c79a] pt-4">
      <p className="ck-marker text-2xl text-primary">fotos pegadas</p>

      {uploadError && <ErrorNote message={uploadError} />}

      <div className="grid grid-cols-2 gap-3 overflow-x-clip">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="relative"
            style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}
          >
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ck-card !p-2 block"
              aria-label="Ver foto de la tarea"
            >
              <span className="ck-tape" />
              <img
                src={photo.url}
                alt="Foto de la tarea"
                className="w-full aspect-square object-cover rounded-sm"
                loading="lazy"
              />
            </a>
            {onDeletePhoto && (
              <button
                type="button"
                onClick={() => onDeletePhoto(photo.id)}
                disabled={isDeletingPhoto}
                aria-label="Borrar foto"
                className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[#c0392b] text-white shadow-md ck-marker cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        <label className="ck-card !p-2 aspect-square grid place-items-center cursor-pointer text-primary">
          {uploadingPhoto ? (
            <Loader2 className="h-6 w-6 motion-safe:animate-spin" />
          ) : (
            <ImagePlus className="h-6 w-6" />
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
