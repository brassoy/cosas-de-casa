/**
 * Hooks de la nevera — online-first con TanStack Query.
 *
 *   GET    /families/:familyId/fridge        → FridgeItemDto[]
 *   POST   /families/:familyId/fridge        → 201 FridgeItemDto
 *   PATCH  /fridge-items/:id                 → FridgeItemDto
 *   DELETE /fridge-items/:id                 → 204
 *   POST   /fridge-items/:id/eat             → 200 { deleted: boolean, itemId: string }
 *   POST   /fridge-items/:id/throw           → 200 FridgeItemDto (location → DISCARDED)
 *   POST   /fridge-items/:id/freeze          → 200 FridgeItemDto
 *   POST   /fridge-items/:id/thaw            → 200 FridgeItemDto
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  FridgeItemDto,
  AddFridgeItemInput,
  UpdateFridgeItemInput,
} from '@cosasdecasa/contracts';

export type { ApiRequestError };

// ── Claves de query ───────────────────────────────────────────────────────────

export const fridgeKeys = {
  all: ['fridge'] as const,
  byFamily: (familyId: string) => ['fridge', 'family', familyId] as const,
};

// ── Respuesta de eat ──────────────────────────────────────────────────────────

interface EatFridgeItemResponse {
  deleted: boolean;
  itemId: string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFamilyFridge(familyId: string | undefined) {
  return useQuery<FridgeItemDto[]>({
    queryKey: familyId ? fridgeKeys.byFamily(familyId) : ['fridge', 'none'],
    queryFn: () => api.get<FridgeItemDto[]>(`/families/${familyId!}/fridge`),
    enabled: Boolean(familyId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateFridgeItem(familyId: string) {
  const qc = useQueryClient();
  return useMutation<FridgeItemDto, ApiRequestError, AddFridgeItemInput>({
    mutationFn: (input) =>
      api.post<FridgeItemDto>(`/families/${familyId}/fridge`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}

export function useUpdateFridgeItem(itemId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<FridgeItemDto, ApiRequestError, UpdateFridgeItemInput>({
    mutationFn: (input) => api.patch<FridgeItemDto>(`/fridge-items/${itemId}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}

export function useDeleteFridgeItem(itemId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/fridge-items/${itemId}`),
    // Actualización optimista: eliminar del cache inmediatamente.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: fridgeKeys.byFamily(familyId) });
      const prev = qc.getQueryData<FridgeItemDto[]>(fridgeKeys.byFamily(familyId));
      qc.setQueryData<FridgeItemDto[]>(
        fridgeKeys.byFamily(familyId),
        (old) => old?.filter((i) => i.id !== itemId) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // Revertir si falla
      const context = ctx as { prev?: FridgeItemDto[] } | undefined;
      if (context?.prev) {
        qc.setQueryData(fridgeKeys.byFamily(familyId), context.prev);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}

// ── Acciones de ítem ──────────────────────────────────────────────────────────

/**
 * POST /fridge-items/:id/eat → 200 { deleted: boolean, itemId: string }
 *
 * - deleted=true  → el ítem fue eliminado (cantidad llegó a 0). Se quita del cache.
 * - deleted=false → la cantidad disminuyó pero el ítem sigue existiendo.
 *                   Se invalida la query para refetch.
 *
 * NO hay actualización optimista de eliminación aquí porque no sabemos de antemano
 * si el ítem se va a eliminar o solo decrementar.
 */
export function useEatFridgeItem(itemId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<EatFridgeItemResponse, ApiRequestError, void>({
    mutationFn: () => api.post<EatFridgeItemResponse>(`/fridge-items/${itemId}/eat`, {}),
    onSuccess: (result) => {
      if (result.deleted) {
        // El ítem fue eliminado: sacarlo del cache directamente.
        qc.setQueryData<FridgeItemDto[]>(
          fridgeKeys.byFamily(familyId),
          (old) => old?.filter((i) => i.id !== itemId) ?? [],
        );
      } else {
        // La cantidad disminuyó: refetch para obtener el nuevo valor.
        void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
      }
    },
  });
}

