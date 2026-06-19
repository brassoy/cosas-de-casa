/**
 * Hooks del rincón de pareja — online-first con TanStack Query.
 *
 * Endpoints reales (confirmados contra romantic.controller.ts):
 *   GET    /couples/challenge-catalog             → ChallengeCatalogDto ({ key, description }[])
 *   GET    /families/:familyId/couple             → CoupleDto
 *   POST   /families/:familyId/couple             body: { partnerUserId } → 201 CoupleDto
 *   DELETE /couples/:coupleId                     → 204 (disolver pareja)
 *   GET    /couples/:coupleId/notes               → CoupleNoteDto[]
 *   POST   /couples/:coupleId/notes               body: { body } → 201 CoupleNoteDto
 *   DELETE /couples/:coupleId/notes/:noteId       → 204 (borrar nota)
 *   GET    /couples/:coupleId/challenges          → CoupleChallengeDto[]
 *   POST   /couples/:coupleId/challenges          body: { challengeKey } → 201 CoupleChallengeDto
 *   POST   /couples/:coupleId/challenges/done     body: { challengeKey } → CoupleChallengeDto
 *   POST   /couples/:coupleId/mischief            → 204 (no content)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  CoupleDto,
  CoupleNoteDto,
  CoupleChallengeDto,
  ChallengeCatalogDto,
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
  challengeCatalog: () => ['romantic', 'challenge-catalog'] as const,
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

/**
 * Catálogo de retos disponibles para añadir a la pareja.
 * Es estático en el backend (datos en código) → cache largo.
 * `enabled` se controla desde fuera para no cargarlo hasta que el usuario lo pida.
 */
export function useChallengeCatalog(enabled = false) {
  return useQuery<ChallengeCatalogDto>({
    queryKey: romanticKeys.challengeCatalog(),
    queryFn: () => api.get<ChallengeCatalogDto>('/couples/challenge-catalog'),
    enabled,
    staleTime: Infinity,
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

/**
 * Añade un reto del catálogo a la lista de la pareja.
 * POST /couples/:coupleId/challenges  body: { challengeKey } → 201 CoupleChallengeDto
 */
export function useAddChallenge(coupleId: string) {
  const qc = useQueryClient();
  return useMutation<CoupleChallengeDto, ApiRequestError, MarkChallengeDoneInput>({
    mutationFn: (input) =>
      api.post<CoupleChallengeDto>(
        `/couples/${coupleId}/challenges`,
        input satisfies MarkChallengeDoneInput,
      ),
    onSuccess: (created) => {
      // Añade el nuevo reto al cache (evita un refetch). Si por carrera ya
      // estuviera, lo reemplaza por su versión del servidor.
      qc.setQueryData<CoupleChallengeDto[]>(romanticKeys.challenges(coupleId), (old) => {
        const list = old ?? [];
        const exists = list.some((c) => c.challengeKey === created.challengeKey);
        return exists
          ? list.map((c) => (c.challengeKey === created.challengeKey ? created : c))
          : [...list, created];
      });
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
 * Borra una nota de la pareja.
 * DELETE /couples/:coupleId/notes/:noteId → 204 No Content.
 */
export function useDeleteNote(coupleId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, string>({
    mutationFn: (noteId) => api.delete<void>(`/couples/${coupleId}/notes/${noteId}`),
    onSuccess: (_void, noteId) => {
      qc.setQueryData<CoupleNoteDto[]>(
        romanticKeys.notes(coupleId),
        (old) => old?.filter((n) => n.id !== noteId) ?? [],
      );
    },
  });
}

/**
 * Disuelve la pareja (borra notas y retos en el backend).
 * DELETE /couples/:coupleId → 204 No Content.
 * Al resolver, invalida la query de pareja para volver al estado "crear pareja".
 */
export function useDissolveCouple(coupleId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/couples/${coupleId}`),
    onSuccess: () => {
      // La pareja deja de existir → 404 en la próxima carga ⇒ PairUp.
      qc.setQueryData<CoupleDto | null>(romanticKeys.couple(familyId), null);
      void qc.invalidateQueries({ queryKey: romanticKeys.couple(familyId) });
      // Limpia los caches dependientes de la pareja disuelta.
      qc.removeQueries({ queryKey: romanticKeys.notes(coupleId) });
      qc.removeQueries({ queryKey: romanticKeys.challenges(coupleId) });
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
