/**
 * TaskDetailView — vista presentacional `cozysitcom` del detalle de tarea.
 *
 * MISMA funcionalidad y contrato que la vista base (`../base/TaskDetailView`):
 * mismos props, callbacks y sub-flujos (editor controlado + galería de fotos +
 * cambio de estado + generar lista). SOLO cambia la estética al theme "Sitcom
 * Cozy 70s" (madera, mostaza, papel crema, serif retro, sello de estado),
 * reutilizando las clases `.cz-*` de `shared/theme/themes/cozysitcom.css`.
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
import { ImagePlus, ListPlus, Loader2 } from 'lucide-react';
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

/** Banner de error con estética del theme (papel con borde granate). */
function ErrorNote({ message }: { message: string }) {
  return (
    <div className="cz-frame !p-3 !border-error text-error text-sm font-bold" role="alert">
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
    onBack,
    onToggleEdit,
    onSave,
    onSetAssignees,
    onSetStatus,
    onUploadPhoto,
    onGenerateShoppingList,
  } = props;

  return (
    <ScreenState isLoading={isLoading} error={error}>
      <div className="cz cz-pop space-y-4">
        {/* Cabecera: volver + madera + serif + sello de estado + cinta mostaza. */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer"
              aria-label="Volver a tareas"
            >
              ← Tareas
            </button>
            <button type="button" className="cz-btn-ghost text-sm" onClick={onToggleEdit}>
              {isEditing ? 'Cancelar edición' : 'Editar'}
            </button>
          </div>
          <div className="cz-wood inline-block mb-2">
            <p className="cz-serif text-base">En esta casa</p>
          </div>
          <div className="flex items-end justify-between gap-2">
            <h1 className="cz-serif text-4xl leading-none">{task.title}</h1>
            <span className="cz-stamp shrink-0">{TASK_STATUS_LABELS[task.status]}</span>
          </div>
          <div className="cz-stripe mt-3" />
        </div>

        {!isEditing ? (
          <section className="cz-frame space-y-3">
            {task.description && <p className="opacity-80">{task.description}</p>}
            {(task.recommendedDate || task.deadlineDate) && (
              <div className="flex flex-wrap gap-2">
                {task.recommendedDate && (
                  <span className="cz-tag">
                    Recomendada: {new Date(task.recommendedDate).toLocaleDateString('es-ES')}
                  </span>
                )}
                {task.deadlineDate && (
                  <span className="cz-tag bg-warning text-text">
                    Límite: {new Date(task.deadlineDate).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
            )}
            {task.assignees.length > 0 && (
              <div>
                <p className="text-xs uppercase font-bold opacity-70 mb-1">Asignada</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.assignees.map((a) => (
                    <span key={a.userId} className="cz-tag">
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

        {/* Estado: segmentado retro (denim cuando activo). */}
        <section className="cz-frame space-y-2">
          <p className="cz-serif text-lg">Estado</p>
          <div
            className="grid grid-cols-3 gap-1.5"
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
                  'min-h-[44px] text-sm cursor-pointer disabled:opacity-50',
                  task.status === s ? 'cz-btn-denim' : 'cz-btn-ghost',
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
          onUploadPhoto={onUploadPhoto}
        />

        {/* Generar lista de la compra */}
        <section className="cz-frame space-y-2">
          <p className="cz-serif text-lg">Lista de la compra</p>
          <p className="text-sm opacity-70">
            Crea una lista de la compra a partir de esta tarea para comprar lo que necesitas.
          </p>
          <button
            type="button"
            className="cz-btn-mustard w-full flex items-center justify-center gap-1.5 disabled:opacity-50"
            onClick={onGenerateShoppingList}
            disabled={isGeneratingList}
          >
            <ListPlus className="h-4 w-4" />
            {isGeneratingList ? 'Generando…' : 'Generar lista de la compra'}
          </button>
          {generateError && <ErrorNote message={generateError} />}
        </section>
      </div>
    </ScreenState>
  );
}

// ── Sub-flujo presentacional: editor de tarea (controlado, estética cozysitcom) ─

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
      className="cz-frame space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="edit-title" className="text-xs font-bold uppercase opacity-70">
          Título
        </label>
        <input
          id="edit-title"
          className="cz-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="edit-description" className="text-xs font-bold uppercase opacity-70">
          Descripción
        </label>
        <textarea
          id="edit-description"
          className="cz-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label htmlFor="edit-recommended" className="text-xs font-bold uppercase opacity-70">
            Recomendada
          </label>
          <input
            id="edit-recommended"
            className="cz-input"
            type="date"
            value={recommendedDate}
            onChange={(e) => setRecommendedDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="edit-deadline" className="text-xs font-bold uppercase opacity-70">
            Límite
          </label>
          <input
            id="edit-deadline"
            className="cz-input"
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
          />
        </div>
      </div>
      {members.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase opacity-70">Asignar a</label>
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
        className="cz-btn-denim w-full disabled:opacity-50"
        disabled={!title.trim() || isSaving}
      >
        {isSaving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}

// ── Sub-flujo presentacional: galería de fotos (estética cozysitcom) ──────────

interface PhotoGalleryProps {
  photos: TaskPhotoView[];
  uploadingPhoto?: boolean;
  uploadError?: string | null;
  onUploadPhoto: (file: File) => void;
}

function PhotoGallery({ photos, uploadingPhoto, uploadError, onUploadPhoto }: PhotoGalleryProps) {
  return (
    <section className="cz-frame space-y-2">
      <p className="cz-serif text-lg">Fotos</p>

      {uploadError && <ErrorNote message={uploadError} />}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <a
            key={photo.id}
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="aspect-square rounded-md overflow-hidden bg-surface border border-border block"
            aria-label="Ver foto de la tarea"
          >
            <img
              src={photo.url}
              alt="Foto de la tarea"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </a>
        ))}
        <label className="aspect-square rounded-md border-2 border-dashed border-accent grid place-items-center cursor-pointer hover:bg-surface text-accent transition-colors">
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
