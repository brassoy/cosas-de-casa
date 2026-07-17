/**
 * RoutineDetailPage — CONTAINER del detalle de rutina (kanban + resumen).
 *
 * Cablea la rutina hidratada, el resumen, el catálogo (para el selector de
 * items) y todas las mutaciones: selección de items, asignaciones (el drag es
 * optimista en el hook), ventanas horarias e incidencias.
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import {
  useCreateAssignment,
  useCreateIncident,
  useDeleteAssignment,
  useDeleteIncident,
  useRoutine,
  useRoutineHistory,
  useRoutineItems,
  useRoutineSummary,
  useSetRoutineItems,
  useUpdateAssignment,
  useUpdateIncident,
} from '../hooks/useRoutines';
import type { RoutineDetailTab, RoutineDetailViewProps } from '../views/types';

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.body.message : fallback;
}

export function RoutineDetailPage() {
  const { familyId, routineId } = useParams({ strict: false }) as {
    familyId?: string;
    routineId?: string;
  };
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const resolvedFamilyId = familyId ?? activeFamily?.id;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<RoutineDetailTab>('kanban');
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data: routine = null, isLoading, error } = useRoutine(routineId);
  const { data: summary = null } = useRoutineSummary(routineId);
  const { data: history = null, isLoading: isHistoryLoading } = useRoutineHistory(
    routineId,
    activeTab === 'history',
  );
  const { data: catalogItems = [] } = useRoutineItems(resolvedFamilyId);

  const rid = routineId ?? '';
  const setItems = useSetRoutineItems(rid);
  const createAssignment = useCreateAssignment(rid);
  const updateAssignment = useUpdateAssignment(rid);
  const deleteAssignment = useDeleteAssignment(rid);
  const createIncident = useCreateIncident(rid);
  const updateIncident = useUpdateIncident(rid);
  const deleteIncident = useDeleteIncident(rid);

  const isMutating =
    setItems.isPending ||
    createAssignment.isPending ||
    updateAssignment.isPending ||
    deleteAssignment.isPending ||
    createIncident.isPending ||
    updateIncident.isPending ||
    deleteIncident.isPending;

  const onError = (fallback: string) => (err: unknown) =>
    setMutationError(toMessage(err, fallback));
  const clearError = () => setMutationError(null);

  const props: RoutineDetailViewProps = {
    routine,
    summary,
    history,
    isHistoryLoading,
    catalogItems,
    isLoading,
    error: error ? 'No se ha podido cargar la rutina.' : null,
    activeTab,
    isItemPickerOpen,
    isMutating,
    mutationError,
    onChangeTab: setActiveTab,
    onOpenItemPicker: () => setIsItemPickerOpen(true),
    onCloseItemPicker: () => setIsItemPickerOpen(false),
    onSubmitItems: (itemIds) => {
      clearError();
      setItems.mutate(itemIds, {
        onError: onError('No se ha podido actualizar la selección.'),
      });
    },
    onAssign: (routineItemId, dayIndex) => {
      clearError();
      createAssignment.mutate(
        { routineItemId, dayIndex },
        { onError: onError('No se ha podido asignar el item.') },
      );
    },
    onMoveAssignment: (assignmentId, dayIndex) => {
      clearError();
      updateAssignment.mutate(
        { assignmentId, input: { dayIndex } },
        { onError: onError('No se ha podido mover la asignación.') },
      );
    },
    onUpdateWindow: (assignmentId, startTime, endTime) => {
      clearError();
      updateAssignment.mutate(
        { assignmentId, input: { startTime, endTime } },
        { onError: onError('No se ha podido cambiar el horario.') },
      );
    },
    onDeleteAssignment: (assignmentId) => {
      clearError();
      deleteAssignment.mutate(assignmentId, {
        onError: onError('No se ha podido quitar la asignación.'),
      });
    },
    onCreateIncident: (assignmentId, description, lostMinutes) => {
      clearError();
      createIncident.mutate(
        { assignmentId, input: { description, lostMinutes } },
        { onError: onError('No se ha podido abrir la incidencia.') },
      );
    },
    onUpdateIncident: (incidentId, description, lostMinutes) => {
      clearError();
      updateIncident.mutate(
        { incidentId, input: { description, lostMinutes } },
        { onError: onError('No se ha podido editar la incidencia.') },
      );
    },
    onDeleteIncident: (incidentId) => {
      clearError();
      deleteIncident.mutate(incidentId, {
        onError: onError('No se ha podido eliminar la incidencia.'),
      });
    },
    onBack: () =>
      void navigate({
        to: '/family/$familyId/routines',
        params: { familyId: resolvedFamilyId ?? '' },
      }),
  };

  if (!resolvedFamilyId || !routineId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60dvh' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return <ThemeView screen="routine_detail" props={props} />;
}
