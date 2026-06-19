import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  PlanDto,
  PlanSummaryDto,
  CreatePlanInput,
  UpdatePlanInput,
  SetRsvpInput,
  SharePlanInput,
  SavedPlaceDto,
  PlaceDto,
} from '../contracts';

export type {
  PlanDto,
  PlanSummaryDto,
  CreatePlanInput,
  UpdatePlanInput,
  SetRsvpInput,
  SharePlanInput,
  SavedPlaceDto,
  PlaceDto,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFamilyPlans(familyId: string | undefined) {
  return useQuery<PlanSummaryDto[]>({
    queryKey: ['plans', familyId],
    queryFn: () => api.get<PlanSummaryDto[]>(`/families/${familyId}/plans`),
    enabled: Boolean(familyId),
  });
}

export function usePlan(planId: string | undefined) {
  return useQuery<PlanDto>({
    queryKey: ['plans', 'detail', planId],
    queryFn: () => api.get<PlanDto>(`/plans/${planId}`),
    enabled: Boolean(planId),
  });
}

export function useSavedPlaces(familyId: string | undefined) {
  return useQuery<SavedPlaceDto[]>({
    queryKey: ['places', familyId],
    queryFn: () => api.get<SavedPlaceDto[]>(`/families/${familyId}/places`),
    enabled: Boolean(familyId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreatePlan(familyId: string) {
  const qc = useQueryClient();

  return useMutation<PlanDto, ApiRequestError, CreatePlanInput>({
    mutationFn: (input) => api.post<PlanDto>(`/families/${familyId}/plans`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['plans', familyId] });
    },
  });
}

export function useDeletePlan(familyId: string | undefined) {
  const qc = useQueryClient();

  return useMutation<void, ApiRequestError, string>({
    mutationFn: (planId) => api.delete<void>(`/plans/${planId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['plans', familyId] });
    },
  });
}

// PATCH /plans/:planId → PlanDto (200). Body: campos opcionales
// { title?, description?, place?, scheduledAt?, status? } (UpdatePlanInput).
export function useUpdatePlan(planId: string, familyId: string | undefined) {
  const qc = useQueryClient();

  return useMutation<PlanDto, ApiRequestError, UpdatePlanInput>({
    mutationFn: (input) => api.patch<PlanDto>(`/plans/${planId}`, input),
    onSuccess: (plan) => {
      // Detalle: refresca la caché con el plan devuelto (como rsvp/share).
      qc.setQueryData(['plans', 'detail', planId], plan);
      // Listado de la familia: el título/fecha/estado del resumen puede cambiar.
      void qc.invalidateQueries({ queryKey: ['plans', familyId] });
    },
  });
}

// POST /plans/:planId/rsvp → PlanDto (200)
export function useSetRsvp(planId: string) {
  const qc = useQueryClient();

  return useMutation<PlanDto, ApiRequestError, SetRsvpInput>({
    mutationFn: (input) => api.post<PlanDto>(`/plans/${planId}/rsvp`, input),
    onSuccess: (plan) => {
      qc.setQueryData(['plans', 'detail', planId], plan);
    },
  });
}

// POST /plans/:planId/share → PlanDto (200)
export function useSharePlan(planId: string) {
  const qc = useQueryClient();

  return useMutation<PlanDto, ApiRequestError, SharePlanInput>({
    mutationFn: (input) => api.post<PlanDto>(`/plans/${planId}/share`, input),
    onSuccess: (plan) => {
      qc.setQueryData(['plans', 'detail', planId], plan);
    },
  });
}

export function useSavePlace(familyId: string) {
  const qc = useQueryClient();

  return useMutation<SavedPlaceDto, ApiRequestError, PlaceDto>({
    mutationFn: (place) => api.post<SavedPlaceDto>(`/families/${familyId}/places`, place),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['places', familyId] });
    },
  });
}

// DELETE /places/:placeId → void (204). Invalida los lugares guardados de la
// familia para que el selector y la lista del detalle se refresquen.
export function useDeletePlace(familyId: string | undefined) {
  const qc = useQueryClient();

  return useMutation<void, ApiRequestError, string>({
    mutationFn: (placeId) => api.delete<void>(`/places/${placeId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['places', familyId] });
    },
  });
}
