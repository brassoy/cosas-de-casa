/**
 * Contrato de props de las pantallas de la feature `stats`.
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para los 4 themes.
 * Es el contrato del componente base del kit (Lovable) reconciliado con los DTOs
 * reales de `@cosasdecasa/contracts`:
 *
 *  - El kit usaba tipos locales `FamilyStats` / `LeaderboardEntry`. Aquí usamos
 *    `StatsDto` / `LeaderboardEntryDto` (los DTOs reales que devuelven los hooks).
 *  - El kit asumía `stats` siempre presente; el read-model real puede no tener
 *    datos durante la carga, así que `stats` es nullable y la vista lo guarda.
 *  - Los `badges` del DTO tienen `earnedAt: string | null`: la vista cuenta los
 *    logros desbloqueados (`earnedAt !== null`), no los pinta como pills sueltas.
 *
 * Read-model puro: sin mutaciones, sin callbacks de escritura. Las barras
 * relativas (porcentajes) se calculan en la vista a partir de los datos.
 */

import type { StatsDto, LeaderboardEntryDto } from '@cosasdecasa/contracts';

export interface StatsViewProps {
  /** Ranking familiar ordenado por puntos (rank ascendente). */
  leaderboard: LeaderboardEntryDto[];
  /** Dashboard del hogar; `null` mientras no haya datos cargados. */
  stats: StatsDto | null;
  /** Carga del ranking en curso. */
  leaderboardLoading?: boolean;
  /** Carga del dashboard en curso. */
  statsLoading?: boolean;
  /** Mensaje de error (ranking o stats); `null`/`undefined` si no hay error. */
  error?: string | null;
}
