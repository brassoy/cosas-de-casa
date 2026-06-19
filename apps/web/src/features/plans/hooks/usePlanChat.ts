/**
 * usePlanChat — suscripción Supabase Realtime a `plan_messages`.
 *
 * Al montar, abre un canal Postgres Changes filtrado por `plan_id=eq.<planId>`.
 * Cada INSERT se añade al estado local del hook para que el chat se actualice
 * en tiempo real sin recargar.
 *
 * Estrategia:
 *   - Solo escuchamos INSERTs (los mensajes no se editan ni borran).
 *   - Deduplicamos por id antes de añadir al estado.
 *   - La lista inicial se carga con useQuery; el realtime solo añade los nuevos.
 *
 * Paginación hacia atrás (cargar mensajes antiguos):
 *   El endpoint REST devuelve hasta `MESSAGES_PAGE_SIZE` mensajes en orden
 *   ascendente y acepta `?before=<ISO>` para traer los anteriores a un instante.
 *   Para no perder el histórico cuando un chat supera una página:
 *     - `loadOlder()` pide una página usando como cursor el `createdAt` del
 *       mensaje MÁS ANTIGUO ya cargado y la prepende al estado.
 *     - `hasMoreOlder` es `true` mientras la última página recibida venga llena
 *       (== page size); cuando llega una página incompleta, ya no hay más atrás.
 *     - La carga es bajo demanda (botón "cargar más" arriba del hilo): no se
 *       dispara sola para no consumir datos sin que el usuario lo pida.
 *
 * Bug del display_name:
 *   La tabla plan_messages NO tiene columna display_name (solo: id, plan_id,
 *   user_id, body, created_at). El payload de postgres_changes no lo incluye.
 *   - Mensajes propios: se añaden directamente desde la respuesta del POST
 *     (que pasa por el JOIN en el endpoint REST y trae displayName).
 *   - Mensajes ajenos (INSERT vía realtime): se resuelve el nombre con el mapa
 *     userId→displayName construido desde PlanDto.participants (que PlanDetailPage
 *     tiene cargado). Si el autor no está en participants, se hace invalidate de
 *     la query de mensajes para que el refetch REST (con JOIN) traiga el nombre.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import { api, ApiRequestError } from '@/shared/lib/api';
import type { PlanMessageDto, SendMessageInput, PlanParticipantDto } from '../contracts';

export type { PlanMessageDto, SendMessageInput };

/**
 * Tamaño de página del endpoint REST de mensajes (limit por defecto del backend
 * en `list-plan-messages.use-case.ts`). Si una página llega con MENOS mensajes
 * que esto, es que ya no hay más histórico hacia atrás.
 */
export const MESSAGES_PAGE_SIZE = 50;

