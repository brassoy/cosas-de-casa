/**
 * useFamilyMembersRealtime — suscripción Supabase Realtime a `memberships`.
 *
 * La lista de miembros de la familia es ONLINE-FIRST (React Query, sin Dexie).
 * Antes NO había ningún mecanismo para refrescar la lista del resto de miembros
 * cuando alguien se unía con un PIN: el OWNER que había creado la familia se
 * quedaba viéndose solo a sí mismo (caché de React Query persistida en IndexedDB)
 * hasta que expiraba el `staleTime` y saltaba un refetch. Este hook cierra ese
 * hueco: cuando llega cualquier cambio (`INSERT`/`UPDATE`/`DELETE`) sobre
 * `memberships` filtrado por `family_id`, INVALIDA las queries de la familia y
 * TanStack Query refetchea la lista completa.
 *
 * Patrón idéntico a `features/fridge/hooks/useFridgeRealtime.ts`: suscripción
 * directa `postgres_changes` desde el cliente, filtrada por familia. El payload
 * de Realtime solo trae columnas crudas de `memberships` (sin `display_name`, que
 * es un JOIN a `app_users`), por eso invalidamos y refetcheamos en vez de mergear
 * el payload: la vista siempre recibe el DTO completo del servidor.
 *
 * Requiere que `memberships` esté en la publicación `supabase_realtime`
 * (migración 0014_realtime_memberships). Si Realtime no está disponible o la app
 * está offline, la suscripción no recibe eventos y la lista sigue funcionando con
 * React Query + refetch normal.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';

export function useFamilyMembersRealtime(familyId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!familyId) return;

    let unsubscribed = false;

    const channel = supabase
      .channel(`memberships:family_id=eq.${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memberships',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          if (unsubscribed) return;
          // Prefijo `['families', familyId]`: invalida a la vez la lista de
          // miembros (`…, 'members'`) y el detalle (`…, 'detail'`).
          void qc.invalidateQueries({ queryKey: ['families', familyId] });
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Degrada en silencio: la lista sigue con React Query + refetch.
          console.warn('[realtime] Canal memberships no disponible:', familyId);
        }
      });

    return () => {
      unsubscribed = true;
      void supabase.removeChannel(channel);
    };
  }, [familyId, qc]);
}
