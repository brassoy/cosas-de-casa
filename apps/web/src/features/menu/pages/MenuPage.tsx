/**
 * MenuPage — CONTAINER de la pantalla de menú.
 *
 * Cablea la lógica real (mutaciones IA + recetas + estado local) una sola vez y
 * delega el render en `ThemeView`, que monta la vista presentacional del theme
 * activo.
 *
 * Flujo:
 *  1. "Sugerir menú" → POST /families/:id/menu/suggest (IA, 503 → aviso).
 *  2. "Añadir a la lista" → POST /families/:id/menu/to-list.
 *  3. "Mis recetas": crear/listar/borrar recetas y, al desplegar una, cargar su
 *     disponibilidad (GET .../recipes/:id/availability) cruzando contra
 *     nevera+congelador+despensa. "Añadir lo que falta" reusa el flujo to-list.
 */

import { useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ThemeView } from '@/shared/theme/ThemeView';
import { api } from '@/shared/lib/api';
import {
  useSuggestMenu,
  useMenuToList,
  useRecipes,
  useCreateRecipe,
  useDeleteRecipe,
  recipeKeys,
  type ApiRequestError,
} from '../hooks/useMenu';
import type { MenuSuggestionDto, RecipeAvailabilityDto } from '../contracts';
import type { MenuViewProps, RecipeWithAvailability } from '../views/types';

// ── Helper ────────────────────────────────────────────────────────────────────

function isAiUnavailable(error: ApiRequestError | null): boolean {
  return error?.status === 503;
}

// ── Container ───────────────────────────────────────────────────────────────────

