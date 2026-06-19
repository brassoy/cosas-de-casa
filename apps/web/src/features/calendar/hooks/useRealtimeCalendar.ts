/**
 * useRealtimeCalendar — suscripción Supabase Realtime a la tabla `calendar_events`.
 *
 * En un hogar compartido, el calendario es de todos: si OTRO miembro crea, edita o
 * borra un evento, debe aparecer/desaparecer en vivo sin recargar.
 *
 * Patrón (igual que features/shopping/hooks/useRealtimeItems.ts): un canal
 * `postgres_changes` sobre la tabla, filtrado por `family_id=eq.<familyId>`, que
 * INVALIDA las queries de eventos de la familia al recibir cualquier evento.
 *
 * Invalidación por familia (no por mes): las queries del calendario se cachean por
 * mes (`calendarKeys.byMonth`), pero un cambio remoto puede afectar a cualquier mes
 * (eventos recurrentes, ediciones de fecha…). Como `byMonth` tiene el prefijo de
 * `byFamily`, invalidar `calendarKeys.byFamily(familyId)` refresca TODOS los meses
 * cacheados de esa familia. TanStack solo hará refetch de los que estén activos.
 *
 * GOTCHA ADR 0013 — NO usamos el payload crudo. La fila de `calendar_events` que
 * llega por Realtime NO trae los campos derivados (asistentes con `displayName`,
 * que viven en `event_attendees` y se hidratan en el read model del backend). Por
 * eso invalidamos y dejamos que TanStack refetchee el read model completo; el
 * payload solo es la SEÑAL de que algo cambió.
 *
 * Degradación: si Realtime no está disponible (offline, canal caído), la
 * suscripción simplemente no recibe eventos; la app sigue con su refetch normal.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { calendarKeys } from './useCalendar';

export function useRealtimeCalendar(familyId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!familyId) return;

    let unsubscribed = false;

    const channel = supabase
      .channel(`calendar_events:family_id=eq.${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          if (unsubscribed) return;
          // No usamos el payload: invalidamos toda la familia (cualquier mes) y
          // dejamos que TanStack refetchee el read model completo (ADR 0013).
          void qc.invalidateQueries({ queryKey: calendarKeys.byFamily(familyId) });
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Degrada en silencio: la app sigue funcionando con su refetch normal.
          console.warn('[realtime] Canal calendar_events no disponible:', familyId);
        }
      });

    return () => {
      unsubscribed = true;
      void supabase.removeChannel(channel);
    };
  }, [familyId, qc]);
}
