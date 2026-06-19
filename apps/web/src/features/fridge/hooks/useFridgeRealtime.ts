/**
 * useFridgeRealtime — suscripción Supabase Realtime a `fridge_items`.
 *
 * La nevera es ONLINE-FIRST (a diferencia de shopping, que es offline-first con
 * Dexie): la UI lee del cache de TanStack Query, no de IndexedDB. Por eso este
 * hook NO mergea nada en una BD local; simplemente INVALIDA la query de la
 * familia cuando llega cualquier cambio (`INSERT`/`UPDATE`/`DELETE`) sobre
 * `fridge_items` filtrado por `family_id`. TanStack Query refetchea y la lista se
 * repinta con el DTO completo del servidor.
 *
 * Patrón tomado de `features/shopping/hooks/useRealtimeItems.ts` (ADR-0013):
 * suscripción directa `postgres_changes` desde el cliente, filtrada por familia.
 *
 * Gotcha de campos derivados (ADR-0013): el payload de Realtime solo trae las
 * columnas de `fridge_items`. La urgencia por caducidad (`urgency`/`urgencyLabel`)
 * es un campo DERIVADO que el container calcula a partir de `expiryDate` (que SÍ
 * es columna de la tabla). Como aquí invalidamos y refetcheamos en lugar de
 * mergear el payload crudo, el problema del payload incompleto no nos afecta: la
 * vista siempre recibe el DTO completo + la urgencia recalculada por el container.
 *
 * Si Realtime no está disponible o la app está offline, la suscripción no recibe
 * eventos; la nevera sigue funcionando con TanStack Query + refetch normal.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { fridgeKeys } from './useFridge';

export function useFridgeRealtime(familyId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!familyId) return;

    let unsubscribed = false;

    const channel = supabase
      .channel(`fridge_items:family_id=eq.${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fridge_items',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          if (unsubscribed) return;
          // Online-first: invalidamos y dejamos que TanStack Query refetchee el
          // DTO completo. No mergeamos el payload crudo (evita el gotcha de
          // campos derivados del ADR-0013).
          void qc.invalidateQueries({ queryKey: fridgeKeys.byFamily(familyId) });
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Degrada en silencio: la nevera sigue con TanStack Query + refetch.
          console.warn('[realtime] Canal fridge_items no disponible:', familyId);
        }
      });

    return () => {
      unsubscribed = true;
      void supabase.removeChannel(channel);
    };
  }, [familyId, qc]);
}
