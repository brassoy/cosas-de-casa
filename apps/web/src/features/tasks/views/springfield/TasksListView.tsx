/**
 * TasksListView — vista presentacional `springfield` del listado de tareas.
 *
 * MISMA funcionalidad y contrato que la vista base (`../base/TasksListView`):
 * mismos props, callbacks y sub-flujos. SOLO cambia la estética al theme
 * "Cómic pop / Springfield" (bordes gruesos de tinta, hard shadows offset,
 * colores planos saturados, Bangers/Fredoka/Nunito), reutilizando las clases
 * `.sf-*` de `shared/theme/themes/springfield.css`.
 *
 * Sub-flujo: `CreateTaskDialog` — se reutilizan las primitivas shadcn `Dialog`
 * (estado de apertura propiedad del container vía `createOpen`/`onChangeCreateOpen`,
 * cierre SOLO al éxito) y se reviste su contenido con la estética del theme. El
 * estado del FORMULARIO sigue siendo estado de UI local, reiniciado vía `key`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import { useState } from 'react';
import { Calendar, Camera, Plus } from 'lucide-react';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import { TASK_STATUS_LABELS } from '../../types';
import type {
  TaskDto,
  TaskStatus,
  FamilyMemberDto,
  CreateTaskFormValues,
  TasksListViewProps,
} from '../types';

/** Color de fondo del `sf-tag` de estado, por estado (paleta plana del cómic). */
const STATUS_TAG: Record<TaskStatus, string> = {
  OPEN: 'bg-error text-text-inverse',
  IN_PROGRESS: 'bg-warning text-text',
  DONE: 'bg-success text-text-inverse',
};

const STATUS_FILTERS: (TaskStatus | 'ALL')[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'DONE'];

/**
 * Paleta de colores de cómic para los avatares/tags de asignados. Se indexa por
 * posición (`i % len`); con `noUncheckedIndexedAccess` el acceso es `T|undefined`,
 * por eso este helper devuelve siempre `string`.
 */
const AVATAR_COLORS = ['bg-accent', 'bg-info', 'bg-error', 'bg-success'] as const;
function avatarColor(i: number): string {
  return AVATAR_COLORS[i % AVATAR_COLORS.length]!;
}

/** Inicial segura para el avatar (displayName del asignado es nullable). */
function initial(name: string | null): string {
  return name?.trim().charAt(0).toUpperCase() ?? '?';
}

/** Subtítulo con el contador real de tareas (sustituye al hardcode del kit). */
function tasksSubtitle(count: number): string {
  if (count === 0) return 'Aún no hay tareas';
  return count === 1 ? '1 tarea en la casa' : `${count} tareas en la casa`;
}

export default function TasksListView(props: TasksListViewProps) {
  const {
    tasks,
    members,
    isLoading,
    error,
    statusFilter,
    assigneeFilter,
    currentUserId,
    createOpen,
    isCreating,
    createError,
    onChangeStatusFilter,
    onChangeAssigneeFilter,
    onChangeCreateOpen,
    onOpen,
    onCreate,
  } = props;

  return (
    <div className="sf space-y-4 px-5">
      {/* Cabecera de viñeta amarilla (estética cómic). */}
      <div className="sf-card-y p-4 relative sf-pop">
        <span className="sf-sticker">¡Manos a la obra!</span>
        <div className="flex items-end justify-between gap-3 mt-2">
          <div className="min-w-0">
            <h1 className="sf-bangers text-4xl leading-none">Tareas</h1>
            <p className="sf-fredoka text-sm mt-1">{tasksSubtitle(tasks.length)}</p>
          </div>
          <button
            type="button"
            className="sf-btn sf-btn-r flex items-center gap-1.5 text-sm shrink-0"
            onClick={() => onChangeCreateOpen(true)}
            aria-label="Crear tarea"
          >
            <Plus className="h-4 w-4" />
            Crear
          </button>
        </div>
      </div>

      <div className="sf-zig rounded" />

      {/* Filtros */}
      <div className="space-y-3">
        <div
          className="flex gap-2 overflow-x-auto -mx-1 px-1"
          role="group"
          aria-label="Filtrar por estado"
        >
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={cn(
                'sf-tag shrink-0 min-h-[32px] cursor-pointer transition-transform hover:-translate-y-px',
                statusFilter === s && 'bg-accent',
              )}
            >
              {s === 'ALL' ? 'Todas' : TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="sf-fredoka text-xs uppercase opacity-70 px-1">
            Asignado a
          </label>
          <select
            className="sf-input cursor-pointer"
            value={assigneeFilter}
            onChange={(e) => onChangeAssigneeFilter(e.target.value as string | 'ALL')}
            aria-label="Filtrar por asignado"
          >
            <option value="ALL">Cualquier persona</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={!tasks.length}
        emptyTitle="No hay tareas. Crea la primera."
        emptyCta={{ label: 'Crear tarea', onClick: () => onChangeCreateOpen(true) }}
      >
        <ul className="space-y-3 list-none p-0 m-0">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={onOpen} />
          ))}
        </ul>
      </ScreenState>

      <CreateTaskDialog
        key={createOpen ? 'open' : 'closed'}
        open={createOpen}
        onOpenChange={onChangeCreateOpen}
        members={members}
        currentUserId={currentUserId}
        isCreating={isCreating}
        error={createError}
        onCreate={onCreate}
      />
    </div>
  );
}

