/**
 * TaskDetailPage — CONTAINER del detalle de tarea.
 *
 * Cablea la lógica real UNA sola vez y delega el render en `ThemeView`, que
 * monta la vista presentacional del theme activo (con fallback a `base`).
 *
 * Responsabilidades que viven AQUÍ (no en la vista):
 *  - `useTaskDetail` (query) + `useFamilyMembers` + guard de familia activa.
 *  - Modo edición (estado de UI) + mutación de campos (`useUpdateTask`) y de
 *    asignados por separado (`useUpdateTaskAssignees`), igual que el flujo real.
 *  - Cambio de estado (`useUpdateTask` con `{ status }`).
 *  - Subida de foto: compresión + Supabase Storage (bucket `task-photos`) la
 *    maneja `useUploadTaskPhoto`; la vista solo emite `onUploadPhoto(file)`.
 *  - Resolución de las URLs públicas de las fotos (`getPhotoPublicUrl`): la vista
 *    recibe `photos[].url` ya resuelta (presentacional puro, sin tocar Storage).
 *  - Generar lista de la compra (`useGenerateShoppingList`) → navegación al
 *    detalle de la lista creada.
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyMembers } from '@/features/family/hooks/useFamily';
import { ApiRequestError } from '@/shared/lib/api';
import {
  useTaskDetail,
  useUpdateTask,
  useUpdateTaskAssignees,
  useUploadTaskPhoto,
  useDeleteTask,
  useDeleteTaskPhoto,
  useGenerateShoppingList,
  getPhotoPublicUrl,
} from '../hooks/useTasks';
import type { TaskDetailViewProps, TaskView } from '../views/types';

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
  const deleteTask = useDeleteTask(familyId);
  const deletePhoto = useDeleteTaskPhoto(taskId, familyId);
  const generateList = useGenerateShoppingList(taskId);

  const [editMode, setEditMode] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Enriquece las fotos con su URL pública resuelta desde Supabase Storage.
  const taskView: TaskView | null = useMemo(() => {
    if (!task) return null;
    return {
      ...task,
      photos: task.photos.map((p) => ({ ...p, url: getPhotoPublicUrl(p.storagePath) })),
    };
  }, [task]);

  if (isLoading) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>Cargando tarea…</p>
      </div>
    );
  }

  if (error || !taskView) {
    return (
      <div style={styles.center}>
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          No se ha podido cargar la tarea.
        </p>
      </div>
    );
  }

  const viewProps: TaskDetailViewProps = {
    task: taskView,
    isEditing: editMode,
    members,
    isSaving: updateTask.isPending || updateAssignees.isPending,
    editError,
    isUpdatingStatus: updateTask.isPending,
    uploadingPhoto: uploadPhoto.isPending,
    uploadError,
    isGeneratingList: generateList.isPending,
    generateError,
    isDeleting: deleteTask.isPending,
    deleteError,
    isDeletingPhoto: deletePhoto.isPending,
    onBack: () =>
      void navigate({ to: '/family/$familyId/tasks', params: { familyId } }),
    onToggleEdit: () => {
      setEditError(null);
      setEditMode((v) => !v);
    },
    onSave: (values) => {
      setEditError(null);
      updateTask.mutate(
        {
          title: values.title,
          description: values.description,
          recommendedDate: values.recommendedDate,
          deadlineDate: values.deadlineDate,
        },
        {
          onSuccess: () => setEditMode(false),
          onError: (err) => {
            const msg =
              err instanceof ApiRequestError
                ? err.body.message
                : 'No se ha podido guardar la tarea.';
            setEditError(msg);
          },
        },
      );
    },
    onSetAssignees: (ids) => {
      setEditError(null);
      updateAssignees.mutate(
        { assigneeIds: ids },
        {
          onError: (err) => {
            const msg =
              err instanceof ApiRequestError
                ? err.body.message
                : 'No se han podido actualizar los asignados.';
            setEditError(msg);
          },
        },
      );
    },
    onSetStatus: (status) => updateTask.mutate({ status }),
    onUploadPhoto: (file) => {
      setUploadError(null);
      uploadPhoto.mutate(file, {
        onError: (err) => setUploadError(err.message ?? 'Error al subir la foto.'),
      });
    },
    onDeletePhoto: (photoId) => {
      // Confirmación bloqueante: no hay un AlertDialog compartido en el repo
      // (mismo patrón que el borrado de listas en shopping).
      if (!window.confirm('¿Seguro que quieres borrar esta foto?')) return;
      setUploadError(null);
      deletePhoto.mutate(photoId, {
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido borrar la foto.';
          setUploadError(msg);
        },
      });
    },
    onDeleteTask: () => {
      if (!window.confirm('¿Seguro que quieres borrar esta tarea? Esta acción no se puede deshacer.')) {
        return;
      }
      setDeleteError(null);
      deleteTask.mutate(taskId, {
        onSuccess: () =>
          void navigate({ to: '/family/$familyId/tasks', params: { familyId } }),
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido borrar la tarea.';
          setDeleteError(msg);
        },
      });
    },
    onGenerateShoppingList: () => {
      setGenerateError(null);
      generateList.mutate(undefined, {
        onSuccess: (res) =>
          void navigate({
            to: '/family/$familyId/lists/$listId',
            params: { familyId, listId: res.id },
          }),
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido generar la lista.';
          setGenerateError(msg);
        },
      });
    },
  };

  return <ThemeView screen="tasks_detail" props={viewProps} />;
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
