/**
 * Hooks de la feature `routines` — online-first con TanStack Query (mismo
 * enfoque que el calendario: sin Dexie; refresco por invalidación tras mutar).
 *
 * Endpoints reales del backend:
 *   GET/POST  /families/:familyId/routine-items          · PATCH/DELETE /routine-items/:itemId
 *   GET/POST  /families/:familyId/routines               · GET .../routines/detailed · GET .../routines/stats
 *   GET/PATCH/DELETE /routines/:routineId                · PUT /routines/:routineId/items
 *   GET       /routines/:routineId/summary
 *   POST      /routines/:routineId/assignments           · PATCH/DELETE .../assignments/:assignmentId
 *   POST      .../assignments/:assignmentId/incidents    · DELETE /routines/:routineId/incidents/:incidentId
 *
 * Las mutaciones sobre una rutina devuelven el RoutineDto completo: se escribe
 * directo en la cache del detalle y se invalida lo derivado (lista, summary,
 * stats, detailed del calendario). El movimiento de asignaciones (drag del
 * kanban) es OPTIMISTA con rollback en error.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  CreateAssignmentInput,
  CreateIncidentInput,
  CreateRoutineInput,
  CreateRoutineItemInput,
  RoutineDto,
  RoutineItemDto,
  RoutineListItemDto,
  RoutineStatsDto,
  RoutineSummaryDto,
  UpdateAssignmentInput,
  UpdateRoutineItemInput,
} from '../types';

export type { ApiRequestError };

// ── Claves de query ───────────────────────────────────────────────────────────

export const routineKeys = {
  all: ['routines'] as const,
  items: (familyId: string, includeArchived: boolean) =>
    ['routines', 'items', familyId, includeArchived] as const,
  list: (familyId: string, from?: string, to?: string) =>
    ['routines', 'list', familyId, from ?? null, to ?? null] as const,
  detailed: (familyId: string, from?: string, to?: string) =>
    ['routines', 'detailed', familyId, from ?? null, to ?? null] as const,
  detail: (routineId: string) => ['routines', 'detail', routineId] as const,
  summary: (routineId: string) => ['routines', 'summary', routineId] as const,
  stats: (familyId: string, from?: string, to?: string) =>
    ['routines', 'stats', familyId, from ?? null, to ?? null] as const,
};

function rangeQS(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useRoutineItems(familyId: string | undefined, includeArchived = false) {
  return useQuery<RoutineItemDto[]>({
    queryKey: familyId
      ? routineKeys.items(familyId, includeArchived)
      : ['routines', 'items', 'none'],
    queryFn: () =>
      api.get<RoutineItemDto[]>(
        `/families/${familyId!}/routine-items${includeArchived ? '?includeArchived=true' : ''}`,
      ),
    enabled: Boolean(familyId),
    staleTime: 60_000,
  });
}

export function useRoutines(familyId: string | undefined, from?: string, to?: string) {
  return useQuery<RoutineListItemDto[]>({
    queryKey: familyId ? routineKeys.list(familyId, from, to) : ['routines', 'list', 'none'],
    queryFn: () =>
      api.get<RoutineListItemDto[]>(`/families/${familyId!}/routines${rangeQS(from, to)}`),
    enabled: Boolean(familyId),
    staleTime: 60_000,
  });
}

/** Rutinas hidratadas del rango visible — para el overlay del calendario. */
export function useDetailedRoutines(
  familyId: string | undefined,
  from?: string,
  to?: string,
) {
  return useQuery<RoutineDto[]>({
    queryKey: familyId
      ? routineKeys.detailed(familyId, from, to)
      : ['routines', 'detailed', 'none'],
    queryFn: () =>
      api.get<RoutineDto[]>(`/families/${familyId!}/routines/detailed${rangeQS(from, to)}`),
    enabled: Boolean(familyId),
    staleTime: 60_000,
  });
}

export function useRoutine(routineId: string | undefined) {
  return useQuery<RoutineDto>({
    queryKey: routineId ? routineKeys.detail(routineId) : ['routines', 'detail', 'none'],
    queryFn: () => api.get<RoutineDto>(`/routines/${routineId!}`),
    enabled: Boolean(routineId),
    staleTime: 30_000,
  });
}

export function useRoutineSummary(routineId: string | undefined) {
  return useQuery<RoutineSummaryDto>({
    queryKey: routineId ? routineKeys.summary(routineId) : ['routines', 'summary', 'none'],
    queryFn: () => api.get<RoutineSummaryDto>(`/routines/${routineId!}/summary`),
    enabled: Boolean(routineId),
    staleTime: 30_000,
  });
}

export function useRoutineStats(familyId: string | undefined, from?: string, to?: string) {
  return useQuery<RoutineStatsDto>({
    queryKey: familyId ? routineKeys.stats(familyId, from, to) : ['routines', 'stats', 'none'],
    queryFn: () =>
      api.get<RoutineStatsDto>(`/families/${familyId!}/routines/stats${rangeQS(from, to)}`),
    enabled: Boolean(familyId),
    staleTime: 60_000,
  });
}

// ── Invalidación común tras mutar una rutina ──────────────────────────────────

