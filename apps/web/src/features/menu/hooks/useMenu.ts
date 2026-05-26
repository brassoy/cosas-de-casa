/**
 * Hooks de la feature menu — sugerir menú desde la nevera.
 *
 * Endpoints (prefijo /api/v1 lo añade el cliente):
 *   POST  /families/:id/menu/suggest   { dishCount? } → MenuSuggestionDto       (200)
 *   POST  /families/:id/menu/to-list   { ingredients, listId? } → MenuToListResultDto (201)
 */

import { useMutation } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  MenuSuggestionDto,
  SuggestMenuInput,
  MenuToListInput,
  MenuToListResultDto,
} from '../contracts';

export type { ApiRequestError };

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Sugiere un menú basado en los contenidos de la nevera familiar.
 * Maneja explícitamente el 503 (IA no disponible).
 */
export function useSuggestMenu(familyId: string) {
  return useMutation<MenuSuggestionDto, ApiRequestError, SuggestMenuInput>({
    mutationFn: (input) =>
      api.post<MenuSuggestionDto>(`/families/${familyId}/menu/suggest`, input),
  });
}

/**
 * Añade ingredientes seleccionados a una lista de la compra.
 * Devuelve MenuToListResultDto con listId, listName, itemsAdded e ingredients.
 */
export function useMenuToList(familyId: string) {
  return useMutation<MenuToListResultDto, ApiRequestError, MenuToListInput>({
    mutationFn: (input) =>
      api.post<MenuToListResultDto>(`/families/${familyId}/menu/to-list`, input),
  });
}
