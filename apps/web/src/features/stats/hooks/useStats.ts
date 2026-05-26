/**
 * Hooks de estadísticas y gamificación — online-first con TanStack Query.
 *
 * Endpoints:
 *   GET /families/:familyId/leaderboard  → LeaderboardEntryDto[]
 *   GET /families/:familyId/stats        → StatsDto
 */

import { useQuery } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type { LeaderboardEntryDto, StatsDto } from '../types';

export type { ApiRequestError };

// ── Claves de query ───────────────────────────────────────────────────────────

export const statsKeys = {
  all: ['stats'] as const,
  leaderboard: (familyId: string) => ['stats', 'leaderboard', familyId] as const,
  familyStats: (familyId: string) => ['stats', 'family', familyId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFamilyLeaderboard(familyId: string | undefined) {
  return useQuery<LeaderboardEntryDto[]>({
    queryKey: familyId ? statsKeys.leaderboard(familyId) : ['stats', 'leaderboard', 'none'],
    queryFn: () => api.get<LeaderboardEntryDto[]>(`/families/${familyId!}/leaderboard`),
    enabled: Boolean(familyId),
  });
}

export function useFamilyStats(familyId: string | undefined) {
  return useQuery<StatsDto>({
    queryKey: familyId ? statsKeys.familyStats(familyId) : ['stats', 'family', 'none'],
    queryFn: () => api.get<StatsDto>(`/families/${familyId!}/stats`),
    enabled: Boolean(familyId),
  });
}
