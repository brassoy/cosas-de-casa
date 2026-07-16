/**
 * RoutineItemsPage — CONTAINER del catálogo de items de rutina.
 *
 * Cablea la query del catálogo (con archivados opcionales) y las mutaciones de
 * CRUD/archivado; delega el render en `ThemeView`.
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import {
  useCreateRoutineItem,
  useDeleteRoutineItem,
  useRoutineItems,
  useUpdateRoutineItem,
} from '../hooks/useRoutines';
import type { RoutineItemDto } from '../types';
import type { RoutineItemFormValues, RoutineItemsViewProps } from '../views/types';

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.body.message : fallback;
}

export function RoutineItemsPage() {
  const { familyId } = useParams({ strict: false }) as { familyId?: string };
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const resolvedFamilyId = familyId ?? activeFamily?.id;
  const navigate = useNavigate();

  const [showArchived, setShowArchived] = useState(false);
  const [editingItem, setEditingItem] = useState<RoutineItemDto | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: items = [], isLoading, error } = useRoutineItems(
    resolvedFamilyId,
    showArchived,
  );

  const fid = resolvedFamilyId ?? '';
  const createItem = useCreateRoutineItem(fid);
  const updateItem = useUpdateRoutineItem(fid);
  const deleteItem = useDeleteRoutineItem(fid);

  function handleSubmit(values: RoutineItemFormValues) {
    setSubmitError(null);
    const onSuccess = () => {
      setIsEditorOpen(false);
      setEditingItem(null);
    };
    const onError = (err: unknown) =>
      setSubmitError(toMessage(err, 'No se ha podido guardar el item.'));

    if (editingItem) {
      updateItem.mutate(
        { itemId: editingItem.id, input: values },
        { onSuccess, onError },
      );
    } else {
      createItem.mutate(values, { onSuccess, onError });
    }
  }

  const props: RoutineItemsViewProps = {
    items,
    isLoading,
    error: error ? 'No se ha podido cargar el catálogo.' : null,
    showArchived,
    editingItem,
    isEditorOpen,
    isSubmitting: createItem.isPending || updateItem.isPending,
    submitError,
    onToggleShowArchived: () => setShowArchived((v) => !v),
    onOpenCreate: () => {
      setEditingItem(null);
      setSubmitError(null);
      setIsEditorOpen(true);
    },
    onOpenEdit: (item) => {
      setEditingItem(item);
      setSubmitError(null);
      setIsEditorOpen(true);
    },
    onCloseEditor: () => {
      setIsEditorOpen(false);
      setEditingItem(null);
    },
    onSubmit: handleSubmit,
    onToggleArchived: (item) =>
      updateItem.mutate({ itemId: item.id, input: { archived: !item.archivedAt } }),
    onDelete: (item) => deleteItem.mutate(item.id),
    onBack: () =>
      void navigate({ to: '/family/$familyId/routines', params: { familyId: fid } }),
  };

  if (!resolvedFamilyId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60dvh' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return <ThemeView screen="routine_items" props={props} />;
}
