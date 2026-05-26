/**
 * Hooks del rincón de pareja — online-first con TanStack Query.
 *
 * Endpoints reales (confirmados contra romantic.controller.ts):
 *   GET   /families/:familyId/couple              → CoupleDto
 *   POST  /families/:familyId/couple              body: { partnerUserId } → 201 CoupleDto
 *   GET   /couples/:coupleId/notes                → CoupleNoteDto[]
 *   POST  /couples/:coupleId/notes                body: { body } → 201 CoupleNoteDto
 *   GET   /couples/:coupleId/challenges           → CoupleChallengeDto[]
 *   POST  /couples/:coupleId/challenges           body: { challengeKey } → 201 CoupleChallengeDto
 *   POST  /couples/:coupleId/challenges/done      body: { challengeKey } → CoupleChallengeDto
 *   POST  /couples/:coupleId/mischief             → 204 (no content)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  CoupleDto,
  CoupleNoteDto,
  CoupleChallengeDto,
  CreateCoupleInput,
  CreateCoupleNoteInput,
  MarkChallengeDoneInput,
} from '@cosasdecasa/contracts';

export type { ApiRequestError };

// ── Claves de query ───────────────────────────────────────────────────────────

export const romanticKeys = {
  couple: (familyId: string) => ['romantic', 'couple', familyId] as const,
  challenges: (coupleId: string) => ['romantic', 'challenges', coupleId] as const,
  notes: (coupleId: string) => ['romantic', 'notes', coupleId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Obtiene la pareja del usuario en la familia.
 * Devuelve null si el servidor responde 404 (sin pareja todavía).
 */
export function useCouple(familyId: string | undefined) {
  return useQuery<CoupleDto | null>({
    queryKey: familyId ? romanticKeys.couple(familyId) : ['romantic', 'couple', 'none'],
    queryFn: async () => {
      try {
        return await api.get<CoupleDto>(`/families/${familyId!}/couple`);
      } catch (err) {
        // 404 = sin pareja → devolvemos null (estado válido, no un error)
        if (err instanceof ApiRequestError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: Boolean(familyId),
  });
}

export function useChallenges(coupleId: string | undefined) {
  return useQuery<CoupleChallengeDto[]>({
    queryKey: coupleId ? romanticKeys.challenges(coupleId) : ['romantic', 'challenges', 'none'],
    queryFn: () => api.get<CoupleChallengeDto[]>(`/couples/${coupleId!}/challenges`),
    enabled: Boolean(coupleId),
  });
}

export function useCoupleNotes(coupleId: string | undefined) {
  return useQuery<CoupleNoteDto[]>({
    queryKey: coupleId ? romanticKeys.notes(coupleId) : ['romantic', 'notes', 'none'],
    queryFn: () => api.get<CoupleNoteDto[]>(`/couples/${coupleId!}/notes`),
    enabled: Boolean(coupleId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCouple(familyId: string) {
  const qc = useQueryClient();
  return useMutation<CoupleDto, ApiRequestError, CreateCoupleInput>({
    mutationFn: (input) =>
      api.post<CoupleDto>(`/families/${familyId}/couple`, input satisfies CreateCoupleInput),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: romanticKeys.couple(familyId) });
    },
  });
}

/**
 * Marca un reto como completado.
 * POST /couples/:coupleId/challenges/done  body: { challengeKey }
 */
export function useMarkChallengeDone(coupleId: string) {
  const qc = useQueryClient();
  return useMutation<CoupleChallengeDto, ApiRequestError, MarkChallengeDoneInput>({
    mutationFn: (input) =>
      api.post<CoupleChallengeDto>(
        `/couples/${coupleId}/challenges/done`,
        input satisfies MarkChallengeDoneInput,
      ),
    onSuccess: (updated) => {
      // Actualización optimista: actualiza el item en el cache directamente
      qc.setQueryData<CoupleChallengeDto[]>(
        romanticKeys.challenges(coupleId),
        (old) => old?.map((c) => (c.challengeKey === updated.challengeKey ? updated : c)) ?? [],
      );
    },
  });
}

export function useAddNote(coupleId: string) {
  const qc = useQueryClient();
  return useMutation<CoupleNoteDto, ApiRequestError, CreateCoupleNoteInput>({
    mutationFn: (input) =>
      api.post<CoupleNoteDto>(
        `/couples/${coupleId}/notes`,
        input satisfies CreateCoupleNoteInput,
      ),
    onSuccess: (newNote) => {
      // Añade al final del hilo (orden cronológico ascendente)
      qc.setQueryData<CoupleNoteDto[]>(
        romanticKeys.notes(coupleId),
        (old) => [...(old ?? []), newNote],
      );
    },
  });
}

/**
 * POST /couples/:coupleId/mischief → 204 No Content.
 */
export function useSendMischief(coupleId: string) {
  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.post<void>(`/couples/${coupleId}/mischief`, {}),
  });
}