/** POST /fridge-items/:id/throw → 204 (elimina el ítem) */
export function useThrowFridgeItem(itemId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.post<void>(`/fridge-items/${itemId}/throw`, {}),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: fridgeKeys.byFamily(familyId) });
      const prev = qc.getQueryData<FridgeItemDto[]>(fridgeKeys.byFamily(familyId));
      qc.setQueryData<FridgeItemDto[]>(
        fridgeKeys.byFamily(familyId),
        (old) => old?.filter((i) => i.id !== itemId) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      const context = ctx as { prev?: FridgeItemDto[] } | undefined;
      if (context?.prev) {
        qc.setQueryData(fridgeKeys.byFamily(familyId), context.prev);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}

/** POST /fridge-items/:id/freeze → 200 FridgeItemDto (cambia location a FREEZER) */
export function useFreezeFridgeItem(itemId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<FridgeItemDto, ApiRequestError, void>({
    mutationFn: () => api.post<FridgeItemDto>(`/fridge-items/${itemId}/freeze`, {}),
    onSuccess: (updated) => {
      // Actualizar el ítem concreto en el cache
      qc.setQueryData<FridgeItemDto[]>(
        fridgeKeys.byFamily(familyId),
        (old) => old?.map((i) => (i.id === itemId ? updated : i)) ?? [],
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}

// ── Acciones de ítem scoped por familia (id en tiempo de mutación) ──────────────
//
// Variantes que reciben el `itemId` en `mutate(itemId)` en lugar de fijarlo en el
// closure. El container las instancia UNA vez (no una por ítem en un bucle, lo que
// rompería las reglas de hooks) y delega en la vista presentacional. La semántica
// de cache es idéntica a las versiones per-ítem de arriba.

/** PATCH /fridge-items/:id (id + payload por mutación). */
export function useUpdateFridgeItemByFamily(familyId: string) {
  const qc = useQueryClient();
  return useMutation<FridgeItemDto, ApiRequestError, { id: string; input: UpdateFridgeItemInput }>({
    mutationFn: ({ id, input }) => api.patch<FridgeItemDto>(`/fridge-items/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}

/** DELETE /fridge-items/:id (optimista + revert, id por mutación). */
export function useDeleteFridgeItemByFamily(familyId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, string>({
    mutationFn: (itemId) => api.delete<void>(`/fridge-items/${itemId}`),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: fridgeKeys.byFamily(familyId) });
      const prev = qc.getQueryData<FridgeItemDto[]>(fridgeKeys.byFamily(familyId));
      qc.setQueryData<FridgeItemDto[]>(
        fridgeKeys.byFamily(familyId),
        (old) => old?.filter((i) => i.id !== itemId) ?? [],
      );
      return { prev };
    },
    onError: (_err, _itemId, ctx) => {
      const context = ctx as { prev?: FridgeItemDto[] } | undefined;
      if (context?.prev) {
        qc.setQueryData(fridgeKeys.byFamily(familyId), context.prev);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}

/** POST /fridge-items/:id/eat → { deleted } (id por mutación). */
export function useEatFridgeItemByFamily(familyId: string) {
  const qc = useQueryClient();
  return useMutation<EatFridgeItemResponse, ApiRequestError, string>({
    mutationFn: (itemId) => api.post<EatFridgeItemResponse>(`/fridge-items/${itemId}/eat`, {}),
    onSuccess: (result, itemId) => {
      if (result.deleted) {
        qc.setQueryData<FridgeItemDto[]>(
          fridgeKeys.byFamily(familyId),
          (old) => old?.filter((i) => i.id !== itemId) ?? [],
        );
      } else {
        void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
      }
    },
  });
}

/**
 * POST /fridge-items/:id/throw → 200 FridgeItemDto (relocation a DISCARDED).
 *
 * Tirar ya NO elimina: mueve el producto a la ubicación "Tirado" (DISCARDED),
 * dejando un registro de comida tirada. Por eso reemplaza el ítem en el cache
 * (como freeze/thaw) en vez de quitarlo. Espejo de `useThawFridgeItemByFamily`.
 */
export function useThrowFridgeItemByFamily(familyId: string) {
  const qc = useQueryClient();
  return useMutation<FridgeItemDto, ApiRequestError, string>({
    mutationFn: (itemId) => api.post<FridgeItemDto>(`/fridge-items/${itemId}/throw`, {}),
    onSuccess: (updated, itemId) => {
      qc.setQueryData<FridgeItemDto[]>(
        fridgeKeys.byFamily(familyId),
        (old) => old?.map((i) => (i.id === itemId ? updated : i)) ?? [],
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}

/** POST /fridge-items/:id/freeze → 200 FridgeItemDto (relocation, id por mutación). */
export function useFreezeFridgeItemByFamily(familyId: string) {
  const qc = useQueryClient();
  return useMutation<FridgeItemDto, ApiRequestError, string>({
    mutationFn: (itemId) => api.post<FridgeItemDto>(`/fridge-items/${itemId}/freeze`, {}),
    onSuccess: (updated, itemId) => {
      qc.setQueryData<FridgeItemDto[]>(
        fridgeKeys.byFamily(familyId),
        (old) => old?.map((i) => (i.id === itemId ? updated : i)) ?? [],
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}

/** POST /fridge-items/:id/thaw → 200 FridgeItemDto (relocation inversa, id por mutación). */
export function useThawFridgeItemByFamily(familyId: string) {
  const qc = useQueryClient();
  return useMutation<FridgeItemDto, ApiRequestError, string>({
    mutationFn: (itemId) => api.post<FridgeItemDto>(`/fridge-items/${itemId}/thaw`, {}),
    onSuccess: (updated, itemId) => {
      qc.setQueryData<FridgeItemDto[]>(
        fridgeKeys.byFamily(familyId),
        (old) => old?.map((i) => (i.id === itemId ? updated : i)) ?? [],
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
    },
  });
}
