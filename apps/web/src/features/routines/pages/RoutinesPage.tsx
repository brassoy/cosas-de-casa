/**
 * RoutinesPage — CONTAINER de la lista de rutinas.
 *
 * Cablea queries (rutinas + catálogo), la mutación de creación (con duplicado
 * de la última) y el borrado; delega el render en `ThemeView`.
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import {
  useCreateRoutine,
  useDeleteRoutine,
  useRoutineItems,
  useRoutines,
} from '../hooks/useRoutines';
import type { RoutineFormValues, RoutinesViewProps } from '../views/types';

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.body.message : fallback;
}

export function RoutinesPage() {
  const { familyId } = useParams({ strict: false }) as { familyId?: string };
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const resolvedFamilyId = familyId ?? activeFamily?.id;
  const navigate = useNavigate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: routines = [], isLoading, error } = useRoutines(resolvedFamilyId);
  const { data: catalogItems = [] } = useRoutineItems(resolvedFamilyId);

  const fid = resolvedFamilyId ?? '';
  const createRoutine = useCreateRoutine(fid);
  const deleteRoutine = useDeleteRoutine(fid);

  function handleCreate(values: RoutineFormValues) {
    setSubmitError(null);
    createRoutine.mutate(
      {
        startDate: values.startDate,
        name: values.name,
        itemIds: values.duplicateFromRoutineId
          ? undefined
          : values.itemIds.length > 0
            ? values.itemIds
            : undefined,
        duplicateFromRoutineId: values.duplicateFromRoutineId,
      },
      {
        onSuccess: (routine) => {
          setIsCreateOpen(false);
          void navigate({
            to: '/family/$familyId/routines/$routineId',
            params: { familyId: fid, routineId: routine.id },
          });
        },
        onError: (err) =>
          setSubmitError(toMessage(err, 'No se ha podido crear la rutina.')),
      },
    );
  }

  const props: RoutinesViewProps = {
    routines,
    catalogItems,
    isLoading,
    error: error ? 'No se han podido cargar las rutinas.' : null,
    isCreateOpen,
    isSubmitting: createRoutine.isPending,
    submitError,
    // La lista viene ordenada por startDate DESC: la primera es la última semana.
    lastRoutine: routines[0] ?? null,
    onOpenCreate: () => {
      setSubmitError(null);
      setIsCreateOpen(true);
    },
    onCloseCreate: () => setIsCreateOpen(false),
    onCreate: handleCreate,
    onOpenRoutine: (routineId) =>
      void navigate({
        to: '/family/$familyId/routines/$routineId',
        params: { familyId: fid, routineId },
      }),
    onDeleteRoutine: (routineId) => deleteRoutine.mutate(routineId),
    onOpenItems: () =>
      void navigate({ to: '/family/$familyId/routines/items', params: { familyId: fid } }),
    onOpenStats: () =>
      void navigate({ to: '/family/$familyId/routines/stats', params: { familyId: fid } }),
  };

  if (!resolvedFamilyId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60dvh' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return <ThemeView screen="routines" props={props} />;
}
