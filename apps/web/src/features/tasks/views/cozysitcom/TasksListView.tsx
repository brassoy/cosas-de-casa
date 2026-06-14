/**
 * TasksListView — vista presentacional `cozysitcom` del listado de tareas.
 *
 * MISMA funcionalidad y contrato que la vista base (`../base/TasksListView`):
 * mismos props, callbacks y sub-flujos. SOLO cambia la estética al theme
 * "Sitcom Cozy 70s" (madera, mostaza, papel crema, serif retro), reutilizando
 * las clases `.cz-*` de `shared/theme/themes/cozysitcom.css`.
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

/** Color de fondo del `cz-tag` de estado, por estado (paleta retro del theme). */
const STATUS_TAG: Record<TaskStatus, string> = {
  OPEN: 'bg-error text-text-inverse',
  IN_PROGRESS: 'bg-warning text-text',
  DONE: 'bg-success text-text-inverse',
};

const STATUS_FILTERS: (TaskStatus | 'ALL')[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'DONE'];

/** Inicial segura para el avatar (displayName del asignado es nullable). */
function initial(name: string | null): string {
  return name?.trim().charAt(0).toUpperCase() ?? '?';
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
    <div className="cz cz-pop space-y-4">
      {/* Cabecera de madera + cinta mostaza (estética sitcom). */}
      <div>
        <div className="cz-wood inline-block mb-2">
          <p className="cz-serif text-base">En esta casa</p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <h1 className="cz-serif text-4xl leading-none">Tareas</h1>
          <button
            type="button"
            className="cz-btn-denim flex items-center gap-1.5 text-sm"
            onClick={() => onChangeCreateOpen(true)}
            aria-label="Crear tarea"
          >
            <Plus className="h-4 w-4" />
            Crear tarea
          </button>
        </div>
        <div className="cz-stripe mt-3" />
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div
          className="flex gap-1.5 overflow-x-auto -mx-1 px-1"
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
                'cz-tag shrink-0 min-h-[32px] cursor-pointer transition-transform hover:-translate-y-px',
                statusFilter === s && 'bg-warning text-text',
              )}
            >
              {s === 'ALL' ? 'Todas' : TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="cz-frame !p-2">
          <label className="text-xs font-bold uppercase opacity-70 px-1">
            Asignado a
          </label>
          <select
            className="cz-input mt-1 cursor-pointer"
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

// ── Sub-componente presentacional: tarjeta de tarea (estética cozysitcom) ──────

function TaskCard({ task, onOpen }: { task: TaskDto; onOpen: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="w-full text-left cursor-pointer block"
      >
        <div className="cz-frame transition-transform hover:-translate-y-px">
          <div className="flex items-start gap-3">
            {/* Casilla retro: marcada en verde solo cuando la tarea está hecha. */}
            <span className={cn('cz-check mt-1 shrink-0', task.status === 'DONE' && 'on')} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="cz-serif text-lg leading-tight">{task.title}</p>
                <span
                  className={cn('cz-tag shrink-0', STATUS_TAG[task.status])}
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
                  {task.assignees.map((a) => (
                    <span
                      key={a.userId}
                      title={a.displayName ?? undefined}
                      className="cz-tag"
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

// ── Sub-flujo presentacional: diálogo de crear tarea (estética cozysitcom) ─────

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
      <DialogContent aria-label="Crear tarea" className="cz">
        <DialogHeader>
          <DialogTitle className="cz-serif text-2xl">Nueva tarea</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="cz-frame !p-3 !border-error text-error text-sm font-bold" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-xs font-bold uppercase opacity-70">
              Título *
            </label>
            <input
              id="task-title"
              className="cz-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Pintar el salón"
              maxLength={200}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="task-description" className="text-xs font-bold uppercase opacity-70">
              Descripción
            </label>
            <textarea
              id="task-description"
              className="cz-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label htmlFor="task-recommended" className="text-xs font-bold uppercase opacity-70">
                Recomendada
              </label>
              <input
                id="task-recommended"
                className="cz-input"
                type="date"
                value={recommendedDate}
                onChange={(e) => setRecommendedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-deadline" className="text-xs font-bold uppercase opacity-70">
                Límite
              </label>
              <input
                id="task-deadline"
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
        </div>

        <DialogFooter>
          <button
            type="button"
            className="cz-btn-ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="cz-btn-denim disabled:opacity-50"
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
