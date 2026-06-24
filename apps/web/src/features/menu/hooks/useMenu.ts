/**
 * Hooks de la feature menu — sugerir menú desde la nevera y gestionar recetas.
 *
 * Endpoints (prefijo /api/v1 lo añade el cliente):
 *   POST   /families/:id/menu/suggest                    { dishCount? } → MenuSuggestionDto       (200)
 *   POST   /families/:id/menu/to-list                    { ingredients, listId? } → MenuToListResultDto (201)
 *   GET    /families/:id/recipes                          → RecipeDto[]
 *   POST   /families/:id/recipes                          { name, ingredients } → RecipeDto         (201)
 *   GET    /families/:id/recipes/:recipeId/availability   → RecipeAvailabilityDto
 *   DELETE /recipes/:recipeId                             → 204
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  MenuSuggestionDto,
  SuggestMenuInput,
  MenuToListInput,
  MenuToListResultDto,
  RecipeDto,
  CreateRecipeInput,
  RecipeAvailabilityDto,
} from '../contracts';

export type { ApiRequestError };

// ── Claves de query ───────────────────────────────────────────────────────────

export const recipeKeys = {
  all: ['recipes'] as const,
  byFamily: (familyId: string) => ['recipes', 'family', familyId] as const,
  availability: (recipeId: string) =>
    ['recipes', 'availability', recipeId] as const,
};

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

// ── Recetas ─────────────────────────────────────────────────────────────────

/** Lista las recetas guardadas de la familia. */
export function useRecipes(familyId: string | undefined) {
  return useQuery<RecipeDto[]>({
    queryKey: familyId ? recipeKeys.byFamily(familyId) : ['recipes', 'none'],
    queryFn: () => api.get<RecipeDto[]>(`/families/${familyId!}/recipes`),
    enabled: Boolean(familyId),
  });
}

/**
 * Comprueba qué ingredientes de una receta hay en nevera/congelador/despensa.
 * Solo se ejecuta si `recipeId` está definido (p. ej. al desplegar la receta).
 */
export function useRecipeAvailability(
  familyId: string | undefined,
  recipeId: string | undefined,
) {
  return useQuery<RecipeAvailabilityDto>({
    queryKey: recipeId
      ? recipeKeys.availability(recipeId)
      : ['recipes', 'availability', 'none'],
    queryFn: () =>
      api.get<RecipeAvailabilityDto>(
        `/families/${familyId!}/recipes/${recipeId!}/availability`,
      ),
    enabled: Boolean(familyId) && Boolean(recipeId),
  });
}

/** Crea una receta nueva. */
export function useCreateRecipe(familyId: string) {
  const qc = useQueryClient();
  return useMutation<RecipeDto, ApiRequestError, CreateRecipeInput>({
    mutationFn: (input) =>
      api.post<RecipeDto>(`/families/${familyId}/recipes`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recipeKeys.byFamily(familyId) });
    },
  });
}

/** Elimina una receta. */
export function useDeleteRecipe(familyId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, string>({
    mutationFn: (recipeId) => api.delete<void>(`/recipes/${recipeId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recipeKeys.byFamily(familyId) });
    },
  });
}
