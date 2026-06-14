/**
 * ReceiptDetailPage — CONTAINER del detalle de un ticket.
 *
 * Cablea la lógica real UNA sola vez y delega el render en `ThemeView`.
 *
 * Responsabilidades que viven AQUÍ (no en la vista):
 *  - `useReceiptDetail` (query) + guards de carga/error/no encontrado.
 *  - Modo edición (estado de UI): la vista reutiliza el editor de borrador y emite
 *    el `CreateReceiptInput` completo (merchant + fecha + divisa + líneas).
 *  - Mutaciones: `useUpdateReceipt` (PATCH) y `useDeleteReceipt` (DELETE → navega).
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useReceiptDetail, useUpdateReceipt, useDeleteReceipt } from '../hooks/useBudget';
import type { CreateReceiptInput } from '../contracts';
import type { ReceiptDetailViewProps } from '../views/types';

export function ReceiptDetailPage() {
  const navigate = useNavigate();
  const { familyId, receiptId } = useParams({ strict: false }) as {
    familyId: string;
    receiptId: string;
  };

  const { data: receipt, isLoading, error } = useReceiptDetail(receiptId);
  const updateMutation = useUpdateReceipt(receiptId, familyId);
  const deleteMutation = useDeleteReceipt(receiptId, familyId);

  const [isEditing, setIsEditing] = useState(false);

  function goBack() {
    void navigate({ to: '/family/$familyId/budget', params: { familyId } });
  }

  function handleSave(input: CreateReceiptInput) {
    // El editor emite CreateReceiptInput; el PATCH acepta el mismo shape (subset).
    updateMutation.mutate(input, { onSuccess: () => setIsEditing(false) });
  }

  function handleDelete() {
    if (!confirm('¿Eliminar este ticket?')) return;
    deleteMutation.mutate(undefined, { onSuccess: goBack });
  }

  // Guards: la vista exige `receipt: ReceiptDto`; los estados sin ticket se
  // resuelven aquí con la misma estética (ScreenState vive en la vista de lista,
  // pero el detalle necesita el DTO para renderizar nada útil).
  if (isLoading) {
    return (
      <p className="mx-auto max-w-2xl p-6 text-sm text-muted-foreground">Cargando ticket…</p>
    );
  }

  if (error || !receipt) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-2xl rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
      >
        No se ha podido cargar el ticket.
      </p>
    );
  }

  const props: ReceiptDetailViewProps = {
    receipt,
    isEditing,
    isLoading,
    error: null,
    isSaving: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    onBack: goBack,
    onToggleEdit: () => setIsEditing((v) => !v),
    onSave: handleSave,
    onDelete: handleDelete,
  };

  return <ThemeView screen="budget_receipt_detail" props={props} />;
}