export function MenuPage() {
  const { familyId } = useParams({ strict: false }) as { familyId: string };
  const qc = useQueryClient();

  // ── Sugerir menú ───────────────────────────────────────────────────────────
  const suggestMutation = useSuggestMenu(familyId);
  const toListMutation = useMenuToList(familyId);

  const [suggestion, setSuggestion] = useState<MenuSuggestionDto | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [toListDone, setToListDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Recetas ──────────────────────────────────────────────────────────────────
  const recipesQuery = useRecipes(familyId);
  const createRecipeMutation = useCreateRecipe(familyId);
  const deleteRecipeMutation = useDeleteRecipe(familyId);

  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState<string[]>(['']);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [availabilityById, setAvailabilityById] = useState<
    Record<string, RecipeAvailabilityDto>
  >({});
  const [loadingAvailability, setLoadingAvailability] = useState<Set<string>>(new Set());

  // ── Handlers: sugerir ────────────────────────────────────────────────────────

  function handleSuggest() {
    setAiUnavailable(false);
    setErrorMsg(null);
    setToListDone(false);

    suggestMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          setSuggestion(data);
          setSelectedIngredients(new Set());
        },
        onError: (err) => {
          if (isAiUnavailable(err)) {
            setAiUnavailable(true);
          } else {
            setErrorMsg('No se ha podido obtener la sugerencia de menú. Inténtalo de nuevo.');
          }
        },
      },
    );
  }

  function handleToggleIngredient(ing: string) {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ing)) next.delete(ing);
      else next.add(ing);
      return next;
    });
  }

  function handleAddToList() {
    const ingredients = Array.from(selectedIngredients);
    if (ingredients.length === 0) return;

    setErrorMsg(null);
    toListMutation.mutate(
      { ingredients },
      {
        onSuccess: () => {
          setToListDone(true);
          setSelectedIngredients(new Set());
        },
        onError: () => {
          setErrorMsg('No se han podido añadir los ingredientes a la lista.');
        },
      },
    );
  }

  const selected = useMemo(() => Array.from(selectedIngredients), [selectedIngredients]);

  // ── Handlers: formulario de receta ────────────────────────────────────────────

  function handleChangeIngredient(index: number, value: string) {
    setNewRecipeIngredients((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function handleAddIngredientLine() {
    setNewRecipeIngredients((prev) => [...prev, '']);
  }

  function handleRemoveIngredientLine(index: number) {
    setNewRecipeIngredients((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  }

  function handleCreateRecipe() {
    const name = newRecipeName.trim();
    const ingredients = newRecipeIngredients.map((i) => i.trim()).filter(Boolean);
    if (!name || ingredients.length === 0) return;

    setErrorMsg(null);
    createRecipeMutation.mutate(
      { name, ingredients },
      {
        onSuccess: () => {
          setNewRecipeName('');
          setNewRecipeIngredients(['']);
        },
        onError: () => {
          setErrorMsg('No se ha podido guardar la receta. Inténtalo de nuevo.');
        },
      },
    );
  }

  // ── Handlers: receta (desplegar / borrar / faltantes) ─────────────────────────

  async function loadAvailability(recipeId: string) {
    setLoadingAvailability((prev) => new Set(prev).add(recipeId));
    try {
      const data = await qc.fetchQuery<RecipeAvailabilityDto>({
        queryKey: recipeKeys.availability(recipeId),
        queryFn: () =>
          api.get<RecipeAvailabilityDto>(
            `/families/${familyId}/recipes/${recipeId}/availability`,
          ),
      });
      setAvailabilityById((prev) => ({ ...prev, [recipeId]: data }));
    } catch {
      setErrorMsg('No se ha podido comprobar qué ingredientes tienes.');
    } finally {
      setLoadingAvailability((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  }

  function handleToggleRecipe(recipeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
        if (!availabilityById[recipeId]) void loadAvailability(recipeId);
      }
      return next;
    });
  }

  function handleDeleteRecipe(recipeId: string) {
    deleteRecipeMutation.mutate(recipeId, {
      onSuccess: () => {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
      },
      onError: () => {
        setErrorMsg('No se ha podido eliminar la receta.');
      },
    });
  }

  function handleAddMissingToList(recipeId: string) {
    const availability = availabilityById[recipeId];
    if (!availability || availability.missing.length === 0) return;

    setErrorMsg(null);
    setToListDone(false);
    toListMutation.mutate(
      { ingredients: availability.missing },
      {
        onSuccess: () => {
          setToListDone(true);
        },
        onError: () => {
          setErrorMsg('No se han podido añadir los ingredientes a la lista.');
        },
      },
    );
  }

  // ── Composición de las recetas para la vista ──────────────────────────────────

  const recipes: RecipeWithAvailability[] = useMemo(
    () =>
      (recipesQuery.data ?? []).map((recipe) => ({
        recipe,
        availability: availabilityById[recipe.id] ?? null,
        isLoading: loadingAvailability.has(recipe.id),
        expanded: expanded.has(recipe.id),
      })),
    [recipesQuery.data, availabilityById, loadingAvailability, expanded],
  );

  const viewProps: MenuViewProps = {
    suggestion,
    isLoading: suggestMutation.isPending,
    isAdding: toListMutation.isPending,
    aiUnavailable,
    error: errorMsg,
    addedOk: toListDone,
    selected,
    onToggleIngredient: handleToggleIngredient,
    onSuggest: handleSuggest,
    onAddToList: handleAddToList,

    recipes,
    recipesLoading: recipesQuery.isLoading,
    isCreatingRecipe: createRecipeMutation.isPending,
    newRecipeName,
    newRecipeIngredients,
    onChangeRecipeName: setNewRecipeName,
    onChangeIngredient: handleChangeIngredient,
    onAddIngredientLine: handleAddIngredientLine,
    onRemoveIngredientLine: handleRemoveIngredientLine,
    onCreateRecipe: handleCreateRecipe,
    onToggleRecipe: handleToggleRecipe,
    onDeleteRecipe: handleDeleteRecipe,
    onAddMissingToList: handleAddMissingToList,
  };

  return <ThemeView screen="menu" props={viewProps} />;
}
