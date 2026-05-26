/**
 * Tipos de la feature de estadísticas y gamificación.
 *
 * Todos los tipos vienen de @cosasdecasa/contracts — no se duplican aquí.
 *
 * Endpoints:
 *   GET /families/:familyId/stats        → StatsDto
 *   GET /families/:familyId/leaderboard  → LeaderboardEntryDto[]
 */

export type {
  StatsDto,
  MemberStatsDto,
  LeaderboardEntryDto,
  BadgeDto,
} from '@cosasdecasa/contracts';
