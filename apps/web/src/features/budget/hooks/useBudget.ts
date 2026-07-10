/**
 * Hooks de la feature budget — tickets y gasto familiar.
 *
 * Endpoints (prefijo /api/v1 lo añade el cliente):
 *   POST   /families/:id/receipts/extract   { imageBase64 } → ExtractReceiptResponse
 *   POST   /families/:id/receipts           CreateReceiptInput → ReceiptDto
 *   GET    /families/:id/receipts           → ReceiptSummaryDto[]
 *   GET    /receipts/:rid                   → ReceiptDto
 *   PATCH  /receipts/:rid                   UpdateReceiptInput → ReceiptDto
 *   DELETE /receipts/:rid                   → 204
 *   GET    /families/:id/spend-summary      ?from=&to= → SpendSummaryDto
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  ReceiptDto,
  ReceiptSummaryDto,
  ExtractReceiptResponse,
  CreateReceiptInput,
  UpdateReceiptInput,
  SpendSummaryDto,
} from '@cosasdecasa/contracts';

export type { ApiRequestError };

// ── Claves de query ───────────────────────────────────────────────────────────

export const budgetKeys = {
  all: ['budget'] as const,
  receiptsByFamily: (familyId: string) => ['budget', 'receipts', familyId] as const,
  receiptDetail: (receiptId: string) => ['budget', 'receipt', receiptId] as const,
  spendSummary: (familyId: string, from?: string, to?: string) =>
    ['budget', 'spend-summary', familyId, from, to] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFamilyReceipts(familyId: string | undefined) {
  return useQuery<ReceiptSummaryDto[]>({
    queryKey: familyId ? budgetKeys.receiptsByFamily(familyId) : ['budget', 'none'],
    queryFn: () => api.get<ReceiptSummaryDto[]>(`/families/${familyId!}/receipts`),
    enabled: Boolean(familyId),
  });
}

export function useReceiptDetail(receiptId: string | undefined) {
  return useQuery<ReceiptDto>({
    queryKey: receiptId ? budgetKeys.receiptDetail(receiptId) : ['budget', 'receipt', 'none'],
    queryFn: () => api.get<ReceiptDto>(`/receipts/${receiptId!}`),
    enabled: Boolean(receiptId),
  });
}

export function useSpendSummary(
  familyId: string | undefined,
  from?: string,
  to?: string,
) {
  return useQuery<SpendSummaryDto>({
    queryKey: familyId
      ? budgetKeys.spendSummary(familyId, from, to)
      : ['budget', 'spend-summary', 'none'],
    queryFn: () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return api.get<SpendSummaryDto>(`/families/${familyId!}/spend-summary${qs}`);
    },
    enabled: Boolean(familyId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Llama a POST /families/:id/receipts/extract { imageBase64 }.
 * Maneja explícitamente el 503 (IA no disponible).
 */
export function useExtractReceipt(familyId: string) {
  return useMutation<ExtractReceiptResponse, ApiRequestError, string>({
    mutationFn: (imageBase64) =>
      api.post<ExtractReceiptResponse>(`/families/${familyId}/receipts/extract`, {
        imageBase64,
      }),
  });
}

export function useCreateReceipt(familyId: string) {
  const qc = useQueryClient();
  return useMutation<ReceiptDto, ApiRequestError, CreateReceiptInput>({
    mutationFn: (input) =>
      api.post<ReceiptDto>(`/families/${familyId}/receipts`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.receiptsByFamily(familyId) });
    },
  });
}

export function useUpdateReceipt(receiptId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<ReceiptDto, ApiRequestError, UpdateReceiptInput>({
    mutationFn: (input) => api.patch<ReceiptDto>(`/receipts/${receiptId}`, input),
    onSuccess: (updated) => {
      qc.setQueryData<ReceiptDto>(budgetKeys.receiptDetail(receiptId), updated);
      void qc.invalidateQueries({ queryKey: budgetKeys.receiptsByFamily(familyId) });
    },
  });
}

export function useDeleteReceipt(receiptId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/receipts/${receiptId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.receiptsByFamily(familyId) });
      qc.removeQueries({ queryKey: budgetKeys.receiptDetail(receiptId) });
    },
  });
}

/**
 * Variante de borrado que recibe el `receiptId` en cada `mutate(id)`.
 *
 * El listado de tickets no puede instanciar `useDeleteReceipt(id)` por fila
 * (sería un hook en bucle, viola las reglas de hooks). Esta variante se
 * instancia UNA vez por familia en el container y el id viaja en cada llamada
 * (mismo patrón que las `*ByFamily` de fridge). Invalidado idéntico.
 */
export function useDeleteReceiptByFamily(familyId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, string>({
    mutationFn: (receiptId) => api.delete<void>(`/receipts/${receiptId}`),
    onSuccess: (_data, receiptId) => {
      void qc.invalidateQueries({ queryKey: budgetKeys.receiptsByFamily(familyId) });
      qc.removeQueries({ queryKey: budgetKeys.receiptDetail(receiptId) });
    },
  });
}

// ── Helper: comprimir imagen y convertir a base64 ────────────────────────────

import imageCompression from 'browser-image-compression';

export async function compressImageToBase64(file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    // `fileType: 'image/jpeg'` fuerza la SALIDA a JPEG sea cual sea el origen
    // (PNG, HEIC del iPhone…). Así el base64 que enviamos coincide con el
    // `media_type: 'image/jpeg'` que asume la API y, de paso, PNG/HEIC pesan
    // mucho menos como JPEG.
    fileType: 'image/jpeg',
    // El binario objetivo es ~0.7 MB: base64 infla ~33% → ~0.93 MB, muy por
    // debajo del máximo de 4 MB del contrato (`ExtractReceiptInputSchema`).
    maxSizeMB: 0.7,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  });

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extraer solo la parte base64 (sin el prefijo data:...;base64,)
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('No se ha podido leer la imagen como base64.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Error al leer el fichero.'));
    reader.readAsDataURL(compressed);
  });
}
