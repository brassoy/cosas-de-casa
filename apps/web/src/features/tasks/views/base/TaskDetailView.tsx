/**
 * TaskDetailView — vista presentacional `base` (shadcn) del detalle de tarea.
 *
 * Porta el JSX del componente base del kit (Lovable `TaskDetailPage`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con `TaskDto` /
 * `FamilyMemberDto` reales.
 *
 * Reconciliación del formulario de edición (plan §4 fila 10): el container real
 * usaba inputs **uncontrolled** con `key={taskId}` + refs. El kit base es
 * **controlado**: aquí el formulario es controlado y vive como estado de UI de
 * la vista, reinicializado vía `key` cuando cambia la tarea o se reabre la
 * edición. El guardado emite `onSave(values)`; los asignados se reemplazan con
 * `onSetAssignees(ids)` por separado (paridad con el container, que llama a
 * `PATCH /tasks/:id` + `PATCH /tasks/:id/assignees`).
 *
 * Sub-flujos presentacionales (props-driven):
 *  - Editor de tarea (campos + asignados) — estado de UI local, controlado.
 *  - PhotoGallery — recibe `photos` con `url` pública YA resuelta por el
 *    container (`getPhotoPublicUrl`); la subida con compresión a Storage la
 *    maneja el container vía `onUploadPhoto(file)`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación, sin Supabase.
 */

import { useRef, useState } from 'react';
import { ImagePlus, ListPlus, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Badge } from '@/shared/ui/badge';
import { Checkbox } from '@/shared/ui/checkbox';
import { Alert, AlertDescription } from '@/shared/ui/alert';
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Volver a tareas"
          >
            ‹ Tareas
          </button>
          <Button variant="outline" size="sm" onClick={onToggleEdit}>
            {isEditing ? 'Cancelar edición' : 'Editar'}
          </Button>
        </div>

        {!isEditing ? (
          <section className="space-y-2">
            <h1 className="text-2xl font-bold">{task.title}</h1>
            {task.description && <p className="text-muted-foreground">{task.description}</p>}
            <div className="flex flex-wrap gap-2">
              {task.recommendedDate && (
                <Badge variant="secondary">
                  Recomendada: {new Date(task.recommendedDate).toLocaleDateString('es-ES')}
                </Badge>
              )}
              {task.deadlineDate && (
                <Badge>Límite: {new Date(task.deadlineDate).toLocaleDateString('es-ES')}</Badge>
              )}
            </div>
            {task.assignees.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Asignados:{' '}
                <span className="font-medium text-foreground">
                  {task.assignees.map((a) => a.displayName ?? '—').join(', ')}
                </span>
              </p>
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

        {/* Estado */}
        <section className="space-y-2">
          <p className="text-sm font-semibold">Estado</p>
          <div
            className="grid grid-cols-3 rounded-md border border-border overflow-hidden"
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
                  'py-2 text-sm font-medium border-l border-border first:border-l-0 min-h-[44px] cursor-pointer transition-colors',
                  task.status === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted',
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
        <section className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-semibold">Lista de la compra</p>
          <p className="text-sm text-muted-foreground">
            Crea una lista de la compra a partir de esta tarea para comprar lo que necesitas.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={onGenerateShoppingList}
            disabled={isGeneratingList}
          >
            <ListPlus className="h-4 w-4" />
            {isGeneratingList ? 'Generando…' : 'Generar lista de la compra'}
          </Button>
          {generateError && (
            <Alert variant="destructive">
              <AlertDescription>{generateError}</AlertDescription>
            </Alert>
          )}
        </section>
      </div>
    </ScreenState>
  );
}

// ── Sub-flujo presentacional: editor de tarea (controlado) ────────────────────

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
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="edit-title">Título</Label>
        <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-description">Descripción</Label>
        <Textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-recommended">Recomendada</Label>
          <Input
            id="edit-recommended"
            type="date"
            value={recommendedDate}
            onChange={(e) => setRecommendedDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-deadline">Límite</Label>
          <Input
            id="edit-deadline"
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
          />
        </div>
      </div>
      {members.length > 0 && (
        <div className="space-y-1.5">
          <Label>Asignar a</Label>
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
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={!title.trim() || isSaving}>
        {isSaving ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  );
}

// ── Sub-flujo presentacional: galería de fotos ────────────────────────────────

interface PhotoGalleryProps {
  photos: TaskPhotoView[];
  uploadingPhoto?: boolean;
  uploadError?: string | null;
  onUploadPhoto: (file: File) => void;
}

function PhotoGallery({ photos, uploadingPhoto, uploadError, onUploadPhoto }: PhotoGalleryProps) {
  return (
    <section className="space-y-2 border-t border-border pt-4">
      <p className="text-sm font-semibold">Fotos</p>

      {uploadError && (
        <Alert variant="destructive">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <a
            key={photo.id}
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="aspect-square rounded-md overflow-hidden bg-muted border border-border block"
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
        <label className="aspect-square rounded-md border-2 border-dashed border-border grid place-items-center cursor-pointer hover:bg-muted text-muted-foreground">
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
