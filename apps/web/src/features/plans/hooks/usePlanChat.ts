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

  // Combina mensajes iniciales + los nuevos de Realtime (sin duplicar por id)
  const initialIds = new Set((initialMessages ?? []).map((m) => m.id));
  const dedupedRealtime = realtimeMessages.filter((m) => !initialIds.has(m.id));
  const messages = [...(initialMessages ?? []), ...dedupedRealtime].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

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
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Construye el mapa userId→displayName a partir de los participantes de un plan. */
export function buildParticipantNames(
  participants: PlanParticipantDto[],
): Map<string, string> {
  return new Map(participants.map((p) => [p.userId, p.displayName]));
}
