/**
 * Container de la pantalla `stats`.
 *
 * Cablea el read-model real (useFamilyLeaderboard / useFamilyStats) UNA sola vez
 * y delega el render en `ThemeView`, que monta la vista presentacional del theme
 * activo (con fallback a `base`).
 *
 * Read-model puro: sin mutaciones. Las barras relativas (porcentajes) las calcula
 * la vista a partir de los datos; aquí solo construimos el contrato de props.
 */

import { useParams } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useFamilyLeaderboard, useFamilyStats } from '../hooks/useStats';
import type { StatsViewProps } from '../views/types';

export function StatsPage() {
  const { familyId } = useParams({ from: '/family/$familyId/stats' });

  const leaderboard = useFamilyLeaderboard(familyId);
  const stats = useFamilyStats(familyId);

  const hasError = Boolean(leaderboard.error) || Boolean(stats.error);

  const props: StatsViewProps = {
    leaderboard: leaderboard.data ?? [],
    stats: stats.data ?? null,
    leaderboardLoading: leaderboard.isLoading,
    statsLoading: stats.isLoading,
    error: hasError ? 'No se han podido cargar las estadísticas. Inténtalo de nuevo.' : null,
  };

  return <ThemeView screen="stats" props={props} />;
}
