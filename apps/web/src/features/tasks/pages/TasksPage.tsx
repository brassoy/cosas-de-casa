/**
 * TasksPage — CONTAINER del listado de tareas.
 *
 * Cablea la lógica real UNA sola vez y delega el render en `ThemeView`, que
 * monta la vista presentacional del theme activo (con fallback a `base`).
 *
 * Responsabilidades que viven AQUÍ (no en la vista):
 *  - Guard de familia activa + usuario actual (preselección de asignado).
 *  - `useFamilyTasks` (query) + `useFamilyMembers`.
 *  - Filtros estado/asignado en Zustand (`useTasksStore`) → props + el FILTRADO
 *    de las tareas (la vista recibe la lista ya filtrada).
 *  - Mutación de creación (`useCreateTask`) + estado de apertura del diálogo: el
 *    container es dueño de `createOpen` para cerrarlo SOLO al éxito; en error lo
 *    mantiene abierto con `createError` (mismo patrón que fridge).
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyMembers } from '@/features/family/hooks/useFamily';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ApiRequestError } from '@/shared/lib/api';
import { useFamilyTasks, useCreateTask } from '../hooks/useTasks';
import { useTasksStore } from '../store/tasks.store';
import type { TasksListViewProps } from '../views/types';

export function TasksPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const user = useAuthStore((s) => s.user);

  const { data: tasks = [], isLoading, error } = useFamilyTasks(activeFamily?.id);
  const { data: members = [] } = useFamilyMembers(activeFamily?.id);

  const filters = useTasksStore((s) => s.filters);
  const setStatusFilter = useTasksStore((s) => s.setStatusFilter);
  const setAssigneeFilter = useTasksStore((s) => s.setAssigneeFilter);

  const createTask = useCreateTask(activeFamily?.id ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = tasks.filter((t) => {
    if (filters.status !== 'ALL' && t.status !== filters.status) return false;
    if (
      filters.assigneeId !== 'ALL' &&
      !t.assignees.some((a) => a.userId === filters.assigneeId)
    )
      return false;
    return true;
  });

  if (!activeFamily) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  const viewProps: TasksListViewProps = {
    tasks: filtered,
    members,
    isLoading,
    error: error ? 'No se han podido cargar las tareas. Inténtalo de nuevo.' : null,
    statusFilter: filters.status,
    assigneeFilter: filters.assigneeId,
    currentUserId: user?.id ?? '',
    createOpen,
    isCreating: createTask.isPending,
    createError,
    onChangeStatusFilter: setStatusFilter,
    onChangeAssigneeFilter: setAssigneeFilter,
    onChangeCreateOpen: (open) => {
      setCreateOpen(open);
      if (!open) setCreateError(null);
    },
    onOpen: (id) => void navigate({ to: '/tasks/$taskId', params: { taskId: id } }),
    onCreate: (values) => {
      setCreateError(null);
      createTask.mutate(
        {
          title: values.title,
          description: values.description,
          recommendedDate: values.recommendedDate,
          deadlineDate: values.deadlineDate,
          assigneeIds: values.assigneeIds.length > 0 ? values.assigneeIds : undefined,
        },
        {
          onSuccess: () => {
            setCreateOpen(false);
            setCreateError(null);
          },
          onError: (err) => {
            const msg =
              err instanceof ApiRequestError
                ? err.body.message
                : 'No se ha podido crear la tarea.';
            setCreateError(msg);
          },
        },
      );
    },
  };

  return <ThemeView screen="tasks_list" props={viewProps} />;
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
