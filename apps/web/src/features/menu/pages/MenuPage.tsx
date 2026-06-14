/**
 * MenuPage — CONTAINER de la pantalla de menú.
 *
 * Cablea la lógica real (mutaciones IA + estado local) una sola vez y delega el
 * render en `ThemeView`, que monta la vista presentacional del theme activo.
 *
 * Flujo:
 *  1. Botón "Sugerir menú" → POST /families/:id/menu/suggest.
 *     - 503 → aviso IA no disponible (aiUnavailable).
 *     - OK  → muestra platos con ingredientes que faltan.
 *  2. El usuario selecciona ingredientes faltantes → "Añadir a la lista"
 *     → POST /families/:id/menu/to-list { ingredients, listId? }.
 */

import { useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import {
  useSuggestMenu,
  useMenuToList,
  type ApiRequestError,
} from '../hooks/useMenu';
import type { MenuSuggestionDto } from '../contracts';
import type { MenuViewProps } from '../views/types';

// ── Helper ────────────────────────────────────────────────────────────────────

function isAiUnavailable(error: ApiRequestError | null): boolean {
  return error?.status === 503;
}

// ── Container ───────────────────────────────────────────────────────────────────

export function MenuPage() {
  const { familyId } = useParams({ strict: false }) as { familyId: string };

  const suggestMutation = useSuggestMenu(familyId);
  const toListMutation = useMenuToList(familyId);

  const [suggestion, setSuggestion] = useState<MenuSuggestionDto | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [toListDone, setToListDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────

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
      if (next.has(ing)) {
        next.delete(ing);
      } else {
        next.add(ing);
      }
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
  };

  return <ThemeView screen="menu" props={viewProps} />;
}
