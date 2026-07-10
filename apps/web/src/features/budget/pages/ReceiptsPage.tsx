/**
 * ReceiptsPage — CONTAINER de la lista de tickets y entrada de la feature budget.
 *
 * Cablea la lógica real UNA sola vez y delega el render en `ThemeView`, que monta
 * la vista presentacional del theme activo (con fallback a `base`).
 *
 * Responsabilidades que viven AQUÍ (no en la vista):
 *  - `useFamilyReceipts` (query) por la familia de la ruta.
 *  - Máquina de estados de captura: idle → extracting → (draft | ai-unavailable).
 *    · Compresión de imagen a base64 (`compressImageToBase64`).
 *    · OCR (`useExtractReceipt`): 503 → `ai-unavailable` → "Alta manual"/"Cancelar".
 *    · Resto de errores → vuelve a `idle` con mensaje de error.
 *  - Editor de borrador (OCR o alta manual): el container es dueño del `draft` y
 *    crea el ticket con `useCreateReceipt` en `onSaveDraft(input)`.
 *  - Borrado con confirmación (`useDeleteReceiptByFamily`: id por `mutate`, NO
 *    hook en bucle por fila).
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import {
  useFamilyReceipts,
  useExtractReceipt,
  useCreateReceipt,
  useDeleteReceiptByFamily,
  compressImageToBase64,
  type ApiRequestError,
} from '../hooks/useBudget';
import type { ExtractReceiptResponse, CreateReceiptInput } from '../contracts';
import type { ReceiptsViewProps, ReceiptCaptureState } from '../views/types';

function isAiUnavailable(error: ApiRequestError | null): boolean {
  return error?.status === 503;
}

/**
 * La imagen supera el tamaño admitido por el servidor (413) o por el contrato
 * OCR (400). Merece un mensaje específico en vez del genérico de error.
 */
function isImageTooLarge(error: ApiRequestError | null): boolean {
  return error?.status === 413 || error?.status === 400;
}

export function ReceiptsPage() {
  const navigate = useNavigate();
  const { familyId } = useParams({ strict: false }) as { familyId: string };

  const { data: receipts = [], isLoading, error: listError } = useFamilyReceipts(familyId);
  const extractMutation = useExtractReceipt(familyId);
  const createMutation = useCreateReceipt(familyId);
  const deleteMutation = useDeleteReceiptByFamily(familyId);

  // Estado de la máquina de captura.
  const [capture, setCapture] = useState<ReceiptCaptureState>({ phase: 'idle' });
  const [captureError, setCaptureError] = useState<string | null>(null);

  async function handleCapture(file: File) {
    setCaptureError(null);
    setCapture({ phase: 'extracting' });
    try {
      const base64 = await compressImageToBase64(file);
      const draft = await extractMutation.mutateAsync(base64);
      setCapture({ phase: 'draft', draft });
    } catch (err) {
      const apiErr = err as ApiRequestError;
      if (isAiUnavailable(apiErr)) {
        setCapture({ phase: 'ai-unavailable' });
      } else if (isImageTooLarge(apiErr)) {
        setCapture({ phase: 'idle' });
        setCaptureError('La imagen es demasiado grande. Prueba con una foto más ligera o recórtala.');
      } else {
        setCapture({ phase: 'idle' });
        setCaptureError('No se ha podido procesar la imagen. Inténtalo de nuevo.');
      }
    }
  }

  function handleManualEntry() {
    const emptyDraft: ExtractReceiptResponse = { lines: [], currency: 'EUR' };
    setCapture({ phase: 'manual', draft: emptyDraft });
  }

  function handleCancelCapture() {
    setCapture({ phase: 'idle' });
    setCaptureError(null);
  }

  async function handleSaveDraft(input: CreateReceiptInput) {
    setCaptureError(null);
    try {
      await createMutation.mutateAsync(input);
      setCapture({ phase: 'idle' });
    } catch {
      setCaptureError('No se ha podido guardar el ticket. Inténtalo de nuevo.');
    }
  }

  function handleDelete(id: string) {
    const r = receipts.find((x) => x.id === id);
    const label = r?.merchant ?? (r ? new Date(r.purchasedAt).toLocaleDateString('es-ES') : '');
    if (!confirm(`¿Eliminar el ticket${label ? ` de ${label}` : ''}?`)) return;
    deleteMutation.mutate(id);
  }

  const props: ReceiptsViewProps = {
    receipts,
    isLoading,
    error: listError ? 'No se han podido cargar los tickets.' : null,
    capture,
    captureError,
    isSavingDraft: createMutation.isPending,
    onCapture: (file) => void handleCapture(file),
    onManualEntry: handleManualEntry,
    onCancelCapture: handleCancelCapture,
    onSaveDraft: (input) => void handleSaveDraft(input),
    onOpen: (id) =>
      void navigate({
        to: '/family/$familyId/budget/receipts/$receiptId',
        params: { familyId, receiptId: id },
      }),
    onDelete: handleDelete,
    onGoSpend: () =>
      void navigate({ to: '/family/$familyId/budget/spend', params: { familyId } }),
  };

  return <ThemeView screen="budget_receipts" props={props} />;
}
