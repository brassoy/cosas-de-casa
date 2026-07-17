/**
 * TasksListView — vista presentacional `base` (shadcn) del listado de tareas.
 *
 * Porta el JSX del componente base del kit (Lovable `TasksPage`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con `TaskDto` /
 * `FamilyMemberDto` reales y delegando loading/error/empty en `ScreenState`.
 *
 * Sub-flujo: `CreateTaskDialog` (props-driven). La APERTURA del diálogo la posee
 * el container (`createOpen` + `onChangeCreateOpen`) para poder cerrarlo SOLO al
 * éxito de la mutación (en error se mantiene abierto con `createError`), igual
 * que el patrón de fridge. El estado del FORMULARIO (título, fechas, asignados)
 * es estado de UI presentacional y vive en el diálogo, reiniciado vía `key`
 * cuando se reabre.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import { useState } from 'react';
import { Calendar, Camera, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Checkbox } from '@/shared/ui/checkbox';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import { useTaskAutofillForm } from '../../hooks/useTaskAutofillForm';
import { TASK_STATUS_LABELS } from '../../types';
import type {
  TaskDto,
  TaskStatus,
  FamilyMemberDto,
  CreateTaskFormValues,
  TasksListViewProps,
} from '../types';

const STATUS_COLOR: Record<TaskStatus, string> = {
  OPEN: 'bg-warning/15 text-warning',
  IN_PROGRESS: 'bg-info/15 text-info',
  DONE: 'bg-success/15 text-success',
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
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tareas</h1>
        <Button size="sm" onClick={() => onChangeCreateOpen(true)} aria-label="Crear tarea">
          <Plus className="h-4 w-4" />
          Crear tarea
        </Button>
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1" role="group" aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-sm border min-h-[36px] cursor-pointer transition-colors',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted',
              )}
            >
              {s === 'ALL' ? 'Todos' : TASK_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <Select
          value={assigneeFilter}
          onValueChange={(v) => onChangeAssigneeFilter(v as string | 'ALL')}
        >
          <SelectTrigger aria-label="Filtrar por asignado">
            <SelectValue placeholder="Asignado a" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Cualquier persona</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={!tasks.length}
        emptyTitle="No hay tareas. Crea la primera."
        emptyCta={{ label: 'Crear tarea', onClick: () => onChangeCreateOpen(true) }}
      >
        <ul className="space-y-2 list-none p-0 m-0">
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

// ── Sub-componente presentacional: tarjeta de tarea ───────────────────────────

function TaskCard({ task, onOpen }: { task: TaskDto; onOpen: (id: string) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(task.id)} className="w-full text-left cursor-pointer">
        <Card className="p-4 space-y-2 transition-colors hover:bg-muted">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight">{task.title}</h3>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                STATUS_COLOR[task.status],
              )}
            >
              {TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
            <div className="flex -space-x-2">
              {task.assignees.map((a) => (
                <div
                  key={a.userId}
                  title={a.displayName ?? undefined}
                  className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center border-2 border-background font-medium"
                >
                  {initial(a.displayName)}
                </div>
              ))}
            </div>
          )}
        </Card>
      </button>
    </li>
  );
}

// ── Sub-flujo presentacional: diálogo de crear tarea ──────────────────────────

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

  // Dictado por voz: la IA rellena título, descripción y las dos fechas.
  const voice = useTaskAutofillForm({
    setTitle,
    setDescription,
    setRecommendedDate,
    setDeadlineDate,
  });

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
      <DialogContent aria-label="Crear tarea">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Nueva tarea</DialogTitle>
            {voice.voiceSupported && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={voice.isBusy}
                onClick={voice.startVoice}
                aria-label="Dictar la tarea hablando"
                title="Habla y la IA rellena la tarea"
              >
                {voice.isBusy ? '…' : '🎤'} Dictar
              </Button>
            )}
          </div>
        </DialogHeader>

        {voice.voiceInterim && (
          <p className="text-xs italic text-muted-foreground">{voice.voiceInterim}</p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p. ej. Pintar el salón"
              maxLength={200}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-description">Descripción</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-recommended">Recomendada</Label>
              <Input
                id="task-recommended"
                type="date"
                value={recommendedDate}
                onChange={(e) => setRecommendedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-deadline">Límite</Label>
              <Input
                id="task-deadline"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!title.trim() || isCreating} onClick={handleSubmit}>
            {isCreating ? 'Creando…' : 'Crear tarea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
