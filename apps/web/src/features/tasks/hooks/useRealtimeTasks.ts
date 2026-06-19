/**
 * useRealtimeTasks — suscripción Supabase Realtime a la tabla `tasks`.
 *
 * En un hogar compartido, varias personas tocan las mismas tareas a la vez. Esta
 * suscripción mantiene el listado vivo: cuando OTRO miembro crea una tarea, cambia
 * su estado o reasigna, el cambio aparece sin recargar.
 *
 * Patrón (igual que features/shopping/hooks/useRealtimeItems.ts): un canal
 * `postgres_changes` sobre la tabla, filtrado por `family_id=eq.<familyId>`, que
 * INVALIDA las queries de TanStack al recibir cualquier evento.
 *
 * GOTCHA ADR 0013 — NO usamos el payload crudo para repintar. La fila de `tasks`
 * que llega por Realtime NO trae los campos derivados que la UI necesita
 * (asignados con `displayName`, fotos, etc.; viven en `task_assignees` /
 * `task_photos` y se hidratan en el read model del backend). Por eso, en lugar de
 * mergear el payload, invalidamos la query y dejamos que TanStack haga refetch del
 * read model completo. Es la fuente de verdad; el payload solo es la SEÑAL de que
 * algo cambió.
 *
 * Las reasignaciones que NO cambian la fila `tasks` (solo tocan `task_assignees`)
 * también se cubren porque el backend bumpea `tasks.updated_at` al reasignar, lo
 * que emite un UPDATE sobre `tasks`. Si en el futuro eso dejara de cumplirse,
 * habría que añadir una segunda suscripción a `task_assignees`.
 *
 * Degradación: si Realtime no está disponible (offline, canal caído), la
 * suscripción simplemente no recibe eventos; la app sigue con su refetch normal.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { taskKeys } from './useTasks';

export function useRealtimeTasks(familyId: string | undefined): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!familyId) return;

    let unsubscribed = false;

    const channel = supabase
      .channel(`tasks:family_id=eq.${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          if (unsubscribed) return;
          // No usamos el payload: invalidamos y dejamos que TanStack refetchee el
          // read model completo (ADR 0013: los campos derivados no vienen en el payload).
          void qc.invalidateQueries({ queryKey: taskKeys.byFamily(familyId) });
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Degrada en silencio: la app sigue funcionando con su refetch normal.
          console.warn('[realtime] Canal tasks no disponible:', familyId);
        }
      });

    return () => {
      unsubscribed = true;
      void supabase.removeChannel(channel);
    };
  }, [familyId, qc]);
}
