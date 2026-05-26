/**
 * Hooks del calendario — online-first con TanStack Query.
 *
 * Endpoints reales del backend:
 *   GET    /families/:familyId/calendar/events?from=ISO&to=ISO → CalendarEventDto[]
 *   POST   /families/:familyId/calendar/events                 → 201 CalendarEventDto
 *   PATCH  /calendar/events/:eventId                           → CalendarEventDto
 *   DELETE /calendar/events/:eventId                           → 204
 *   PUT    /calendar/events/:eventId/attendees                 → CalendarEventDto
 *
 * Zona horaria:
 *   Los eventos se almacenan en UTC (ISO 8601). El frontend los muestra en la
 *   zona horaria local del navegador usando los métodos nativos de Date. El
 *   rango from/to enviado a la API también es UTC.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  CalendarEventDto,
  CreateEventInput,
  UpdateEventInput,
  SetAttendeesInput,
} from '../types';
import { getMonthRangeISO } from '../types';

export type { ApiRequestError };

// ── Claves de query ───────────────────────────────────────────────────────────

export const calendarKeys = {
  all: ['calendar'] as const,
  byFamily: (familyId: string) => ['calendar', 'family', familyId] as const,
  byMonth: (familyId: string, year: number, month: number) =>
    ['calendar', 'family', familyId, 'month', year, month] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Carga todos los eventos del mes visible (incluyendo días adyacentes de la grilla).
 * El rango from/to cubre el inicio del primer día visible hasta el fin del último.
 */
export function useCalendarEvents(
  familyId: string | undefined,
  year: number,
  month: number, // 0-indexed
) {
  return useQuery<CalendarEventDto[]>({
    queryKey: familyId ? calendarKeys.byMonth(familyId, year, month) : ['calendar', 'none'],
    queryFn: () => {
      const { from, to } = getMonthRangeISO(year, month);
      return api.get<CalendarEventDto[]>(
        `/families/${familyId!}/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
    },
    enabled: Boolean(familyId),
    staleTime: 60_000, // 1 min — el calendario cambia poco
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCalendarEvent(familyId: string, year: number, month: number) {
  const qc = useQueryClient();
  return useMutation<CalendarEventDto, ApiRequestError, CreateEventInput>({
    mutationFn: (input) =>
      api.post<CalendarEventDto>(`/families/${familyId}/calendar/events`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.byMonth(familyId, year, month) });
    },
  });
}

export function useUpdateCalendarEvent(
  eventId: string,
  familyId: string,
  year: number,
  month: number,
) {
  const qc = useQueryClient();
  return useMutation<CalendarEventDto, ApiRequestError, UpdateEventInput>({
    mutationFn: (input) =>
      api.patch<CalendarEventDto>(`/calendar/events/${eventId}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.byMonth(familyId, year, month) });
    },
  });
}

export function useSetEventAttendees(
  eventId: string,
  familyId: string,
  year: number,
  month: number,
) {
  const qc = useQueryClient();
  return useMutation<CalendarEventDto, ApiRequestError, SetAttendeesInput>({
    mutationFn: (input) =>
      api.patch<CalendarEventDto>(`/calendar/events/${eventId}/attendees`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.byMonth(familyId, year, month) });
    },
  });
}

export function useDeleteCalendarEvent(
  eventId: string,
  familyId: string,
  year: number,
  month: number,
) {
  const qc = useQueryClient();
  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/calendar/events/${eventId}`),
    onSuccess: () => {
      // Actualización optimista: quitar del cache directamente
      qc.setQueryData<CalendarEventDto[]>(
        calendarKeys.byMonth(familyId, year, month),
        (old) => old?.filter((e) => e.id !== eventId) ?? [],
      );
      void qc.invalidateQueries({ queryKey: calendarKeys.byMonth(familyId, year, month) });
    },
  });
}
