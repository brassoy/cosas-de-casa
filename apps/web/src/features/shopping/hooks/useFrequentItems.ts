/**
 * Hook para cargar los artículos frecuentes de una familia.
 *
 * GET /families/:familyId/frequent-items
 * → FrequentItemDto[]  (del contrato @cosasdecasa/contracts)
 *
 * Devuelve los datos mapeados a { name, count } para uso en FrequentItemsBar.
 * Solo se lanza si hay conexión; en offline devuelve lista vacía sin error.
 */

import { useReducer, useEffect } from 'react';
import type { FrequentItemDto } from '@cosasdecasa/contracts';
import { api } from '@/shared/lib/api';

/** Shape de presentación para la barra de frecuentes. */
export interface FrequentItemBarEntry {
  name: string;
  count: number;
}

export interface UseFrequentItemsReturn {
  items: FrequentItemBarEntry[];
  loading: boolean;
}

type State = { items: FrequentItemBarEntry[]; loading: boolean };
type Action =
  | { type: 'start' }
  | { type: 'done'; items: FrequentItemBarEntry[] }
  | { type: 'error' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return { ...state, loading: true };
    case 'done':
      return { items: action.items, loading: false };
    case 'error':
      return { ...state, loading: false };
    default:
      return state;
  }
}

/** Mapea FrequentItemDto del contrato al shape de la barra de sugerencias. */
function toBarEntry(dto: FrequentItemDto): FrequentItemBarEntry {
  return {
    name: dto.displayName,
    count: dto.frequency,
  };
}

export function useFrequentItems(familyId: string | undefined): UseFrequentItemsReturn {
  const [state, dispatch] = useReducer(reducer, { items: [], loading: false });

  useEffect(() => {
    if (!familyId || !navigator.onLine) return;

    let cancelled = false;

    dispatch({ type: 'start' });

    api
      .get<FrequentItemDto[]>(`/families/${familyId}/frequent-items`)
      .then((data) => {
        if (!cancelled) dispatch({ type: 'done', items: data.map(toBarEntry) });
      })
      .catch(() => {
        // Fallo silencioso: los sugeridos son un añadido; no romper la UI.
        if (!cancelled) dispatch({ type: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [familyId]);

  return state;
}
