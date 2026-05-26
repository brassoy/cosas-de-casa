import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  PlanDto,
  PlanSummaryDto,
  CreatePlanInput,
  SetRsvpInput,
  SharePlanInput,
  SavedPlaceDto,
  PlaceDto,
} from '../contracts';

export type { PlanDto, PlanSummaryDto, CreatePlanInput, SetRsvpInput, SharePlanInput, SavedPlaceDto, PlaceDto };

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