// Forma de la fila cruda que llega de Supabase Realtime para plan_messages.
// NO incluye display_name porque esa columna no existe en la tabla.
interface RawPlanMessageRecord {
  id: string;
  plan_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

type MessagePayload = RealtimePostgresChangesPayload<RawPlanMessageRecord>;

// ── Hook principal ─────────────────────────────────────────────────────────────

export interface UsePlanChatOptions {
  /** Mapa userId → displayName construido desde PlanDto.participants. */
  participantNames?: Map<string, string>;
}

export function usePlanChat(
  planId: string | undefined,
  { participantNames }: UsePlanChatOptions = {},
) {
  const qc = useQueryClient();

  const [realtimeMessages, setRealtimeMessages] = useState<PlanMessageDto[]>([]);
  // Páginas antiguas cargadas bajo demanda con el cursor `?before=`.
  const [olderMessages, setOlderMessages] = useState<PlanMessageDto[]>([]);
  // `null` = aún no sabemos (no ha cargado la primera página). Una vez cargada,
  // pasa a true/false según si la primera página vino llena.
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean | null>(null);

  // Carga inicial de mensajes (endpoint REST: pasa por JOIN, trae displayName)
  const {
    data: initialMessages,
    isLoading,
    error,
  } = useQuery<PlanMessageDto[]>({
    queryKey: ['plan-messages', planId],
    queryFn: () => api.get<PlanMessageDto[]>(`/plans/${planId}/messages`),
    enabled: Boolean(planId),
  });

  // Al recibir la primera página: si vino llena, hay histórico anterior que
  // todavía no tenemos. Solo lo inicializamos una vez (hasMoreOlder === null)
  // para no pisar el estado tras un `loadOlder`.
  useEffect(() => {
    if (!initialMessages || hasMoreOlder !== null) return;
    setHasMoreOlder(initialMessages.length >= MESSAGES_PAGE_SIZE);
  }, [initialMessages, hasMoreOlder]);

  // Al cambiar de plan, reseteamos las páginas antiguas y el flag de "hay más".
  useEffect(() => {
    setOlderMessages([]);
    setHasMoreOlder(null);
  }, [planId]);

  // Suscripción Realtime
  useEffect(() => {
    if (!planId) return;

    let unsubscribed = false;

    const channel = supabase
      .channel(`plan_messages:plan_id=eq.${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_messages',
          filter: `plan_id=eq.${planId}`,
        },
        (payload: MessagePayload) => {
          if (unsubscribed) return;
          const record = payload.new as RawPlanMessageRecord;
          if (!record?.id) return;

          // Resuelve el displayName desde el mapa de participantes.
          // Si no está (usuario aún no cargado), forzamos refetch del endpoint
          // REST que hace el JOIN y trae el nombre correcto.
          const displayName = participantNames?.get(record.user_id);
          if (!displayName) {
            void qc.invalidateQueries({ queryKey: ['plan-messages', planId] });
            return;
          }

          const dto: PlanMessageDto = {
            id: record.id,
            planId: record.plan_id,
            userId: record.user_id,
            displayName,
            body: record.body,
            createdAt: record.created_at,
          };

          setRealtimeMessages((prev) => {
            if (prev.some((m) => m.id === dto.id)) return prev;
            return [...prev, dto];
          });
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] Canal plan_messages no disponible:', planId);
        }
      });

    return () => {
      unsubscribed = true;
      void supabase.removeChannel(channel);
    };
  }, [planId, participantNames, qc]);

  // Combina páginas antiguas + iniciales + nuevos de Realtime (sin duplicar por
  // id) y ordena ascendente (más antiguo arriba).
  const seen = new Set<string>();
  const messages = [...olderMessages, ...(initialMessages ?? []), ...realtimeMessages]
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Cursor para pedir la página anterior: el `createdAt` del mensaje MÁS
  // ANTIGUO que ya tenemos (el primero del array ya ordenado).
  const oldestCreatedAt = messages[0]?.createdAt;

  // Cargar página anterior (`?before=<cursor>`). Prepende los resultados y
  // recalcula `hasMoreOlder` según si la página vino llena.
  const loadOlder = useMutation<PlanMessageDto[], ApiRequestError, void>({
    mutationFn: () => {
      const cursor = encodeURIComponent(oldestCreatedAt ?? new Date().toISOString());
      return api.get<PlanMessageDto[]>(`/plans/${planId}/messages?before=${cursor}`);
    },
    onSuccess: (page) => {
      // Si la página vino incompleta, ya no queda histórico hacia atrás.
      setHasMoreOlder(page.length >= MESSAGES_PAGE_SIZE);
      if (page.length === 0) return;
      setOlderMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        const fresh = page.filter((m) => !known.has(m.id));
        return [...fresh, ...prev];
      });
    },
  });

  const loadOlderMessages = useCallback(() => {
    if (!planId || loadOlder.isPending || hasMoreOlder === false) return;
    loadOlder.mutate();
  }, [planId, loadOlder, hasMoreOlder]);

  // Enviar mensaje
  const sendMessage = useMutation<PlanMessageDto, ApiRequestError, SendMessageInput>({
    mutationFn: (input) => api.post<PlanMessageDto>(`/plans/${planId}/messages`, input),
    onSuccess: (msg) => {
      // El endpoint REST devuelve el mensaje con displayName resuelto por JOIN.
      // Lo añadimos directamente; el canal Realtime también lo recibirá,
      // pero la deduplicación por id lo filtrará (o hará invalidate si el nombre
      // no estaba en el mapa de participantes, lo que igualmente es inofensivo).
      setRealtimeMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      void qc.invalidateQueries({ queryKey: ['plan-messages', planId] });
    },
  });

  const resetRealtimeMessages = useCallback(() => setRealtimeMessages([]), []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    resetRealtimeMessages,
    // Paginación hacia atrás (cargar mensajes antiguos):
    loadOlderMessages,
    isLoadingOlder: loadOlder.isPending,
    // Antes de cargar la primera página no sabemos si hay más; tratamos `null`
    // como `false` para no mostrar el botón "cargar más" prematuramente.
    hasMoreOlder: hasMoreOlder === true,
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Construye el mapa userId→displayName a partir de los participantes de un plan. */
export function buildParticipantNames(
  participants: PlanParticipantDto[],
): Map<string, string> {
  return new Map(participants.map((p) => [p.userId, p.displayName]));
}
