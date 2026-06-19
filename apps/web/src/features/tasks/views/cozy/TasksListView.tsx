/**
 * TasksListView — vista presentacional `cozy` del listado de tareas.
 *
 * MISMA funcionalidad y contrato que la vista base (`../base/TasksListView`):
 * mismos props, callbacks y sub-flujos. SOLO cambia la estética al theme
 * "Cuaderno de papel manuscrito" (papel crema pautado, tinta marrón, bolígrafo
 * azul, notas pegadas con cinta/chinchetas, casillas a mano, sellos inclinados,
 * fuentes Caveat/Patrick Hand), reutilizando las clases `.ck-*` de
 * `shared/theme/themes/cozy.css`.
 *
 * Sub-flujo: `CreateTaskDialog` — se reutilizan las primitivas shadcn `Dialog`
 * (focus-trap/escape/portal) con el estado de apertura propiedad del container
 * vía `createOpen`/`onChangeCreateOpen` (cierre SOLO al éxito de la mutación; en
 * error se mantiene abierto con `createError`). Su contenido se reviste con la
 * estética del theme. El estado del FORMULARIO sigue siendo estado de UI local,
 * reiniciado vía `key` cuando se reabre.
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

const STATUS_FILTERS: (TaskStatus | 'ALL')[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'DONE'];

/**
 * Paleta de chinchetas del tablón (manuscrita). Se indexa por posición
 * (`i % len`); con `noUncheckedIndexedAccess` el acceso es `T|undefined`, por eso
 * este helper devuelve siempre `string` con non-null assertion.
 */
const PINS = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'] as const;
function pinColor(i: number): string {
  return PINS[i % PINS.length]!;
}

/** Inicial segura para el avatar (displayName del asignado es nullable). */
function initial(name: string | null): string {
  return name?.trim().charAt(0).toUpperCase() ?? '?';
}

/** Subtítulo con el contador real de tareas (sustituye al "4 pendientes" del kit). */
function tasksSubtitle(count: number): string {
  if (count === 0) return 'aún nada apuntado';
  return count === 1 ? '1 cosa apuntada' : `${count} cosas apuntadas`;
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
    <div className="ck space-y-5 px-5">
      {/* Cabecera tipo diario manuscrito. */}
      <div className="text-center relative">
        <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
        <h1 className="ck-marker text-5xl leading-none mt-1 text-primary">tareas</h1>
        <p className="text-base mt-2 opacity-80">{tasksSubtitle(tasks.length)}</p>
      </div>

      {/* Botón crear como nota manuscrita destacada. */}
      <div className="flex justify-center">
        <button
          type="button"
          className="ck-btn ck-btn-blue inline-flex items-center gap-1.5"
          onClick={() => onChangeCreateOpen(true)}
          aria-label="Crear tarea"
        >
          <Plus className="h-4 w-4" />
          apuntar tarea
        </button>
      </div>

      {/* Filtros: etiquetas a mano + selector de asignado con línea de boli. */}
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
                'ck-tag shrink-0 min-h-[34px] cursor-pointer transition-transform hover:-translate-y-px',
                statusFilter === s && 'bg-primary text-primary-foreground border-primary',
              )}
            >
              {s === 'ALL' ? 'todas' : TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="ck-marker text-xl text-primary px-1">asignada a</p>
          <select
            className="ck-input cursor-pointer"
            value={assigneeFilter}
            onChange={(e) => onChangeAssigneeFilter(e.target.value as string | 'ALL')}
            aria-label="Filtrar por asignado"
          >
            <option value="ALL">cualquier persona</option>
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
        <ul className="space-y-4 list-none p-0 m-0">
          {tasks.map((t, i) => (
            <TaskCard key={t.id} task={t} index={i} onOpen={onOpen} />
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

// ── Sub-componente presentacional: nota de tarea clavada al tablón ─────────────

function TaskCard({
  task,
  index,
  onOpen,
}: {
  task: TaskDto;
  index: number;
  onOpen: (id: string) => void;
}) {
  // Rotación estática sutil de la nota (no es movimiento → siempre aplica).
  const rotation = (((index % 3) - 1) * 0.4).toFixed(2);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="w-full text-left cursor-pointer block"
      >
        <div className="ck-card p-4" style={{ transform: `rotate(${rotation}deg)` }}>
          <span
            className="ck-pin"
            style={{ background: `radial-gradient(circle at 30% 30%, #fff, ${pinColor(index)})` }}
          />
          <div className="flex items-start gap-3">
            {/* Casilla a mano: marcada en verde cuando está hecha. */}
            <span className={cn('ck-check mt-1 shrink-0', task.status === 'DONE' && 'on')} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="ck-marker text-2xl leading-tight text-primary">{task.title}</p>
                <span className="ck-stamp shrink-0">{TASK_STATUS_LABELS[task.status]}</span>
              </div>
              {task.description && (
                <p className="text-sm opacity-80 mt-1 line-clamp-2">{task.description}</p>
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
                    <span key={a.userId} title={a.displayName ?? undefined} className="ck-tag">
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

// ── Sub-flujo presentacional: diálogo de crear tarea (estética cozy) ───────────

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
      <DialogContent aria-label="Crear tarea" className="ck ck-card">
        <span className="ck-tape" />
        <DialogHeader>
          <DialogTitle className="ck-marker text-3xl text-primary">nueva tarea</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="ck-card !p-3 text-sm font-bold text-destructive" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="ck-marker text-xl text-primary">
              título *
            </label>
            <input
              id="task-title"
              className="ck-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Pintar el salón"
              maxLength={200}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="task-description" className="ck-marker text-xl text-primary">
              descripción
            </label>
            <textarea
              id="task-description"
              className="ck-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label htmlFor="task-recommended" className="ck-marker text-xl text-primary">
                recomendada
              </label>
              <input
                id="task-recommended"
                className="ck-input"
                type="date"
                value={recommendedDate}
                onChange={(e) => setRecommendedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-deadline" className="ck-marker text-xl text-primary">
                límite
              </label>
              <input
                id="task-deadline"
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
        </div>

        <DialogFooter>
          <button type="button" className="ck-btn" onClick={() => onOpenChange(false)}>
            cancelar
          </button>
          <button
            type="button"
            className="ck-btn ck-btn-blue disabled:opacity-50"
            disabled={!title.trim() || isCreating}
            onClick={handleSubmit}
          >
            {isCreating ? 'apuntando…' : 'apuntar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