// ── Sub-componente presentacional: tarjeta de tarea (estética springfield) ─────

function TaskCard({ task, onOpen }: { task: TaskDto; onOpen: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="w-full text-left cursor-pointer block sf-wob"
      >
        <div className="sf-card p-4">
          <div className="flex items-start gap-3">
            {/* Casilla cuadrada de cómic: marcada en verde cuando está hecha. */}
            <span
              className={cn('sf-check mt-1 shrink-0', task.status === 'DONE' && 'on')}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="sf-fredoka text-lg leading-tight">{task.title}</p>
                <span
                  className={cn('sf-tag shrink-0', STATUS_TAG[task.status])}
                >
                  {TASK_STATUS_LABELS[task.status]}
                </span>
              </div>
              {task.description && (
                <p className="text-sm opacity-70 mt-1 line-clamp-2">{task.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs opacity-70 mt-2">
                {task.deadlineDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Hasta {new Date(task.deadlineDate).toLocaleDateString('es-ES')}
                  </span>
                )}
                {task.photos.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {task.photos.length}
                  </span>
                )}
              </div>
              {task.assignees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {task.assignees.map((a, i) => (
                    <span
                      key={a.userId}
                      title={a.displayName ?? undefined}
                      className={cn('sf-tag', avatarColor(i))}
                    >
                      {a.displayName ?? initial(a.displayName)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

// ── Sub-flujo presentacional: diálogo de crear tarea (estética springfield) ────

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: FamilyMemberDto[];
  currentUserId: string;
  isCreating?: boolean;
  error?: string | null;
  onCreate: (values: CreateTaskFormValues) => void;
}

function CreateTaskDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  isCreating,
  error,
  onCreate,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recommendedDate, setRecommendedDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  // Por defecto el usuario actual está preseleccionado (paridad con el container real).
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    currentUserId ? [currentUserId] : [],
  );

  function toggleAssignee(userId: string, checked: boolean) {
    setAssigneeIds((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId),
    );
  }

  function handleSubmit() {
    if (!title.trim()) return;
    // Solo emite; el container cierra el diálogo al éxito de la mutación. En
    // error, `error` se pinta dentro del diálogo (que sigue abierto).
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      recommendedDate: recommendedDate || undefined,
      deadlineDate: deadlineDate || undefined,
      assigneeIds,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Crear tarea" className="sf">
        <DialogHeader>
          <DialogTitle className="sf-bangers text-3xl">Nueva tarea</DialogTitle>
        </DialogHeader>

        {error && (
          <div
            className="sf-card !bg-error text-text-inverse !p-3 text-sm font-bold"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="sf-fredoka text-xs uppercase opacity-70">
              Título *
            </label>
            <input
              id="task-title"
              className="sf-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Pintar el salón"
              maxLength={200}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="task-description" className="sf-fredoka text-xs uppercase opacity-70">
              Descripción
            </label>
            <textarea
              id="task-description"
              className="sf-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label htmlFor="task-recommended" className="sf-fredoka text-xs uppercase opacity-70">
                Recomendada
              </label>
              <input
                id="task-recommended"
                className="sf-input"
                type="date"
                value={recommendedDate}
                onChange={(e) => setRecommendedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-deadline" className="sf-fredoka text-xs uppercase opacity-70">
                Límite
              </label>
              <input
                id="task-deadline"
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
        </div>

        <DialogFooter>
          <button
            type="button"
            className="sf-btn sf-btn-w"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="sf-btn sf-btn-r disabled:opacity-50"
            disabled={!title.trim() || isCreating}
            onClick={handleSubmit}
          >
            {isCreating ? 'Creando…' : 'Crear tarea'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