function useApplyRoutine() {
  const qc = useQueryClient();
  return (routine: RoutineDto) => {
    qc.setQueryData(routineKeys.detail(routine.id), routine);
    void qc.invalidateQueries({ queryKey: ['routines', 'list', routine.familyId] });
    void qc.invalidateQueries({ queryKey: ['routines', 'detailed', routine.familyId] });
    void qc.invalidateQueries({ queryKey: routineKeys.summary(routine.id) });
    void qc.invalidateQueries({ queryKey: ['routines', 'stats', routine.familyId] });
  };
}

// ── Mutaciones: catálogo ──────────────────────────────────────────────────────

export function useCreateRoutineItem(familyId: string) {
  const qc = useQueryClient();
  return useMutation<RoutineItemDto, ApiRequestError, CreateRoutineItemInput>({
    mutationFn: (input) =>
      api.post<RoutineItemDto>(`/families/${familyId}/routine-items`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routines', 'items', familyId] });
    },
  });
}

export function useUpdateRoutineItem(familyId: string) {
  const qc = useQueryClient();
  return useMutation<
    RoutineItemDto,
    ApiRequestError,
    { itemId: string; input: UpdateRoutineItemInput }
  >({
    mutationFn: ({ itemId, input }) =>
      api.patch<RoutineItemDto>(`/routine-items/${itemId}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routines', 'items', familyId] });
    },
  });
}

export function useDeleteRoutineItem(familyId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, string>({
    mutationFn: (itemId) => api.delete<void>(`/routine-items/${itemId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routines', 'items', familyId] });
    },
  });
}

// ── Mutaciones: rutinas ───────────────────────────────────────────────────────

export function useCreateRoutine(familyId: string) {
  const qc = useQueryClient();
  return useMutation<RoutineDto, ApiRequestError, CreateRoutineInput>({
    mutationFn: (input) => api.post<RoutineDto>(`/families/${familyId}/routines`, input),
    onSuccess: (routine) => {
      qc.setQueryData(routineKeys.detail(routine.id), routine);
      void qc.invalidateQueries({ queryKey: ['routines', 'list', familyId] });
      void qc.invalidateQueries({ queryKey: ['routines', 'detailed', familyId] });
      void qc.invalidateQueries({ queryKey: ['routines', 'stats', familyId] });
    },
  });
}

export function useDeleteRoutine(familyId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, string>({
    mutationFn: (routineId) => api.delete<void>(`/routines/${routineId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: routineKeys.all });
      void qc.invalidateQueries({ queryKey: ['routines', 'list', familyId] });
    },
  });
}

export function useSetRoutineItems(routineId: string) {
  const apply = useApplyRoutine();
  return useMutation<RoutineDto, ApiRequestError, string[]>({
    mutationFn: (itemIds) => api.put<RoutineDto>(`/routines/${routineId}/items`, { itemIds }),
    onSuccess: apply,
  });
}

// ── Mutaciones: asignaciones ──────────────────────────────────────────────────

export function useCreateAssignment(routineId: string) {
  const apply = useApplyRoutine();
  return useMutation<RoutineDto, ApiRequestError, CreateAssignmentInput>({
    mutationFn: (input) => api.post<RoutineDto>(`/routines/${routineId}/assignments`, input),
    onSuccess: apply,
  });
}

/**
 * Mover/ajustar una asignación. El cambio de `dayIndex` (drag del kanban) se
 * aplica OPTIMISTA sobre la cache del detalle, con rollback si la API falla.
 */
export function useUpdateAssignment(routineId: string) {
  const qc = useQueryClient();
  const apply = useApplyRoutine();
  return useMutation<
    RoutineDto,
    ApiRequestError,
    { assignmentId: string; input: UpdateAssignmentInput },
    { previous: RoutineDto | undefined }
  >({
    mutationFn: ({ assignmentId, input }) =>
      api.patch<RoutineDto>(`/routines/${routineId}/assignments/${assignmentId}`, input),
    onMutate: async ({ assignmentId, input }) => {
      await qc.cancelQueries({ queryKey: routineKeys.detail(routineId) });
      const previous = qc.getQueryData<RoutineDto>(routineKeys.detail(routineId));
      if (previous && input.dayIndex !== undefined) {
        qc.setQueryData<RoutineDto>(routineKeys.detail(routineId), {
          ...previous,
          assignments: previous.assignments.map((assignment) =>
            assignment.id === assignmentId
              ? { ...assignment, dayIndex: input.dayIndex! }
              : assignment,
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(routineKeys.detail(routineId), context.previous);
      }
    },
    onSuccess: apply,
  });
}

export function useDeleteAssignment(routineId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, string>({
    mutationFn: (assignmentId) =>
      api.delete<void>(`/routines/${routineId}/assignments/${assignmentId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: routineKeys.all });
    },
  });
}

// ── Mutaciones: incidencias ───────────────────────────────────────────────────

export function useCreateIncident(routineId: string) {
  const apply = useApplyRoutine();
  return useMutation<
    RoutineDto,
    ApiRequestError,
    { assignmentId: string; input: CreateIncidentInput }
  >({
    mutationFn: ({ assignmentId, input }) =>
      api.post<RoutineDto>(
        `/routines/${routineId}/assignments/${assignmentId}/incidents`,
        input,
      ),
    onSuccess: apply,
  });
}

export function useDeleteIncident(routineId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, string>({
    mutationFn: (incidentId) =>
      api.delete<void>(`/routines/${routineId}/incidents/${incidentId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: routineKeys.all });
    },
  });
}
