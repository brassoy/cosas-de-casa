/**
 * Suscripciones Supabase Realtime de la feature `plans`.
 *
 * Los planes son ONLINE-FIRST (React Query, sin Dexie). Estos hooks INVALIDAN la
 * query correspondiente al llegar un cambio y dejan que TanStack Query refetchee
 * el DTO completo del servidor (mismo patrón que `useFridgeRealtime` /
 * `useFamilyMembersRealtime`), evitando el gotcha de campos derivados (ADR-0013):
 * el payload de Realtime trae columnas crudas (sin `displayName`/`status`
 * resueltos), pero al invalidar+refetchear la vista siempre recibe el DTO bueno.
 *
 * El chat (`plan_messages`) tiene su propia suscripción en `usePlanChat`.
 *
 * Requieren que las tablas estén en la publicación `supabase_realtime`
 * (migración 0015_realtime_plans). Si Realtime no está disponible/offline, la
 * suscripción no recibe eventos y todo sigue con React Query + refetch normal.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';

/**
 * Detalle de un plan: "quién viene" (`plan_participants`) y los campos/estado del
 * propio plan (`plans`). Invalida `['plans','detail',planId]` en cualquier cambio.
 */
export function usePlanDetailRealtime(planId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!planId) return;

    let unsubscribed = false;
    const invalidate = () => {
      if (unsubscribed) return;
      void qc.invalidateQueries({ queryKey: ['plans', 'detail', planId] });
    };

    const channel = supabase
      .channel(`plan_detail:${planId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plan_participants', filter: `plan_id=eq.${planId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans', filter: `id=eq.${planId}` },
        invalidate,
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] Canal plan_detail no disponible:', planId);
        }
      });

    return () => {
      unsubscribed = true;
      void supabase.removeChannel(channel);
    };
  }, [planId, qc]);
}

/**
 * Listado de planes de una familia: planes propios (`plans` por `owner_family_id`)
 * y planes compartidos CON esta familia (`plan_shares` por `family_id`). Invalida
 * `['plans', familyId]` en cualquier cambio, de modo que un plan recién creado o
 * recién compartido por una familia amiga aparezca sin recargar.
 */
export function usePlansListRealtime(familyId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!familyId) return;

    let unsubscribed = false;
    const invalidate = () => {
      if (unsubscribed) return;
      void qc.invalidateQueries({ queryKey: ['plans', familyId] });
    };

    const channel = supabase
      .channel(`plans_list:${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans', filter: `owner_family_id=eq.${familyId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plan_shares', filter: `family_id=eq.${familyId}` },
        invalidate,
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] Canal plans_list no disponible:', familyId);
        }
      });

    return () => {
      unsubscribed = true;
      void supabase.removeChannel(channel);
    };
  }, [familyId, qc]);
}
