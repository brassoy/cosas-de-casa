/* ─── Helpers compartidos de las vistas de stats ─────────────────────────────
 *
 * Lógica de presentación común a las 4 vistas por theme (base / cozy /
 * cozysitcom / springfield). Se extrae aquí para no duplicar el mismo código en
 * cada `StatsView`: las medallas del ranking, el recuento de logros y la
 * resolución del nombre a mostrar son idénticos en todos los themes (solo
 * cambia la ESTÉTICA, no esta lógica).
 *
 * Lo específico de cada theme (paletas de color y sus selectores por índice)
 * sigue viviendo en la propia vista, porque no es compartible.
 * ───────────────────────────────────────────────────────────────────────────── */

import type { BadgeDto } from '@cosasdecasa/contracts';

/** Medallas del podio (1.º/2.º/3.º). A partir del 4.º se usa `#rango`. */
export const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

/** Medalla del podio o `#rango` para posiciones fuera del top 3. */
export function getMedal(rank: number): string {
  return RANK_MEDALS[rank - 1] ?? `#${rank}`;
}

/** Nombre a mostrar: el `displayName` si existe; si no, el correo. */
export function resolveName(displayName: string | null, email: string): string {
  return displayName ?? email;
}

/** Número de logros desbloqueados (badges con `earnedAt` no nulo). */
export function earnedBadgeCount(badges: BadgeDto[]): number {
  return badges.filter((b) => b.earnedAt !== null).length;
}
